import { buildWorkspaceSetupChatThreadId } from 'src/engine/metadata-modules/ai/ai-chat/utils/build-workspace-setup-chat-thread-id.util';
import { shouldEnqueueChatMemoryUpdate } from 'src/engine/metadata-modules/ai/ai-chat/utils/should-enqueue-chat-memory-update.util';

const WORKSPACE_ID = '11111111-1111-4111-8111-111111111111';
const USER_WORKSPACE_ID = '22222222-2222-4222-8222-222222222222';

describe('shouldEnqueueChatMemoryUpdate', () => {
  const args = {
    threadId: 'thread-id',
    workspaceId: WORKSPACE_ID,
    userWorkspaceId: USER_WORKSPACE_ID,
  };

  it('should enqueue after an answered turn', () => {
    expect(
      shouldEnqueueChatMemoryUpdate({
        ...args,
        outcome: { kind: 'completed', outcome: 'answered' },
      }),
    ).toBe(true);
  });

  it('should skip turns that are waiting on the user', () => {
    expect(
      shouldEnqueueChatMemoryUpdate({
        ...args,
        outcome: { kind: 'completed', outcome: 'awaiting_user' },
      }),
    ).toBe(false);
  });

  it('should skip cancelled and failed turns', () => {
    expect(
      shouldEnqueueChatMemoryUpdate({
        ...args,
        outcome: { kind: 'cancelled', reason: 'user_cancelled' },
      }),
    ).toBe(false);
    expect(
      shouldEnqueueChatMemoryUpdate({
        ...args,
        outcome: { kind: 'failed', failurePhase: 'execution' },
      }),
    ).toBe(false);
  });

  it('should skip workspace setup threads', () => {
    expect(
      shouldEnqueueChatMemoryUpdate({
        ...args,
        threadId: buildWorkspaceSetupChatThreadId({
          workspaceId: WORKSPACE_ID,
          userWorkspaceId: USER_WORKSPACE_ID,
        }),
        outcome: { kind: 'completed', outcome: 'answered' },
      }),
    ).toBe(false);
  });
});
