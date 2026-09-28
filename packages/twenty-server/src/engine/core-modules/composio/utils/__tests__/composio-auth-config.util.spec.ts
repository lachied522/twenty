import { organisationNotConfiguredMessage } from 'src/engine/core-modules/composio/utils/composio-auth-config.util';

describe('composio-auth-config.util', () => {
  it('builds a support message for unconfigurable toolkits', () => {
    expect(organisationNotConfiguredMessage('Notion')).toContain('Notion');
    expect(organisationNotConfiguredMessage('Notion')).toContain(
      'contact support',
    );
  });
});
