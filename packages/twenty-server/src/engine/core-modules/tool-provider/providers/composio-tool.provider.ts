import { Injectable, Logger } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';
import { z } from 'zod';

import { ToolCategory } from 'twenty-shared/ai';
import { toToolJsonSchema } from 'src/engine/core-modules/record-crud/utils/to-tool-json-schema.util';
import { ComposioClientService } from 'src/engine/core-modules/composio/services/composio-client.service';
import { ComposioSessionService } from 'src/engine/core-modules/composio/services/composio-session.service';
import { type GenerateDescriptorOptions } from 'src/engine/core-modules/tool-provider/interfaces/generate-descriptor-options.type';
import { type ToolProvider } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider.interface';
import { type ToolProviderContext } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider-context.type';
import { type ToolDescriptor } from 'src/engine/core-modules/tool-provider/types/tool-descriptor.type';
import { type ToolIndexEntry } from 'src/engine/core-modules/tool-provider/types/tool-index-entry.type';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';

export const COMPOSIO_SEARCH_TOOLS_TOOL_NAME = 'composio_search_tools';
export const COMPOSIO_GET_TOOL_SCHEMAS_TOOL_NAME = 'composio_get_tool_schemas';
export const COMPOSIO_EXECUTE_TOOL_TOOL_NAME = 'composio_execute_tool';
export const COMPOSIO_MANAGE_CONNECTIONS_TOOL_NAME =
  'composio_manage_connections';
export const COMPOSIO_WAIT_FOR_CONNECTIONS_TOOL_NAME =
  'composio_wait_for_connections';

export const COMPOSIO_META_TOOL_NAMES = [
  COMPOSIO_SEARCH_TOOLS_TOOL_NAME,
  COMPOSIO_GET_TOOL_SCHEMAS_TOOL_NAME,
  COMPOSIO_EXECUTE_TOOL_TOOL_NAME,
  COMPOSIO_MANAGE_CONNECTIONS_TOOL_NAME,
  COMPOSIO_WAIT_FOR_CONNECTIONS_TOOL_NAME,
] as const;

const composioSearchToolsInputSchema = z.object({
  query: z
    .string()
    .describe(
      'Natural-language description of what you want to do with a connected integration (e.g. "send an email via Gmail", "create a Slack message").',
    ),
  toolkits: z
    .array(z.string())
    .optional()
    .describe(
      'Optional toolkit slugs to restrict the search (e.g. ["gmail", "slack"]).',
    ),
});

const composioGetToolSchemasInputSchema = z.object({
  toolSlugs: z
    .array(z.string())
    .min(1)
    .describe(
      'Exact Composio tool slugs returned by composio_search_tools (e.g. ["GMAIL_SEND_EMAIL"]).',
    ),
});

const composioExecuteToolInputSchema = z.object({
  toolSlug: z
    .string()
    .optional()
    .describe(
      'Exact Composio tool slug to execute. Prefer this for a single tool call.',
    ),
  arguments: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Arguments matching the schema from composio_get_tool_schemas.'),
  tools: z
    .array(
      z.object({
        toolSlug: z.string(),
        arguments: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .optional()
    .describe(
      'Execute multiple tools in one call. Prefer toolSlug/arguments for a single tool.',
    ),
  account: z
    .string()
    .optional()
    .describe(
      'Optional connected-account id or alias when multiple accounts exist for the toolkit.',
    ),
});

const composioManageConnectionsInputSchema = z.object({
  toolkits: z
    .array(z.string())
    .min(1)
    .describe(
      'Toolkit slugs to check or connect (e.g. ["gmail", "googlecalendar", "slack"]). Use real toolkit slugs from search results — never invent them.',
    ),
  reinitiateAll: z
    .boolean()
    .optional()
    .describe(
      'Force a fresh auth flow even if an active connection already exists. Default false.',
    ),
});

const composioWaitForConnectionsInputSchema = z.object({
  toolkits: z
    .array(z.string())
    .min(1)
    .describe(
      'Toolkit slugs to wait on after the user has been shown an auth link from composio_manage_connections.',
    ),
  mode: z
    .enum(['any', 'all'])
    .optional()
    .describe(
      'Wait until any listed toolkit becomes active ("any") or all of them ("all"). Default any.',
    ),
});

type ComposioMetaToolDefinition = {
  name: (typeof COMPOSIO_META_TOOL_NAMES)[number];
  label: string;
  description: string;
  inputSchema: z.ZodTypeAny;
};

const COMPOSIO_META_TOOLS: ComposioMetaToolDefinition[] = [
  {
    name: COMPOSIO_SEARCH_TOOLS_TOOL_NAME,
    label: 'Search Integrations',
    description:
      'Search connected third-party integrations for relevant actions. Call this first when the user asks to do something in Gmail, Slack, Notion, HubSpot, or another linked integration. Returns tool slugs and guidance — then call composio_get_tool_schemas before executing. If a tool needs an account and none is linked, call composio_manage_connections.',
    inputSchema: composioSearchToolsInputSchema,
  },
  {
    name: COMPOSIO_GET_TOOL_SCHEMAS_TOOL_NAME,
    label: 'Get Integration Tool Schemas',
    description:
      'Load input schemas for Composio tool slugs returned by composio_search_tools. Call this before composio_execute_tool.',
    inputSchema: composioGetToolSchemasInputSchema,
  },
  {
    name: COMPOSIO_EXECUTE_TOOL_TOOL_NAME,
    label: 'Execute Integration Tool',
    description:
      'Execute a connected-integration action by tool slug with arguments from composio_get_tool_schemas. Uses the logged-in user’s linked accounts. If the result says no active connection, call composio_manage_connections with the toolkit slug and show the user the returned auth URL.',
    inputSchema: composioExecuteToolInputSchema,
  },
  {
    name: COMPOSIO_MANAGE_CONNECTIONS_TOOL_NAME,
    label: 'Manage Integration Connections',
    description:
      'List connection status for toolkit slugs and start OAuth/API-key linking when missing. Returns an auth URL the user can open to finish connecting. Use when the user asks to connect an app, or when execute fails with no active connection. After sharing the URL, you may call composio_wait_for_connections. Speak in plain language — never mention Composio.',
    inputSchema: composioManageConnectionsInputSchema,
  },
  {
    name: COMPOSIO_WAIT_FOR_CONNECTIONS_TOOL_NAME,
    label: 'Wait for Integration Connections',
    description:
      'After sharing an auth link from composio_manage_connections, wait until the listed toolkit(s) finish connecting (or fail). Call only after the user has been given the link.',
    inputSchema: composioWaitForConnectionsInputSchema,
  },
];

@Injectable()
export class ComposioToolProvider implements ToolProvider {
  readonly category = ToolCategory.INTEGRATION;

  private readonly logger = new Logger(ComposioToolProvider.name);

  constructor(
    private readonly composioClientService: ComposioClientService,
    private readonly composioSessionService: ComposioSessionService,
  ) {}

  async isAvailable(context: ToolProviderContext): Promise<boolean> {
    return (
      this.composioClientService.isConfigured() &&
      isNonEmptyString(context.userWorkspaceId)
    );
  }

  async generateDescriptors(
    _context: ToolProviderContext,
    options?: GenerateDescriptorOptions,
  ): Promise<(ToolIndexEntry | ToolDescriptor)[]> {
    const includeSchemas = options?.includeSchemas ?? true;

    return COMPOSIO_META_TOOLS.map((tool) => ({
      name: tool.name,
      label: tool.label,
      description: tool.description,
      category: ToolCategory.INTEGRATION,
      icon: 'IconPlug',
      ...(includeSchemas && {
        inputSchema: toToolJsonSchema(tool.inputSchema),
      }),
      executionRef: { kind: 'static' as const, toolId: tool.name },
    }));
  }

  async executeStaticTool(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolProviderContext,
  ): Promise<ToolOutput> {
    const userWorkspaceId = context.userWorkspaceId;

    if (!isNonEmptyString(userWorkspaceId)) {
      return {
        success: false,
        message: 'Integrations require a logged-in user',
        error: 'Missing userWorkspaceId',
      };
    }

    try {
      const session =
        await this.composioSessionService.getSession(userWorkspaceId);

      switch (toolName) {
        case COMPOSIO_SEARCH_TOOLS_TOOL_NAME: {
          const parsed = composioSearchToolsInputSchema.parse(args);
          const result = await session.search({
            query: parsed.query,
            ...(isDefined(parsed.toolkits)
              ? { toolkits: parsed.toolkits }
              : {}),
          });

          return {
            success: true,
            message: 'Integration search completed',
            result,
          };
        }
        case COMPOSIO_GET_TOOL_SCHEMAS_TOOL_NAME: {
          const parsed = composioGetToolSchemasInputSchema.parse(args);
          const result = await session.execute('COMPOSIO_GET_TOOL_SCHEMAS', {
            tool_slugs: parsed.toolSlugs,
            toolSlugs: parsed.toolSlugs,
          });

          return {
            success: true,
            message: 'Loaded integration tool schemas',
            result,
          };
        }
        case COMPOSIO_EXECUTE_TOOL_TOOL_NAME: {
          const parsed = composioExecuteToolInputSchema.parse(args);
          const executeOptions = isNonEmptyString(parsed.account)
            ? { account: parsed.account }
            : undefined;

          if (isDefined(parsed.tools) && parsed.tools.length > 0) {
            const result = await session.execute(
              'COMPOSIO_MULTI_EXECUTE_TOOL',
              {
                tools: parsed.tools.map((tool) => ({
                  tool_slug: tool.toolSlug,
                  arguments: tool.arguments ?? {},
                })),
              },
              executeOptions,
            );

            return {
              success: true,
              message: `Executed ${parsed.tools.length} integration tool${
                parsed.tools.length === 1 ? '' : 's'
              }`,
              result,
            };
          }

          if (!isNonEmptyString(parsed.toolSlug)) {
            return {
              success: false,
              message: 'toolSlug or tools is required',
              error: 'Provide toolSlug (and optional arguments) or tools[]',
            };
          }

          const result = await session.execute(
            parsed.toolSlug,
            parsed.arguments ?? {},
            executeOptions,
          );

          return {
            success: true,
            message: `Executed ${parsed.toolSlug}`,
            result,
          };
        }
        case COMPOSIO_MANAGE_CONNECTIONS_TOOL_NAME: {
          const parsed = composioManageConnectionsInputSchema.parse(args);
          const result = await session.execute('COMPOSIO_MANAGE_CONNECTIONS', {
            toolkits: parsed.toolkits,
            ...(isDefined(parsed.reinitiateAll)
              ? {
                  reinitiate_all: parsed.reinitiateAll,
                  reinitiateAll: parsed.reinitiateAll,
                }
              : {}),
          });

          await this.composioSessionService.trySyncUserSessionAccounts(
            userWorkspaceId,
          );

          return {
            success: true,
            message:
              'Share any returned auth/redirect URL with the user so they can finish connecting. Then optionally call composio_wait_for_connections.',
            result,
          };
        }
        case COMPOSIO_WAIT_FOR_CONNECTIONS_TOOL_NAME: {
          const parsed = composioWaitForConnectionsInputSchema.parse(args);
          const result = await session.execute(
            'COMPOSIO_WAIT_FOR_CONNECTIONS',
            {
              toolkits: parsed.toolkits,
              ...(isDefined(parsed.mode) ? { mode: parsed.mode } : {}),
            },
          );

          await this.composioSessionService.trySyncUserSessionAccounts(
            userWorkspaceId,
          );

          return {
            success: true,
            message: 'Finished waiting for integration connections',
            result,
          };
        }
        default:
          return {
            success: false,
            message: `Unknown integration tool "${toolName}"`,
            error: `Unknown integration tool "${toolName}"`,
          };
      }
    } catch (error) {
      this.logger.error(
        `Composio tool ${toolName} failed for ${userWorkspaceId}`,
        error instanceof Error ? error.stack : String(error),
      );

      return {
        success: false,
        message: `Integration tool failed`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
