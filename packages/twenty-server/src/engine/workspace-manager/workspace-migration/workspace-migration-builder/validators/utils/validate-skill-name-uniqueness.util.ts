import { msg, t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';

import { SkillExceptionCode } from 'src/engine/metadata-modules/skill/skill.exception';
import { type UniversalFlatSkill } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-skill.type';
import { type FlatEntityValidationError } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/builders/types/failed-flat-entity-validation.type';

export const validateSkillNameUniqueness = ({
  name,
  ownerUserWorkspaceId,
  existingFlatSkills,
}: {
  name: string;
  ownerUserWorkspaceId: string | null | undefined;
  existingFlatSkills: UniversalFlatSkill[];
}): FlatEntityValidationError<SkillExceptionCode>[] => {
  const errors: FlatEntityValidationError<SkillExceptionCode>[] = [];
  const normalizedOwnerUserWorkspaceId = ownerUserWorkspaceId ?? null;

  const hasDuplicate = existingFlatSkills.some((skill) => {
    if (skill.name !== name) {
      return false;
    }

    const existingOwnerUserWorkspaceId = skill.ownerUserWorkspaceId ?? null;

    return existingOwnerUserWorkspaceId === normalizedOwnerUserWorkspaceId;
  });

  if (hasDuplicate) {
    errors.push({
      code: SkillExceptionCode.SKILL_ALREADY_EXISTS,
      message: isDefined(normalizedOwnerUserWorkspaceId)
        ? t`Skill with name "${name}" already exists for this user`
        : t`Skill with name "${name}" already exists`,
      userFriendlyMessage: msg`A skill with this name already exists`,
    });
  }

  return errors;
};
