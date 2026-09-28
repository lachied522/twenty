import { getDictationLanguage } from '@/ai/dictation/utils/getDictationLanguage';

describe('getDictationLanguage', () => {
  it('uses the workspace member locale when it is a shipped language', () => {
    expect(getDictationLanguage('en')).toBe('en');
  });

  it('falls back to the source locale for a language that is not shipped', () => {
    expect(getDictationLanguage('fr-FR')).toBe('en');
  });

  it.each([undefined, null, ''])(
    'falls back to the source locale for %p',
    (locale) => {
      expect(getDictationLanguage(locale)).toBe('en');
    },
  );

  // The pseudo locale is a translation-coverage tool, not a language anything
  // can be recognised in.
  it('falls back to the source locale for the pseudo locale', () => {
    expect(getDictationLanguage('pseudo-en')).toBe('en');
  });
});
