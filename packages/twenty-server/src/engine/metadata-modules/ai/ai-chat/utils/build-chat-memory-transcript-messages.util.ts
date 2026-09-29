import { isNonEmptyString } from '@sniptt/guards';

import {
  AgentMessageRole,
  type AgentMessageEntity,
} from 'src/engine/metadata-modules/ai/ai-agent-execution/entities/agent-message.entity';
import { type ChatMemoryTranscriptMessage } from 'src/engine/metadata-modules/ai/ai-chat/types/chat-memory-transcript-message.type';

const extractMessageText = (message: AgentMessageEntity): string =>
  (message.parts ?? [])
    .filter(
      (part) => part.type === 'text' && isNonEmptyString(part.textContent),
    )
    .map((part) => part.textContent)
    .join('\n')
    .trim();

export const buildChatMemoryTranscriptMessages = (
  messages: AgentMessageEntity[],
): ChatMemoryTranscriptMessage[] =>
  messages.flatMap((message) => {
    if (
      message.isHidden ||
      (message.role !== AgentMessageRole.USER &&
        message.role !== AgentMessageRole.ASSISTANT)
    ) {
      return [];
    }

    const content = extractMessageText(message);

    if (!isNonEmptyString(content)) {
      return [];
    }

    return [
      {
        id: message.id,
        role: message.role,
        content,
      },
    ];
  });
