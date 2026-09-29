import { isDefined } from 'twenty-shared/utils';

import { type AgentChatTurnOutcome } from 'src/engine/metadata-modules/ai/ai-chat/types/agent-chat-turn-outcome.type';
import { buildWorkspaceSetupChatThreadId } from 'src/engine/metadata-modules/ai/ai-chat/utils/build-workspace-setup-chat-thread-id.util';

export const shouldEnqueueChatMemoryUpdate = ({
  outcome,
  threadId,
  workspaceId,
  userWorkspaceId,
}: {
  outcome: AgentChatTurnOutcome | null | undefined;
  threadId: string;
  workspaceId: string;
  userWorkspaceId: string;
}): boolean => {
  if (
    !isDefined(outcome) ||
    outcome.kind !== 'completed' ||
    outcome.outcome !== 'answered'
  ) {
    return false;
  }

  return (
    threadId !==
    buildWorkspaceSetupChatThreadId({
      workspaceId,
      userWorkspaceId,
    })
  );
};
