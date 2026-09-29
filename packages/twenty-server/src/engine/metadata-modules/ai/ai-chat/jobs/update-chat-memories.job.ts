import { Logger } from '@nestjs/common';

import { Process } from 'src/engine/core-modules/message-queue/decorators/process.decorator';
import { Processor } from 'src/engine/core-modules/message-queue/decorators/processor.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { UPDATE_CHAT_MEMORIES_JOB_NAME } from 'src/engine/metadata-modules/ai/ai-chat/constants/update-chat-memories-job-name.constant';
import { type UpdateChatMemoriesJobData } from 'src/engine/metadata-modules/ai/ai-chat/jobs/update-chat-memories-job.types';
import { ChatMemoryManagerService } from 'src/engine/metadata-modules/ai/ai-chat/services/chat-memory-manager.service';

@Processor(MessageQueue.aiQueue)
export class UpdateChatMemoriesJob {
  private readonly logger = new Logger(UpdateChatMemoriesJob.name);

  constructor(
    private readonly chatMemoryManagerService: ChatMemoryManagerService,
  ) {}

  @Process(UPDATE_CHAT_MEMORIES_JOB_NAME)
  async handle(data: UpdateChatMemoriesJobData): Promise<void> {
    if (!data.threadId || !data.workspaceId || !data.userWorkspaceId) {
      this.logger.warn('Skipping chat memory update: missing job data');

      return;
    }

    await this.chatMemoryManagerService.updateMemoriesForTurn(data);
  }
}
