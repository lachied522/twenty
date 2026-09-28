import { Injectable } from '@nestjs/common';

import { type DriveAccessLevel } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { In, IsNull } from 'typeorm';

import { DriveItemEntity } from 'src/engine/core-modules/drive/entities/drive-item.entity';
import { DriveItemShareEntity } from 'src/engine/core-modules/drive/entities/drive-item-share.entity';
import { DriveSpaceEntity } from 'src/engine/core-modules/drive/entities/drive-space.entity';
import { DriveSpaceGrantEntity } from 'src/engine/core-modules/drive/entities/drive-space-grant.entity';
import {
  DriveException,
  DriveExceptionCode,
  driveNotFoundException,
} from 'src/engine/core-modules/drive/drive.exception';
import {
  isDriveAccessAtLeast,
  maxDriveAccessLevel,
} from 'src/engine/core-modules/drive/utils/drive-access-level.util';
import {
  joinDriveVirtualPath,
  parseDriveVirtualPath,
  type ParsedDriveVirtualPath,
} from 'src/engine/core-modules/drive/utils/parse-drive-virtual-path.util';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';

export type DriveAccessPrincipal = {
  workspaceId: string;
  userWorkspaceId: string;
};

export type DriveResolvedLocation = {
  parsedPath: ParsedDriveVirtualPath;
  virtualPath: string;
  space: DriveSpaceEntity | null;
  item: DriveItemEntity | null;
  parentItem: DriveItemEntity | null;
  sharedRootItem: DriveItemEntity | null;
  accessLevel: DriveAccessLevel | null;
};

@Injectable()
export class DriveAccessService {
  constructor(
    @InjectWorkspaceScopedRepository(DriveSpaceEntity)
    private readonly driveSpaceRepository: WorkspaceScopedRepository<DriveSpaceEntity>,
    @InjectWorkspaceScopedRepository(DriveItemEntity)
    private readonly driveItemRepository: WorkspaceScopedRepository<DriveItemEntity>,
    @InjectWorkspaceScopedRepository(DriveSpaceGrantEntity)
    private readonly driveSpaceGrantRepository: WorkspaceScopedRepository<DriveSpaceGrantEntity>,
    @InjectWorkspaceScopedRepository(DriveItemShareEntity)
    private readonly driveItemShareRepository: WorkspaceScopedRepository<DriveItemShareEntity>,
    private readonly userRoleService: UserRoleService,
  ) {}

  async resolve({
    path,
    principal,
  }: {
    path: string;
    principal: DriveAccessPrincipal;
  }): Promise<DriveResolvedLocation> {
    const parsedPath = parseDriveVirtualPath(path);
    const virtualPath = this.normalizeVirtualPath(parsedPath);

    if (parsedPath.prefix === 'shared-root') {
      return {
        parsedPath,
        virtualPath,
        space: null,
        item: null,
        parentItem: null,
        sharedRootItem: null,
        accessLevel: 'READ',
      };
    }

    if (parsedPath.prefix === 'personal') {
      return this.resolvePersonalPath({
        parsedPath,
        virtualPath,
        principal,
      });
    }

    if (parsedPath.prefix === 'organisation') {
      return this.resolveOrganisationPath({
        parsedPath,
        virtualPath,
        principal,
      });
    }

    return this.resolveSharedPath({
      parsedPath,
      virtualPath,
      principal,
    });
  }

  async assertCanAccess({
    path,
    principal,
    requiredAccessLevel,
  }: {
    path: string;
    principal: DriveAccessPrincipal;
    requiredAccessLevel: DriveAccessLevel;
  }): Promise<DriveResolvedLocation> {
    const resolvedLocation = await this.resolve({ path, principal });

    if (!isDefined(resolvedLocation.accessLevel)) {
      throw driveNotFoundException();
    }

    if (
      !isDriveAccessAtLeast({
        actualAccessLevel: resolvedLocation.accessLevel,
        requiredAccessLevel,
      })
    ) {
      throw new DriveException(
        'You do not have permission to do that',
        DriveExceptionCode.FORBIDDEN,
      );
    }

    if (
      parsedPathHasRestSegments(resolvedLocation.parsedPath) &&
      !isDefined(resolvedLocation.item)
    ) {
      throw driveNotFoundException();
    }

    return resolvedLocation;
  }

  async listVisibleOrganisationSpaces({
    principal,
  }: {
    principal: DriveAccessPrincipal;
  }): Promise<
    Array<{ space: DriveSpaceEntity; accessLevel: DriveAccessLevel }>
  > {
    const organisationSpaces = await this.driveSpaceRepository.find(
      principal.workspaceId,
      {
        where: { kind: 'ORGANISATION' },
        order: { name: 'ASC' },
      },
    );

    const visibleSpaces: Array<{
      space: DriveSpaceEntity;
      accessLevel: DriveAccessLevel;
    }> = [];

    for (const space of organisationSpaces) {
      const accessLevel = await this.resolveOrganisationSpaceAccessLevel({
        space,
        principal,
      });

      if (isDefined(accessLevel)) {
        visibleSpaces.push({ space, accessLevel });
      }
    }

    return visibleSpaces;
  }

  async findPersonalSpace({
    principal,
  }: {
    principal: DriveAccessPrincipal;
  }): Promise<DriveSpaceEntity | null> {
    return this.driveSpaceRepository.findOne(principal.workspaceId, {
      where: {
        kind: 'PERSONAL',
        ownerUserWorkspaceId: principal.userWorkspaceId,
      },
    });
  }

  async listSharesForPrincipal({
    principal,
  }: {
    principal: DriveAccessPrincipal;
  }): Promise<DriveItemShareEntity[]> {
    return this.driveItemShareRepository.find(principal.workspaceId, {
      where: { userWorkspaceId: principal.userWorkspaceId },
      relations: { item: true },
      order: { createdAt: 'DESC' },
    });
  }

  async walkItemPath({
    workspaceId,
    spaceId,
    restSegments,
    startingItem,
  }: {
    workspaceId: string;
    spaceId: string;
    restSegments: string[];
    startingItem?: DriveItemEntity | null;
  }): Promise<{
    item: DriveItemEntity | null;
    parentItem: DriveItemEntity | null;
  }> {
    if (restSegments.length === 0) {
      return {
        item: startingItem ?? null,
        parentItem: isDefined(startingItem)
          ? await this.findItemById({
              workspaceId,
              itemId: startingItem.parentId,
            })
          : null,
      };
    }

    let parentItem: DriveItemEntity | null = startingItem ?? null;
    let currentItem: DriveItemEntity | null = startingItem ?? null;

    for (const segment of restSegments) {
      if (isDefined(currentItem) && currentItem.kind !== 'FOLDER') {
        return { item: null, parentItem: currentItem };
      }

      const childItem = await this.driveItemRepository.findOne(workspaceId, {
        where: {
          spaceId,
          parentId: isDefined(currentItem) ? currentItem.id : IsNull(),
          name: segment,
        },
      });

      if (!isDefined(childItem)) {
        return { item: null, parentItem: currentItem };
      }

      parentItem = currentItem;
      currentItem = childItem;
    }

    return { item: currentItem, parentItem };
  }

  private async resolvePersonalPath({
    parsedPath,
    virtualPath,
    principal,
  }: {
    parsedPath: Extract<ParsedDriveVirtualPath, { prefix: 'personal' }>;
    virtualPath: string;
    principal: DriveAccessPrincipal;
  }): Promise<DriveResolvedLocation> {
    const space = await this.findPersonalSpace({ principal });

    if (!isDefined(space)) {
      return this.hiddenLocation({ parsedPath, virtualPath });
    }

    const { item, parentItem } = await this.walkItemPath({
      workspaceId: principal.workspaceId,
      spaceId: space.id,
      restSegments: parsedPath.restSegments,
    });

    return {
      parsedPath,
      virtualPath,
      space,
      item,
      parentItem,
      sharedRootItem: null,
      accessLevel: 'READ_WRITE',
    };
  }

  private async resolveOrganisationPath({
    parsedPath,
    virtualPath,
    principal,
  }: {
    parsedPath: Extract<ParsedDriveVirtualPath, { prefix: 'organisation' }>;
    virtualPath: string;
    principal: DriveAccessPrincipal;
  }): Promise<DriveResolvedLocation> {
    const space = await this.driveSpaceRepository.findOne(
      principal.workspaceId,
      {
        where: {
          kind: 'ORGANISATION',
          slug: parsedPath.slug,
        },
      },
    );

    if (!isDefined(space)) {
      return this.hiddenLocation({ parsedPath, virtualPath });
    }

    const accessLevel = await this.resolveOrganisationSpaceAccessLevel({
      space,
      principal,
    });

    if (!isDefined(accessLevel)) {
      return this.hiddenLocation({ parsedPath, virtualPath });
    }

    const { item, parentItem } = await this.walkItemPath({
      workspaceId: principal.workspaceId,
      spaceId: space.id,
      restSegments: parsedPath.restSegments,
    });

    return {
      parsedPath,
      virtualPath,
      space,
      item,
      parentItem,
      sharedRootItem: null,
      accessLevel,
    };
  }

  private async resolveSharedPath({
    parsedPath,
    virtualPath,
    principal,
  }: {
    parsedPath: Extract<ParsedDriveVirtualPath, { prefix: 'shared' }>;
    virtualPath: string;
    principal: DriveAccessPrincipal;
  }): Promise<DriveResolvedLocation> {
    const share = await this.driveItemShareRepository.findOne(
      principal.workspaceId,
      {
        where: {
          itemId: parsedPath.itemId,
          userWorkspaceId: principal.userWorkspaceId,
        },
      },
    );

    if (!isDefined(share)) {
      return this.hiddenLocation({ parsedPath, virtualPath });
    }

    const sharedRootItem = await this.driveItemRepository.findOne(
      principal.workspaceId,
      {
        where: { id: share.itemId },
      },
    );

    if (!isDefined(sharedRootItem)) {
      return this.hiddenLocation({ parsedPath, virtualPath });
    }

    const space = await this.driveSpaceRepository.findOne(
      principal.workspaceId,
      {
        where: { id: sharedRootItem.spaceId },
      },
    );

    if (!isDefined(space) || space.kind !== 'PERSONAL') {
      return this.hiddenLocation({ parsedPath, virtualPath });
    }

    const { item, parentItem } = await this.walkItemPath({
      workspaceId: principal.workspaceId,
      spaceId: space.id,
      restSegments: parsedPath.restSegments,
      startingItem: sharedRootItem,
    });

    return {
      parsedPath,
      virtualPath,
      space,
      item,
      parentItem,
      sharedRootItem,
      accessLevel: share.accessLevel,
    };
  }

  private async resolveOrganisationSpaceAccessLevel({
    space,
    principal,
  }: {
    space: DriveSpaceEntity;
    principal: DriveAccessPrincipal;
  }): Promise<DriveAccessLevel | null> {
    const rolesByUserWorkspace =
      await this.userRoleService.getRolesByUserWorkspaces({
        userWorkspaceIds: [principal.userWorkspaceId],
        workspaceId: principal.workspaceId,
      });

    const roles = rolesByUserWorkspace.get(principal.userWorkspaceId) ?? [];
    const roleIds = roles.map((role) => role.id);

    const grants = await this.driveSpaceGrantRepository.find(
      principal.workspaceId,
      {
        where: [
          ...(roleIds.length > 0
            ? [
                {
                  spaceId: space.id,
                  principalType: 'ROLE' as const,
                  principalId: In(roleIds),
                },
              ]
            : []),
          {
            spaceId: space.id,
            principalType: 'WORKSPACE_MEMBER' as const,
            principalId: principal.userWorkspaceId,
          },
        ],
      },
    );

    return maxDriveAccessLevel(grants.map((grant) => grant.accessLevel));
  }

  private async findItemById({
    workspaceId,
    itemId,
  }: {
    workspaceId: string;
    itemId: string | null;
  }): Promise<DriveItemEntity | null> {
    if (!isDefined(itemId)) {
      return null;
    }

    return this.driveItemRepository.findOne(workspaceId, {
      where: { id: itemId },
    });
  }

  private hiddenLocation({
    parsedPath,
    virtualPath,
  }: {
    parsedPath: ParsedDriveVirtualPath;
    virtualPath: string;
  }): DriveResolvedLocation {
    return {
      parsedPath,
      virtualPath,
      space: null,
      item: null,
      parentItem: null,
      sharedRootItem: null,
      accessLevel: null,
    };
  }

  private normalizeVirtualPath(parsedPath: ParsedDriveVirtualPath): string {
    if (parsedPath.prefix === 'personal') {
      return joinDriveVirtualPath(['personal', ...parsedPath.restSegments]);
    }

    if (parsedPath.prefix === 'organisation') {
      return joinDriveVirtualPath([
        'spaces',
        parsedPath.slug,
        ...parsedPath.restSegments,
      ]);
    }

    if (parsedPath.prefix === 'shared-root') {
      return '/shared';
    }

    return joinDriveVirtualPath([
      'shared',
      parsedPath.itemId,
      ...parsedPath.restSegments,
    ]);
  }
}

const parsedPathHasRestSegments = (
  parsedPath: ParsedDriveVirtualPath,
): boolean => {
  if (parsedPath.prefix === 'shared-root') {
    return false;
  }

  if (parsedPath.prefix === 'shared') {
    return parsedPath.restSegments.length > 0;
  }

  return parsedPath.restSegments.length > 0;
};
