/**
 * Session multi-account config shared by the Integrations UI and chat tools.
 *
 * The Composio TypeScript SDK defaults `requireExplicitSelection` to true when
 * `enable` is true and the field is omitted — that makes agents fail with
 * "account not selected". Always pass false so a single ACTIVE account is used
 * unless the tool call names an id/alias.
 */
export const COMPOSIO_MULTI_ACCOUNT = {
  enable: true,
  maxAccountsPerToolkit: 5,
  requireExplicitSelection: false,
} as const;
