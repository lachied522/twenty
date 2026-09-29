import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { AgentMessageEntity } from 'src/engine/metadata-modules/ai/ai-agent-execution/entities/agent-message.entity';
import { CHAT_MEMORY_MAX_COUNT } from 'src/engine/metadata-modules/ai/ai-chat/constants/chat-memory-max-count.constant';
import { AgentUserMemoryEntity } from 'src/engine/metadata-modules/ai/ai-chat/entities/agent-user-memory.entity';
import { type ChatMemoryAction } from 'src/engine/metadata-modules/ai/ai-chat/types/chat-memory-action.type';
import { InjectWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/inject-workspace-scoped-repository.decorator';
import { WorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/workspace-scoped-repository';

const CHAT_MEMORY_ACTION_ORDER = {
  delete: 0,
  update: 1,
  create: 2,
} as const;

@Injectable()
export class AgentUserMemoryService {
  constructor(
    @InjectWorkspaceScopedRepository(AgentUserMemoryEntity)
    private readonly memoryRepository: WorkspaceScopedRepository<AgentUserMemoryEntity>,
    @InjectWorkspaceScopedRepository(AgentMessageEntity)
    private readonly messageRepository: WorkspaceScopedRepository<AgentMessageEntity>,
  ) {}

  async findByUserWorkspaceId({
    workspaceId,
    userWorkspaceId,
  }: {
    workspaceId: string;
    userWorkspaceId: string;
  }): Promise<AgentUserMemoryEntity[]> {
    return this.memoryRepository.find(workspaceId, {
      where: { userWorkspaceId },
      order: { createdAt: 'ASC' },
    });
  }

  async findThreadMessages({
    workspaceId,
    threadId,
  }: {
    workspaceId: string;
    threadId: string;
  }): Promise<AgentMessageEntity[]> {
    return this.messageRepository.find(workspaceId, {
      where: { threadId, isHidden: false },
      order: { processedAt: { direction: 'ASC', nulls: 'LAST' } },
      relations: ['parts'],
    });
  }

  async applyActions({
    workspaceId,
    userWorkspaceId,
    actions,
  }: {
    workspaceId: string;
    userWorkspaceId: string;
    actions: ChatMemoryAction[];
  }): Promise<void> {
    let memoryCount = await this.memoryRepository.count(workspaceId, {
      where: { userWorkspaceId },
    });

    const orderedActions = [...actions].sort(
      (leftAction, rightAction) =>
        CHAT_MEMORY_ACTION_ORDER[leftAction.type] -
        CHAT_MEMORY_ACTION_ORDER[rightAction.type],
    );

    for (const action of orderedActions) {
      switch (action.type) {
        case 'create': {
          const content = action.content.trim();

          if (
            !isNonEmptyString(content) ||
            memoryCount >= CHAT_MEMORY_MAX_COUNT
          ) {
            break;
          }

          await this.memoryRepository.insert(workspaceId, {
            userWorkspaceId,
            content,
          });
          memoryCount += 1;
          break;
        }
        case 'update': {
          const content = action.content.trim();

          if (!isNonEmptyString(content)) {
            break;
          }

          await this.memoryRepository.update(
            workspaceId,
            { id: action.id, userWorkspaceId },
            { content },
          );
          break;
        }
        case 'delete': {
          if (!isNonEmptyString(action.id)) {
            break;
          }

          const deleteResult = await this.memoryRepository.delete(workspaceId, {
            id: action.id,
            userWorkspaceId,
          });

          if (isDefined(deleteResult.affected) && deleteResult.affected > 0) {
            memoryCount = Math.max(0, memoryCount - deleteResult.affected);
          }
          break;
        }
      }
    }
  }
}
