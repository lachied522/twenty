import { Injectable, Logger } from '@nestjs/common';

import {
  generateText,
  Output,
  type LanguageModelUsage,
  type StepResult,
  type ToolSet,
} from 'ai';
import { isDefined } from 'twenty-shared/utils';

import { InjectMessageQueue } from 'src/engine/core-modules/message-queue/decorators/message-queue.decorator';
import { MessageQueue } from 'src/engine/core-modules/message-queue/message-queue.constants';
import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { UsageOperationType } from 'src/engine/core-modules/usage/enums/usage-operation-type.enum';
import { AiBillingService } from 'src/engine/metadata-modules/ai/ai-billing/services/ai-billing.service';
import { extractCacheCreationTokensFromSteps } from 'src/engine/metadata-modules/ai/ai-billing/utils/extract-cache-creation-tokens.util';
import { CHAT_MEMORY_ACTIONS_SCHEMA } from 'src/engine/metadata-modules/ai/ai-chat/constants/chat-memory-actions.schema';
import { CHAT_MEMORY_MANAGER_SYSTEM_PROMPT } from 'src/engine/metadata-modules/ai/ai-chat/constants/chat-memory-manager-system-prompt.const';
import { UPDATE_CHAT_MEMORIES_JOB_NAME } from 'src/engine/metadata-modules/ai/ai-chat/constants/update-chat-memories-job-name.constant';
import { type UpdateChatMemoriesJobData } from 'src/engine/metadata-modules/ai/ai-chat/jobs/update-chat-memories-job.types';
import { AgentUserMemoryService } from 'src/engine/metadata-modules/ai/ai-chat/services/agent-user-memory.service';
import { type AgentChatTurnOutcome } from 'src/engine/metadata-modules/ai/ai-chat/types/agent-chat-turn-outcome.type';
import { buildChatMemoryManagerUserPrompt } from 'src/engine/metadata-modules/ai/ai-chat/utils/build-chat-memory-manager-user-prompt.util';
import { buildChatMemoryTranscriptMessages } from 'src/engine/metadata-modules/ai/ai-chat/utils/build-chat-memory-transcript-messages.util';
import { selectRecentChatMemoryMessages } from 'src/engine/metadata-modules/ai/ai-chat/utils/select-recent-chat-memory-messages.util';
import { shouldEnqueueChatMemoryUpdate } from 'src/engine/metadata-modules/ai/ai-chat/utils/should-enqueue-chat-memory-update.util';
import { AiModelRegistryService } from 'src/engine/metadata-modules/ai/ai-models/services/ai-model-registry.service';
import { buildAiTelemetry } from 'src/engine/metadata-modules/ai/ai-models/utils/build-ai-telemetry.util';
import { buildReasoningProviderOptions } from 'src/engine/metadata-modules/ai/ai-models/utils/build-reasoning-provider-options.util';

@Injectable()
export class ChatMemoryManagerService {
  private readonly logger = new Logger(ChatMemoryManagerService.name);

  constructor(
    private readonly agentUserMemoryService: AgentUserMemoryService,
    private readonly aiModelRegistryService: AiModelRegistryService,
    private readonly aiBillingService: AiBillingService,
    @InjectMessageQueue(MessageQueue.aiQueue)
    private readonly messageQueueService: MessageQueueService,
  ) {}

  async enqueueAfterCompletedTurn({
    outcome,
    threadId,
    workspaceId,
    userWorkspaceId,
  }: {
    outcome: AgentChatTurnOutcome | null | undefined;
    threadId: string;
    workspaceId: string;
    userWorkspaceId: string;
  }): Promise<void> {
    if (
      !shouldEnqueueChatMemoryUpdate({
        outcome,
        threadId,
        workspaceId,
        userWorkspaceId,
      })
    ) {
      return;
    }

    try {
      await this.messageQueueService.add<UpdateChatMemoriesJobData>(
        UPDATE_CHAT_MEMORIES_JOB_NAME,
        {
          threadId,
          workspaceId,
          userWorkspaceId,
        },
        {
          id: `update-chat-memories:${workspaceId}:${userWorkspaceId}`,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to enqueue chat memory update for thread ${threadId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async updateMemoriesForTurn({
    threadId,
    workspaceId,
    userWorkspaceId,
  }: UpdateChatMemoriesJobData): Promise<void> {
    try {
      await this.updateMemoriesForTurnOrThrow({
        threadId,
        workspaceId,
        userWorkspaceId,
      });
    } catch (error) {
      this.logger.warn(
        `Chat memory update failed for thread ${threadId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async updateMemoriesForTurnOrThrow({
    threadId,
    workspaceId,
    userWorkspaceId,
  }: UpdateChatMemoriesJobData): Promise<void> {
    const threadMessages = await this.agentUserMemoryService.findThreadMessages(
      {
        workspaceId,
        threadId,
      },
    );
    const recentMessages = selectRecentChatMemoryMessages(
      buildChatMemoryTranscriptMessages(threadMessages),
    );

    if (recentMessages.length === 0) {
      return;
    }

    const existingMemories =
      await this.agentUserMemoryService.findByUserWorkspaceId({
        workspaceId,
        userWorkspaceId,
      });

    await this.aiBillingService.assertAiExecutionAllowed({
      workspaceId,
      operationType: UsageOperationType.AI_CHAT_TOKEN,
      spenders: { userWorkspaceId },
    });

    const defaultModel =
      this.aiModelRegistryService.getDefaultModelForTier('fast');

    const today = new Intl.DateTimeFormat('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());

    let usage: LanguageModelUsage | undefined;
    let steps: StepResult<ToolSet>[] | undefined;

    try {
      const result = await generateText({
        model: defaultModel.model,
        providerOptions: buildReasoningProviderOptions(defaultModel),
        system: `${CHAT_MEMORY_MANAGER_SYSTEM_PROMPT}

Today's date is ${today}.`,
        prompt: buildChatMemoryManagerUserPrompt({
          messages: recentMessages,
          existingMemories,
        }),
        output: Output.object({ schema: CHAT_MEMORY_ACTIONS_SCHEMA }),
        ...buildAiTelemetry({
          functionId: 'chat-memory-manager',
          workspaceId,
          userWorkspaceId,
          threadId,
        }),
      });

      usage = result.usage;
      steps = result.steps;

      if (!isDefined(result.output) || result.output.actions.length === 0) {
        return;
      }

      await this.agentUserMemoryService.applyActions({
        workspaceId,
        userWorkspaceId,
        actions: result.output.actions,
      });
    } finally {
      if (isDefined(usage)) {
        void this.aiBillingService.calculateAndBillUsage(
          defaultModel.modelId,
          {
            usage,
            cacheCreationTokens: steps
              ? extractCacheCreationTokensFromSteps(steps)
              : 0,
          },
          workspaceId,
          UsageOperationType.AI_CHAT_TOKEN,
          null,
          userWorkspaceId,
        );
      }
    }
  }
}
