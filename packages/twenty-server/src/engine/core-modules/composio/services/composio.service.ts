import { Injectable, Logger } from '@nestjs/common';

import { AuthScheme } from '@composio/core';
import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import {
  ComposioException,
  ComposioExceptionCode,
} from 'src/engine/core-modules/composio/composio.exception';
import { ComposioAccountsService } from 'src/engine/core-modules/composio/services/composio-accounts.service';
import { ComposioClientService } from 'src/engine/core-modules/composio/services/composio-client.service';
import { ComposioSessionService } from 'src/engine/core-modules/composio/services/composio-session.service';
import {
  isNoAuthToolkit,
  resolveAuthConfig,
} from 'src/engine/core-modules/composio/utils/composio-auth-config.util';
import {
  mapAccountStatus,
  mapToolkitStatus,
  toUiAccount,
  type ConnectedAccountUiStatus,
  type ToolkitAccountDto,
  type ToolkitConnectionStatus,
} from 'src/engine/core-modules/composio/utils/composio-status.util';

const TOOLKIT_PAGE_SIZE = 100;
const WAIT_MS = 45_000;
const TOOLKIT_CATEGORY_CATALOG_TTL_MS = 15 * 60 * 1000;
const TOOLKIT_CATEGORY_COUNT_PAGE_SIZE = 1000;
const MAX_TOOLKIT_COUNT_PAGES = 5;
const MIN_TOOLKIT_CATEGORY_COUNT = 20;
const CATEGORY_NAME_ACRONYMS = new Set([
  'ai',
  'api',
  'crm',
  'hr',
  'it',
  'lms',
  'mcp',
  'seo',
  'sms',
]);

type RawToolkitItem = {
  slug: string;
  name: string;
  no_auth?: boolean;
  meta?: {
    description?: string;
    logo?: string;
    categories?: Array<{ id: string; name: string }>;
  };
};

type RawToolkitListPage = {
  items: RawToolkitItem[];
  next_cursor?: string | null;
  total_items?: number;
};

type ToolkitCategoryCatalog = {
  expiresAt: number;
  totalCount: number;
  categories: ComposioToolkitCategory[];
};

export type ComposioToolkitCategory = {
  id: string;
  name: string;
  toolkitCount: number;
};

const formatCategoryName = (name: string): string =>
  name
    .split(/[\s-]+/)
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part === '&') {
        return '&';
      }

      if (CATEGORY_NAME_ACRONYMS.has(part.toLowerCase())) {
        return part.toUpperCase();
      }

      if (part === part.toUpperCase() && part.length <= 4) {
        return part;
      }

      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');

export type ComposioToolkitSummary = {
  slug: string;
  name: string;
  description: string;
  logo: string | null;
  noAuth: boolean;
  status: ToolkitConnectionStatus;
  accountCount: number;
};

export type ComposioToolkitDetail = {
  slug: string;
  name: string;
  description: string;
  logo: string | null;
  noAuth: boolean;
  status: ToolkitConnectionStatus;
  authConfigId: string | null;
  connectMode: string;
  connectFields: Array<{
    name: string;
    displayName: string;
    description: string;
    required: boolean;
    type: string;
  }>;
  configurationError: string | null;
  accounts: ToolkitAccountDto[];
};

export type ComposioConnectResult = {
  redirectUrl: string | null;
  connectedAccountId: string;
  account?: ToolkitAccountDto | null;
};

@Injectable()
export class ComposioService {
  private readonly logger = new Logger(ComposioService.name);
  private toolkitCategoryCatalog: ToolkitCategoryCatalog | null = null;

  constructor(
    private readonly composioClientService: ComposioClientService,
    private readonly composioAccountsService: ComposioAccountsService,
    private readonly composioSessionService: ComposioSessionService,
  ) {}

  isConfigured(): boolean {
    return this.composioClientService.isConfigured();
  }

  async listToolkits({
    userWorkspaceId,
    search,
    cursor,
    category,
  }: {
    userWorkspaceId: string;
    search?: string | null;
    cursor?: string | null;
    category?: string | null;
  }): Promise<{ items: ComposioToolkitSummary[]; nextCursor: string | null }> {
    this.assertConfigured();

    const composio = this.composioClientService.getClient();
    const rawSearch = search?.trim() ?? '';
    const categoryId = category?.trim() ?? '';
    // Composio requires search queries to be at least 3 characters
    const searchQuery = rawSearch.length >= 3 ? rawSearch : '';

    const page = (await composio.getClient().toolkits.list({
      limit: TOOLKIT_PAGE_SIZE,
      sort_by: 'alphabetically',
      ...(searchQuery ? { search: searchQuery } : {}),
      ...(cursor ? { cursor } : {}),
      ...(categoryId ? { category: categoryId } : {}),
    })) as RawToolkitListPage;

    const accountsResult = await composio.connectedAccounts.list({
      userIds: [userWorkspaceId],
    });

    const accountsByToolkit = new Map<string, ConnectedAccountUiStatus[]>();

    for (const account of accountsResult.items) {
      const slug = account.toolkit.slug;
      const uiStatus = mapAccountStatus(account.status, account.isDisabled);
      const list = accountsByToolkit.get(slug) ?? [];

      list.push(uiStatus);
      accountsByToolkit.set(slug, list);
    }

    const items = page.items.map((toolkit) => {
      const accountStatuses = accountsByToolkit.get(toolkit.slug) ?? [];

      return {
        slug: toolkit.slug,
        name: toolkit.name,
        description: toolkit.meta?.description ?? '',
        logo: toolkit.meta?.logo ?? null,
        noAuth: Boolean(toolkit.no_auth),
        status: mapToolkitStatus(accountStatuses),
        accountCount: accountStatuses.length,
      };
    });

    return {
      items,
      nextCursor: page.next_cursor ?? null,
    };
  }

  async listToolkitCategories(): Promise<{
    totalCount: number;
    categories: ComposioToolkitCategory[];
  }> {
    this.assertConfigured();

    const now = Date.now();

    if (
      isDefined(this.toolkitCategoryCatalog) &&
      this.toolkitCategoryCatalog.expiresAt > now
    ) {
      return {
        totalCount: this.toolkitCategoryCatalog.totalCount,
        categories: this.toolkitCategoryCatalog.categories,
      };
    }

    const client = this.composioClientService.getClient().getClient();
    const catalog = await this.loadToolkitCategoryCatalog(client);

    this.toolkitCategoryCatalog = {
      ...catalog,
      expiresAt: now + TOOLKIT_CATEGORY_CATALOG_TTL_MS,
    };

    return catalog;
  }

  // The categories endpoint returns tens of thousands of duplicate tags.
  // Toolkit metadata carries the category id the list filter accepts, so
  // counts come from walking the catalog instead.
  private async loadToolkitCategoryCatalog(client: {
    toolkits: {
      list: (query: {
        limit: number;
        cursor?: string;
      }) => Promise<RawToolkitListPage>;
    };
  }): Promise<{
    totalCount: number;
    categories: ComposioToolkitCategory[];
  }> {
    const counts = new Map<string, { name: string; toolkitCount: number }>();
    let cursor: string | null = null;
    let totalCount = 0;

    for (
      let pageIndex = 0;
      pageIndex < MAX_TOOLKIT_COUNT_PAGES;
      pageIndex += 1
    ) {
      const page = await client.toolkits.list({
        limit: TOOLKIT_CATEGORY_COUNT_PAGE_SIZE,
        ...(cursor ? { cursor } : {}),
      });

      totalCount = page.total_items ?? totalCount;

      for (const toolkit of page.items) {
        const seenCategoryIds = new Set<string>();

        for (const category of toolkit.meta?.categories ?? []) {
          if (
            !isNonEmptyString(category.id) ||
            seenCategoryIds.has(category.id)
          ) {
            continue;
          }

          seenCategoryIds.add(category.id);
          const existing = counts.get(category.id);

          if (isDefined(existing)) {
            existing.toolkitCount += 1;
            continue;
          }

          counts.set(category.id, {
            name: isNonEmptyString(category.name) ? category.name : category.id,
            toolkitCount: 1,
          });
        }
      }

      cursor = page.next_cursor ?? null;

      if (!isNonEmptyString(cursor)) {
        break;
      }
    }

    const categories = [...counts.entries()]
      .filter(
        ([, category]) => category.toolkitCount >= MIN_TOOLKIT_CATEGORY_COUNT,
      )
      .map(([id, category]) => ({
        id,
        name: formatCategoryName(category.name),
        toolkitCount: category.toolkitCount,
      }))
      .sort((left, right) => {
        if (right.toolkitCount !== left.toolkitCount) {
          return right.toolkitCount - left.toolkitCount;
        }

        return left.name.localeCompare(right.name);
      });

    return { totalCount, categories };
  }

  async getToolkit({
    userWorkspaceId,
    toolkitSlug,
  }: {
    userWorkspaceId: string;
    toolkitSlug: string;
  }): Promise<ComposioToolkitDetail> {
    this.assertConfigured();

    const composio = this.composioClientService.getClient();
    const slug = toolkitSlug.toLowerCase();

    const [toolkit, accountsResult] = await Promise.all([
      composio.toolkits.get(slug),
      composio.connectedAccounts.list({
        userIds: [userWorkspaceId],
        toolkitSlugs: [slug],
      }),
    ]);

    const accounts = accountsResult.items.map(toUiAccount);

    void this.composioSessionService.trySyncUserSessionAccounts(
      userWorkspaceId,
    );

    const noAuth = isNoAuthToolkit(toolkit);
    const resolved = await resolveAuthConfig(composio, slug, toolkit);

    return {
      slug: toolkit.slug,
      name: toolkit.name,
      description: toolkit.meta.description ?? '',
      logo: toolkit.meta.logo ?? null,
      noAuth,
      status: mapToolkitStatus(accounts.map((account) => account.status)),
      authConfigId: resolved.authConfigId,
      connectMode: resolved.connectMode,
      connectFields: resolved.connectFields,
      configurationError: resolved.configurationError,
      accounts,
    };
  }

  async connectToolkit({
    userWorkspaceId,
    toolkitSlug,
    callbackUrl,
    alias,
    credentials,
  }: {
    userWorkspaceId: string;
    toolkitSlug: string;
    callbackUrl: string;
    alias?: string | null;
    credentials?: Record<string, string> | null;
  }): Promise<ComposioConnectResult> {
    this.assertConfigured();

    const composio = this.composioClientService.getClient();
    const slug = toolkitSlug.toLowerCase();
    const resolved = await resolveAuthConfig(composio, slug);

    if (resolved.connectMode === 'unavailable' || !resolved.authConfigId) {
      throw new ComposioException(
        resolved.configurationError ??
          `${resolved.toolkitName} cannot be connected`,
        ComposioExceptionCode.UNAVAILABLE,
      );
    }

    const existing =
      await this.composioAccountsService.listUserConnectedAccounts(
        userWorkspaceId,
        slug,
      );
    const allowMultiple = existing.length > 0;
    const trimmedAlias = alias?.trim() || undefined;

    if (resolved.connectMode === 'credentials') {
      const credentialValues = credentials ?? {};
      const missing = resolved.connectFields
        .filter((field) => field.required)
        .filter((field) => !credentialValues[field.name]?.trim());

      if (missing.length > 0) {
        throw new ComposioException(
          `Missing required field${missing.length === 1 ? '' : 's'}: ${missing
            .map((field) => field.displayName)
            .join(', ')}`,
          ComposioExceptionCode.BAD_REQUEST,
        );
      }

      const trimmedCredentials = Object.fromEntries(
        Object.entries(credentialValues)
          .map(([key, value]) => [key, value.trim()] as const)
          .filter(([, value]) => Boolean(value)),
      );

      const connectionRequest = await composio.connectedAccounts.initiate(
        userWorkspaceId,
        resolved.authConfigId,
        {
          allowMultiple,
          alias: trimmedAlias,
          config: AuthScheme.APIKey(
            trimmedCredentials as {
              api_key?: string;
              generic_api_key?: string;
            },
          ),
        },
      );

      if (!connectionRequest.redirectUrl) {
        const account = await this.waitForOwnedAccount(
          connectionRequest.id,
          userWorkspaceId,
        );

        return {
          redirectUrl: null,
          connectedAccountId: account.id,
          account,
        };
      }

      return {
        redirectUrl: connectionRequest.redirectUrl,
        connectedAccountId: connectionRequest.id,
      };
    }

    const connectionRequest = await composio.connectedAccounts.link(
      userWorkspaceId,
      resolved.authConfigId,
      {
        callbackUrl,
        alias: trimmedAlias,
        allowMultiple,
      },
    );

    return {
      redirectUrl: connectionRequest.redirectUrl ?? null,
      connectedAccountId: connectionRequest.id,
    };
  }

  async waitForAccount({
    userWorkspaceId,
    accountId,
  }: {
    userWorkspaceId: string;
    accountId: string;
  }): Promise<ToolkitAccountDto> {
    this.assertConfigured();

    const owned = await this.composioAccountsService.getOwnedConnectedAccount(
      accountId,
      userWorkspaceId,
    );

    if (!isDefined(owned)) {
      throw new ComposioException(
        'Account not found',
        ComposioExceptionCode.NOT_FOUND,
      );
    }

    return this.waitForOwnedAccount(accountId, userWorkspaceId);
  }

  async refreshAccount({
    userWorkspaceId,
    accountId,
    redirectUrl,
  }: {
    userWorkspaceId: string;
    accountId: string;
    redirectUrl: string;
  }): Promise<{ redirectUrl: string | null; connectedAccountId: string }> {
    this.assertConfigured();

    const owned = await this.composioAccountsService.getOwnedConnectedAccount(
      accountId,
      userWorkspaceId,
    );

    if (!isDefined(owned)) {
      throw new ComposioException(
        'Account not found',
        ComposioExceptionCode.NOT_FOUND,
      );
    }

    const composio = this.composioClientService.getClient();
    const refreshed = await composio.connectedAccounts.refresh(accountId, {
      redirectUrl,
    });

    return {
      redirectUrl:
        (refreshed as { redirectUrl?: string | null }).redirectUrl ??
        (refreshed as { redirect_url?: string | null }).redirect_url ??
        null,
      connectedAccountId: (refreshed as { id?: string }).id ?? accountId,
    };
  }

  async deleteAccount({
    userWorkspaceId,
    accountId,
  }: {
    userWorkspaceId: string;
    accountId: string;
  }): Promise<boolean> {
    this.assertConfigured();

    const owned = await this.composioAccountsService.getOwnedConnectedAccount(
      accountId,
      userWorkspaceId,
    );

    if (!isDefined(owned)) {
      throw new ComposioException(
        'Account not found',
        ComposioExceptionCode.NOT_FOUND,
      );
    }

    const composio = this.composioClientService.getClient();

    await composio.connectedAccounts.delete(accountId);
    await this.composioSessionService.trySyncUserSessionAccounts(
      userWorkspaceId,
    );

    return true;
  }

  async updateAccountAlias({
    userWorkspaceId,
    accountId,
    alias,
  }: {
    userWorkspaceId: string;
    accountId: string;
    alias: string;
  }): Promise<{ id: string; alias: string | null }> {
    this.assertConfigured();

    const owned = await this.composioAccountsService.getOwnedConnectedAccount(
      accountId,
      userWorkspaceId,
    );

    if (!isDefined(owned)) {
      throw new ComposioException(
        'Account not found',
        ComposioExceptionCode.NOT_FOUND,
      );
    }

    const composio = this.composioClientService.getClient();
    const trimmedAlias = alias.trim();

    await composio.getClient().connectedAccounts.patch(accountId, {
      alias: trimmedAlias,
    });

    return {
      id: accountId,
      alias: trimmedAlias || null,
    };
  }

  async listConnectedToolkitNames(userWorkspaceId: string): Promise<string[]> {
    if (!this.isConfigured() || !isNonEmptyString(userWorkspaceId)) {
      return [];
    }

    try {
      const accounts =
        await this.composioAccountsService.listUserConnectedAccounts(
          userWorkspaceId,
        );
      const names = new Set<string>();

      for (const account of accounts) {
        if (mapAccountStatus(account.status, account.isDisabled) !== 'active') {
          continue;
        }
        names.add(
          (account.toolkit as { name?: string; slug: string }).name ||
            account.toolkit.slug,
        );
      }

      return [...names].sort((left, right) => left.localeCompare(right));
    } catch (error) {
      this.logger.warn(
        `Failed to list connected toolkits for ${userWorkspaceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return [];
    }
  }

  private async waitForOwnedAccount(
    accountId: string,
    userWorkspaceId: string,
  ): Promise<ToolkitAccountDto> {
    const composio = this.composioClientService.getClient();

    try {
      const connected = await composio.connectedAccounts.waitForConnection(
        accountId,
        WAIT_MS,
      );

      await this.composioSessionService.trySyncUserSessionAccounts(
        userWorkspaceId,
      );

      return toUiAccount(connected);
    } catch {
      const current = await composio.connectedAccounts.get(accountId);

      if (current.status === 'ACTIVE' && !current.isDisabled) {
        await this.composioSessionService.trySyncUserSessionAccounts(
          userWorkspaceId,
        );
      }

      return toUiAccount(current);
    }
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ComposioException(
        'COMPOSIO_API_KEY is not configured',
        ComposioExceptionCode.NOT_CONFIGURED,
      );
    }
  }
}
