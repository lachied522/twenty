import { type AiModelTier } from 'twenty-shared/ai';
import { type ActorMetadata } from 'twenty-shared/types';
import { type APP_LOCALES } from 'twenty-shared/translations';

import { type CodeExecutionStreamEmitter } from 'src/engine/core-modules/tool-provider/interfaces/code-execution-stream-emitter.type';

import { type WorkspaceAuthContext } from 'src/engine/core-modules/auth/types/workspace-auth-context.type';
import { type UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { type RolePermissionConfig } from 'src/engine/twenty-orm/types/role-permission-config';

export type ToolContext = {
  workspaceId: string;
  roleId: string;
  rolePermissionConfig?: RolePermissionConfig;
  authContext?: WorkspaceAuthContext;
  actorContext?: ActorMetadata;
  userId?: string;
  userWorkspaceId?: string;
  threadId?: string;
  locale?: keyof typeof APP_LOCALES;
  modelId?: string;
  aiModelTier?: AiModelTier;
  usageOperationType?: UsageOperationType;
  onCodeExecutionUpdate?: CodeExecutionStreamEmitter;
};
