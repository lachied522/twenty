import { buildMemoriesSection } from 'src/engine/metadata-modules/ai/ai-chat/utils/build-memories-section.util';

describe('buildMemoriesSection', () => {
  it('should return an empty string when there are no memories', () => {
    expect(buildMemoriesSection([])).toBe('');
  });

  it('should list memories under a Memories heading without ids', () => {
    const section = buildMemoriesSection([
      'User prefers concise replies',
      'User asked never to create a workflow without confirmation',
    ]);

    expect(section).toContain('## Memories');
    expect(section).toContain('- User prefers concise replies');
    expect(section).toContain(
      '- User asked never to create a workflow without confirmation',
    );
    expect(section).not.toContain('id');
  });
});
