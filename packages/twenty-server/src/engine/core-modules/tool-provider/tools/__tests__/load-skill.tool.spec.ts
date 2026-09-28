import { createLoadSkillTool } from 'src/engine/core-modules/tool-provider/tools/load-skill.tool';
import { type FlatSkill } from 'src/engine/metadata-modules/flat-skill/types/flat-skill.type';

describe('createLoadSkillTool', () => {
  it('projects canonical skill documents to Markdown', async () => {
    const tool = createLoadSkillTool(
      async () => [
        {
          name: 'sales-playbook',
          label: 'Sales playbook',
          content: JSON.stringify({
            type: 'doc',
            attrs: { schemaVersion: 1 },
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Qualify the account.' }],
              },
            ],
          }),
        } as FlatSkill,
      ],
      async () => [],
    );

    await expect(
      tool.execute({ skillNames: ['sales-playbook'] }),
    ).resolves.toMatchObject({
      skills: [
        {
          name: 'sales-playbook',
          label: 'Sales playbook',
          content: 'Qualify the account.',
        },
      ],
      message:
        'Loaded Sales playbook. Do not call load_skills again for these names. Next: learn_tools, then execute_tool.',
    });
  });

  it('refuses to load the same skill name twice in one turn', async () => {
    let loadCount = 0;
    const tool = createLoadSkillTool(
      async () => {
        loadCount += 1;

        return [
          {
            name: 'drive',
            label: 'Drive',
            content: 'List files.',
          } as FlatSkill,
        ];
      },
      async () => [],
    );

    await tool.execute({ skillNames: ['drive'] });

    await expect(tool.execute({ skillNames: ['drive'] })).resolves.toEqual({
      skills: [],
      message:
        'Already loaded: drive. Do not call load_skills again. Next: learn_tools, then execute_tool.',
    });
    expect(loadCount).toBe(1);
  });
});
