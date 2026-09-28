import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { buildComposioManageConnectionsConfig } from 'src/engine/core-modules/composio/constants/composio-manage-connections.const';
import { COMPOSIO_MULTI_ACCOUNT } from 'src/engine/core-modules/composio/constants/composio-multi-account.const';
import { ComposioClientService } from 'src/engine/core-modules/composio/services/composio-client.service';
import { ComposioAccountsService } from 'src/engine/core-modules/composio/services/composio-accounts.service';
import { activeAccountIdsByToolkit } from 'src/engine/core-modules/composio/utils/composio-status.util';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserWorkspaceEntity } from 'src/engine/core-modules/user-workspace/user-workspace.entity';

export type ComposioSessionHandle = {
  sessionId: string;
};

@Injectable()
export class ComposioSessionService {
  private readonly logger = new Logger(ComposioSessionService.name);

  constructor(
    private readonly composioClientService: ComposioClientService,
    private readonly composioAccountsService: ComposioAccountsService,
    private readonly twentyConfigService: TwentyConfigService,
    @InjectRepository(UserWorkspaceEntity)
    private readonly userWorkspaceRepository: Repository<UserWorkspaceEntity>,
  ) {}

  async getOrCreateUserSession(
    userWorkspaceId: string,
  ): Promise<ComposioSessionHandle> {
    const composio = this.composioClientService.getClient();
    const sessionOptions = this.buildSessionOptions();

    const userWorkspace = await this.userWorkspaceRepository.findOne({
      where: { id: userWorkspaceId },
      select: { id: true, composioSessionId: true },
    });

    if (userWorkspace?.composioSessionId) {
      try {
        const session = await composio.use(userWorkspace.composioSessionId);

        try {
          await session.update(sessionOptions);
        } catch (error) {
          this.logger.warn(
            `session update failed session=${session.sessionId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }

        return { sessionId: session.sessionId };
      } catch {
        // Session missing or invalid — create a fresh one below
      }
    }

    const session = await composio.create(userWorkspaceId, sessionOptions);

    await this.userWorkspaceRepository.update(
      { id: userWorkspaceId },
      { composioSessionId: session.sessionId },
    );

    return { sessionId: session.sessionId };
  }

  async syncUserSessionAccounts(userWorkspaceId: string): Promise<void> {
    const endpoint = await this.getOrCreateUserSession(userWorkspaceId);
    const accounts =
      await this.composioAccountsService.listUserConnectedAccounts(
        userWorkspaceId,
      );
    const connectedAccounts = activeAccountIdsByToolkit(
      accounts.map((account) => ({
        id: account.id,
        status: account.status,
        isDisabled: account.isDisabled,
        toolkitSlug: account.toolkit.slug,
      })),
    );

    const composio = this.composioClientService.getClient();
    const session = await composio.use(endpoint.sessionId);

    await session.update({
      ...this.buildSessionOptions(),
      connectedAccounts,
    });
  }

  async trySyncUserSessionAccounts(userWorkspaceId: string): Promise<void> {
    try {
      await this.syncUserSessionAccounts(userWorkspaceId);
    } catch (error) {
      this.logger.warn(
        `session account sync failed userWorkspace=${userWorkspaceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async getSession(userWorkspaceId: string) {
    const { sessionId } = await this.getOrCreateUserSession(userWorkspaceId);
    const composio = this.composioClientService.getClient();

    return composio.use(sessionId);
  }

  private buildSessionOptions() {
    return {
      multiAccount: { ...COMPOSIO_MULTI_ACCOUNT },
      manageConnections: buildComposioManageConnectionsConfig(
        this.twentyConfigService.get('FRONTEND_URL'),
      ),
    };
  }
}
