import { Injectable } from '@nestjs/common';

import { msg } from '@lingui/core/macro';
import { isNonEmptyString } from '@sniptt/guards';
import bytes from 'bytes';
import { FileFolder, type DriveAccessLevel } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { IsNull, In } from 'typeorm';
import { v4 } from 'uuid';

import { settings } from 'src/engine/constants/settings';
import { DriveItemDTO } from 'src/engine/core-modules/drive/dtos/drive-item.dto';
import { DriveItemShareDTO } from 'src/engine/core-modules/drive/dtos/drive-item-share.dto';
import { DriveSpaceDTO } from 'src/engine/core-modules/drive/dtos/drive-space.dto';
import { DriveSpaceGrantDTO } from 'src/engine/core-modules/drive/dtos/drive-space-grant.dto';
import { DriveFileContentDTO } from 'src/engine/core-modules/drive/dtos/drive-file-content.dto';
import { DriveItemEntity } from 'src/engine/core-modules/drive/entities/drive-item.entity';
import { DriveItemShareEntity } from 'src/engine/core-modules/drive/entities/drive-item-share.entity';
import { DriveSpaceEntity } from 'src/engine/core-modules/drive/entities/drive-space.entity';
import { DriveSpaceGrantEntity } from 'src/engine/core-modules/drive/entities/drive-space-grant.entity';
import {
  DRIVE_MAX_SANDBOX_BYTES,
  DRIVE_MAX_TEXT_BYTES,
} from 'src/engine/core-modules/drive/drive.constants';
import {
  DriveException,
  DriveExceptionCode,
  driveNotFoundException,
} from 'src/engine/core-modules/drive/drive.exception';
import {
  DriveAccessService,
  type DriveAccessPrincipal,
  type DriveResolvedLocation,
} from 'src/engine/core-modules/drive/services/drive-access.service';
import { assertValidDriveItemName } from 'src/engine/core-modules/drive/utils/assert-valid-drive-item-name.util';
import { isChatReadableDriveFile } from 'src/engine/core-modules/drive/utils/is-chat-readable-drive-file.util';
import { splitDriveLeafPath } from 'src/engine/core-modules/drive/utils/split-drive-leaf-path.util';
import { FileStorageService } from 'src/engine/core-modules/file-storage/services/file-storage.service';
import { FileEntity } from 'src/engine/core-modules/file/entities/file.entity';
import { FileUploadTargetDTO } from 'src/engine/core-modules/file/file-upload/dtos/file-upload-target.dto';
import {
  FileUploadException,
  FileUploadExceptionCode,
} from 'src/engine/core-modules/file/file-upload/file-upload.exception';
import { FileUploadCompletionService } from 'src/engine/core-modules/file/file-upload/services/file-upload-completion.service';
import { FileUploadTargetService } from 'src/engine/core-modules/file/file-upload/services/file-upload-target.service';
import { FileUrlService } from 'src/engine/core-modules/file/file-url/file-url.service';
import { FileService } from 'src/engine/core-modules/file/services/file.service';
import { FILE_STATUS } from 'src/engine/core-modules/file/types/file-status.types';
import { buildFileInfo } from 'src/engine/core-modules/file/utils/build-file-info.utils';
import { removeFileFolderFromFileEntityPath } from 'src/engine/core-modules/file/utils/remove-file-folder-from-file-entity-path.utils';
import { TWENTY_STANDARD_APPLICATION } from 'src/engine/workspace-manager/twenty-standard-application/constants/twenty-standard-applications';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';
import { streamToBuffer } from 'src/utils/stream-to-buffer';

@Injectable()
export class DriveService {
  constructor(
    private readonly driveAccessService: DriveAccessService,
    private readonly fileStorageService: FileStorageService,
    private readonly fileUploadTargetService: FileUploadTargetService,
    private readonly fileUploadCompletionService: FileUploadCompletionService,
    private readonly fileUrlService: FileUrlService,
    private readonly fileService: FileService,
    @InjectWorkspaceScopedRepository(DriveSpaceEntity)
    private readonly driveSpaceRepository: WorkspaceScopedRepository<DriveSpaceEntity>,
    @InjectWorkspaceScopedRepository(DriveItemEntity)
    private readonly driveItemRepository: WorkspaceScopedRepository<DriveItemEntity>,
    @InjectWorkspaceScopedRepository(DriveSpaceGrantEntity)
    private readonly driveSpaceGrantRepository: WorkspaceScopedRepository<DriveSpaceGrantEntity>,
    @InjectWorkspaceScopedRepository(DriveItemShareEntity)
    private readonly driveItemShareRepository: WorkspaceScopedRepository<DriveItemShareEntity>,
    @InjectWorkspaceScopedRepository(FileEntity)
    private readonly fileRepository: WorkspaceScopedRepository<FileEntity>,
  ) {}

  async listSpaces(principal: DriveAccessPrincipal): Promise<DriveSpaceDTO[]> {
    const personalSpace = await this.driveAccessService.findPersonalSpace({
      principal,
    });
    const organisationSpaces =
      await this.driveAccessService.listVisibleOrganisationSpaces({
        principal,
      });
    const shares = await this.driveAccessService.listSharesForPrincipal({
      principal,
    });

    const spaces: DriveSpaceDTO[] = [];

    if (isDefined(personalSpace)) {
      spaces.push({
        id: personalSpace.id,
        listKind: 'PERSONAL',
        kind: 'PERSONAL',
        name: personalSpace.name,
        slug: personalSpace.slug,
        icon: personalSpace.icon,
        virtualPath: '/personal',
        accessLevel: 'READ_WRITE',
        ownerUserWorkspaceId: personalSpace.ownerUserWorkspaceId,
      });
    }

    for (const { space, accessLevel } of organisationSpaces) {
      spaces.push({
        id: space.id,
        listKind: 'ORGANISATION',
        kind: 'ORGANISATION',
        name: space.name,
        slug: space.slug,
        icon: space.icon,
        virtualPath: `/spaces/${space.slug}`,
        accessLevel,
        ownerUserWorkspaceId: null,
      });
    }

    for (const share of shares) {
      if (!isDefined(share.item) || isDefined(share.item.deletedAt)) {
        continue;
      }

      spaces.push({
        id: share.item.id,
        listKind: 'SHARED_WITH_ME',
        kind: null,
        name: share.item.name,
        slug: share.item.id,
        icon: share.item.kind === 'FOLDER' ? 'IconFolder' : 'IconFile',
        virtualPath: `/shared/${share.item.id}`,
        accessLevel: share.accessLevel,
        ownerUserWorkspaceId: null,
      });
    }

    return spaces;
  }

  async listOrganisationSpaces(
    workspaceId: string,
  ): Promise<DriveSpaceEntity[]> {
    return this.driveSpaceRepository.find(workspaceId, {
      where: { kind: 'ORGANISATION' },
      order: { name: 'ASC' },
    });
  }

  async listSpaceGrantsForRole({
    workspaceId,
    roleId,
  }: {
    workspaceId: string;
    roleId: string;
  }): Promise<DriveSpaceGrantDTO[]> {
    const grants = await this.driveSpaceGrantRepository.find(workspaceId, {
      where: {
        principalType: 'ROLE',
        principalId: roleId,
      },
    });

    return grants.map((grant) => ({
      id: grant.id,
      spaceId: grant.spaceId,
      roleId: grant.principalId,
      accessLevel: grant.accessLevel,
    }));
  }

  async upsertSpaceGrantsForRole({
    workspaceId,
    roleId,
    grants,
  }: {
    workspaceId: string;
    roleId: string;
    grants: Array<{ spaceId: string; accessLevel?: DriveAccessLevel | null }>;
  }): Promise<DriveSpaceGrantDTO[]> {
    for (const grant of grants) {
      const space = await this.driveSpaceRepository.findOne(workspaceId, {
        where: { id: grant.spaceId, kind: 'ORGANISATION' },
      });

      if (!isDefined(space)) {
        throw driveNotFoundException();
      }

      const existingGrant = await this.driveSpaceGrantRepository.findOne(
        workspaceId,
        {
          where: {
            spaceId: grant.spaceId,
            principalType: 'ROLE',
            principalId: roleId,
          },
        },
      );

      if (!isDefined(grant.accessLevel)) {
        if (isDefined(existingGrant)) {
          await this.driveSpaceGrantRepository.delete(workspaceId, {
            id: existingGrant.id,
          });
        }

        continue;
      }

      if (isDefined(existingGrant)) {
        await this.driveSpaceGrantRepository.update(
          workspaceId,
          { id: existingGrant.id },
          { accessLevel: grant.accessLevel },
        );

        continue;
      }

      await this.driveSpaceGrantRepository.insertAndReturnOne(workspaceId, {
        spaceId: grant.spaceId,
        principalType: 'ROLE',
        principalId: roleId,
        accessLevel: grant.accessLevel,
      });
    }

    return this.listSpaceGrantsForRole({ workspaceId, roleId });
  }

  async listItems({
    path,
    principal,
  }: {
    path: string;
    principal: DriveAccessPrincipal;
  }): Promise<DriveItemDTO[]> {
    const resolvedLocation = await this.driveAccessService.assertCanAccess({
      path,
      principal,
      requiredAccessLevel: 'READ',
    });

    if (resolvedLocation.parsedPath.prefix === 'shared-root') {
      const shares = await this.driveAccessService.listSharesForPrincipal({
        principal,
      });

      const sharedItems: DriveItemDTO[] = [];

      for (const share of shares) {
        if (!isDefined(share.item) || isDefined(share.item.deletedAt)) {
          continue;
        }

        sharedItems.push(
          await this.toItemDto({
            item: share.item,
            virtualPath: `/shared/${share.item.id}`,
            accessLevel: share.accessLevel,
            workspaceId: principal.workspaceId,
          }),
        );
      }

      return sharedItems;
    }

    if (!isDefined(resolvedLocation.space)) {
      throw driveNotFoundException();
    }

    if (
      isDefined(resolvedLocation.item) &&
      resolvedLocation.item.kind === 'FILE'
    ) {
      return [];
    }

    const children = await this.driveItemRepository.find(
      principal.workspaceId,
      {
        where: {
          spaceId: resolvedLocation.space.id,
          parentId: isDefined(resolvedLocation.item)
            ? resolvedLocation.item.id
            : IsNull(),
        },
        order: { kind: 'ASC', name: 'ASC' },
      },
    );

    const items: DriveItemDTO[] = [];

    for (const child of children) {
      if (
        child.kind === 'FILE' &&
        !(await this.isUploadedFile(child, principal.workspaceId))
      ) {
        continue;
      }

      items.push(
        await this.toItemDto({
          item: child,
          virtualPath: `${resolvedLocation.virtualPath}/${child.name}`.replace(
            '//',
            '/',
          ),
          accessLevel: resolvedLocation.accessLevel ?? 'READ',
          workspaceId: principal.workspaceId,
        }),
      );
    }

    return items;
  }

  async statItem({
    path,
    principal,
  }: {
    path: string;
    principal: DriveAccessPrincipal;
  }): Promise<DriveItemDTO> {
    const resolvedLocation = await this.driveAccessService.assertCanAccess({
      path,
      principal,
      requiredAccessLevel: 'READ',
    });

    if (
      resolvedLocation.parsedPath.prefix === 'shared-root' ||
      !isDefined(resolvedLocation.space)
    ) {
      throw driveNotFoundException();
    }

    if (!isDefined(resolvedLocation.item)) {
      return {
        id: resolvedLocation.space.id,
        name: resolvedLocation.space.name,
        kind: 'FOLDER',
        virtualPath: resolvedLocation.virtualPath,
        accessLevel: resolvedLocation.accessLevel ?? 'READ',
        mimeType: null,
        size: null,
        downloadUrl: null,
        parentId: null,
        spaceId: resolvedLocation.space.id,
        createdAt: resolvedLocation.space.createdAt,
        updatedAt: resolvedLocation.space.updatedAt,
      };
    }

    return this.toItemDto({
      item: resolvedLocation.item,
      virtualPath: resolvedLocation.virtualPath,
      accessLevel: resolvedLocation.accessLevel ?? 'READ',
      workspaceId: principal.workspaceId,
    });
  }

  async readFile({
    path,
    fileId,
    principal,
  }: {
    path?: string;
    fileId?: string;
    principal: DriveAccessPrincipal;
  }): Promise<DriveFileContentDTO> {
    const resolvedPath = await this.resolveDriveFilePath({
      path,
      fileId,
      principal,
    });

    const item = await this.getUploadedFileItemOrThrow({
      path: resolvedPath,
      principal,
      requiredAccessLevel: 'READ',
    });

    if (
      !isChatReadableDriveFile({
        mimeType: item.mimeType,
        name: item.name,
      })
    ) {
      throw new DriveException(
        `This file (${item.mimeType ?? 'binary'}) cannot be read into chat. Use code_interpreter and drive.pull('${resolvedPath}', '/home/user/${item.name}'), then parse it in Python (PyMuPDF for PDFs).`,
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    if (Number(item.size ?? 0) > DRIVE_MAX_TEXT_BYTES) {
      throw new DriveException(
        'File is too large to read as text',
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    const fileStream = await this.fileService.getFileStreamById({
      fileId: item.fileId as string,
      workspaceId: principal.workspaceId,
      allowedFileFolders: [FileFolder.Drive],
    });

    if (!isDefined(fileStream)) {
      throw driveNotFoundException();
    }

    const buffer = await streamToBuffer(
      fileStream.stream,
      DRIVE_MAX_TEXT_BYTES,
    );

    return {
      content: buffer.toString('utf8'),
      mimeType: item.mimeType ?? fileStream.mimeType,
    };
  }

  async copyFileToDrive({
    fileId,
    path,
    principal,
  }: {
    fileId: string;
    path: string;
    principal: DriveAccessPrincipal;
  }): Promise<DriveItemDTO> {
    const fileStream = await this.fileService.getFileStreamById({
      fileId,
      workspaceId: principal.workspaceId,
      allowedFileFolders: [FileFolder.AgentChat, FileFolder.Drive],
    });

    if (!isDefined(fileStream)) {
      throw new DriveException(
        'File not found in this chat or Drive. copy_file_to_drive needs the fileId from a code_interpreter harvest or an existing Drive file.',
        DriveExceptionCode.NOT_FOUND,
      );
    }

    const sourceFile = await streamToBuffer(
      fileStream.stream,
      DRIVE_MAX_SANDBOX_BYTES,
    );

    return this.publishBytes({
      path,
      sourceFile,
      principal,
    });
  }

  async readFileBytes({
    path,
    principal,
  }: {
    path: string;
    principal: DriveAccessPrincipal;
  }): Promise<{ content: Buffer; mimeType: string; filename: string }> {
    const item = await this.getUploadedFileItemOrThrow({
      path,
      principal,
      requiredAccessLevel: 'READ',
    });

    const fileStream = await this.fileService.getFileStreamById({
      fileId: item.fileId as string,
      workspaceId: principal.workspaceId,
      allowedFileFolders: [FileFolder.Drive],
    });

    if (!isDefined(fileStream)) {
      throw driveNotFoundException();
    }

    const buffer = await streamToBuffer(
      fileStream.stream,
      DRIVE_MAX_SANDBOX_BYTES,
    );

    return {
      content: buffer,
      mimeType: item.mimeType ?? fileStream.mimeType,
      filename: item.name,
    };
  }

  async getDownloadUrl({
    path,
    principal,
  }: {
    path: string;
    principal: DriveAccessPrincipal;
  }): Promise<string> {
    const item = await this.getUploadedFileItemOrThrow({
      path,
      principal,
      requiredAccessLevel: 'READ',
    });

    return this.fileUrlService.signFileByIdUrl({
      fileId: item.fileId as string,
      workspaceId: principal.workspaceId,
      fileFolder: FileFolder.Drive,
    });
  }

  async createFolder({
    path,
    principal,
  }: {
    path: string;
    principal: DriveAccessPrincipal;
  }): Promise<DriveItemDTO> {
    const { parentPath, name } = splitDriveLeafPath(path);

    assertValidDriveItemName(name);

    const parentLocation = await this.driveAccessService.assertCanAccess({
      path: parentPath,
      principal,
      requiredAccessLevel: 'READ_WRITE',
    });

    this.assertParentIsDirectory(parentLocation);

    await this.assertSiblingNameIsFree({
      workspaceId: principal.workspaceId,
      spaceId: parentLocation.space?.id as string,
      parentId: parentLocation.item?.id ?? null,
      name,
    });

    const item = await this.driveItemRepository.insertAndReturnOne(
      principal.workspaceId,
      {
        spaceId: parentLocation.space?.id,
        parentId: parentLocation.item?.id ?? null,
        name,
        kind: 'FOLDER',
        createdByUserWorkspaceId: principal.userWorkspaceId,
        updatedByUserWorkspaceId: principal.userWorkspaceId,
      },
    );

    return this.toItemDto({
      item,
      virtualPath: path,
      accessLevel: 'READ_WRITE',
      workspaceId: principal.workspaceId,
    });
  }

  async writeFile({
    path,
    content,
    principal,
  }: {
    path: string;
    principal: DriveAccessPrincipal;
    content: string;
  }): Promise<DriveItemDTO> {
    if (Buffer.byteLength(content, 'utf8') > DRIVE_MAX_TEXT_BYTES) {
      throw new DriveException(
        'File is too large to write as text',
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    const { parentPath, name } = splitDriveLeafPath(path);

    assertValidDriveItemName(name);

    const parentLocation = await this.driveAccessService.assertCanAccess({
      path: parentPath,
      principal,
      requiredAccessLevel: 'READ_WRITE',
    });

    this.assertParentIsDirectory(parentLocation);

    return this.persistFileBytes({
      path,
      name,
      parentLocation,
      principal,
      sourceFile: Buffer.from(content, 'utf8'),
    });
  }

  async createFileUpload({
    path,
    size,
    principal,
  }: {
    path: string;
    size: number;
    principal: DriveAccessPrincipal;
  }): Promise<FileUploadTargetDTO> {
    const maxFileSize = bytes(settings.storage.maxDirectUploadFileSize) ?? 0;

    if (!Number.isInteger(size) || size <= 0 || size > maxFileSize) {
      throw new DriveException(
        `Invalid file size ${size}`,
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    const { parentPath, name } = splitDriveLeafPath(path);

    assertValidDriveItemName(name);

    const parentLocation = await this.driveAccessService.assertCanAccess({
      path: parentPath,
      principal,
      requiredAccessLevel: 'READ_WRITE',
    });

    this.assertParentIsDirectory(parentLocation);

    const existingItem = await this.findSibling({
      workspaceId: principal.workspaceId,
      spaceId: parentLocation.space?.id as string,
      parentId: parentLocation.item?.id ?? null,
      name,
    });

    if (isDefined(existingItem) && existingItem.kind === 'FOLDER') {
      throw new DriveException(
        'A folder with that name already exists',
        DriveExceptionCode.CONFLICT,
      );
    }

    const fileId = existingItem?.fileId ?? v4();
    const resourcePath = this.buildFileResourcePath({
      pathPrefix: parentLocation.space?.pathPrefix as string,
      fileId,
      filename: name,
    });

    await this.fileStorageService.createPendingFile({
      fileFolder: FileFolder.Drive,
      applicationUniversalIdentifier:
        TWENTY_STANDARD_APPLICATION.universalIdentifier,
      workspaceId: principal.workspaceId,
      resourcePath,
      fileId,
      size,
      mimeType: 'application/octet-stream',
      settings: {
        isTemporaryFile: true,
        toDelete: false,
      },
    });

    if (!isDefined(existingItem)) {
      await this.driveItemRepository.insertAndReturnOne(principal.workspaceId, {
        id: fileId,
        spaceId: parentLocation.space?.id,
        parentId: parentLocation.item?.id ?? null,
        name,
        kind: 'FILE',
        fileId,
        mimeType: 'application/octet-stream',
        size: String(size),
        createdByUserWorkspaceId: principal.userWorkspaceId,
        updatedByUserWorkspaceId: principal.userWorkspaceId,
      });
    }

    return this.fileUploadTargetService.buildUploadTarget({
      workspaceId: principal.workspaceId,
      fileId,
      fileFolder: FileFolder.Drive,
      applicationUniversalIdentifier:
        TWENTY_STANDARD_APPLICATION.universalIdentifier,
      resourcePath,
      contentType: 'application/octet-stream',
      size,
    });
  }

  async completeFileUpload({
    fileId,
    principal,
  }: {
    fileId: string;
    principal: DriveAccessPrincipal;
  }): Promise<DriveItemDTO> {
    const item = await this.driveItemRepository.findOne(principal.workspaceId, {
      where: { fileId },
    });

    if (!isDefined(item) || item.kind !== 'FILE') {
      throw driveNotFoundException();
    }

    const virtualPath = await this.buildVirtualPathForItem({
      item,
      workspaceId: principal.workspaceId,
    });

    await this.driveAccessService.assertCanAccess({
      path: virtualPath,
      principal,
      requiredAccessLevel: 'READ_WRITE',
    });

    const file = await this.fileRepository.findOne(principal.workspaceId, {
      where: { id: fileId },
    });

    if (!isDefined(file)) {
      throw driveNotFoundException();
    }

    const [fileFolder] = file.path.split('/');

    if (fileFolder !== FileFolder.Drive) {
      throw driveNotFoundException();
    }

    try {
      const completedFile =
        await this.fileUploadCompletionService.completeUploadedFile({
          workspaceId: principal.workspaceId,
          file,
          storageLocation: {
            fileFolder: FileFolder.Drive,
            applicationUniversalIdentifier:
              TWENTY_STANDARD_APPLICATION.universalIdentifier,
            workspaceId: principal.workspaceId,
            resourcePath: removeFileFolderFromFileEntityPath(file.path),
          },
        });

      await this.driveItemRepository.update(
        principal.workspaceId,
        { id: item.id },
        {
          mimeType: completedFile.mimeType,
          size: String(completedFile.size),
          updatedByUserWorkspaceId: principal.userWorkspaceId,
        },
      );
    } catch (error) {
      if (error instanceof FileUploadException) {
        throw new DriveException(
          error.message,
          error.code === FileUploadExceptionCode.FILE_NOT_FOUND
            ? DriveExceptionCode.NOT_FOUND
            : DriveExceptionCode.BAD_REQUEST,
          {
            userFriendlyMessage:
              error.userFriendlyMessage ?? msg`The file could not be uploaded.`,
          },
        );
      }

      throw error;
    }

    const updatedItem = await this.driveItemRepository.findOneOrFail(
      principal.workspaceId,
      { where: { id: item.id } },
    );

    return this.toItemDto({
      item: updatedItem,
      virtualPath,
      accessLevel: 'READ_WRITE',
      workspaceId: principal.workspaceId,
    });
  }

  async renameItem({
    path,
    newName,
    principal,
  }: {
    path: string;
    newName: string;
    principal: DriveAccessPrincipal;
  }): Promise<DriveItemDTO> {
    assertValidDriveItemName(newName);

    const resolvedLocation = await this.driveAccessService.assertCanAccess({
      path,
      principal,
      requiredAccessLevel: 'READ_WRITE',
    });

    if (
      !isDefined(resolvedLocation.item) ||
      !isDefined(resolvedLocation.space)
    ) {
      throw driveNotFoundException();
    }

    await this.assertSiblingNameIsFree({
      workspaceId: principal.workspaceId,
      spaceId: resolvedLocation.space.id,
      parentId: resolvedLocation.item.parentId,
      name: newName,
      ignoreItemId: resolvedLocation.item.id,
    });

    await this.driveItemRepository.update(
      principal.workspaceId,
      { id: resolvedLocation.item.id },
      {
        name: newName,
        updatedByUserWorkspaceId: principal.userWorkspaceId,
      },
    );

    const { parentPath } = splitDriveLeafPath(path);

    return this.statItem({
      path: `${parentPath}/${newName}`.replace('//', '/'),
      principal,
    });
  }

  async moveItem({
    path,
    destinationPath,
    principal,
  }: {
    path: string;
    destinationPath: string;
    principal: DriveAccessPrincipal;
  }): Promise<DriveItemDTO> {
    const sourceLocation = await this.driveAccessService.assertCanAccess({
      path,
      principal,
      requiredAccessLevel: 'READ_WRITE',
    });

    if (!isDefined(sourceLocation.item) || !isDefined(sourceLocation.space)) {
      throw driveNotFoundException();
    }

    const { parentPath, name } = splitDriveLeafPath(destinationPath);

    assertValidDriveItemName(name);

    const destinationParent = await this.driveAccessService.assertCanAccess({
      path: parentPath,
      principal,
      requiredAccessLevel: 'READ_WRITE',
    });

    this.assertParentIsDirectory(destinationParent);

    if (destinationParent.space?.id !== sourceLocation.space.id) {
      throw new DriveException(
        'Cannot move items between spaces',
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    await this.assertSiblingNameIsFree({
      workspaceId: principal.workspaceId,
      spaceId: sourceLocation.space.id,
      parentId: destinationParent.item?.id ?? null,
      name,
      ignoreItemId: sourceLocation.item.id,
    });

    await this.driveItemRepository.update(
      principal.workspaceId,
      { id: sourceLocation.item.id },
      {
        parentId: destinationParent.item?.id ?? null,
        name,
        updatedByUserWorkspaceId: principal.userWorkspaceId,
      },
    );

    return this.statItem({ path: destinationPath, principal });
  }

  async deleteItem({
    path,
    principal,
  }: {
    path: string;
    principal: DriveAccessPrincipal;
  }): Promise<boolean> {
    const resolvedLocation = await this.driveAccessService.assertCanAccess({
      path,
      principal,
      requiredAccessLevel: 'READ_WRITE',
    });

    if (!isDefined(resolvedLocation.item)) {
      throw driveNotFoundException();
    }

    const descendantIds = await this.collectDescendantIds({
      workspaceId: principal.workspaceId,
      itemId: resolvedLocation.item.id,
    });

    const descendants = await this.driveItemRepository.find(
      principal.workspaceId,
      {
        where: { id: In(descendantIds) },
      },
    );

    for (const descendant of descendants) {
      if (isDefined(descendant.fileId)) {
        await this.fileStorageService.deleteByFileId({
          workspaceId: principal.workspaceId,
          fileId: descendant.fileId,
          fileFolder: FileFolder.Drive,
        });
      }

      await this.driveItemRepository.softDelete(principal.workspaceId, {
        id: descendant.id,
      });
    }

    return true;
  }

  async shareItem({
    path,
    recipientUserWorkspaceId,
    accessLevel,
    principal,
  }: {
    path: string;
    recipientUserWorkspaceId: string;
    accessLevel: DriveAccessLevel;
    principal: DriveAccessPrincipal;
  }): Promise<DriveItemShareDTO> {
    const resolvedLocation = await this.driveAccessService.assertCanAccess({
      path,
      principal,
      requiredAccessLevel: 'READ_WRITE',
    });

    if (
      !isDefined(resolvedLocation.space) ||
      resolvedLocation.space.kind !== 'PERSONAL' ||
      resolvedLocation.space.ownerUserWorkspaceId !== principal.userWorkspaceId
    ) {
      throw new DriveException(
        'Only the owner can share personal files',
        DriveExceptionCode.FORBIDDEN,
      );
    }

    if (!isDefined(resolvedLocation.item)) {
      throw driveNotFoundException();
    }

    if (recipientUserWorkspaceId === principal.userWorkspaceId) {
      throw new DriveException(
        'Cannot share a file with yourself',
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    const existingShare = await this.driveItemShareRepository.findOne(
      principal.workspaceId,
      {
        where: {
          itemId: resolvedLocation.item.id,
          userWorkspaceId: recipientUserWorkspaceId,
        },
      },
    );

    if (isDefined(existingShare)) {
      await this.driveItemShareRepository.update(
        principal.workspaceId,
        { id: existingShare.id },
        { accessLevel },
      );

      const updatedShare = await this.driveItemShareRepository.findOneOrFail(
        principal.workspaceId,
        { where: { id: existingShare.id } },
      );

      return this.toShareDto(updatedShare);
    }

    const share = await this.driveItemShareRepository.insertAndReturnOne(
      principal.workspaceId,
      {
        itemId: resolvedLocation.item.id,
        userWorkspaceId: recipientUserWorkspaceId,
        accessLevel,
      },
    );

    return this.toShareDto(share);
  }

  async unshareItem({
    path,
    recipientUserWorkspaceId,
    principal,
  }: {
    path: string;
    recipientUserWorkspaceId: string;
    principal: DriveAccessPrincipal;
  }): Promise<boolean> {
    const resolvedLocation = await this.driveAccessService.assertCanAccess({
      path,
      principal,
      requiredAccessLevel: 'READ_WRITE',
    });

    if (
      !isDefined(resolvedLocation.space) ||
      resolvedLocation.space.kind !== 'PERSONAL' ||
      resolvedLocation.space.ownerUserWorkspaceId !== principal.userWorkspaceId
    ) {
      throw new DriveException(
        'Only the owner can unshare personal files',
        DriveExceptionCode.FORBIDDEN,
      );
    }

    if (!isDefined(resolvedLocation.item)) {
      throw driveNotFoundException();
    }

    await this.driveItemShareRepository.delete(principal.workspaceId, {
      itemId: resolvedLocation.item.id,
      userWorkspaceId: recipientUserWorkspaceId,
    });

    return true;
  }

  async listItemShares({
    path,
    principal,
  }: {
    path: string;
    principal: DriveAccessPrincipal;
  }): Promise<DriveItemShareDTO[]> {
    const resolvedLocation = await this.driveAccessService.assertCanAccess({
      path,
      principal,
      requiredAccessLevel: 'READ_WRITE',
    });

    if (
      !isDefined(resolvedLocation.space) ||
      resolvedLocation.space.kind !== 'PERSONAL' ||
      resolvedLocation.space.ownerUserWorkspaceId !==
        principal.userWorkspaceId ||
      !isDefined(resolvedLocation.item)
    ) {
      throw driveNotFoundException();
    }

    const shares = await this.driveItemShareRepository.find(
      principal.workspaceId,
      {
        where: { itemId: resolvedLocation.item.id },
      },
    );

    return shares.map((share) => this.toShareDto(share));
  }

  async publishBytes({
    path,
    sourceFile,
    principal,
  }: {
    path: string;
    sourceFile: Buffer;
    principal: DriveAccessPrincipal;
  }): Promise<DriveItemDTO> {
    const { parentPath, name } = splitDriveLeafPath(path);

    assertValidDriveItemName(name);

    const parentLocation = await this.driveAccessService.assertCanAccess({
      path: parentPath,
      principal,
      requiredAccessLevel: 'READ_WRITE',
    });

    this.assertParentIsDirectory(parentLocation);

    return this.persistFileBytes({
      path,
      name,
      parentLocation,
      principal,
      sourceFile,
    });
  }

  private async persistFileBytes({
    path,
    name,
    parentLocation,
    principal,
    sourceFile,
  }: {
    path: string;
    name: string;
    parentLocation: DriveResolvedLocation;
    principal: DriveAccessPrincipal;
    sourceFile: Buffer;
  }): Promise<DriveItemDTO> {
    const existingItem = await this.findSibling({
      workspaceId: principal.workspaceId,
      spaceId: parentLocation.space?.id as string,
      parentId: parentLocation.item?.id ?? null,
      name,
    });

    if (isDefined(existingItem) && existingItem.kind === 'FOLDER') {
      throw new DriveException(
        'A folder with that name already exists',
        DriveExceptionCode.CONFLICT,
      );
    }

    const fileId = existingItem?.fileId ?? v4();
    const resourcePath = this.buildFileResourcePath({
      pathPrefix: parentLocation.space?.pathPrefix as string,
      fileId,
      filename: name,
    });

    const file = await this.fileStorageService.writeFile({
      sourceFile,
      fileFolder: FileFolder.Drive,
      applicationUniversalIdentifier:
        TWENTY_STANDARD_APPLICATION.universalIdentifier,
      workspaceId: principal.workspaceId,
      resourcePath,
      fileId,
      settings: {
        isTemporaryFile: false,
        toDelete: false,
      },
    });

    const item = isDefined(existingItem)
      ? await this.updateExistingFileItem({
          workspaceId: principal.workspaceId,
          item: existingItem,
          file,
          principal,
        })
      : await this.driveItemRepository.insertAndReturnOne(
          principal.workspaceId,
          {
            id: fileId,
            spaceId: parentLocation.space?.id,
            parentId: parentLocation.item?.id ?? null,
            name,
            kind: 'FILE',
            fileId: file.id,
            mimeType: file.mimeType,
            size: String(file.size),
            createdByUserWorkspaceId: principal.userWorkspaceId,
            updatedByUserWorkspaceId: principal.userWorkspaceId,
          },
        );

    return this.toItemDto({
      item,
      virtualPath: path,
      accessLevel: 'READ_WRITE',
      workspaceId: principal.workspaceId,
    });
  }

  private async resolveDriveFilePath({
    path,
    fileId,
    principal,
  }: {
    path?: string;
    fileId?: string;
    principal: DriveAccessPrincipal;
  }): Promise<string> {
    if (isNonEmptyString(path)) {
      return path;
    }

    if (!isNonEmptyString(fileId)) {
      throw new DriveException(
        'read_drive_file requires path (the virtualPath from list_drive_items, e.g. /personal/notes.md). PDFs, images, and Office files cannot be read with this tool — use code_interpreter with drive.pull(virtual_path, dest_path).',
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    const itemById = await this.driveItemRepository.findOne(
      principal.workspaceId,
      {
        where: { id: fileId },
      },
    );

    const driveItem =
      itemById ??
      (await this.driveItemRepository.findOne(principal.workspaceId, {
        where: { fileId },
      }));

    if (!isDefined(driveItem)) {
      throw new DriveException(
        'read_drive_file needs a Drive virtual path, not a chat fileId. Call list_drive_items to get virtualPath. For PDFs and images use code_interpreter with drive.pull.',
        DriveExceptionCode.BAD_REQUEST,
      );
    }

    return this.buildVirtualPathForItem({
      item: driveItem,
      workspaceId: principal.workspaceId,
    });
  }

  private async getUploadedFileItemOrThrow({
    path,
    principal,
    requiredAccessLevel,
  }: {
    path: string;
    principal: DriveAccessPrincipal;
    requiredAccessLevel: DriveAccessLevel;
  }): Promise<DriveItemEntity> {
    const resolvedLocation = await this.driveAccessService.assertCanAccess({
      path,
      principal,
      requiredAccessLevel,
    });

    if (
      !isDefined(resolvedLocation.item) ||
      resolvedLocation.item.kind !== 'FILE' ||
      !isDefined(resolvedLocation.item.fileId)
    ) {
      throw driveNotFoundException();
    }

    if (
      !(await this.isUploadedFile(resolvedLocation.item, principal.workspaceId))
    ) {
      throw driveNotFoundException();
    }

    return resolvedLocation.item;
  }

  private async isUploadedFile(
    item: DriveItemEntity,
    workspaceId: string,
  ): Promise<boolean> {
    if (!isDefined(item.fileId)) {
      return false;
    }

    const file = await this.fileRepository.findOne(workspaceId, {
      where: { id: item.fileId, status: FILE_STATUS.UPLOADED },
    });

    return isDefined(file);
  }

  private assertParentIsDirectory(parentLocation: DriveResolvedLocation): void {
    if (!isDefined(parentLocation.space)) {
      throw driveNotFoundException();
    }

    if (
      isDefined(parentLocation.item) &&
      parentLocation.item.kind !== 'FOLDER'
    ) {
      throw new DriveException(
        'Parent path is not a folder',
        DriveExceptionCode.BAD_REQUEST,
      );
    }
  }

  private async findSibling({
    workspaceId,
    spaceId,
    parentId,
    name,
  }: {
    workspaceId: string;
    spaceId: string;
    parentId: string | null;
    name: string;
  }): Promise<DriveItemEntity | null> {
    return this.driveItemRepository.findOne(workspaceId, {
      where: {
        spaceId,
        parentId: isDefined(parentId) ? parentId : IsNull(),
        name,
      },
    });
  }

  private async assertSiblingNameIsFree({
    workspaceId,
    spaceId,
    parentId,
    name,
    ignoreItemId,
  }: {
    workspaceId: string;
    spaceId: string;
    parentId: string | null;
    name: string;
    ignoreItemId?: string;
  }): Promise<void> {
    const existingItem = await this.findSibling({
      workspaceId,
      spaceId,
      parentId,
      name,
    });

    if (isDefined(existingItem) && existingItem.id !== ignoreItemId) {
      throw new DriveException(
        'A file or folder with that name already exists',
        DriveExceptionCode.CONFLICT,
      );
    }
  }

  private buildFileResourcePath({
    pathPrefix,
    fileId,
    filename,
  }: {
    pathPrefix: string;
    fileId: string;
    filename: string;
  }): string {
    const { ext } = buildFileInfo(filename);
    const extension = isNonEmptyString(ext) ? `.${ext}` : '.bin';

    return `${pathPrefix}/${fileId}${extension}`;
  }

  private async updateExistingFileItem({
    workspaceId,
    item,
    file,
    principal,
  }: {
    workspaceId: string;
    item: DriveItemEntity;
    file: FileEntity;
    principal: DriveAccessPrincipal;
  }): Promise<DriveItemEntity> {
    await this.driveItemRepository.update(
      workspaceId,
      { id: item.id },
      {
        fileId: file.id,
        mimeType: file.mimeType,
        size: String(file.size),
        updatedByUserWorkspaceId: principal.userWorkspaceId,
      },
    );

    return this.driveItemRepository.findOneOrFail(workspaceId, {
      where: { id: item.id },
    });
  }

  private async collectDescendantIds({
    workspaceId,
    itemId,
  }: {
    workspaceId: string;
    itemId: string;
  }): Promise<string[]> {
    const children = await this.driveItemRepository.find(workspaceId, {
      where: { parentId: itemId },
    });

    const descendantIds = [itemId];

    for (const child of children) {
      descendantIds.push(
        ...(await this.collectDescendantIds({
          workspaceId,
          itemId: child.id,
        })),
      );
    }

    return descendantIds;
  }

  private async buildVirtualPathForItem({
    item,
    workspaceId,
  }: {
    item: DriveItemEntity;
    workspaceId: string;
  }): Promise<string> {
    const names: string[] = [item.name];
    let parentId = item.parentId;

    while (isDefined(parentId)) {
      const parent = await this.driveItemRepository.findOne(workspaceId, {
        where: { id: parentId },
      });

      if (!isDefined(parent)) {
        break;
      }

      names.unshift(parent.name);
      parentId = parent.parentId;
    }

    const space = await this.driveSpaceRepository.findOneOrFail(workspaceId, {
      where: { id: item.spaceId },
    });

    if (space.kind === 'PERSONAL') {
      return `/personal/${names.join('/')}`;
    }

    return `/spaces/${space.slug}/${names.join('/')}`;
  }

  private async toItemDto({
    item,
    virtualPath,
    accessLevel,
    workspaceId,
  }: {
    item: DriveItemEntity;
    virtualPath: string;
    accessLevel: DriveAccessLevel;
    workspaceId: string;
  }): Promise<DriveItemDTO> {
    let downloadUrl: string | null = null;

    if (
      item.kind === 'FILE' &&
      isDefined(item.fileId) &&
      (await this.isUploadedFile(item, workspaceId))
    ) {
      downloadUrl = await this.fileUrlService.signFileByIdUrl({
        fileId: item.fileId,
        workspaceId,
        fileFolder: FileFolder.Drive,
      });
    }

    return {
      id: item.id,
      name: item.name,
      kind: item.kind,
      virtualPath,
      accessLevel,
      mimeType: item.mimeType,
      size: isDefined(item.size) ? Number(item.size) : null,
      downloadUrl,
      parentId: item.parentId,
      spaceId: item.spaceId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private toShareDto(share: DriveItemShareEntity): DriveItemShareDTO {
    return {
      id: share.id,
      itemId: share.itemId,
      userWorkspaceId: share.userWorkspaceId,
      accessLevel: share.accessLevel,
      createdAt: share.createdAt,
    };
  }
}
