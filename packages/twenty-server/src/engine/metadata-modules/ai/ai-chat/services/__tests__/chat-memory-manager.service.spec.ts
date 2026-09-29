import { UPDATE_CHAT_MEMORIES_JOB_NAME } from 'src/engine/metadata-modules/ai/ai-chat/constants/update-chat-memories-job-name.constant';
import { ChatMemoryManagerService } from 'src/engine/metadata-modules/ai/ai-chat/services/chat-memory-manager.service';

const WORKSPACE_ID = 'workspace-id';
const USER_WORKSPACE_ID = 'user-workspace-id';
const THREAD_ID = 'thread-id';

describe('ChatMemoryManagerService', () => {
  const buildService = () => {
    const agentUserMemoryService = {};
    const aiModelRegistryService = {};
    const aiBillingService = {};
    const messageQueueService = {
      add: jest.fn().mockResolvedValue('job-id'),
    };
    const service = new ChatMemoryManagerService(
      agentUserMemoryService as never,
      aiModelRegistryService as never,
      aiBillingService as never,
      messageQueueService as never,
    );

    return { service, messageQueueService };
  };

  it('should enqueue a coalesced memory job after an answered turn', async () => {
    const { service, messageQueueService } = buildService();

    await service.enqueueAfterCompletedTurn({
      outcome: { kind: 'completed', outcome: 'answered' },
      threadId: THREAD_ID,
      workspaceId: WORKSPACE_ID,
      userWorkspaceId: USER_WORKSPACE_ID,
    });

    expect(messageQueueService.add).toHaveBeenCalledWith(
      UPDATE_CHAT_MEMORIES_JOB_NAME,
      {
        threadId: THREAD_ID,
        workspaceId: WORKSPACE_ID,
        userWorkspaceId: USER_WORKSPACE_ID,
      },
      {
        id: `update-chat-memories:${WORKSPACE_ID}:${USER_WORKSPACE_ID}`,
      },
    );
  });

  it('should not enqueue after a turn that is awaiting the user', async () => {
    const { service, messageQueueService } = buildService();

    await service.enqueueAfterCompletedTurn({
      outcome: { kind: 'completed', outcome: 'awaiting_user' },
      threadId: THREAD_ID,
      workspaceId: WORKSPACE_ID,
      userWorkspaceId: USER_WORKSPACE_ID,
    });

    expect(messageQueueService.add).not.toHaveBeenCalled();
  });

  it('should swallow enqueue failures', async () => {
    const { service, messageQueueService } = buildService();

    messageQueueService.add.mockRejectedValue(new Error('redis down'));

    await expect(
      service.enqueueAfterCompletedTurn({
        outcome: { kind: 'completed', outcome: 'answered' },
        threadId: THREAD_ID,
        workspaceId: WORKSPACE_ID,
        userWorkspaceId: USER_WORKSPACE_ID,
      }),
    ).resolves.toBeUndefined();
  });
});
