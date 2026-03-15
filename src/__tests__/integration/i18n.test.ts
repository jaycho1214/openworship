import { en } from '../../renderer/shared/i18n/en';
import { ko } from '../../renderer/shared/i18n/ko';

describe('i18n translations', () => {
  it('English and Korean have the same keys', () => {
    const enKeys = Object.keys(en).sort();
    const koKeys = Object.keys(ko).sort();
    expect(enKeys).toEqual(koKeys);
  });

  it('no English keys are missing from Korean', () => {
    const enKeys = Object.keys(en);
    const koKeys = new Set(Object.keys(ko));
    const missing = enKeys.filter((key) => !koKeys.has(key));
    expect(missing).toEqual([]);
  });

  it('no Korean keys are missing from English', () => {
    const koKeys = Object.keys(ko);
    const enKeys = new Set(Object.keys(en));
    const missing = koKeys.filter((key) => !enKeys.has(key));
    expect(missing).toEqual([]);
  });

  it('no values are empty strings', () => {
    const emptyEn = Object.entries(en).filter(
      ([, v]) => typeof v === 'string' && v.length === 0,
    );
    const emptyKo = Object.entries(ko).filter(
      ([, v]) => typeof v === 'string' && v.length === 0,
    );
    expect(emptyEn.map(([k]) => k)).toEqual([]);
    expect(emptyKo.map(([k]) => k)).toEqual([]);
  });

  it('app name is the same in both languages', () => {
    expect(en.appName).toBe('OpenWorship');
    expect(ko.appName).toBe('OpenWorship');
  });

  it('all top-level values are strings or objects', () => {
    // Some keys may be nested objects (e.g., keyboard shortcut groups)
    Object.entries(en).forEach(([, value]) => {
      expect(['string', 'object']).toContain(typeof value);
    });
    Object.entries(ko).forEach(([, value]) => {
      expect(['string', 'object']).toContain(typeof value);
    });
  });
});
