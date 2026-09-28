import { z } from 'zod';

import { type SkillService } from 'src/engine/metadata-modules/skill/skill.service';

const updateSkillSchema = z.object({
  skillId: z.string().uuid().describe('ID of the skill to update'),
  label: z.string().optional().describe('Updated human-readable title'),
  description: z.string().optional().describe('Updated short description'),
  content: z
    .string()
    .optional()
    .describe('Updated markdown instructions for the skill'),
  toolkitSlugs: z
    .array(z.string())
    .nullable()
    .optional()
    .describe('Updated Composio toolkit slugs, or null to clear'),
  name: z.string().optional().describe('Updated machine name'),
  icon: z.string().optional().describe('Updated icon name'),
});

type UpdateSkillParams = z.infer<typeof updateSkillSchema>;

export const UPDATE_SKILL_TOOL_NAME = 'update_skill';

export const createUpdateSkillTool = ({
  skillService,
  workspaceId,
  userWorkspaceId,
}: {
  skillService: SkillService;
  workspaceId: string;
  userWorkspaceId: string;
}) => ({
  name: UPDATE_SKILL_TOOL_NAME,
  description:
    'Update a personal skill the current user owns or has write access to. Confirm overwrites with ask_questions. Cannot edit system skills.',
  inputSchema: updateSkillSchema,
  execute: async (parameters: UpdateSkillParams) => {
    try {
      const skill = await skillService.update(
        {
          id: parameters.skillId,
          label: parameters.label,
          description: parameters.description,
          content: parameters.content,
          toolkitSlugs: parameters.toolkitSlugs,
          name: parameters.name,
          icon: parameters.icon,
        },
        { workspaceId, userWorkspaceId },
      );

      return {
        success: true,
        message: `Updated skill "${skill.label}"`,
        result: {
          id: skill.id,
          name: skill.name,
          label: skill.label,
          description: skill.description,
          toolkitSlugs: skill.toolkitSlugs,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        message: `Failed to update skill: ${message}`,
        error: message,
      };
    }
  },
});
