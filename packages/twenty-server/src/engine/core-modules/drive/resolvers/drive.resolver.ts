import { UseFilters, UseGuards, UsePipes } from '@nestjs/common';
import { Args, Mutation, Query } from '@nestjs/graphql';

import { PermissionFlagType } from 'twenty-shared/constants';
import { type DriveAccessLevel } from 'twenty-shared/types';

import { MetadataResolver } from 'src/engine/api/graphql/graphql-config/decorators/metadata-resolver.decorator';
import { UUIDScalarType } from 'src/engine/api/graphql/workspace-schema-builder/graphql-types/scalars';
import { DriveExceptionFilter } from 'src/engine/core-modules/drive/drive-exception.filter';
import { DriveAccessLevelEnum } from 'src/engine/core-modules/drive/drive-graphql-enums';
import { DriveFileContentDTO } from 'src/engine/core-modules/drive/dtos/drive-file-content.dto';
import { DriveItemDTO } from 'src/engine/core-modules/drive/dtos/drive-item.dto';
import { DriveItemShareDTO } from 'src/engine/core-modules/drive/dtos/drive-item-share.dto';
import { DriveSpaceDTO } from 'src/engine/core-modules/drive/dtos/drive-space.dto';
import { DriveSpaceGrantDTO } from 'src/engine/core-modules/drive/dtos/drive-space-grant.dto';
import { UpsertDriveSpaceGrantInput } from 'src/engine/core-modules/drive/dtos/upsert-drive-space-grant.input';
import { DriveService } from 'src/engine/core-modules/drive/services/drive.service';
import { PreventNestToAutoLogGraphqlErrorsFilter } from 'src/engine/core-modules/graphql/filters/prevent-nest-to-auto-log-graphql-errors.filter';
import { ResolverValidationPipe } from 'src/engine/core-modules/graphql/pipes/resolver-validation.pipe';
import { FileUploadTargetDTO } from 'src/engine/core-modules/file/file-upload/dtos/file-upload-target.dto';
import { WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';
import { AuthUserWorkspaceId } from 'src/engine/decorators/auth/auth-user-workspace-id.decorator';
import { AuthWorkspace } from 'src/engine/decorators/auth/auth-workspace.decorator';
import { NoPermissionGuard } from 'src/engine/guards/no-permission.guard';
import { SettingsPermissionGuard } from 'src/engine/guards/settings-permission.guard';
import { WorkspaceAuthGuard } from 'src/engine/guards/workspace-auth.guard';

@UseGuards(WorkspaceAuthGuard, NoPermissionGuard)
@UsePipes(ResolverValidationPipe)
@UseFilters(DriveExceptionFilter, PreventNestToAutoLogGraphqlErrorsFilter)
@MetadataResolver()
export class DriveResolver {
  constructor(private readonly driveService: DriveService) {}

  @Query(() => [DriveSpaceDTO])
  async listDriveSpaces(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
  ): Promise<DriveSpaceDTO[]> {
    return this.driveService.listSpaces({
      workspaceId: workspace.id,
      userWorkspaceId,
    });
  }

  @Query(() => [DriveSpaceDTO])
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.ROLES))
  async listOrganisationDriveSpaces(
    @AuthWorkspace() workspace: WorkspaceEntity,
  ): Promise<DriveSpaceDTO[]> {
    const spaces = await this.driveService.listOrganisationSpaces(workspace.id);

    return spaces.map((space) => ({
      id: space.id,
      listKind: 'ORGANISATION' as const,
      kind: space.kind,
      name: space.name,
      slug: space.slug,
      icon: space.icon,
      virtualPath: `/spaces/${space.slug}`,
      accessLevel: 'READ_WRITE' as const,
      ownerUserWorkspaceId: null,
    }));
  }

  @Query(() => [DriveSpaceGrantDTO])
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.ROLES))
  async listDriveSpaceGrants(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('roleId', { type: () => UUIDScalarType }) roleId: string,
  ): Promise<DriveSpaceGrantDTO[]> {
    return this.driveService.listSpaceGrantsForRole({
      workspaceId: workspace.id,
      roleId,
    });
  }

  @Query(() => [DriveItemDTO])
  async listDriveItems(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('path', { type: () => String }) path: string,
  ): Promise<DriveItemDTO[]> {
    return this.driveService.listItems({
      path,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Query(() => DriveItemDTO)
  async statDriveItem(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('path', { type: () => String }) path: string,
  ): Promise<DriveItemDTO> {
    return this.driveService.statItem({
      path,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Query(() => DriveFileContentDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.DOWNLOAD_FILE))
  async readDriveFile(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('path', { type: () => String }) path: string,
  ): Promise<DriveFileContentDTO> {
    return this.driveService.readFile({
      path,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Query(() => String)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.DOWNLOAD_FILE))
  async getDriveDownloadUrl(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('path', { type: () => String }) path: string,
  ): Promise<string> {
    return this.driveService.getDownloadUrl({
      path,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Query(() => [DriveItemShareDTO])
  async listDriveItemShares(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('path', { type: () => String }) path: string,
  ): Promise<DriveItemShareDTO[]> {
    return this.driveService.listItemShares({
      path,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Mutation(() => DriveItemDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.UPLOAD_FILE))
  async createDriveFolder(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('path', { type: () => String }) path: string,
  ): Promise<DriveItemDTO> {
    return this.driveService.createFolder({
      path,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Mutation(() => DriveItemDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.UPLOAD_FILE))
  async writeDriveFile(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('path', { type: () => String }) path: string,
    @Args('content', { type: () => String }) content: string,
  ): Promise<DriveItemDTO> {
    return this.driveService.writeFile({
      path,
      content,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Mutation(() => FileUploadTargetDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.UPLOAD_FILE))
  async createDriveFileUpload(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('path', { type: () => String }) path: string,
    @Args('size', { type: () => Number }) size: number,
  ): Promise<FileUploadTargetDTO> {
    return this.driveService.createFileUpload({
      path,
      size,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Mutation(() => DriveItemDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.UPLOAD_FILE))
  async completeDriveFileUpload(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('fileId', { type: () => UUIDScalarType }) fileId: string,
  ): Promise<DriveItemDTO> {
    return this.driveService.completeFileUpload({
      fileId,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Mutation(() => DriveItemDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.UPLOAD_FILE))
  async renameDriveItem(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('path', { type: () => String }) path: string,
    @Args('newName', { type: () => String }) newName: string,
  ): Promise<DriveItemDTO> {
    return this.driveService.renameItem({
      path,
      newName,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Mutation(() => DriveItemDTO)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.UPLOAD_FILE))
  async moveDriveItem(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('path', { type: () => String }) path: string,
    @Args('destinationPath', { type: () => String }) destinationPath: string,
  ): Promise<DriveItemDTO> {
    return this.driveService.moveItem({
      path,
      destinationPath,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Mutation(() => Boolean)
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.UPLOAD_FILE))
  async deleteDriveItem(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('path', { type: () => String }) path: string,
  ): Promise<boolean> {
    return this.driveService.deleteItem({
      path,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Mutation(() => DriveItemShareDTO)
  async shareDriveItem(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('path', { type: () => String }) path: string,
    @Args('userWorkspaceId', { type: () => UUIDScalarType })
    recipientUserWorkspaceId: string,
    @Args('accessLevel', { type: () => DriveAccessLevelEnum })
    accessLevel: DriveAccessLevel,
  ): Promise<DriveItemShareDTO> {
    return this.driveService.shareItem({
      path,
      recipientUserWorkspaceId,
      accessLevel,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Mutation(() => Boolean)
  async unshareDriveItem(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @AuthUserWorkspaceId() userWorkspaceId: string,
    @Args('path', { type: () => String }) path: string,
    @Args('userWorkspaceId', { type: () => UUIDScalarType })
    recipientUserWorkspaceId: string,
  ): Promise<boolean> {
    return this.driveService.unshareItem({
      path,
      recipientUserWorkspaceId,
      principal: { workspaceId: workspace.id, userWorkspaceId },
    });
  }

  @Mutation(() => [DriveSpaceGrantDTO])
  @UseGuards(SettingsPermissionGuard(PermissionFlagType.ROLES))
  async upsertDriveSpaceGrants(
    @AuthWorkspace() workspace: WorkspaceEntity,
    @Args('roleId', { type: () => UUIDScalarType }) roleId: string,
    @Args('grants', { type: () => [UpsertDriveSpaceGrantInput] })
    grants: UpsertDriveSpaceGrantInput[],
  ): Promise<DriveSpaceGrantDTO[]> {
    return this.driveService.upsertSpaceGrantsForRole({
      workspaceId: workspace.id,
      roleId,
      grants,
    });
  }
}
