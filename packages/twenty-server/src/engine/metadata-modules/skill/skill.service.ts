import { Injectable } from '@nestjs/common';

import { PermissionFlagType } from 'twenty-shared/constants';
import { type DriveAccessLevel } from 'twenty-shared/types';
import { isDefined } from 'twenty-shared/utils';

import { ApplicationService } from 'src/engine/core-modules/application/application.service';
import { WorkspaceManyOrAllFlatEntityMapsCacheService } from 'src/engine/metadata-modules/flat-entity/services/workspace-many-or-all-flat-entity-maps-cache.service';
import { findFlatEntityByIdInFlatEntityMapsOrThrow } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps-or-throw.util';
import { findFlatEntityByIdInFlatEntityMaps } from 'src/engine/metadata-modules/flat-entity/utils/find-flat-entity-by-id-in-flat-entity-maps.util';
import { type FlatSkill } from 'src/engine/metadata-modules/flat-skill/types/flat-skill.type';
import { fromCreateSkillInputToUniversalFlatSkillToCreate } from 'src/engine/metadata-modules/flat-skill/utils/from-create-skill-input-to-flat-skill-to-create.util';
import { fromDeleteSkillInputToFlatSkillOrThrow } from 'src/engine/metadata-modules/flat-skill/utils/from-delete-skill-input-to-flat-skill-or-throw.util';
import { fromFlatSkillToSkillDto } from 'src/engine/metadata-modules/flat-skill/utils/from-flat-skill-to-skill-dto.util';
import { fromUpdateSkillInputToFlatSkillToUpdateOrThrow } from 'src/engine/metadata-modules/flat-skill/utils/from-update-skill-input-to-flat-skill-to-update-or-throw.util';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';
import { type CreateSkillInput } from 'src/engine/metadata-modules/skill/dtos/create-skill.input';
import { type ShareSkillInput } from 'src/engine/metadata-modules/skill/dtos/share-skill.input';
import { type SkillDTO } from 'src/engine/metadata-modules/skill/dtos/skill.dto';
import { type SkillShareDTO } from 'src/engine/metadata-modules/skill/dtos/skill-share.dto';
import { type UnshareSkillInput } from 'src/engine/metadata-modules/skill/dtos/unshare-skill.input';
import { type UpdateSkillInput } from 'src/engine/metadata-modules/skill/dtos/update-skill.input';
import {
  type SkillAccessPrincipal,
  SkillAccessService,
} from 'src/engine/metadata-modules/skill/services/skill-access.service';
import {
  SkillException,
  SkillExceptionCode,
} from 'src/engine/metadata-modules/skill/skill.exception';
import { UserRoleService } from 'src/engine/metadata-modules/user-role/user-role.service';
import { WorkspaceMigrationBuilderException } from 'src/engine/workspace-manager/workspace-migration/exceptions/workspace-migration-builder-exception';
import { WorkspaceMigrationValidateBuildAndRunService } from 'src/engine/workspace-manager/workspace-migration/services/workspace-migration-validate-build-and-run-service';

export type SkillActorContext = {
  workspaceId: string;
  userWorkspaceId: string;
  roleId?: string;
};

@Injectable()
export class SkillService {
  constructor(
    private readonly workspaceMigrationValidateBuildAndRunService: WorkspaceMigrationValidateBuildAndRunService,
    private readonly workspaceManyOrAllFlatEntityMapsCacheService: WorkspaceManyOrAllFlatEntityMapsCacheService,
    private readonly applicationService: ApplicationService,
    private readonly skillAccessService: SkillAccessService,
    private readonly permissionsService: PermissionsService,
    private readonly userRoleService: UserRoleService,
  ) {}

  async findAll(workspaceId: string): Promise<SkillDTO[]> {
    const { flatSkillMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatSkillMaps'],
        },
      );

    return Object.values(flatSkillMaps.byUniversalIdentifier)
      .filter(isDefined)
      .sort((a, b) => a.label.localeCompare(b.label))
      .map(fromFlatSkillToSkillDto);
  }

  async findAllVisible(
    actor: SkillActorContext,
  ): Promise<SkillDTO[]> {
    const principal = await this.buildPrincipal(actor);
    const flatSkills = await this.loadAllFlatSkills(actor.workspaceId);
    const visibleSkills = await this.skillAccessService.filterVisibleSkills({
      skills: flatSkills,
      principal,
    });

    return visibleSkills
      .sort((skillA, skillB) => skillA.label.localeCompare(skillB.label))
      .map(fromFlatSkillToSkillDto);
  }

  async findById(id: string, workspaceId: string): Promise<SkillDTO | null> {
    const { flatSkillMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatSkillMaps'],
        },
      );

    const flatSkill = findFlatEntityByIdInFlatEntityMaps({
      flatEntityId: id,
      flatEntityMaps: flatSkillMaps,
    });

    if (!isDefined(flatSkill)) {
      return null;
    }

    return fromFlatSkillToSkillDto(flatSkill);
  }

  async findVisibleById(
    id: string,
    actor: SkillActorContext,
  ): Promise<SkillDTO | null> {
    const principal = await this.buildPrincipal(actor);
    const flatSkill = await this.findFlatSkillById(id, actor.workspaceId);

    if (!isDefined(flatSkill)) {
      return null;
    }

    const accessLevel = await this.skillAccessService.resolveAccessLevel({
      skill: flatSkill,
      principal,
    });

    if (!isDefined(accessLevel)) {
      return null;
    }

    return fromFlatSkillToSkillDto(flatSkill);
  }

  async create(
    input: CreateSkillInput,
    actor: SkillActorContext,
  ): Promise<SkillDTO> {
    const principal = await this.buildPrincipal(actor);
    const ownerUserWorkspaceId =
      input.ownerUserWorkspaceId ?? actor.userWorkspaceId;
    const isUserOwned = isDefined(input.ownerUserWorkspaceId)
      ? input.ownerUserWorkspaceId === actor.userWorkspaceId
      : true;

    if (!isUserOwned && !principal.hasAiSettings) {
      throw new SkillException(
        'Only AI settings admins can create workspace skills',
        SkillExceptionCode.SKILL_FORBIDDEN,
      );
    }

    if (
      isDefined(input.ownerUserWorkspaceId) &&
      input.ownerUserWorkspaceId !== actor.userWorkspaceId &&
      !principal.hasAiSettings
    ) {
      throw new SkillException(
        'Cannot create a skill owned by another user',
        SkillExceptionCode.SKILL_FORBIDDEN,
      );
    }

    const createInput: CreateSkillInput = {
      ...input,
      ownerUserWorkspaceId: principal.hasAiSettings
        ? input.ownerUserWorkspaceId
        : ownerUserWorkspaceId,
    };

    // Chat users always create USER skills for themselves
    if (!principal.hasAiSettings) {
      createInput.ownerUserWorkspaceId = actor.userWorkspaceId;
    }

    const { workspaceCustomFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId: actor.workspaceId },
      );

    const universalFlatSkillToCreate =
      fromCreateSkillInputToUniversalFlatSkillToCreate({
        createSkillInput: createInput,
        flatApplication: workspaceCustomFlatApplication,
      });

    const validateAndBuildResult =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration(
        {
          allFlatEntityOperationByMetadataName: {
            skill: {
              flatEntityToCreate: [universalFlatSkillToCreate],
              flatEntityToDelete: [],
              flatEntityToUpdate: [],
            },
          },
          workspaceId: actor.workspaceId,
          isSystemBuild: false,
          applicationUniversalIdentifier:
            workspaceCustomFlatApplication.universalIdentifier,
        },
      );

    if (validateAndBuildResult.status === 'fail') {
      throw new WorkspaceMigrationBuilderException(
        validateAndBuildResult,
        'Multiple validation errors occurred while creating skill',
      );
    }

    const { flatSkillMaps: recomputedFlatSkillMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId: actor.workspaceId,
          flatMapsKeys: ['flatSkillMaps'],
        },
      );

    return fromFlatSkillToSkillDto(
      findFlatEntityByIdInFlatEntityMapsOrThrow({
        flatEntityId: universalFlatSkillToCreate.id,
        flatEntityMaps: recomputedFlatSkillMaps,
      }),
    );
  }

  async update(
    input: UpdateSkillInput,
    actor: SkillActorContext,
  ): Promise<SkillDTO> {
    const principal = await this.buildPrincipal(actor);
    const existingFlatSkill = await this.findFlatSkillByIdOrThrow(
      input.id,
      actor.workspaceId,
    );

    await this.skillAccessService.assertCanAccess({
      skill: existingFlatSkill,
      principal,
      requiredAccessLevel: 'READ_WRITE',
    });

    if (existingFlatSkill.kind === 'SYSTEM') {
      throw new SkillException(
        'Cannot update system skill',
        SkillExceptionCode.SKILL_IS_STANDARD,
      );
    }

    if (
      existingFlatSkill.kind === 'WORKSPACE' &&
      !principal.hasAiSettings
    ) {
      throw new SkillException(
        'Only AI settings admins can update workspace skills',
        SkillExceptionCode.SKILL_FORBIDDEN,
      );
    }

    const { workspaceCustomFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId: actor.workspaceId },
      );

    const { flatSkillMaps: existingFlatSkillMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId: actor.workspaceId,
          flatMapsKeys: ['flatSkillMaps'],
        },
      );

    const flatSkillToUpdate = fromUpdateSkillInputToFlatSkillToUpdateOrThrow({
      flatSkillMaps: existingFlatSkillMaps,
      updateSkillInput: input,
    });

    const validateAndBuildResult =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration(
        {
          allFlatEntityOperationByMetadataName: {
            skill: {
              flatEntityToCreate: [],
              flatEntityToDelete: [],
              flatEntityToUpdate: [flatSkillToUpdate],
            },
          },
          workspaceId: actor.workspaceId,
          isSystemBuild: false,
          applicationUniversalIdentifier:
            workspaceCustomFlatApplication.universalIdentifier,
        },
      );

    if (validateAndBuildResult.status === 'fail') {
      throw new WorkspaceMigrationBuilderException(
        validateAndBuildResult,
        'Multiple validation errors occurred while updating skill',
      );
    }

    const { flatSkillMaps: recomputedFlatSkillMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId: actor.workspaceId,
          flatMapsKeys: ['flatSkillMaps'],
        },
      );

    return fromFlatSkillToSkillDto(
      findFlatEntityByIdInFlatEntityMapsOrThrow({
        flatEntityId: input.id,
        flatEntityMaps: recomputedFlatSkillMaps,
      }),
    );
  }

  async delete(id: string, actor: SkillActorContext): Promise<SkillDTO> {
    const principal = await this.buildPrincipal(actor);
    const existingFlatSkill = await this.findFlatSkillByIdOrThrow(
      id,
      actor.workspaceId,
    );

    if (existingFlatSkill.kind === 'SYSTEM') {
      throw new SkillException(
        'Cannot delete system skill',
        SkillExceptionCode.SKILL_IS_STANDARD,
      );
    }

    if (existingFlatSkill.kind === 'WORKSPACE') {
      if (!principal.hasAiSettings) {
        throw new SkillException(
          'Only AI settings admins can delete workspace skills',
          SkillExceptionCode.SKILL_FORBIDDEN,
        );
      }
    } else {
      await this.skillAccessService.assertIsOwner({
        skill: existingFlatSkill,
        principal,
      });
    }

    const { workspaceCustomFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId: actor.workspaceId },
      );

    const { flatSkillMaps: existingFlatSkillMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId: actor.workspaceId,
          flatMapsKeys: ['flatSkillMaps'],
        },
      );

    const flatSkillToDelete = fromDeleteSkillInputToFlatSkillOrThrow({
      flatSkillMaps: existingFlatSkillMaps,
      skillId: id,
    });

    const validateAndBuildResult =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration(
        {
          allFlatEntityOperationByMetadataName: {
            skill: {
              flatEntityToCreate: [],
              flatEntityToDelete: [flatSkillToDelete],
              flatEntityToUpdate: [],
            },
          },
          workspaceId: actor.workspaceId,
          isSystemBuild: false,
          applicationUniversalIdentifier:
            workspaceCustomFlatApplication.universalIdentifier,
        },
      );

    if (validateAndBuildResult.status === 'fail') {
      throw new WorkspaceMigrationBuilderException(
        validateAndBuildResult,
        'Multiple validation errors occurred while deleting skill',
      );
    }

    return fromFlatSkillToSkillDto(flatSkillToDelete);
  }

  async findAllFlatSkills(
    workspaceId: string,
    actor?: SkillActorContext,
  ): Promise<FlatSkill[]> {
    const flatSkills = (await this.loadAllFlatSkills(workspaceId)).filter(
      (flatSkill) => flatSkill.isActive,
    );

    if (!isDefined(actor)) {
      return flatSkills.sort((a, b) => a.label.localeCompare(b.label));
    }

    const principal = await this.buildPrincipal(actor);
    const visibleSkills = await this.skillAccessService.filterVisibleSkills({
      skills: flatSkills,
      principal,
    });

    return visibleSkills.sort((a, b) => a.label.localeCompare(b.label));
  }

  async findFlatSkillsByNames(
    names: string[],
    workspaceId: string,
    actor?: SkillActorContext,
  ): Promise<FlatSkill[]> {
    if (names.length === 0) {
      return [];
    }

    const visibleSkills = await this.findAllFlatSkills(workspaceId, actor);

    return visibleSkills.filter((flatSkill) => names.includes(flatSkill.name));
  }

  async findFlatSkillsByIds(
    ids: string[],
    workspaceId: string,
    actor?: SkillActorContext,
  ): Promise<FlatSkill[]> {
    if (ids.length === 0) {
      return [];
    }

    const visibleSkills = await this.findAllFlatSkills(workspaceId, actor);

    return visibleSkills.filter((flatSkill) => ids.includes(flatSkill.id));
  }

  async activate(id: string, actor: SkillActorContext): Promise<SkillDTO> {
    const principal = await this.buildPrincipal(actor);

    if (!principal.hasAiSettings) {
      throw new SkillException(
        'Only AI settings admins can activate skills',
        SkillExceptionCode.SKILL_FORBIDDEN,
      );
    }

    return this.setIsActive(id, actor.workspaceId, true);
  }

  async deactivate(id: string, actor: SkillActorContext): Promise<SkillDTO> {
    const principal = await this.buildPrincipal(actor);

    if (!principal.hasAiSettings) {
      throw new SkillException(
        'Only AI settings admins can deactivate skills',
        SkillExceptionCode.SKILL_FORBIDDEN,
      );
    }

    return this.setIsActive(id, actor.workspaceId, false);
  }

  async shareSkill(
    input: ShareSkillInput,
    actor: SkillActorContext,
  ): Promise<SkillShareDTO> {
    const principal = await this.buildPrincipal(actor);
    const flatSkill = await this.findFlatSkillByIdOrThrow(
      input.skillId,
      actor.workspaceId,
    );

    await this.skillAccessService.assertIsOwner({
      skill: flatSkill,
      principal,
    });

    const share = await this.skillAccessService.upsertShare({
      workspaceId: actor.workspaceId,
      skillId: input.skillId,
      principalType: input.principalType,
      principalId: input.principalId,
      accessLevel: input.accessLevel,
    });

    return this.toSkillShareDto(share);
  }

  async unshareSkill(
    input: UnshareSkillInput,
    actor: SkillActorContext,
  ): Promise<boolean> {
    const principal = await this.buildPrincipal(actor);
    const flatSkill = await this.findFlatSkillByIdOrThrow(
      input.skillId,
      actor.workspaceId,
    );

    await this.skillAccessService.assertIsOwner({
      skill: flatSkill,
      principal,
    });

    await this.skillAccessService.removeShare({
      workspaceId: actor.workspaceId,
      skillId: input.skillId,
      principalType: input.principalType,
      principalId: input.principalId,
    });

    return true;
  }

  async listSkillShares(
    skillId: string,
    actor: SkillActorContext,
  ): Promise<SkillShareDTO[]> {
    const principal = await this.buildPrincipal(actor);
    const flatSkill = await this.findFlatSkillByIdOrThrow(
      skillId,
      actor.workspaceId,
    );

    await this.skillAccessService.assertCanAccess({
      skill: flatSkill,
      principal,
      requiredAccessLevel: 'READ',
    });

    const shares = await this.skillAccessService.listSharesForSkill({
      workspaceId: actor.workspaceId,
      skillId,
    });

    return shares.map((share) => this.toSkillShareDto(share));
  }

  async findByIdOrThrow(id: string, workspaceId: string): Promise<SkillDTO> {
    const skill = await this.findById(id, workspaceId);

    if (!isDefined(skill)) {
      throw new SkillException(
        'Skill not found',
        SkillExceptionCode.SKILL_NOT_FOUND,
      );
    }

    return skill;
  }

  async assertCanAccessSkill({
    skillId,
    actor,
    requiredAccessLevel,
  }: {
    skillId: string;
    actor: SkillActorContext;
    requiredAccessLevel: DriveAccessLevel;
  }): Promise<FlatSkill> {
    const principal = await this.buildPrincipal(actor);
    const flatSkill = await this.findFlatSkillByIdOrThrow(
      skillId,
      actor.workspaceId,
    );

    await this.skillAccessService.assertCanAccess({
      skill: flatSkill,
      principal,
      requiredAccessLevel,
    });

    return flatSkill;
  }

  private async setIsActive(
    id: string,
    workspaceId: string,
    isActive: boolean,
  ): Promise<SkillDTO> {
    const { workspaceCustomFlatApplication } =
      await this.applicationService.findWorkspaceTwentyStandardAndCustomApplicationOrThrow(
        { workspaceId },
      );

    const existingFlatSkill = await this.findFlatSkillByIdOrThrow(
      id,
      workspaceId,
    );

    const flatSkillToUpdate: FlatSkill = {
      ...existingFlatSkill,
      isActive,
      updatedAt: new Date().toISOString(),
    };

    const validateAndBuildResult =
      await this.workspaceMigrationValidateBuildAndRunService.validateBuildAndRunWorkspaceMigration(
        {
          allFlatEntityOperationByMetadataName: {
            skill: {
              flatEntityToCreate: [],
              flatEntityToDelete: [],
              flatEntityToUpdate: [flatSkillToUpdate],
            },
          },
          workspaceId,
          isSystemBuild: false,
          applicationUniversalIdentifier:
            workspaceCustomFlatApplication.universalIdentifier,
        },
      );

    if (validateAndBuildResult.status === 'fail') {
      throw new WorkspaceMigrationBuilderException(
        validateAndBuildResult,
        `Multiple validation errors occurred while ${isActive ? 'activating' : 'deactivating'} skill`,
      );
    }

    const { flatSkillMaps: recomputedFlatSkillMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatSkillMaps'],
        },
      );

    return fromFlatSkillToSkillDto(
      findFlatEntityByIdInFlatEntityMapsOrThrow({
        flatEntityId: id,
        flatEntityMaps: recomputedFlatSkillMaps,
      }),
    );
  }

  private async buildPrincipal(
    actor: SkillActorContext,
  ): Promise<SkillAccessPrincipal> {
    const roleId =
      actor.roleId ??
      (await this.userRoleService.getRoleIdForUserWorkspace({
        workspaceId: actor.workspaceId,
        userWorkspaceId: actor.userWorkspaceId,
      }));

    const hasAiSettings = await this.permissionsService.checkRolesPermissions(
      { unionOf: [roleId] },
      actor.workspaceId,
      PermissionFlagType.AI_SETTINGS,
    );

    return {
      workspaceId: actor.workspaceId,
      userWorkspaceId: actor.userWorkspaceId,
      roleId,
      hasAiSettings,
    };
  }

  private async loadAllFlatSkills(workspaceId: string): Promise<FlatSkill[]> {
    const { flatSkillMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatSkillMaps'],
        },
      );

    return Object.values(flatSkillMaps.byUniversalIdentifier).filter(
      isDefined,
    );
  }

  private async findFlatSkillById(
    id: string,
    workspaceId: string,
  ): Promise<FlatSkill | null> {
    const { flatSkillMaps } =
      await this.workspaceManyOrAllFlatEntityMapsCacheService.getOrRecomputeManyOrAllFlatEntityMaps(
        {
          workspaceId,
          flatMapsKeys: ['flatSkillMaps'],
        },
      );

    return (
      findFlatEntityByIdInFlatEntityMaps({
        flatEntityId: id,
        flatEntityMaps: flatSkillMaps,
      }) ?? null
    );
  }

  private async findFlatSkillByIdOrThrow(
    id: string,
    workspaceId: string,
  ): Promise<FlatSkill> {
    const flatSkill = await this.findFlatSkillById(id, workspaceId);

    if (!isDefined(flatSkill)) {
      throw new SkillException(
        'Skill not found',
        SkillExceptionCode.SKILL_NOT_FOUND,
      );
    }

    return flatSkill;
  }

  private toSkillShareDto(share: {
    id: string;
    skillId: string;
    principalType: SkillShareDTO['principalType'];
    principalId: string;
    accessLevel: SkillShareDTO['accessLevel'];
    createdAt: Date;
    updatedAt: Date;
  }): SkillShareDTO {
    return {
      id: share.id,
      skillId: share.skillId,
      principalType: share.principalType,
      principalId: share.principalId,
      accessLevel: share.accessLevel,
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
    };
  }
}
