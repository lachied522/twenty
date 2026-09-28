import { SOURCE_LOCALE } from '@/translations';
import { normalizeLocale } from '../normalizeLocale';

describe('normalizeLocale', () => {
  it('should return SOURCE_LOCALE when the input is null', () => {
    expect(normalizeLocale(null)).toBe(SOURCE_LOCALE);
  });

  it('should return the locale when there is a direct match in APP_LOCALES', () => {
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('pseudo-en')).toBe('pseudo-en');
  });

  it('should handle case-insensitive matches', () => {
    expect(normalizeLocale('EN')).toBe('en');
    expect(normalizeLocale('Pseudo-EN')).toBe('pseudo-en');
  });

  it('should match just the language part if full locale not found', () => {
    expect(normalizeLocale('en-AU')).toBe('en');
  });

  it('should return SOURCE_LOCALE for unsupported or invalid locales', () => {
    expect(normalizeLocale('invalid-locale')).toBe(SOURCE_LOCALE);
    expect(normalizeLocale('xx-XX')).toBe(SOURCE_LOCALE);
    expect(normalizeLocale('')).toBe(SOURCE_LOCALE);
  });

  it('should handle SOURCE_LOCALE and its variants correctly', () => {
    expect(normalizeLocale(SOURCE_LOCALE)).toBe(SOURCE_LOCALE);
    // If SOURCE_LOCALE is 'en', test 'en-US', 'en-GB', etc.
    if (SOURCE_LOCALE === 'en') {
      expect(normalizeLocale('en-US')).toBe(SOURCE_LOCALE);
      expect(normalizeLocale('en-GB')).toBe(SOURCE_LOCALE);
    }
  });
});
