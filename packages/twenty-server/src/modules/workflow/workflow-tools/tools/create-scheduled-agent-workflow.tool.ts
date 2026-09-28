import { isDefined } from 'twenty-shared/utils';
import { TRIGGER_STEP_ID, WorkflowActionType } from 'twenty-shared/workflow';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { type RolePermissionConfig } from 'src/engine/twenty-orm/types/role-permission-config';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';
import {
  WorkflowVersionStatus,
  type WorkflowVersionWorkspaceEntity,
} from 'src/modules/workflow/common/standard-objects/workflow-version.workspace-entity';
import { WorkflowStatus } from 'src/modules/workflow/common/standard-objects/workflow.workspace-entity';
import { isWorkflowAiAgentAction } from 'src/modules/workflow/workflow-executor/workflow-actions/ai-agent/guards/is-workflow-ai-agent-action.guard';
import {
  type WorkflowToolContext,
  type WorkflowToolDependencies,
} from 'src/modules/workflow/workflow-tools/types/workflow-tool-dependencies.type';
import { WorkflowTriggerType } from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';

const createScheduledAgentWorkflowSchema = z.object({
  name: z
    .string()
    .describe('A short name for the scheduled task / workflow'),
  prompt: z
    .string()
    .describe(
      'The instruction the AI agent should execute on each scheduled run',
    ),
  cronPattern: z
    .string()
    .describe(
      'A 5-field cron pattern (minute hour day-of-month month day-of-week), e.g. "0 9 * * 1" for every Monday at 09:00',
    ),
});

type CreateScheduledAgentWorkflowToolDeps = Pick<
  WorkflowToolDependencies,
  | 'workflowVersionService'
  | 'workflowVersionStepService'
  | 'workflowTriggerService'
  | 'workspaceOrmManager'
  | 'recordPositionService'
  | 'workflowVersionCoreSyncService'
  | 'agentService'
  | 'workflowCommonService'
>;

type CreateScheduledAgentWorkflowToolContext = WorkflowToolContext & {
  rolePermissionConfig: RolePermissionConfig;
};

const SCHEDULED_AGENT_SYSTEM_PROMPT = `You are a scheduled assistant running as part of a recurring workflow in Twenty CRM.

Complete the task in the user message thoroughly. Use available tools, skills, and connected integrations when they help. Prefer concrete actions over asking clarifying questions, since nobody is watching this run interactively.`;

export const createCreateScheduledAgentWorkflowTool = (
  deps: CreateScheduledAgentWorkflowToolDeps,
  context: CreateScheduledAgentWorkflowToolContext,
) => ({
  name: 'create_scheduled_agent_workflow' as const,
  description: `Create and activate a recurring scheduled workflow with a single AI Agent step.

Use this when the user asks to run a task on a schedule (daily, weekly, cron, recurring). Prefer this over create_complete_workflow for agent schedules: create_complete_workflow cannot create AI_AGENT steps.

Inputs:
- name: short workflow title
- prompt: the instruction the agent should execute on every run
- cronPattern: standard 5-field cron (minute hour day-of-month month day-of-week)

The workflow is activated immediately and appears under Workflows.`,
  inputSchema: createScheduledAgentWorkflowSchema,
  execute: async (parameters: {
    name: string;
    prompt: string;
    cronPattern: string;
  }) => {
    try {
      const workflowId = await createWorkflow({
        deps,
        context,
        name: parameters.name,
      });

      const workflowVersionId = await createCronDraftVersion({
        deps,
        context,
        workflowId,
        cronPattern: parameters.cronPattern,
      });

      await deps.workflowVersionStepService.createWorkflowVersionStep({
        workspaceId: context.workspaceId,
        input: {
          workflowVersionId,
          stepType: WorkflowActionType.AI_AGENT,
          parentStepId: TRIGGER_STEP_ID,
        },
      });

      const workflowVersion =
        await deps.workflowCommonService.getWorkflowVersionOrFail({
          workspaceId: context.workspaceId,
          workflowVersionId,
        });

      const aiAgentStep = (workflowVersion.steps ?? []).find(
        isWorkflowAiAgentAction,
      );

      if (!isDefined(aiAgentStep)) {
        throw new Error('AI Agent step was not created on the workflow');
      }

      const agentId = aiAgentStep.settings.input.agentId;

      if (!isDefined(agentId)) {
        throw new Error('AI Agent step is missing an agentId');
      }

      await deps.agentService.updateOneAgent({
        input: {
          id: agentId,
          prompt: SCHEDULED_AGENT_SYSTEM_PROMPT,
          label: parameters.name,
        },
        workspaceId: context.workspaceId,
      });

      await deps.workflowVersionStepService.updateWorkflowVersionStep({
        workspaceId: context.workspaceId,
        workflowVersionId,
        step: {
          ...aiAgentStep,
          name: parameters.name,
          settings: {
            ...aiAgentStep.settings,
            input: {
              ...aiAgentStep.settings.input,
              prompt: parameters.prompt,
            },
          },
        },
      });

      await deps.workflowVersionService.autoLayoutWorkflowVersion({
        workflowVersionId,
        workspaceId: context.workspaceId,
      });

      await deps.workflowTriggerService.activateWorkflowVersion(
        workflowVersionId,
        context.workspaceId,
      );

      await updateWorkflowStatus({
        deps,
        context,
        workflowId,
        workflowVersionId,
      });

      return {
        success: true,
        message: `Scheduled agent workflow "${parameters.name}" created and activated`,
        result: {
          workflowId,
          workflowVersionId,
          agentId,
          cronPattern: parameters.cronPattern,
        },
        recordReferences: [
          {
            objectNameSingular: 'workflow',
            recordId: workflowId,
            displayName: parameters.name,
          },
        ],
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create scheduled agent workflow "${parameters.name}": ${error.message}`,
        error: error.message,
      };
    }
  },
});

const createWorkflow = async ({
  deps,
  context,
  name,
}: {
  deps: CreateScheduledAgentWorkflowToolDeps;
  context: CreateScheduledAgentWorkflowToolContext;
  name: string;
}): Promise<string> => {
  const authContext = buildSystemAuthContext(context.workspaceId);

  return deps.workspaceOrmManager.executeInWorkspaceContext(async () => {
    const workflowRepository = deps.workspaceOrmManager.getRepository(
      'workflow',
      context.rolePermissionConfig,
    );

    const workflowPosition =
      await deps.recordPositionService.buildRecordPosition({
        value: 'first',
        objectMetadata: {
          isCustom: false,
          nameSingular: 'workflow',
        },
        workspaceId: context.workspaceId,
      });

    const workflowId = uuidv4();

    await workflowRepository.insert({
      id: workflowId,
      name,
      statuses: [WorkflowStatus.DRAFT],
      position: workflowPosition,
      ...(isDefined(context.actorContext)
        ? { createdBy: context.actorContext }
        : {}),
    });

    return workflowId;
  }, authContext);
};

const createCronDraftVersion = async ({
  deps,
  context,
  workflowId,
  cronPattern,
}: {
  deps: CreateScheduledAgentWorkflowToolDeps;
  context: CreateScheduledAgentWorkflowToolContext;
  workflowId: string;
  cronPattern: string;
}): Promise<string> => {
  const workflowVersionId = uuidv4();

  await deps.workflowVersionCoreSyncService.writeWorkflowVersionAndMirror(
    context.workspaceId,
    async (workflowVersionRepository) => {
      const versionPosition =
        await deps.recordPositionService.buildRecordPosition({
          value: 'first',
          objectMetadata: {
            isCustom: false,
            nameSingular: 'workflowVersion',
          },
          workspaceId: context.workspaceId,
        });

      await workflowVersionRepository.insert({
        id: workflowVersionId,
        workflowId,
        name: 'v1',
        status: WorkflowVersionStatus.DRAFT,
        trigger: {
          name: 'On a schedule',
          type: WorkflowTriggerType.CRON,
          settings: {
            type: 'CUSTOM',
            pattern: cronPattern,
            outputSchema: {},
          },
        },
        steps: [],
        position: versionPosition,
      } satisfies Partial<WorkflowVersionWorkspaceEntity>);

      return workflowVersionId;
    },
  );

  return workflowVersionId;
};

const updateWorkflowStatus = async ({
  deps,
  context,
  workflowId,
  workflowVersionId,
}: {
  deps: CreateScheduledAgentWorkflowToolDeps;
  context: CreateScheduledAgentWorkflowToolContext;
  workflowId: string;
  workflowVersionId: string;
}) => {
  const authContext = buildSystemAuthContext(context.workspaceId);

  await deps.workspaceOrmManager.executeInWorkspaceContext(async () => {
    const workflowRepository = deps.workspaceOrmManager.getRepository(
      'workflow',
      context.rolePermissionConfig,
    );

    await workflowRepository.update(workflowId, {
      statuses: [WorkflowStatus.ACTIVE],
      lastPublishedVersionId: workflowVersionId,
    });
  }, authContext);
};
