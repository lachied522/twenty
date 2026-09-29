import { AgentMessageRole } from 'src/engine/metadata-modules/ai/ai-agent-execution/entities/agent-message.entity';
import { type ChatMemoryTranscriptMessage } from 'src/engine/metadata-modules/ai/ai-chat/types/chat-memory-transcript-message.type';
import { selectRecentChatMemoryMessages } from 'src/engine/metadata-modules/ai/ai-chat/utils/select-recent-chat-memory-messages.util';

const buildTranscriptMessage = ({
  id,
  role,
}: {
  id: string;
  role: ChatMemoryTranscriptMessage['role'];
}): ChatMemoryTranscriptMessage => ({
  id,
  role,
  content: id,
});

describe('selectRecentChatMemoryMessages', () => {
  it('should keep the last five user and last five assistant messages in chronological order', () => {
    const messages = Array.from({ length: 6 }, (_, index) => [
      buildTranscriptMessage({
        id: `user-${index + 1}`,
        role: AgentMessageRole.USER,
      }),
      buildTranscriptMessage({
        id: `assistant-${index + 1}`,
        role: AgentMessageRole.ASSISTANT,
      }),
    ]).flat();

    const recentMessages = selectRecentChatMemoryMessages(messages);

    expect(recentMessages.map((message) => message.id)).toEqual([
      'user-2',
      'assistant-2',
      'user-3',
      'assistant-3',
      'user-4',
      'assistant-4',
      'user-5',
      'assistant-5',
      'user-6',
      'assistant-6',
    ]);
  });
});
