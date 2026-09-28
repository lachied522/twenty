import { AppPath } from 'twenty-shared/types';

// Shared session manageConnections config for UI + chat meta-tools.
// callbackUrl sends OAuth back to the Integrations page after the user finishes.
export const buildComposioManageConnectionsConfig = (frontendUrl: string) => {
  const origin = frontendUrl.replace(/\/$/, '');

  return {
    enable: true,
    // Enables COMPOSIO_WAIT_FOR_CONNECTIONS so chat can poll after sharing a link
    waitForConnections: true,
    callbackUrl: `${origin}${AppPath.Integrations}`,
  } as const;
};
