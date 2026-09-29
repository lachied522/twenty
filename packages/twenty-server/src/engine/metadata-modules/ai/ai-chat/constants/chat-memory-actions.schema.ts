import { z } from 'zod';

import { CHAT_MEMORY_MAX_CONTENT_LENGTH } from 'src/engine/metadata-modules/ai/ai-chat/constants/chat-memory-max-content-length.constant';

export const CHAT_MEMORY_ACTIONS_SCHEMA = z.object({
  actions: z.array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('create'),
        content: z
          .string()
          .min(1)
          .max(CHAT_MEMORY_MAX_CONTENT_LENGTH)
          .describe('The content of the new memory'),
      }),
      z.object({
        type: z.literal('update'),
        id: z.string().describe('The ID of the memory to update'),
        content: z
          .string()
          .min(1)
          .max(CHAT_MEMORY_MAX_CONTENT_LENGTH)
          .describe('The updated memory content'),
      }),
      z.object({
        type: z.literal('delete'),
        id: z.string().describe('The ID of the memory to delete'),
      }),
    ]),
  ),
});
