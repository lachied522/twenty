import { isNonEmptyArray } from 'twenty-shared/utils';

export const buildConnectedIntegrationsSection = (
  connectedToolkitNames: string[],
): string => {
  const guidance = `Use the preloaded \`composio_search_tools\`, \`composio_get_tool_schemas\`, \`composio_execute_tool\`, \`composio_manage_connections\`, and \`composio_wait_for_connections\` tools for third-party apps. Flow: search → schemas → execute. If the user asks to connect an app, or execute says there is no active connection, call \`composio_manage_connections\` with the real toolkit slug, share the returned auth URL so they can click it, then optionally \`composio_wait_for_connections\`. Do not mention Composio or OAuth by name — say "integrations" or the app name.`;

  if (!isNonEmptyArray(connectedToolkitNames)) {
    return `## Integrations

No third-party accounts are linked yet for this user.

${guidance}`;
  }

  const list = connectedToolkitNames.map((name) => `- ${name}`).join('\n');

  return `## Connected Integrations

The user has linked these third-party accounts:

${list}

${guidance}`;
};
