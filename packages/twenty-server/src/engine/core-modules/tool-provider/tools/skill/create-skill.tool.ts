import { z } from 'zod';

import { computeMetadataNameFromLabel } from 'twenty-shared/metadata';

import { type SkillService } from 'src/engine/metadata-modules/skill/skill.service';

const createSkillSchema = z.object({
  label: z
    .string()
    .min(1)
    .describe('Human-readable skill title, e.g. "Morning email triage"'),
  description: z
    .string()
    .optional()
    .describe('Short description shown in the skill catalog'),
  content: z
    .string()
    .min(1)
    .describe(
      'Full skill instructions as markdown: steps, tool names, and patterns',
    ),
  toolkitSlugs: z
    .array(z.string())
    .optional()
    .describe(
      'Optional Composio toolkit slugs this skill uses, e.g. ["gmail", "outlook"]',
    ),
  name: z
    .string()
    .optional()
    .describe(
      'Optional machine name (kebab-case). Derived from label when omitted.',
    ),
  icon: z.string().optional().describe('Optional icon name, e.g. IconBook'),
});

type CreateSkillParams = z.infer<typeof createSkillSchema>;

export const CREATE_SKILL_TOOL_NAME = 'create_skill';

export const createCreateSkillTool = ({
  skillService,
  workspaceId,
  userWorkspaceId,
}: {
  skillService: SkillService;
  workspaceId: string;
  userWorkspaceId: string;
}) => ({
  name: CREATE_SKILL_TOOL_NAME,
  description:
    'Save a reusable personal skill for the current user. Use after a successful multi-step procedure that the user wants to reuse. Always confirm with ask_questions before creating.',
  inputSchema: createSkillSchema,
  execute: async (parameters: CreateSkillParams) => {
    try {
      const name =
        parameters.name ??
        computeMetadataNameFromLabel({ label: parameters.label });

      const skill = await skillService.create(
        {
          name,
          label: parameters.label,
          description: parameters.description,
          content: parameters.content,
          icon: parameters.icon ?? 'IconBook',
          ownerUserWorkspaceId: userWorkspaceId,
          toolkitSlugs: parameters.toolkitSlugs,
        },
        { workspaceId, userWorkspaceId },
      );

      return {
        success: true,
        message: `Created personal skill "${skill.label}" (${skill.name})`,
        result: {
          id: skill.id,
          name: skill.name,
          label: skill.label,
          description: skill.description,
          toolkitSlugs: skill.toolkitSlugs,
          kind: skill.kind,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        message: `Failed to create skill: ${message}`,
        error: message,
      };
    }
  },
});
