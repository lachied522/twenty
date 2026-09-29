import {
  AgentMessageRole,
  type AgentMessageEntity,
} from 'src/engine/metadata-modules/ai/ai-agent-execution/entities/agent-message.entity';
import { buildChatMemoryTranscriptMessages } from 'src/engine/metadata-modules/ai/ai-chat/utils/build-chat-memory-transcript-messages.util';

const buildMessage = ({
  id,
  role,
  text,
  isHidden = false,
}: {
  id: string;
  role: AgentMessageRole;
  text?: string;
  isHidden?: boolean;
}): AgentMessageEntity =>
  ({
    id,
    role,
    isHidden,
    parts: isDefinedText(text)
      ? [{ type: 'text', textContent: text }]
      : [{ type: 'tool-call', textContent: null }],
  }) as AgentMessageEntity;

const isDefinedText = (text: string | undefined): text is string =>
  text !== undefined;

describe('buildChatMemoryTranscriptMessages', () => {
  it('should keep visible user and assistant text and drop hidden, system, and tool-only messages', () => {
    const transcript = buildChatMemoryTranscriptMessages([
      buildMessage({
        id: 'hidden',
        role: AgentMessageRole.USER,
        text: 'kickoff',
        isHidden: true,
      }),
      buildMessage({
        id: 'system',
        role: AgentMessageRole.SYSTEM,
        text: 'system prompt',
      }),
      buildMessage({
        id: 'user-1',
        role: AgentMessageRole.USER,
        text: 'Export this as CSV',
      }),
      buildMessage({
        id: 'tool-only',
        role: AgentMessageRole.ASSISTANT,
      }),
      buildMessage({
        id: 'assistant-1',
        role: AgentMessageRole.ASSISTANT,
        text: 'Here is the file',
      }),
    ]);

    expect(transcript).toEqual([
      {
        id: 'user-1',
        role: AgentMessageRole.USER,
        content: 'Export this as CSV',
      },
      {
        id: 'assistant-1',
        role: AgentMessageRole.ASSISTANT,
        content: 'Here is the file',
      },
    ]);
  });
});
