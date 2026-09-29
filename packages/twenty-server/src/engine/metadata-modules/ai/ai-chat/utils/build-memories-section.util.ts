import { isNonEmptyArray } from 'twenty-shared/utils';

export const buildMemoriesSection = (memories: string[]): string => {
  if (!isNonEmptyArray(memories)) {
    return '';
  }

  const list = memories.map((memory) => `- ${memory}`).join('\n');

  return `
## Memories

Durable facts you have learned about this user from previous conversations. Use them when relevant. Do not mention this section unless the user asks. Do not repeat User Context (name, job title, locale, timezone).

${list}`;
};
