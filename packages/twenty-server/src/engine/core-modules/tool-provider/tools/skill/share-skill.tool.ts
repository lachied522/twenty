import { z } from 'zod';

import { type SkillService } from 'src/engine/metadata-modules/skill/skill.service';

const shareSkillSchema = z.object({
  skillId: z.string().uuid().describe('ID of the skill to share'),
  principalType: z
    .enum(['WORKSPACE_MEMBER', 'ROLE'])
    .describe(
      'Share with a coworker (WORKSPACE_MEMBER) or everyone on a role (ROLE)',
    ),
  principalId: z
    .string()
    .uuid()
    .describe(
      'userWorkspaceId when principalType is WORKSPACE_MEMBER, or roleId when ROLE',
    ),
  accessLevel: z
    .enum(['READ', 'READ_WRITE'])
    .default('READ')
    .describe('READ lets them use the skill; READ_WRITE also lets them edit it'),
});

type ShareSkillParams = z.infer<typeof shareSkillSchema>;

export const SHARE_SKILL_TOOL_NAME = 'share_skill';

export const createShareSkillTool = ({
  skillService,
  workspaceId,
  userWorkspaceId,
}: {
  skillService: SkillService;
  workspaceId: string;
  userWorkspaceId: string;
}) => ({
  name: SHARE_SKILL_TOOL_NAME,
  description:
    'Share a personal skill you own with a coworker or a role. Only the owner can share.',
  inputSchema: shareSkillSchema,
  execute: async (parameters: ShareSkillParams) => {
    try {
      const share = await skillService.shareSkill(
        {
          skillId: parameters.skillId,
          principalType: parameters.principalType,
          principalId: parameters.principalId,
          accessLevel: parameters.accessLevel,
        },
        { workspaceId, userWorkspaceId },
      );

      return {
        success: true,
        message: `Shared skill with ${parameters.principalType} ${parameters.principalId}`,
        result: share,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        message: `Failed to share skill: ${message}`,
        error: message,
      };
    }
  },
});
