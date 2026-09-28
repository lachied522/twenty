import { z } from 'zod';
import { tipTapDocumentToMarkdown } from 'twenty-shared/utils';

import { type FlatSkill } from 'src/engine/metadata-modules/flat-skill/types/flat-skill.type';

export const LOAD_SKILL_TOOL_NAME = 'load_skills';

export const loadSkillInputSchema = z.object({
  skillNames: z
    .array(z.string())
    .describe(
      'Names of the skills to load (e.g., ["workflow-building", "data-manipulation"])',
    ),
});

export type LoadSkillInput = z.infer<typeof loadSkillInputSchema>;

export type LoadSkillResult = {
  skills: Array<{
    name: string;
    label: string;
    content: string;
  }>;
  message: string;
};

export type LoadSkillFunction = (names: string[]) => Promise<FlatSkill[]>;
export type ListAvailableSkillNamesFunction = () => Promise<string[]>;

export const createLoadSkillTool = (
  loadSkills: LoadSkillFunction,
  listAvailableSkillNames: ListAvailableSkillNamesFunction,
) => {
  const loadedSkillNames = new Set<string>();

  return {
    description:
      'Load specialized skills for complex tasks. Returns detailed step-by-step instructions for building workflows, dashboards, manipulating data, or managing metadata. Call this before attempting complex operations. Call each skill name at most once per turn.',
    inputSchema: loadSkillInputSchema,
    execute: async (parameters: LoadSkillInput): Promise<LoadSkillResult> => {
      const { skillNames } = parameters;

      const skillNamesToLoad = skillNames.filter(
        (skillName) => !loadedSkillNames.has(skillName),
      );

      if (skillNames.length > 0 && skillNamesToLoad.length === 0) {
        return {
          skills: [],
          message: `Already loaded: ${skillNames.join(', ')}. Do not call load_skills again. Next: learn_tools, then execute_tool.`,
        };
      }

      const skills = await loadSkills(
        skillNamesToLoad.length > 0 ? skillNamesToLoad : skillNames,
      );

      for (const skillName of skillNamesToLoad) {
        loadedSkillNames.add(skillName);
      }

      if (skills.length === 0) {
        const availableNames = await listAvailableSkillNames();

        const availableMessage =
          availableNames.length > 0
            ? `Available skills: ${availableNames.join(', ')}.`
            : 'No skills are currently available in this workspace.';

        return {
          skills: [],
          message: `No skills found with names: ${skillNames.join(', ')}. ${availableMessage}`,
        };
      }

      return {
        skills: skills.map((skill) => ({
          name: skill.name,
          label: skill.label,
          content: tipTapDocumentToMarkdown(skill.content),
        })),
        message: `Loaded ${skills.map((skill) => skill.label).join(', ')}. Do not call load_skills again for these names. Next: learn_tools, then execute_tool.`,
      };
    },
  };
};
