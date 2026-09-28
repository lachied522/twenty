import { type AiModelTier } from 'twenty-shared/ai';

import { type CodeExecutionStreamEmitter } from 'src/engine/core-modules/tool-provider/interfaces/code-execution-stream-emitter.type';
import { type UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';

export type ToolExecutionContext = {
  workspaceId: string;
  userId?: string;
  userWorkspaceId?: string;
  threadId?: string;
  modelId?: string;
  aiModelTier?: AiModelTier;
  usageOperationType?: UsageOperationType;
  onCodeExecutionUpdate?: CodeExecutionStreamEmitter;
};
