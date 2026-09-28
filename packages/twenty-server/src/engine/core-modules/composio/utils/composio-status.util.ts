export type ToolkitConnectionStatus =
  | 'connected'
  | 'needs_reauth'
  | 'not_connected';

export type ConnectedAccountUiStatus =
  | 'active'
  | 'needs_reauth'
  | 'inactive'
  | 'pending';

export type ToolkitAccountDto = {
  id: string;
  alias: string | null;
  status: ConnectedAccountUiStatus;
  rawStatus: string;
  createdAt: string;
  updatedAt: string;
};

const NEEDS_REAUTH = new Set(['EXPIRED', 'FAILED', 'REVOKED']);

const PENDING = new Set(['INITIALIZING', 'INITIATED']);

export const mapAccountStatus = (
  status: string,
  isDisabled?: boolean,
): ConnectedAccountUiStatus => {
  if (isDisabled || status === 'INACTIVE') {
    return 'inactive';
  }
  if (NEEDS_REAUTH.has(status)) {
    return 'needs_reauth';
  }
  if (PENDING.has(status)) {
    return 'pending';
  }
  if (status === 'ACTIVE') {
    return 'active';
  }

  return 'needs_reauth';
};

export const mapToolkitStatus = (
  accountStatuses: ConnectedAccountUiStatus[],
): ToolkitConnectionStatus => {
  if (accountStatuses.length === 0) {
    return 'not_connected';
  }
  if (accountStatuses.some((status) => status === 'active')) {
    return 'connected';
  }
  if (
    accountStatuses.some(
      (status) => status === 'needs_reauth' || status === 'inactive',
    )
  ) {
    return 'needs_reauth';
  }

  return 'not_connected';
};

export const toUiAccount = (account: {
  id: string;
  alias?: string | null;
  status: string;
  isDisabled?: boolean;
  createdAt: string;
  updatedAt: string;
}): ToolkitAccountDto => ({
  id: account.id,
  alias: account.alias ?? null,
  status: mapAccountStatus(account.status, account.isDisabled),
  rawStatus: account.status,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt,
});

// Group ACTIVE connected-account ids by toolkit slug for session pinning
export const activeAccountIdsByToolkit = (
  accounts: Array<{
    id: string;
    status: string;
    isDisabled?: boolean;
    toolkitSlug: string;
  }>,
): Record<string, string[]> => {
  const byToolkit: Record<string, string[]> = {};

  for (const account of accounts) {
    if (mapAccountStatus(account.status, account.isDisabled) !== 'active') {
      continue;
    }
    const slug = account.toolkitSlug;
    const ids = byToolkit[slug] ?? [];

    ids.push(account.id);
    byToolkit[slug] = ids;
  }

  return byToolkit;
};
