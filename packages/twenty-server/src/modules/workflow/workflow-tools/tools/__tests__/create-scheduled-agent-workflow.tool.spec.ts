import { FieldActorSource } from 'twenty-shared/types';
import { WorkflowActionType } from 'twenty-shared/workflow';

import { createCreateScheduledAgentWorkflowTool } from 'src/modules/workflow/workflow-tools/tools/create-scheduled-agent-workflow.tool';
import { WorkflowTriggerType } from 'src/modules/workflow/workflow-trigger/types/workflow-trigger.type';

describe('createCreateScheduledAgentWorkflowTool', () => {
  const actorContext = {
    source: FieldActorSource.MANUAL,
    workspaceMemberId: 'workspace-member-id',
    name: 'Tim Apple',
    context: {},
  };

  const buildDeps = () => {
    const insertedWorkflows: Array<Record<string, unknown>> = [];
    let insertedVersion: Record<string, unknown> | undefined;
    let createdStepType: string | undefined;
    let updatedStepPrompt: string | undefined;
    let updatedAgentPrompt: string | undefined;
    let activatedWorkflowVersionId: string | undefined;

    const workflowRepository = {
      insert: jest.fn(async (workflow) => {
        insertedWorkflows.push(workflow);
      }),
      update: jest.fn(),
    };

    const deps = {
      workspaceOrmManager: {
        executeInWorkspaceContext: jest.fn(
          async (callback: () => Promise<unknown>) => callback(),
        ),
        getRepository: jest.fn(() => workflowRepository),
      },
      recordPositionService: {
        buildRecordPosition: jest.fn(async () => 1),
      },
      workflowVersionCoreSyncService: {
        writeWorkflowVersionAndMirror: jest.fn(
          async (
            _workspaceId: string,
            callback: (
              repository: {
                insert: (version: Record<string, unknown>) => Promise<void>;
              },
            ) => Promise<string>,
          ) =>
            callback({
              insert: async (version) => {
                insertedVersion = version;
              },
            }),
        ),
      },
      workflowVersionStepService: {
        createWorkflowVersionStep: jest.fn(async ({ input }) => {
          createdStepType = input.stepType;
        }),
        updateWorkflowVersionStep: jest.fn(async ({ step }) => {
          updatedStepPrompt = step.settings.input.prompt;
        }),
      },
      workflowCommonService: {
        getWorkflowVersionOrFail: jest.fn(async () => ({
          id: 'workflow-version-id',
          steps: [
            {
              id: 'ai-agent-step-id',
              type: WorkflowActionType.AI_AGENT,
              name: 'AI Agent',
              valid: true,
              settings: {
                input: {
                  agentId: 'agent-id',
                  prompt: '',
                },
              },
            },
          ],
        })),
      },
      agentService: {
        updateOneAgent: jest.fn(async ({ input }) => {
          updatedAgentPrompt = input.prompt;

          return { id: input.id };
        }),
      },
      workflowVersionService: {
        autoLayoutWorkflowVersion: jest.fn(),
      },
      workflowTriggerService: {
        activateWorkflowVersion: jest.fn(async (workflowVersionId: string) => {
          activatedWorkflowVersionId = workflowVersionId;
        }),
      },
    };

    return {
      deps,
      insertedWorkflows,
      getInsertedVersion: () => insertedVersion,
      getCreatedStepType: () => createdStepType,
      getUpdatedStepPrompt: () => updatedStepPrompt,
      getUpdatedAgentPrompt: () => updatedAgentPrompt,
      getActivatedWorkflowVersionId: () => activatedWorkflowVersionId,
      workflowRepository,
    };
  };

  it('creates an active cron workflow with an AI agent step stamped as the chatting user', async () => {
    const {
      deps,
      insertedWorkflows,
      getInsertedVersion,
      getCreatedStepType,
      getUpdatedStepPrompt,
      getUpdatedAgentPrompt,
      getActivatedWorkflowVersionId,
      workflowRepository,
    } = buildDeps();

    const tool = createCreateScheduledAgentWorkflowTool(deps as never, {
      workspaceId: 'workspace-id',
      rolePermissionConfig: { shouldBypassPermissionChecks: true },
      actorContext,
      userWorkspaceId: 'user-workspace-id',
    });

    const result = await tool.execute({
      name: 'Weekly pipeline check',
      prompt: 'Summarise open opportunities every Monday',
      cronPattern: '0 9 * * 1',
    });

    expect(result.success).toBe(true);
    expect(insertedWorkflows[0]).toMatchObject({
      name: 'Weekly pipeline check',
      createdBy: actorContext,
    });
    expect(getInsertedVersion()?.trigger).toMatchObject({
      type: WorkflowTriggerType.CRON,
      settings: {
        type: 'CUSTOM',
        pattern: '0 9 * * 1',
      },
    });
    expect(getCreatedStepType()).toBe(WorkflowActionType.AI_AGENT);
    expect(getUpdatedStepPrompt()).toBe(
      'Summarise open opportunities every Monday',
    );
    expect(getUpdatedAgentPrompt()).toContain('scheduled assistant');
    expect(getActivatedWorkflowVersionId()).toBeDefined();
    expect(workflowRepository.update).toHaveBeenCalled();
  });
});
