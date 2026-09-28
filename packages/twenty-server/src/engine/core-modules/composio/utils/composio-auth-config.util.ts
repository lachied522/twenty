import { type Composio, type ToolkitRetrieveResponse } from '@composio/core';

export type ConnectField = {
  name: string;
  displayName: string;
  description: string;
  required: boolean;
  type: string;
};

export type ConnectMode = 'redirect' | 'credentials' | 'unavailable' | 'none';

export type ResolvedAuthConfig = {
  toolkitName: string;
  authConfigId: string | null;
  authScheme: string | null;
  isComposioManaged: boolean;
  connectMode: ConnectMode;
  connectFields: ConnectField[];
  configurationError: string | null;
};

export const organisationNotConfiguredMessage = (toolkitName: string): string =>
  `${toolkitName} is not configured for your organisation. Please contact support to request a connection with this provider.`;

const isEnabled = (status: 'ENABLED' | 'DISABLED' | undefined): boolean =>
  status !== 'DISABLED';

export const isNoAuthToolkit = (toolkit: ToolkitRetrieveResponse): boolean => {
  const details = toolkit.authConfigDetails;

  if (!details?.length) {
    return false;
  }

  return details.every((detail) => detail.mode.toUpperCase() === 'NO_AUTH');
};

const supportsApiKeyAuth = (toolkit: ToolkitRetrieveResponse): boolean =>
  Boolean(
    toolkit.authConfigDetails?.some(
      (detail) => detail.mode.toUpperCase() === 'API_KEY',
    ),
  );

const hasManagedAuthAvailable = (toolkit: ToolkitRetrieveResponse): boolean =>
  (toolkit.composioManagedAuthSchemes?.length ?? 0) > 0;

const getApiKeyConnectFields = (
  toolkit: ToolkitRetrieveResponse,
): ConnectField[] => {
  const detail = toolkit.authConfigDetails?.find(
    (item) => item.mode.toUpperCase() === 'API_KEY',
  );

  if (!detail) {
    return [];
  }

  const initiation = detail.fields.connectedAccountInitiation;

  return [
    ...initiation.required.map((field) => ({
      name: field.name,
      displayName: field.displayName,
      description: field.description,
      required: true,
      type: field.type,
    })),
    ...initiation.optional.map((field) => ({
      name: field.name,
      displayName: field.displayName,
      description: field.description,
      required: Boolean(field.required),
      type: field.type,
    })),
  ];
};

const isManagedAuthError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();

  return (
    message.includes('default auth config not found') ||
    message.includes('auth_config_defaultauthconfignotfound') ||
    message.includes('use_custom_auth') ||
    message.includes('managed credentials')
  );
};

/**
 * Resolve an auth config for a toolkit.
 *
 * Priority:
 * 1. Composio-managed auth (existing or create)
 * 2. Existing API_KEY auth config
 * 3. Create a new API_KEY auth config when the toolkit supports it
 */
export const resolveAuthConfig = async (
  composio: Composio,
  toolkitSlug: string,
  toolkit?: ToolkitRetrieveResponse,
): Promise<ResolvedAuthConfig> => {
  const resolvedToolkit = toolkit ?? (await composio.toolkits.get(toolkitSlug));

  if (isNoAuthToolkit(resolvedToolkit)) {
    return {
      toolkitName: resolvedToolkit.name,
      authConfigId: null,
      authScheme: null,
      isComposioManaged: false,
      connectMode: 'none',
      connectFields: [],
      configurationError: null,
    };
  }

  const existing = await composio.authConfigs.list({ toolkit: toolkitSlug });
  const enabled = existing.items.filter((item) => isEnabled(item.status));

  const existingManaged = enabled.find(
    (item) => item.isComposioManaged === true,
  );

  if (existingManaged?.id) {
    return {
      toolkitName: resolvedToolkit.name,
      authConfigId: existingManaged.id,
      authScheme: existingManaged.authScheme ?? null,
      isComposioManaged: true,
      connectMode: 'redirect',
      connectFields: [],
      configurationError: null,
    };
  }

  if (hasManagedAuthAvailable(resolvedToolkit)) {
    try {
      const created = await composio.authConfigs.create(toolkitSlug, {
        type: 'use_composio_managed_auth',
        name: `${resolvedToolkit.name} Auth Config`,
      });

      return {
        toolkitName: resolvedToolkit.name,
        authConfigId: created.id,
        authScheme: created.authScheme,
        isComposioManaged: created.isComposioManaged,
        connectMode: 'redirect',
        connectFields: [],
        configurationError: null,
      };
    } catch (error) {
      if (!isManagedAuthError(error)) {
        throw error;
      }
    }
  }

  const existingApiKey = enabled.find((item) => item.authScheme === 'API_KEY');

  if (existingApiKey?.id) {
    return {
      toolkitName: resolvedToolkit.name,
      authConfigId: existingApiKey.id,
      authScheme: 'API_KEY',
      isComposioManaged: false,
      connectMode: 'credentials',
      connectFields: getApiKeyConnectFields(resolvedToolkit),
      configurationError: null,
    };
  }

  if (supportsApiKeyAuth(resolvedToolkit)) {
    const created = await composio.authConfigs.create(toolkitSlug, {
      type: 'use_custom_auth',
      authScheme: 'API_KEY',
      name: `${resolvedToolkit.name} Auth Config`,
      credentials: {},
    });

    return {
      toolkitName: resolvedToolkit.name,
      authConfigId: created.id,
      authScheme: created.authScheme,
      isComposioManaged: false,
      connectMode: 'credentials',
      connectFields: getApiKeyConnectFields(resolvedToolkit),
      configurationError: null,
    };
  }

  return {
    toolkitName: resolvedToolkit.name,
    authConfigId: null,
    authScheme: null,
    isComposioManaged: false,
    connectMode: 'unavailable',
    connectFields: [],
    configurationError: organisationNotConfiguredMessage(resolvedToolkit.name),
  };
};
