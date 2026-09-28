jest.mock('@composio/core', () => ({}));

import { buildComposioManageConnectionsConfig } from 'src/engine/core-modules/composio/constants/composio-manage-connections.const';
import { COMPOSIO_MULTI_ACCOUNT } from 'src/engine/core-modules/composio/constants/composio-multi-account.const';
import { ComposioSessionService } from 'src/engine/core-modules/composio/services/composio-session.service';

describe('ComposioSessionService', () => {
  const create = jest.fn();
  const use = jest.fn();
  const update = jest.fn();

  const composioClientService = {
    getClient: jest.fn(() => ({
      create,
      use,
    })),
  };

  const composioAccountsService = {
    listUserConnectedAccounts: jest.fn(),
  };

  const twentyConfigService = {
    get: jest.fn(() => 'http://localhost:3001'),
  };

  const userWorkspaceRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const service = new ComposioSessionService(
    composioClientService as never,
    composioAccountsService as never,
    twentyConfigService as never,
    userWorkspaceRepository as never,
  );

  const expectedSessionOptions = {
    multiAccount: { ...COMPOSIO_MULTI_ACCOUNT },
    manageConnections: buildComposioManageConnectionsConfig(
      'http://localhost:3001',
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    twentyConfigService.get.mockReturnValue('http://localhost:3001');
    use.mockResolvedValue({ sessionId: 'session-existing', update });
    create.mockResolvedValue({ sessionId: 'session-new' });
    update.mockResolvedValue(undefined);
  });

  it('creates a session with userWorkspaceId as the Composio user id', async () => {
    userWorkspaceRepository.findOne.mockResolvedValue({
      id: 'uw-1',
      composioSessionId: null,
    });

    const handle = await service.getOrCreateUserSession('uw-1');

    expect(create).toHaveBeenCalledWith('uw-1', expectedSessionOptions);
    expect(userWorkspaceRepository.update).toHaveBeenCalledWith(
      { id: 'uw-1' },
      { composioSessionId: 'session-new' },
    );
    expect(handle).toEqual({ sessionId: 'session-new' });
  });

  it('reuses a stored session id when still valid', async () => {
    userWorkspaceRepository.findOne.mockResolvedValue({
      id: 'uw-1',
      composioSessionId: 'session-existing',
    });

    const handle = await service.getOrCreateUserSession('uw-1');

    expect(use).toHaveBeenCalledWith('session-existing');
    expect(update).toHaveBeenCalledWith(expectedSessionOptions);
    expect(create).not.toHaveBeenCalled();
    expect(handle).toEqual({ sessionId: 'session-existing' });
  });

  it('pins active account ids onto the session by toolkit', async () => {
    userWorkspaceRepository.findOne.mockResolvedValue({
      id: 'uw-1',
      composioSessionId: 'session-existing',
    });
    composioAccountsService.listUserConnectedAccounts.mockResolvedValue([
      {
        id: 'acc-gmail',
        status: 'ACTIVE',
        isDisabled: false,
        toolkit: { slug: 'gmail' },
      },
      {
        id: 'acc-slack-expired',
        status: 'EXPIRED',
        isDisabled: false,
        toolkit: { slug: 'slack' },
      },
    ]);

    await service.syncUserSessionAccounts('uw-1');

    expect(update).toHaveBeenCalledWith({
      ...expectedSessionOptions,
      connectedAccounts: { gmail: ['acc-gmail'] },
    });
  });
});
