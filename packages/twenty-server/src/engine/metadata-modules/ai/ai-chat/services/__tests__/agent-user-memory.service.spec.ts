import { CHAT_MEMORY_MAX_COUNT } from 'src/engine/metadata-modules/ai/ai-chat/constants/chat-memory-max-count.constant';
import { AgentUserMemoryService } from 'src/engine/metadata-modules/ai/ai-chat/services/agent-user-memory.service';

const WORKSPACE_ID = 'workspace-id';
const USER_WORKSPACE_ID = 'user-workspace-id';

describe('AgentUserMemoryService', () => {
  const buildService = ({
    memoryCount = 0,
    deleteAffected = 1,
  }: {
    memoryCount?: number;
    deleteAffected?: number;
  } = {}) => {
    const memoryRepository = {
      count: jest.fn().mockResolvedValue(memoryCount),
      insert: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: deleteAffected }),
    };
    const messageRepository = {};
    const service = new AgentUserMemoryService(
      memoryRepository as never,
      messageRepository as never,
    );

    return { service, memoryRepository };
  };

  it('should create, update, and delete memories for the owning user', async () => {
    const { service, memoryRepository } = buildService();

    await service.applyActions({
      workspaceId: WORKSPACE_ID,
      userWorkspaceId: USER_WORKSPACE_ID,
      actions: [
        { type: 'create', content: '  User prefers tables  ' },
        {
          type: 'update',
          id: 'memory-1',
          content: 'User prefers concise tables',
        },
        { type: 'delete', id: 'memory-2' },
      ],
    });

    expect(memoryRepository.insert).toHaveBeenCalledWith(WORKSPACE_ID, {
      userWorkspaceId: USER_WORKSPACE_ID,
      content: 'User prefers tables',
    });
    expect(memoryRepository.update).toHaveBeenCalledWith(
      WORKSPACE_ID,
      { id: 'memory-1', userWorkspaceId: USER_WORKSPACE_ID },
      { content: 'User prefers concise tables' },
    );
    expect(memoryRepository.delete).toHaveBeenCalledWith(WORKSPACE_ID, {
      id: 'memory-2',
      userWorkspaceId: USER_WORKSPACE_ID,
    });
  });

  it('should skip creates once the cap is reached', async () => {
    const { service, memoryRepository } = buildService({
      memoryCount: CHAT_MEMORY_MAX_COUNT,
    });

    await service.applyActions({
      workspaceId: WORKSPACE_ID,
      userWorkspaceId: USER_WORKSPACE_ID,
      actions: [{ type: 'create', content: 'User likes dark mode' }],
    });

    expect(memoryRepository.insert).not.toHaveBeenCalled();
  });

  it('should allow a create after a delete when at the cap', async () => {
    const { service, memoryRepository } = buildService({
      memoryCount: CHAT_MEMORY_MAX_COUNT,
    });

    await service.applyActions({
      workspaceId: WORKSPACE_ID,
      userWorkspaceId: USER_WORKSPACE_ID,
      actions: [
        { type: 'create', content: 'User likes dark mode' },
        { type: 'delete', id: 'memory-old' },
      ],
    });

    expect(memoryRepository.delete).toHaveBeenCalledWith(WORKSPACE_ID, {
      id: 'memory-old',
      userWorkspaceId: USER_WORKSPACE_ID,
    });
    expect(memoryRepository.insert).toHaveBeenCalledWith(WORKSPACE_ID, {
      userWorkspaceId: USER_WORKSPACE_ID,
      content: 'User likes dark mode',
    });
  });

  it('should skip empty create and update contents', async () => {
    const { service, memoryRepository } = buildService();

    await service.applyActions({
      workspaceId: WORKSPACE_ID,
      userWorkspaceId: USER_WORKSPACE_ID,
      actions: [
        { type: 'create', content: '   ' },
        { type: 'update', id: 'memory-1', content: '' },
      ],
    });

    expect(memoryRepository.insert).not.toHaveBeenCalled();
    expect(memoryRepository.update).not.toHaveBeenCalled();
  });
});
