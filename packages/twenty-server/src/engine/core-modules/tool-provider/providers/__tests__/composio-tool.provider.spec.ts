import { ToolCategory } from 'twenty-shared/ai';

jest.mock(
  'src/engine/core-modules/composio/services/composio-client.service',
  () => ({
    ComposioClientService: class ComposioClientService {},
  }),
);

jest.mock(
  'src/engine/core-modules/composio/services/composio-session.service',
  () => ({
    ComposioSessionService: class ComposioSessionService {},
  }),
);

jest.mock('@composio/core', () => ({}));

import { ComposioToolProvider } from 'src/engine/core-modules/tool-provider/providers/composio-tool.provider';

describe('ComposioToolProvider', () => {
  const composioClientService = {
    isConfigured: jest.fn(),
    getClient: jest.fn(),
  };
  const composioSessionService = {
    getSession: jest.fn(),
    trySyncUserSessionAccounts: jest.fn(),
  };

  const provider = new ComposioToolProvider(
    composioClientService as never,
    composioSessionService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is unavailable when Composio is not configured', async () => {
    composioClientService.isConfigured.mockReturnValue(false);

    await expect(
      provider.isAvailable({
        workspaceId: 'ws',
        roleId: 'role',
        rolePermissionConfig: {} as never,
        userWorkspaceId: 'uw',
      }),
    ).resolves.toBe(false);
  });

  it('is unavailable without userWorkspaceId', async () => {
    composioClientService.isConfigured.mockReturnValue(true);

    await expect(
      provider.isAvailable({
        workspaceId: 'ws',
        roleId: 'role',
        rolePermissionConfig: {} as never,
      }),
    ).resolves.toBe(false);
  });

  it('emits the five meta-tool descriptors', async () => {
    const descriptors = await provider.generateDescriptors(
      {
        workspaceId: 'ws',
        roleId: 'role',
        rolePermissionConfig: {} as never,
        userWorkspaceId: 'uw',
      },
      { includeSchemas: false },
    );

    expect(descriptors.map((descriptor) => descriptor.name)).toEqual([
      'composio_search_tools',
      'composio_get_tool_schemas',
      'composio_execute_tool',
      'composio_manage_connections',
      'composio_wait_for_connections',
    ]);
    expect(descriptors[0].category).toBe(ToolCategory.INTEGRATION);
  });

  it('executes search through the user session', async () => {
    const search = jest.fn().mockResolvedValue({
      success: true,
      results: [],
    });

    composioSessionService.getSession.mockResolvedValue({ search });

    const output = await provider.executeStaticTool(
      'composio_search_tools',
      { query: 'send email' },
      {
        workspaceId: 'ws',
        roleId: 'role',
        rolePermissionConfig: {} as never,
        userWorkspaceId: 'uw-1',
      },
    );

    expect(composioSessionService.getSession).toHaveBeenCalledWith('uw-1');
    expect(search).toHaveBeenCalledWith({ query: 'send email' });
    expect(output.success).toBe(true);
  });

  it('starts connection management through COMPOSIO_MANAGE_CONNECTIONS', async () => {
    const execute = jest.fn().mockResolvedValue({
      data: {
        results: {
          googlecalendar: {
            redirect_url: 'https://oauth.example/start',
          },
        },
      },
    });

    composioSessionService.getSession.mockResolvedValue({ execute });
    composioSessionService.trySyncUserSessionAccounts = jest
      .fn()
      .mockResolvedValue(undefined);

    const output = await provider.executeStaticTool(
      'composio_manage_connections',
      { toolkits: ['googlecalendar'] },
      {
        workspaceId: 'ws',
        roleId: 'role',
        rolePermissionConfig: {} as never,
        userWorkspaceId: 'uw-1',
      },
    );

    expect(execute).toHaveBeenCalledWith('COMPOSIO_MANAGE_CONNECTIONS', {
      toolkits: ['googlecalendar'],
    });
    expect(
      composioSessionService.trySyncUserSessionAccounts,
    ).toHaveBeenCalledWith('uw-1');
    expect(output.success).toBe(true);
  });

  it('fails execute without userWorkspaceId', async () => {
    const output = await provider.executeStaticTool(
      'composio_execute_tool',
      { toolSlug: 'GMAIL_SEND_EMAIL' },
      {
        workspaceId: 'ws',
        roleId: 'role',
        rolePermissionConfig: {} as never,
      },
    );

    expect(output.success).toBe(false);
    expect(composioSessionService.getSession).not.toHaveBeenCalled();
  });
});
