import { type AgentUserMemoryEntity } from 'src/engine/metadata-modules/ai/ai-chat/entities/agent-user-memory.entity';
import { type ChatMemoryTranscriptMessage } from 'src/engine/metadata-modules/ai/ai-chat/types/chat-memory-transcript-message.type';

const formatTranscript = (messages: ChatMemoryTranscriptMessage[]): string =>
  messages
    .map((message) => `[${message.role}] ${message.content}`)
    .join('\n\n');

const formatExistingMemories = (
  memories: Pick<AgentUserMemoryEntity, 'id' | 'content' | 'createdAt'>[],
): string => {
  if (memories.length === 0) {
    return 'No existing memories for this user';
  }

  return JSON.stringify(
    memories.map((memory) => ({
      id: memory.id,
      content: memory.content,
      createdAt: memory.createdAt,
    })),
    null,
    2,
  );
};

export const buildChatMemoryManagerUserPrompt = ({
  messages,
  existingMemories,
}: {
  messages: ChatMemoryTranscriptMessage[];
  existingMemories: Pick<
    AgentUserMemoryEntity,
    'id' | 'content' | 'createdAt'
  >[];
}): string => `The following messages are a recent conversation between a user and Gizmo.

'''
${formatTranscript(messages)}
'''

Compare the conversation to the following existing memories, and create, update, or delete memories accordingly.

'''
${formatExistingMemories(existingMemories)}
'''`;
