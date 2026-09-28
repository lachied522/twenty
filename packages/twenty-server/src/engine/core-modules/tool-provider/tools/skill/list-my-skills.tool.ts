import { z } from 'zod';
import { tipTapDocumentToMarkdown } from 'twenty-shared/utils';

import { type SkillService } from 'src/engine/metadata-modules/skill/skill.service';

export const LIST_MY_SKILLS_TOOL_NAME = 'list_my_skills';

const listMySkillsSchema = z.object({});

export const createListMySkillsTool = ({
  skillService,
  workspaceId,
  userWorkspaceId,
  roleId,
}: {
  skillService: SkillService;
  workspaceId: string;
  userWorkspaceId: string;
  roleId?: string;
}) => ({
  name: LIST_MY_SKILLS_TOOL_NAME,
  description:
    'List skills visible to the current user (system, workspace, owned, and shared). Useful after creating a skill mid-thread.',
  inputSchema: listMySkillsSchema,
  execute: async () => {
    try {
      const skills = await skillService.findAllFlatSkills(workspaceId, {
        workspaceId,
        userWorkspaceId,
        roleId,
      });

      return {
        success: true,
        message: `Found ${skills.length} visible skill(s)`,
        result: skills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          label: skill.label,
          description: skill.description,
          kind: skill.kind,
          toolkitSlugs: skill.toolkitSlugs,
          ownerUserWorkspaceId: skill.ownerUserWorkspaceId,
          contentPreview: tipTapDocumentToMarkdown(skill.content).slice(
            0,
            200,
          ),
        })),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        message: `Failed to list skills: ${message}`,
        error: message,
      };
    }
  },
});
