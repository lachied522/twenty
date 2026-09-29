import { type AgentMessageRole } from 'src/engine/metadata-modules/ai/ai-agent-execution/entities/agent-message.entity';

export type ChatMemoryTranscriptMessage = {
  id: string;
  role: AgentMessageRole;
  content: string;
};
