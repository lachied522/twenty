export type ComposioToolkitConnectionStatus =
  | 'connected'
  | 'needs_reauth'
  | 'not_connected';

export type ComposioAccountStatus =
  | 'active'
  | 'needs_reauth'
  | 'inactive'
  | 'pending';

export type ComposioConnectField = {
  name: string;
  displayName: string;
  description: string;
  required: boolean;
  type: string;
};

export type ComposioAccount = {
  id: string;
  alias: string | null;
  status: ComposioAccountStatus;
  rawStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type ComposioToolkitCategory = {
  id: string;
  name: string;
  toolkitCount: number;
};

export type ComposioToolkitSummary = {
  slug: string;
  name: string;
  description: string;
  logo: string | null;
  noAuth: boolean;
  status: ComposioToolkitConnectionStatus;
  accountCount: number;
};

export type ComposioToolkitDetail = {
  slug: string;
  name: string;
  description: string;
  logo: string | null;
  noAuth: boolean;
  status: ComposioToolkitConnectionStatus;
  authConfigId: string | null;
  connectMode: string;
  connectFields: ComposioConnectField[];
  configurationError: string | null;
  accounts: ComposioAccount[];
};

export type ComposioConnectResult = {
  redirectUrl: string | null;
  connectedAccountId: string;
  account?: ComposioAccount | null;
};
