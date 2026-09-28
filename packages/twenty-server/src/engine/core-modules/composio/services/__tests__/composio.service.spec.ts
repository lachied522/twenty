jest.mock('@composio/core', () => ({
  AuthScheme: {
    APIKey: jest.fn((credentials: unknown) => credentials),
  },
}));

jest.mock(
  'src/engine/core-modules/composio/utils/composio-auth-config.util',
  () => ({
    isNoAuthToolkit: jest.fn(() => false),
    resolveAuthConfig: jest.fn(),
    organisationNotConfiguredMessage: jest.fn(
      (toolkitName: string) => `${toolkitName} is not configured`,
    ),
  }),
);

import { resolveAuthConfig } from 'src/engine/core-modules/composio/utils/composio-auth-config.util';
import { ComposioService } from 'src/engine/core-modules/composio/services/composio.service';
import {
  ComposioException,
  ComposioExceptionCode,
} from 'src/engine/core-modules/composio/composio.exception';

describe('ComposioService', () => {
  const listToolkits = jest.fn();
  const retrieveCategories = jest.fn();
  const listConnectedAccounts = jest.fn();
  const linkConnectedAccount = jest.fn();
  const deleteConnectedAccount = jest.fn();
  const waitForConnection = jest.fn();
  const getConnectedAccount = jest.fn();

  const composioClient = {
    getClient: () => ({
      toolkits: { list: listToolkits, retrieveCategories },
    }),
    connectedAccounts: {
      list: listConnectedAccounts,
      link: linkConnectedAccount,
      delete: deleteConnectedAccount,
      waitForConnection,
      get: getConnectedAccount,
    },
  };

  const composioClientService = {
    isConfigured: jest.fn(() => true),
    getClient: jest.fn(() => composioClient),
  };

  const composioAccountsService = {
    listUserConnectedAccounts: jest.fn(),
    getOwnedConnectedAccount: jest.fn(),
  };

  const composioSessionService = {
    trySyncUserSessionAccounts: jest.fn(),
  };

  const service = new ComposioService(
    composioClientService as never,
    composioAccountsService as never,
    composioSessionService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    Reflect.set(service, 'toolkitCategoryCatalog', null);
    composioClientService.isConfigured.mockReturnValue(true);
    (resolveAuthConfig as jest.Mock).mockResolvedValue({
      toolkitName: 'Gmail',
      authConfigId: 'auth-1',
      authScheme: 'OAUTH2',
      isComposioManaged: true,
      connectMode: 'redirect',
      connectFields: [],
      configurationError: null,
    });
  });

  it('lists toolkits with connection status for the user workspace', async () => {
    listToolkits.mockResolvedValue({
      items: [
        {
          slug: 'gmail',
          name: 'Gmail',
          meta: { description: 'Email', logo: null },
          no_auth: false,
        },
      ],
      next_cursor: null,
    });
    listConnectedAccounts.mockResolvedValue({
      items: [
        {
          id: 'acc-1',
          status: 'ACTIVE',
          isDisabled: false,
          toolkit: { slug: 'gmail' },
        },
      ],
    });

    const result = await service.listToolkits({
      userWorkspaceId: 'uw-1',
      search: 'gma',
    });

    expect(listConnectedAccounts).toHaveBeenCalledWith({
      userIds: ['uw-1'],
    });
    expect(result.items).toEqual([
      expect.objectContaining({
        slug: 'gmail',
        name: 'Gmail',
        status: 'connected',
        accountCount: 1,
      }),
    ]);
  });

  it('passes the category filter through to Composio', async () => {
    listToolkits.mockResolvedValue({
      items: [],
      next_cursor: null,
    });
    listConnectedAccounts.mockResolvedValue({ items: [] });

    await service.listToolkits({
      userWorkspaceId: 'uw-1',
      category: 'crm',
    });

    expect(listToolkits).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'crm' }),
    );
  });

  it('lists categories with toolkit counts from the catalog', async () => {
    const crmToolkits = Array.from({ length: 20 }, (_, index) => ({
      slug: `crm-${index}`,
      name: `CRM ${index}`,
      meta: { categories: [{ id: 'crm', name: 'crm' }] },
    }));

    listToolkits.mockResolvedValue({
      items: [
        ...crmToolkits,
        {
          slug: 'gmail',
          name: 'Gmail',
          meta: {
            categories: [
              { id: 'crm', name: 'crm' },
              { id: 'email', name: 'email' },
            ],
          },
        },
        {
          slug: 'tiny',
          name: 'Tiny',
          meta: { categories: [{ id: 'tag1', name: 'tag1' }] },
        },
      ],
      total_items: 22,
      next_cursor: null,
    });

    const result = await service.listToolkitCategories();

    expect(listToolkits).toHaveBeenCalledWith({ limit: 1000 });
    expect(result).toEqual({
      totalCount: 22,
      categories: [{ id: 'crm', name: 'CRM', toolkitCount: 21 }],
    });
  });

  it('starts an OAuth connect and returns the redirect URL', async () => {
    composioAccountsService.listUserConnectedAccounts.mockResolvedValue([]);
    linkConnectedAccount.mockResolvedValue({
      id: 'acc-new',
      redirectUrl: 'https://oauth.example/start',
    });

    const result = await service.connectToolkit({
      userWorkspaceId: 'uw-1',
      toolkitSlug: 'gmail',
      callbackUrl: 'http://localhost:3001/integrations?toolkit=gmail',
    });

    expect(linkConnectedAccount).toHaveBeenCalledWith(
      'uw-1',
      'auth-1',
      expect.objectContaining({
        callbackUrl: 'http://localhost:3001/integrations?toolkit=gmail',
        allowMultiple: false,
      }),
    );
    expect(result).toEqual({
      redirectUrl: 'https://oauth.example/start',
      connectedAccountId: 'acc-new',
    });
  });

  it('waits for an owned account and syncs the session', async () => {
    composioAccountsService.getOwnedConnectedAccount.mockResolvedValue({
      id: 'acc-1',
      status: 'INITIATED',
    });
    waitForConnection.mockResolvedValue({
      id: 'acc-1',
      alias: null,
      status: 'ACTIVE',
      isDisabled: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const account = await service.waitForAccount({
      userWorkspaceId: 'uw-1',
      accountId: 'acc-1',
    });

    expect(waitForConnection).toHaveBeenCalledWith('acc-1', 45_000);
    expect(
      composioSessionService.trySyncUserSessionAccounts,
    ).toHaveBeenCalledWith('uw-1');
    expect(account).toEqual(
      expect.objectContaining({
        id: 'acc-1',
        status: 'active',
      }),
    );
  });

  it('deletes an owned account and syncs the session', async () => {
    composioAccountsService.getOwnedConnectedAccount.mockResolvedValue({
      id: 'acc-1',
    });
    deleteConnectedAccount.mockResolvedValue(undefined);

    await expect(
      service.deleteAccount({
        userWorkspaceId: 'uw-1',
        accountId: 'acc-1',
      }),
    ).resolves.toBe(true);

    expect(deleteConnectedAccount).toHaveBeenCalledWith('acc-1');
    expect(
      composioSessionService.trySyncUserSessionAccounts,
    ).toHaveBeenCalledWith('uw-1');
  });

  it('rejects wait/delete for accounts the user does not own', async () => {
    composioAccountsService.getOwnedConnectedAccount.mockResolvedValue(null);

    await expect(
      service.waitForAccount({
        userWorkspaceId: 'uw-1',
        accountId: 'acc-other',
      }),
    ).rejects.toMatchObject({
      code: ComposioExceptionCode.NOT_FOUND,
    });

    await expect(
      service.deleteAccount({
        userWorkspaceId: 'uw-1',
        accountId: 'acc-other',
      }),
    ).rejects.toBeInstanceOf(ComposioException);
  });
});
