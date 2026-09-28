import { validateSkillNameUniqueness } from 'src/engine/workspace-manager/workspace-migration/workspace-migration-builder/validators/utils/validate-skill-name-uniqueness.util';
import { type UniversalFlatSkill } from 'src/engine/workspace-manager/workspace-migration/universal-flat-entity/types/universal-flat-skill.type';

const buildSkill = ({
  name,
  ownerUserWorkspaceId = null,
  universalIdentifier = 'skill-1',
}: {
  name: string;
  ownerUserWorkspaceId?: string | null;
  universalIdentifier?: string;
}): UniversalFlatSkill =>
  ({
    name,
    ownerUserWorkspaceId,
    universalIdentifier,
  }) as UniversalFlatSkill;

describe('validateSkillNameUniqueness', () => {
  it('allows the same name for different owners', () => {
    const errors = validateSkillNameUniqueness({
      name: 'morning-email-triage',
      ownerUserWorkspaceId: 'user-b',
      existingFlatSkills: [
        buildSkill({
          name: 'morning-email-triage',
          ownerUserWorkspaceId: 'user-a',
        }),
      ],
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects a duplicate name for the same owner', () => {
    const errors = validateSkillNameUniqueness({
      name: 'morning-email-triage',
      ownerUserWorkspaceId: 'user-a',
      existingFlatSkills: [
        buildSkill({
          name: 'morning-email-triage',
          ownerUserWorkspaceId: 'user-a',
        }),
      ],
    });

    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe('SKILL_ALREADY_EXISTS');
  });

  it('rejects a duplicate workspace-level name', () => {
    const errors = validateSkillNameUniqueness({
      name: 'workflow-building',
      ownerUserWorkspaceId: null,
      existingFlatSkills: [
        buildSkill({
          name: 'workflow-building',
          ownerUserWorkspaceId: null,
        }),
      ],
    });

    expect(errors).toHaveLength(1);
  });

  it('allows a personal skill to reuse a workspace skill name', () => {
    const errors = validateSkillNameUniqueness({
      name: 'workflow-building',
      ownerUserWorkspaceId: 'user-a',
      existingFlatSkills: [
        buildSkill({
          name: 'workflow-building',
          ownerUserWorkspaceId: null,
        }),
      ],
    });

    expect(errors).toHaveLength(0);
  });
});
