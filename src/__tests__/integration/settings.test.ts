import {
  mergeProjectionSettings,
  defaultProjectionSettings,
  defaultTextStyleSettings,
  defaultContentTypeTextSettings,
  defaultBibleReferenceStyle,
  COLOR_PRESETS,
} from '../../shared/types/settings';

// ── mergeProjectionSettings ──────────────────────────────────────────────

describe('mergeProjectionSettings', () => {
  it('returns default settings when called with no args', () => {
    const result = mergeProjectionSettings();
    expect(result).toEqual(defaultProjectionSettings);
  });

  it('returns default settings when called with undefined', () => {
    const result = mergeProjectionSettings(undefined);
    expect(result).toEqual(defaultProjectionSettings);
  });

  it('returns a new object (not same reference)', () => {
    const result = mergeProjectionSettings();
    expect(result).not.toBe(defaultProjectionSettings);
  });

  it('overrides top-level properties', () => {
    const result = mergeProjectionSettings({ fontSize: 96 });
    expect(result.fontSize).toBe(96);
    expect(result.textColor).toBe(defaultProjectionSettings.textColor);
  });

  it('deep-merges textShadow', () => {
    const result = mergeProjectionSettings({
      textShadow: {
        enabled: false,
        offsetX: 0,
        offsetY: 0,
        blur: 0,
        color: '',
      },
    });
    expect(result.textShadow.enabled).toBe(false);
    // Other textShadow props get overridden because spread replaces
    expect(result.textShadow.blur).toBe(0);
  });

  it('deep-merges textOutline', () => {
    const result = mergeProjectionSettings({
      textOutline: { enabled: true, width: 4, color: '#ff0000' },
    });
    expect(result.textOutline.enabled).toBe(true);
    expect(result.textOutline.width).toBe(4);
    expect(result.textOutline.color).toBe('#ff0000');
  });

  it('deep-merges textAlign', () => {
    const result = mergeProjectionSettings({
      textAlign: { horizontal: 'left', vertical: 'top' },
    });
    expect(result.textAlign.horizontal).toBe('left');
    expect(result.textAlign.vertical).toBe('top');
  });

  it('deep-merges padding', () => {
    const result = mergeProjectionSettings({
      padding: { top: 10, bottom: 20, left: 30, right: 40 },
    });
    expect(result.padding).toEqual({
      top: 10,
      bottom: 20,
      left: 30,
      right: 40,
    });
  });

  it('partial textShadow preserves defaults for unspecified fields', () => {
    const result = mergeProjectionSettings({
      textShadow: {
        ...defaultProjectionSettings.textShadow,
        blur: 16,
      },
    });
    expect(result.textShadow.blur).toBe(16);
    expect(result.textShadow.enabled).toBe(
      defaultProjectionSettings.textShadow.enabled,
    );
  });

  it('overrides animation type', () => {
    const result = mergeProjectionSettings({ animation: 'none' });
    expect(result.animation).toBe('none');
  });

  it('overrides display mode', () => {
    const result = mergeProjectionSettings({ displayMode: 'windowed' });
    expect(result.displayMode).toBe('windowed');
  });

  it('overrides background settings', () => {
    const result = mergeProjectionSettings({
      backgroundType: 'color',
      backgroundColor: '#00FF00',
    });
    expect(result.backgroundType).toBe('color');
    expect(result.backgroundColor).toBe('#00FF00');
  });
});

// ── defaultProjectionSettings ────────────────────────────────────────────

describe('defaultProjectionSettings', () => {
  it('has default fontSize of 72', () => {
    expect(defaultProjectionSettings.fontSize).toBe(72);
  });

  it('has white text color', () => {
    expect(defaultProjectionSettings.textColor).toBe('#ffffff');
  });

  it('has text shadow enabled by default', () => {
    expect(defaultProjectionSettings.textShadow.enabled).toBe(true);
  });

  it('has text outline disabled by default', () => {
    expect(defaultProjectionSettings.textOutline.enabled).toBe(false);
  });

  it('has center-middle alignment', () => {
    expect(defaultProjectionSettings.textAlign.horizontal).toBe('center');
    expect(defaultProjectionSettings.textAlign.vertical).toBe('middle');
  });

  it('has fade animation', () => {
    expect(defaultProjectionSettings.animation).toBe('fade');
  });

  it('has fullscreen display mode', () => {
    expect(defaultProjectionSettings.displayMode).toBe('fullscreen');
  });

  it('has 5% padding on all sides', () => {
    expect(defaultProjectionSettings.padding).toEqual({
      top: 5,
      bottom: 5,
      left: 5,
      right: 5,
    });
  });
});

// ── defaultTextStyleSettings ─────────────────────────────────────────────

describe('defaultTextStyleSettings', () => {
  it('has same fontSize as projection defaults', () => {
    expect(defaultTextStyleSettings.fontSize).toBe(72);
  });

  it('has center text justify', () => {
    expect(defaultTextStyleSettings.textJustify).toBe('center');
  });

  it('has 12px lineGap', () => {
    expect(defaultTextStyleSettings.lineGap).toBe(12);
  });
});

// ── defaultContentTypeTextSettings ───────────────────────────────────────

describe('defaultContentTypeTextSettings', () => {
  it('has song, bible, and announcement keys', () => {
    expect(defaultContentTypeTextSettings).toHaveProperty('song');
    expect(defaultContentTypeTextSettings).toHaveProperty('bible');
    expect(defaultContentTypeTextSettings).toHaveProperty('announcement');
  });

  it('bible has referenceStyle', () => {
    expect(defaultContentTypeTextSettings.bible.referenceStyle).toBeDefined();
    expect(defaultContentTypeTextSettings.bible.referenceStyle.fontSize).toBe(
      48,
    );
    expect(defaultContentTypeTextSettings.bible.referenceStyle.textColor).toBe(
      '#cccccc',
    );
  });
});

// ── defaultBibleReferenceStyle ───────────────────────────────────────────

describe('defaultBibleReferenceStyle', () => {
  it('has 48px fontSize', () => {
    expect(defaultBibleReferenceStyle.fontSize).toBe(48);
  });

  it('has gray text color', () => {
    expect(defaultBibleReferenceStyle.textColor).toBe('#cccccc');
  });
});

// ── COLOR_PRESETS ────────────────────────────────────────────────────────

describe('COLOR_PRESETS', () => {
  it('has standard chroma key colors', () => {
    expect(COLOR_PRESETS.black).toBe('#000000');
    expect(COLOR_PRESETS.white).toBe('#FFFFFF');
    expect(COLOR_PRESETS.green).toBe('#00FF00');
    expect(COLOR_PRESETS.blue).toBe('#0000FF');
  });
});
