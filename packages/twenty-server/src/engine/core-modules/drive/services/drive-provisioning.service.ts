import { Injectable } from '@nestjs/common';

import { isDefined } from 'twenty-shared/utils';
import { type QueryRunner } from 'typeorm';

import { DRIVE_SEEDED_ORGANISATION_SPACES } from 'src/engine/core-modules/drive/drive.constants';
import { DriveSpaceEntity } from 'src/engine/core-modules/drive/entities/drive-space.entity';
import { DriveSpaceGrantEntity } from 'src/engine/core-modules/drive/entities/drive-space-grant.entity';
import { MEMBER_ROLE_LABEL } from 'src/engine/metadata-modules/permissions/constants/member-role-label.constants';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';
import { STANDARD_ROLE } from 'src/engine/workspace-manager/twenty-standard-application/constants/standard-role.constant';

@Injectable()
export class DriveProvisioningService {
  constructor(
    @InjectWorkspaceScopedRepository(DriveSpaceEntity)
    private readonly driveSpaceRepository: WorkspaceScopedRepository<DriveSpaceEntity>,
    @InjectWorkspaceScopedRepository(DriveSpaceGrantEntity)
    private readonly driveSpaceGrantRepository: WorkspaceScopedRepository<DriveSpaceGrantEntity>,
    @InjectWorkspaceScopedRepository(RoleEntity)
    private readonly roleRepository: WorkspaceScopedRepository<RoleEntity>,
  ) {}

  async seedOrganisationSpaces({
    workspaceId,
  }: {
    workspaceId: string;
  }): Promise<void> {
    const organisationSpaces: DriveSpaceEntity[] = [];

    for (const seededSpace of DRIVE_SEEDED_ORGANISATION_SPACES) {
      const existingSpace = await this.driveSpaceRepository.findOne(
        workspaceId,
        {
          where: {
            kind: 'ORGANISATION',
            slug: seededSpace.slug,
          },
        },
      );

      if (isDefined(existingSpace)) {
        organisationSpaces.push(existingSpace);
        continue;
      }

      organisationSpaces.push(
        await this.driveSpaceRepository.insertAndReturnOne(workspaceId, {
          kind: 'ORGANISATION',
          name: seededSpace.name,
          slug: seededSpace.slug,
          icon: seededSpace.icon,
          pathPrefix: `spaces/${seededSpace.slug}`,
          ownerUserWorkspaceId: null,
        }),
      );
    }

    const adminRole = await this.roleRepository.findOne(workspaceId, {
      where: {
        universalIdentifier: STANDARD_ROLE.admin.universalIdentifier,
      },
    });

    const memberRole = await this.roleRepository.findOne(workspaceId, {
      where: { label: MEMBER_ROLE_LABEL },
    });

    if (isDefined(adminRole)) {
      for (const space of organisationSpaces) {
        await this.ensureRoleGrant({
          workspaceId,
          spaceId: space.id,
          roleId: adminRole.id,
          accessLevel: 'READ_WRITE',
        });
      }
    }

    const generalSpace = organisationSpaces.find(
      (space) => space.slug === 'general',
    );

    if (isDefined(memberRole) && isDefined(generalSpace)) {
      await this.ensureRoleGrant({
        workspaceId,
        spaceId: generalSpace.id,
        roleId: memberRole.id,
        accessLevel: 'READ',
      });
    }
  }

  async createPersonalSpace({
    workspaceId,
    userWorkspaceId,
    queryRunner,
  }: {
    workspaceId: string;
    userWorkspaceId: string;
    queryRunner?: QueryRunner;
  }): Promise<DriveSpaceEntity> {
    const driveSpaceRepository = isDefined(queryRunner)
      ? this.driveSpaceRepository.withManager(queryRunner.manager)
      : this.driveSpaceRepository;

    const existingSpace = await driveSpaceRepository.findOne(workspaceId, {
      where: {
        kind: 'PERSONAL',
        ownerUserWorkspaceId: userWorkspaceId,
      },
    });

    if (isDefined(existingSpace)) {
      return existingSpace;
    }

    return driveSpaceRepository.insertAndReturnOne(workspaceId, {
      kind: 'PERSONAL',
      name: 'Personal',
      slug: `personal-${userWorkspaceId}`,
      icon: 'IconUser',
      pathPrefix: `personal/${userWorkspaceId}`,
      ownerUserWorkspaceId: userWorkspaceId,
    });
  }

  private async ensureRoleGrant({
    workspaceId,
    spaceId,
    roleId,
    accessLevel,
  }: {
    workspaceId: string;
    spaceId: string;
    roleId: string;
    accessLevel: 'READ' | 'READ_WRITE';
  }): Promise<void> {
    const existingGrant = await this.driveSpaceGrantRepository.findOne(
      workspaceId,
      {
        where: {
          spaceId,
          principalType: 'ROLE',
          principalId: roleId,
        },
      },
    );

    if (isDefined(existingGrant)) {
      return;
    }

    await this.driveSpaceGrantRepository.insertAndReturnOne(workspaceId, {
      spaceId,
      principalType: 'ROLE',
      principalId: roleId,
      accessLevel,
    });
  }
}
