import { buildConnectedIntegrationsSection } from 'src/engine/metadata-modules/ai/ai-chat/utils/build-connected-integrations-section.util';

describe('buildConnectedIntegrationsSection', () => {
  it('still documents manage-connections when nothing is linked', () => {
    const section = buildConnectedIntegrationsSection([]);

    expect(section).toContain('## Integrations');
    expect(section).toContain('composio_manage_connections');
    expect(section).toContain('composio_wait_for_connections');
  });

  it('lists connected toolkit names and points at the meta-tools', () => {
    const section = buildConnectedIntegrationsSection(['Gmail', 'Slack']);

    expect(section).toContain('## Connected Integrations');
    expect(section).toContain('- Gmail');
    expect(section).toContain('- Slack');
    expect(section).toContain('composio_search_tools');
    expect(section).toContain('composio_execute_tool');
    expect(section).toContain('composio_manage_connections');
  });
});
