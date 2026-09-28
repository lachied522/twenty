import { dynamicActivate } from '~/utils/i18n/dynamicActivate';

describe('dynamicActivate', () => {
  it('lays the document out left to right for English', async () => {
    await dynamicActivate('en');

    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  it('falls back to the source locale for an unknown one', async () => {
    await dynamicActivate('zz-ZZ' as 'en');

    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });
});
