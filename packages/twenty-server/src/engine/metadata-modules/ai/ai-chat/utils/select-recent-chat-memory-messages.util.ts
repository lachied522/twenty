import { AgentMessageRole } from 'src/engine/metadata-modules/ai/ai-agent-execution/entities/agent-message.entity';
import { CHAT_MEMORY_RECENT_MESSAGE_COUNT_PER_ROLE } from 'src/engine/metadata-modules/ai/ai-chat/constants/chat-memory-recent-message-count.constant';
import { type ChatMemoryTranscriptMessage } from 'src/engine/metadata-modules/ai/ai-chat/types/chat-memory-transcript-message.type';

const takeLast = <TItem>(items: TItem[], count: number): TItem[] =>
  items.slice(Math.max(0, items.length - count));

export const selectRecentChatMemoryMessages = (
  messages: ChatMemoryTranscriptMessage[],
): ChatMemoryTranscriptMessage[] => {
  const recentUserIds = new Set(
    takeLast(
      messages.filter((message) => message.role === AgentMessageRole.USER),
      CHAT_MEMORY_RECENT_MESSAGE_COUNT_PER_ROLE,
    ).map((message) => message.id),
  );
  const recentAssistantIds = new Set(
    takeLast(
      messages.filter((message) => message.role === AgentMessageRole.ASSISTANT),
      CHAT_MEMORY_RECENT_MESSAGE_COUNT_PER_ROLE,
    ).map((message) => message.id),
  );

  return messages.filter(
    (message) =>
      recentUserIds.has(message.id) || recentAssistantIds.has(message.id),
  );
};
