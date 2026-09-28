import { z } from 'zod';

import { type SkillService } from 'src/engine/metadata-modules/skill/skill.service';

const unshareSkillSchema = z.object({
  skillId: z.string().uuid().describe('ID of the skill to unshare'),
  principalType: z.enum(['WORKSPACE_MEMBER', 'ROLE']),
  principalId: z.string().uuid(),
});

type UnshareSkillParams = z.infer<typeof unshareSkillSchema>;

export const UNSHARE_SKILL_TOOL_NAME = 'unshare_skill';

export const createUnshareSkillTool = ({
  skillService,
  workspaceId,
  userWorkspaceId,
}: {
  skillService: SkillService;
  workspaceId: string;
  userWorkspaceId: string;
}) => ({
  name: UNSHARE_SKILL_TOOL_NAME,
  description:
    'Remove a share from a personal skill you own. Only the owner can unshare.',
  inputSchema: unshareSkillSchema,
  execute: async (parameters: UnshareSkillParams) => {
    try {
      await skillService.unshareSkill(
        {
          skillId: parameters.skillId,
          principalType: parameters.principalType,
          principalId: parameters.principalId,
        },
        { workspaceId, userWorkspaceId },
      );

      return {
        success: true,
        message: `Removed share for ${parameters.principalType} ${parameters.principalId}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        message: `Failed to unshare skill: ${message}`,
        error: message,
      };
    }
  },
});
