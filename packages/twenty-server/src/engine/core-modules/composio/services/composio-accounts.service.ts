import { Injectable } from '@nestjs/common';

import { ComposioClientService } from 'src/engine/core-modules/composio/services/composio-client.service';

const LIST_PAGE_SIZE = 100;

@Injectable()
export class ComposioAccountsService {
  constructor(private readonly composioClientService: ComposioClientService) {}

  async listUserConnectedAccounts(
    userWorkspaceId: string,
    toolkitSlug?: string,
  ) {
    const composio = this.composioClientService.getClient();
    const items = [] as Awaited<
      ReturnType<typeof composio.connectedAccounts.list>
    >['items'];
    let cursor: string | undefined;

    do {
      const page = await composio.connectedAccounts.list({
        userIds: [userWorkspaceId],
        limit: LIST_PAGE_SIZE,
        ...(toolkitSlug ? { toolkitSlugs: [toolkitSlug] } : {}),
        ...(cursor ? { cursor } : {}),
      });

      items.push(...page.items);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);

    return items;
  }

  async getOwnedConnectedAccount(accountId: string, userWorkspaceId: string) {
    const composio = this.composioClientService.getClient();
    const account = await composio.connectedAccounts.get(accountId);
    const owned = await this.listUserConnectedAccounts(
      userWorkspaceId,
      account.toolkit.slug,
    );

    return owned.find((item) => item.id === accountId) ?? null;
  }
}
