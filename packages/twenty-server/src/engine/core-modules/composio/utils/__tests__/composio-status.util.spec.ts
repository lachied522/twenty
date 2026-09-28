import {
  activeAccountIdsByToolkit,
  mapAccountStatus,
  mapToolkitStatus,
  toUiAccount,
} from 'src/engine/core-modules/composio/utils/composio-status.util';

describe('composio-status.util', () => {
  describe('mapAccountStatus', () => {
    it('maps ACTIVE to active', () => {
      expect(mapAccountStatus('ACTIVE')).toBe('active');
    });

    it('maps disabled accounts to inactive', () => {
      expect(mapAccountStatus('ACTIVE', true)).toBe('inactive');
    });

    it('maps EXPIRED to needs_reauth', () => {
      expect(mapAccountStatus('EXPIRED')).toBe('needs_reauth');
    });

    it('maps INITIATED to pending', () => {
      expect(mapAccountStatus('INITIATED')).toBe('pending');
    });
  });

  describe('mapToolkitStatus', () => {
    it('returns not_connected when there are no accounts', () => {
      expect(mapToolkitStatus([])).toBe('not_connected');
    });

    it('returns connected when any account is active', () => {
      expect(mapToolkitStatus(['needs_reauth', 'active'])).toBe('connected');
    });

    it('returns needs_reauth when accounts need reauth', () => {
      expect(mapToolkitStatus(['needs_reauth'])).toBe('needs_reauth');
    });
  });

  describe('toUiAccount', () => {
    it('maps account fields for the UI', () => {
      expect(
        toUiAccount({
          id: 'acc_1',
          alias: 'Work',
          status: 'ACTIVE',
          createdAt: '2026-01-01',
          updatedAt: '2026-01-02',
        }),
      ).toEqual({
        id: 'acc_1',
        alias: 'Work',
        status: 'active',
        rawStatus: 'ACTIVE',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-02',
      });
    });
  });

  describe('activeAccountIdsByToolkit', () => {
    it('groups only ACTIVE accounts by toolkit slug', () => {
      expect(
        activeAccountIdsByToolkit([
          {
            id: 'a1',
            status: 'ACTIVE',
            toolkitSlug: 'gmail',
          },
          {
            id: 'a2',
            status: 'EXPIRED',
            toolkitSlug: 'gmail',
          },
          {
            id: 'a3',
            status: 'ACTIVE',
            toolkitSlug: 'slack',
          },
        ]),
      ).toEqual({
        gmail: ['a1'],
        slack: ['a3'],
      });
    });
  });
});
