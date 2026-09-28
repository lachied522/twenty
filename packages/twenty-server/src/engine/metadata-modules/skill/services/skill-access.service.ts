import { Injectable } from '@nestjs/common';

import { type DriveAccessLevel } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';
import { In } from 'typeorm';

import {
  isDriveAccessAtLeast,
  maxDriveAccessLevel,
} from 'src/engine/core-modules/drive/utils/drive-access-level.util';
import { type FlatSkill } from 'src/engine/metadata-modules/flat-skill/types/flat-skill.type';
import { SkillShareEntity } from 'src/engine/metadata-modules/skill/entities/skill-share.entity';
import {
  SkillException,
  SkillExceptionCode,
} from 'src/engine/metadata-modules/skill/skill.exception';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';

export type SkillAccessPrincipal = {
  workspaceId: string;
  userWorkspaceId: string;
  roleId?: string;
  hasAiSettings?: boolean;
};

@Injectable()
export class SkillAccessService {
  constructor(
    @InjectWorkspaceScopedRepository(SkillShareEntity)
    private readonly skillShareRepository: WorkspaceScopedRepository<SkillShareEntity>,
    private readonly userRoleService: UserRoleService,
  ) {}

  async resolveAccessLevel({
    skill,
    principal,
  }: {
    skill: Pick<
      FlatSkill,
      'id' | 'kind' | 'ownerUserWorkspaceId' | 'isActive' | 'isSystem'
    >;
    principal: SkillAccessPrincipal;
  }): Promise<DriveAccessLevel | null> {
    if (skill.kind === 'GIZMO') {
      return null;
    }

    if (skill.kind === 'SYSTEM' || skill.kind === 'WORKSPACE') {
      if (principal.hasAiSettings === true) {
        return 'READ_WRITE';
      }

      return skill.isActive ? 'READ' : null;
    }

    if (
      skill.kind === 'USER' &&
      skill.ownerUserWorkspaceId === principal.userWorkspaceId
    ) {
      return 'READ_WRITE';
    }

    const shareAccessLevel = await this.resolveShareAccessLevel({
      skillId: skill.id,
      principal,
    });

    return shareAccessLevel;
  }

  async filterVisibleSkills<
    TSkill extends Pick<
      FlatSkill,
      'id' | 'kind' | 'ownerUserWorkspaceId' | 'isActive' | 'isSystem'
    >,
  >({
    skills,
    principal,
    requiredAccessLevel = 'READ',
  }: {
    skills: TSkill[];
    principal: SkillAccessPrincipal;
    requiredAccessLevel?: DriveAccessLevel;
  }): Promise<TSkill[]> {
    const visibleSkills: TSkill[] = [];

    for (const skill of skills) {
      const accessLevel = await this.resolveAccessLevel({ skill, principal });

      if (
        isDefined(accessLevel) &&
        isDriveAccessAtLeast({
          actualAccessLevel: accessLevel,
          requiredAccessLevel,
        })
      ) {
        visibleSkills.push(skill);
      }
    }

    return visibleSkills;
  }

  async assertCanAccess({
    skill,
    principal,
    requiredAccessLevel,
  }: {
    skill: Pick<
      FlatSkill,
      'id' | 'kind' | 'ownerUserWorkspaceId' | 'isActive' | 'isSystem'
    >;
    principal: SkillAccessPrincipal;
    requiredAccessLevel: DriveAccessLevel;
  }): Promise<DriveAccessLevel> {
    const accessLevel = await this.resolveAccessLevel({ skill, principal });

    if (
      !isDefined(accessLevel) ||
      !isDriveAccessAtLeast({
        actualAccessLevel: accessLevel,
        requiredAccessLevel,
      })
    ) {
      throw new SkillException(
        'Skill not found',
        SkillExceptionCode.SKILL_NOT_FOUND,
      );
    }

    return accessLevel;
  }

  async assertIsOwner({
    skill,
    principal,
  }: {
    skill: Pick<FlatSkill, 'kind' | 'ownerUserWorkspaceId'>;
    principal: SkillAccessPrincipal;
  }): Promise<void> {
    if (
      skill.kind !== 'USER' ||
      skill.ownerUserWorkspaceId !== principal.userWorkspaceId
    ) {
      throw new SkillException(
        'Only the skill owner can share this skill',
        SkillExceptionCode.SKILL_FORBIDDEN,
      );
    }
  }

  async listSharesForSkill({
    workspaceId,
    skillId,
  }: {
    workspaceId: string;
    skillId: string;
  }): Promise<SkillShareEntity[]> {
    return this.skillShareRepository.find(workspaceId, {
      where: { skillId },
      order: { createdAt: 'ASC' },
    });
  }

  async upsertShare({
    workspaceId,
    skillId,
    principalType,
    principalId,
    accessLevel,
  }: {
    workspaceId: string;
    skillId: string;
    principalType: SkillShareEntity['principalType'];
    principalId: string;
    accessLevel: DriveAccessLevel;
  }): Promise<SkillShareEntity> {
    const existingShare = await this.skillShareRepository.findOne(workspaceId, {
      where: { skillId, principalType, principalId },
    });

    if (isDefined(existingShare)) {
      await this.skillShareRepository.update(
        workspaceId,
        { id: existingShare.id },
        { accessLevel },
      );

      return {
        ...existingShare,
        accessLevel,
        updatedAt: new Date(),
      };
    }

    return this.skillShareRepository.insertAndReturnOne(workspaceId, {
      skillId,
      principalType,
      principalId,
      accessLevel,
    });
  }

  async removeShare({
    workspaceId,
    skillId,
    principalType,
    principalId,
  }: {
    workspaceId: string;
    skillId: string;
    principalType: SkillShareEntity['principalType'];
    principalId: string;
  }): Promise<void> {
    await this.skillShareRepository.delete(workspaceId, {
      skillId,
      principalType,
      principalId,
    });
  }

  private async resolveShareAccessLevel({
    skillId,
    principal,
  }: {
    skillId: string;
    principal: SkillAccessPrincipal;
  }): Promise<DriveAccessLevel | null> {
    const rolesByUserWorkspace =
      await this.userRoleService.getRolesByUserWorkspaces({
        userWorkspaceIds: [principal.userWorkspaceId],
        workspaceId: principal.workspaceId,
      });
    const roles = rolesByUserWorkspace.get(principal.userWorkspaceId) ?? [];
    const roleIds = [
      ...new Set([
        ...roles.map((role) => role.id),
        ...(isDefined(principal.roleId) ? [principal.roleId] : []),
      ]),
    ];

    const shares = await this.skillShareRepository.find(principal.workspaceId, {
      where: [
        ...(roleIds.length > 0
          ? [
              {
                skillId,
                principalType: 'ROLE' as const,
                principalId: In(roleIds),
              },
            ]
          : []),
        {
          skillId,
          principalType: 'WORKSPACE_MEMBER' as const,
          principalId: principal.userWorkspaceId,
        },
      ],
    });

    return maxDriveAccessLevel(shares.map((share) => share.accessLevel));
  }
}
