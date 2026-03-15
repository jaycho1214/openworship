import {
  normalizeLineEndings,
  generateId,
  parseLyricsToSlides,
  resolveSectionReferences,
  slidesToRawLyrics,
} from '../../shared/utils/lyricsParser';
import type { Slide } from '../../shared/types/song';

// ── normalizeLineEndings ─────────────────────────────────────────────────

describe('normalizeLineEndings', () => {
  it('converts CRLF to LF', () => {
    expect(normalizeLineEndings('hello\r\nworld')).toBe('hello\nworld');
  });

  it('converts lone CR to LF', () => {
    expect(normalizeLineEndings('hello\rworld')).toBe('hello\nworld');
  });

  it('leaves LF unchanged', () => {
    expect(normalizeLineEndings('hello\nworld')).toBe('hello\nworld');
  });

  it('handles mixed line endings', () => {
    expect(normalizeLineEndings('a\r\nb\rc\nd')).toBe('a\nb\nc\nd');
  });

  it('handles empty string', () => {
    expect(normalizeLineEndings('')).toBe('');
  });

  it('handles string with no line endings', () => {
    expect(normalizeLineEndings('hello world')).toBe('hello world');
  });

  it('handles multiple consecutive CRLF', () => {
    expect(normalizeLineEndings('a\r\n\r\nb')).toBe('a\n\nb');
  });
});

// ── generateId ───────────────────────────────────────────────────────────

describe('generateId', () => {
  it('returns a string', () => {
    expect(typeof generateId()).toBe('string');
  });

  it('returns unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });

  it('returns UUID-like format', () => {
    const id = generateId();
    // Should look like xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

// ── parseLyricsToSlides ──────────────────────────────────────────────────

describe('parseLyricsToSlides', () => {
  describe('basic splitting', () => {
    it('splits by blank lines when present', () => {
      const lyrics = 'Line 1\nLine 2\n\nLine 3\nLine 4';
      const slides = parseLyricsToSlides(lyrics);
      expect(slides).toHaveLength(2);
      expect(slides[0].lines).toEqual(['Line 1', 'Line 2']);
      expect(slides[1].lines).toEqual(['Line 3', 'Line 4']);
    });

    it('splits by default 2 lines per slide when no blank lines', () => {
      const lyrics = 'Line 1\nLine 2\nLine 3\nLine 4';
      const slides = parseLyricsToSlides(lyrics);
      expect(slides).toHaveLength(2);
      expect(slides[0].lines).toEqual(['Line 1', 'Line 2']);
      expect(slides[1].lines).toEqual(['Line 3', 'Line 4']);
    });

    it('handles odd number of lines with default splitting', () => {
      const lyrics = 'Line 1\nLine 2\nLine 3';
      const slides = parseLyricsToSlides(lyrics);
      expect(slides).toHaveLength(2);
      expect(slides[0].lines).toEqual(['Line 1', 'Line 2']);
      expect(slides[1].lines).toEqual(['Line 3']);
    });

    it('returns empty array for empty string', () => {
      expect(parseLyricsToSlides('')).toHaveLength(0);
    });

    it('handles single line', () => {
      const slides = parseLyricsToSlides('Just one line');
      expect(slides).toHaveLength(1);
      expect(slides[0].lines).toEqual(['Just one line']);
    });
  });

  describe('maxLinesPerSlide parameter', () => {
    it('respects custom maxLinesPerSlide', () => {
      const lyrics = 'L1\nL2\nL3\nL4\nL5\nL6';
      const slides = parseLyricsToSlides(lyrics, 3);
      expect(slides).toHaveLength(2);
      expect(slides[0].lines).toEqual(['L1', 'L2', 'L3']);
      expect(slides[1].lines).toEqual(['L4', 'L5', 'L6']);
    });

    it('null maxLinesPerSlide means unlimited (uses blank lines only)', () => {
      const lyrics = 'L1\nL2\nL3\nL4\n\nL5\nL6';
      const slides = parseLyricsToSlides(lyrics, null);
      expect(slides).toHaveLength(2);
      expect(slides[0].lines).toEqual(['L1', 'L2', 'L3', 'L4']);
      expect(slides[1].lines).toEqual(['L5', 'L6']);
    });

    it('maxLinesPerSlide=1 creates one slide per line', () => {
      const lyrics = 'A\nB\nC';
      const slides = parseLyricsToSlides(lyrics, 1);
      expect(slides).toHaveLength(3);
      expect(slides[0].lines).toEqual(['A']);
      expect(slides[1].lines).toEqual(['B']);
      expect(slides[2].lines).toEqual(['C']);
    });
  });

  describe('section markers', () => {
    it('parses section markers like [Verse]', () => {
      const lyrics = '[Verse]\nLine 1\nLine 2\n\n[Chorus]\nChorus line';
      const slides = parseLyricsToSlides(lyrics);
      expect(slides).toHaveLength(2);
      expect(slides[0].section).toBe('Verse');
      expect(slides[0].lines).toEqual(['Line 1', 'Line 2']);
      expect(slides[1].section).toBe('Chorus');
      expect(slides[1].lines).toEqual(['Chorus line']);
    });

    it('parses Korean section markers', () => {
      const lyrics = '[절]\n가사 1\n가사 2\n\n[후렴]\n후렴 가사';
      const slides = parseLyricsToSlides(lyrics);
      expect(slides).toHaveLength(2);
      expect(slides[0].section).toBe('절');
      expect(slides[1].section).toBe('후렴');
    });

    it('handles section markers without blank lines', () => {
      const lyrics = '[Verse]\nLine 1\nLine 2\n[Chorus]\nChorus line 1';
      const slides = parseLyricsToSlides(lyrics);
      expect(slides).toHaveLength(2);
      expect(slides[0].section).toBe('Verse');
      expect(slides[1].section).toBe('Chorus');
    });
  });

  describe('section references', () => {
    it('creates reference slides for [Section:ref] markers', () => {
      const lyrics =
        '[Chorus]\nHallelujah\n\n[Verse]\nVerse text\n\n[Chorus:ref]';
      const slides = parseLyricsToSlides(lyrics);
      expect(slides).toHaveLength(3);
      expect(slides[2].sectionRef).toBe('Chorus');
      expect(slides[2].lines).toEqual([]);
    });
  });

  describe('whitespace handling', () => {
    it('trims whitespace from lines', () => {
      const lyrics = '  Line 1  \n  Line 2  \n\n  Line 3  ';
      const slides = parseLyricsToSlides(lyrics);
      expect(slides[0].lines).toEqual(['Line 1', 'Line 2']);
      expect(slides[1].lines).toEqual(['Line 3']);
    });

    it('ignores leading/trailing blank lines', () => {
      const lyrics = '\n\nLine 1\nLine 2\n\n';
      const slides = parseLyricsToSlides(lyrics);
      expect(slides).toHaveLength(1);
      expect(slides[0].lines).toEqual(['Line 1', 'Line 2']);
    });

    it('handles multiple consecutive blank lines (no valid separator pattern)', () => {
      // Consecutive blanks fail the hasBlankLineSeparators heuristic
      // (requires non-empty lines on both sides of each blank),
      // so the parser falls back to default 2-lines-per-slide grouping
      const lyrics = 'Line 1\n\n\n\nLine 2';
      const slides = parseLyricsToSlides(lyrics);
      expect(slides).toHaveLength(1);
      expect(slides[0].lines).toEqual(['Line 1', 'Line 2']);
    });
  });

  describe('CRLF handling', () => {
    it('handles Windows-style line endings', () => {
      const lyrics = 'Line 1\r\nLine 2\r\n\r\nLine 3\r\nLine 4';
      const slides = parseLyricsToSlides(lyrics);
      expect(slides).toHaveLength(2);
      expect(slides[0].lines).toEqual(['Line 1', 'Line 2']);
      expect(slides[1].lines).toEqual(['Line 3', 'Line 4']);
    });
  });

  describe('slide id generation', () => {
    it('assigns unique ids to each slide', () => {
      const lyrics = 'L1\nL2\n\nL3\nL4\n\nL5\nL6';
      const slides = parseLyricsToSlides(lyrics);
      const ids = slides.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('real-world lyrics', () => {
    it('parses a typical worship song', () => {
      const lyrics = [
        '[Verse 1]',
        'Amazing grace how sweet the sound',
        'That saved a wretch like me',
        '',
        '[Chorus]',
        'I once was lost but now am found',
        'Was blind but now I see',
        '',
        '[Verse 2]',
        "'Twas grace that taught my heart to fear",
        'And grace my fears relieved',
        '',
        '[Chorus:ref]',
      ].join('\n');

      const slides = parseLyricsToSlides(lyrics);
      expect(slides).toHaveLength(4);
      expect(slides[0].section).toBe('Verse 1');
      expect(slides[0].lines).toEqual([
        'Amazing grace how sweet the sound',
        'That saved a wretch like me',
      ]);
      expect(slides[1].section).toBe('Chorus');
      expect(slides[2].section).toBe('Verse 2');
      expect(slides[3].sectionRef).toBe('Chorus');
    });
  });
});

// ── resolveSectionReferences ─────────────────────────────────────────────

describe('resolveSectionReferences', () => {
  it('resolves a reference to an existing section', () => {
    const slides: Slide[] = [
      { id: '1', lines: ['Hallelujah'], section: 'Chorus' },
      { id: '2', lines: ['Verse text'], section: 'Verse' },
      { id: '3', lines: [], sectionRef: 'Chorus' },
    ];

    const resolved = resolveSectionReferences(slides);
    expect(resolved).toHaveLength(3);
    expect(resolved[2].lines).toEqual(['Hallelujah']);
    expect(resolved[2].sectionRef).toBe('Chorus');
    expect(resolved[2].section).toBe('Chorus (ref)');
  });

  it('handles reference to non-existent section', () => {
    const slides: Slide[] = [
      { id: '1', lines: ['Some text'], section: 'Verse' },
      { id: '2', lines: [], sectionRef: 'Bridge' },
    ];

    const resolved = resolveSectionReferences(slides);
    expect(resolved).toHaveLength(2);
    expect(resolved[1].lines).toEqual(['[Bridge not found]']);
  });

  it('resolves multi-slide section references', () => {
    const slides: Slide[] = [
      { id: '1', lines: ['Chorus L1'], section: 'Chorus' },
      { id: '2', lines: ['Chorus L2'] },
      { id: '3', lines: ['Verse text'], section: 'Verse' },
      { id: '4', lines: [], sectionRef: 'Chorus' },
    ];

    const resolved = resolveSectionReferences(slides);
    // Original 3 + 2 from resolved ref (replacing the 1 ref) = 5
    expect(resolved).toHaveLength(5);
    expect(resolved[3].lines).toEqual(['Chorus L1']);
    expect(resolved[3].section).toBe('Chorus (ref)');
    expect(resolved[4].lines).toEqual(['Chorus L2']);
  });

  it('returns slides unchanged if no references', () => {
    const slides: Slide[] = [
      { id: '1', lines: ['Line 1'], section: 'Verse' },
      { id: '2', lines: ['Line 2'] },
    ];

    const resolved = resolveSectionReferences(slides);
    expect(resolved).toHaveLength(2);
    expect(resolved[0]).toBe(slides[0]); // Same object reference
  });

  it('handles empty input', () => {
    expect(resolveSectionReferences([])).toEqual([]);
  });
});

// ── slidesToRawLyrics ────────────────────────────────────────────────────

describe('slidesToRawLyrics', () => {
  it('joins slides with double newlines', () => {
    const slides: Slide[] = [
      { id: '1', lines: ['Line 1', 'Line 2'] },
      { id: '2', lines: ['Line 3', 'Line 4'] },
    ];
    expect(slidesToRawLyrics(slides)).toBe('Line 1\nLine 2\n\nLine 3\nLine 4');
  });

  it('handles single-line slides', () => {
    const slides: Slide[] = [
      { id: '1', lines: ['Line 1'] },
      { id: '2', lines: ['Line 2'] },
    ];
    expect(slidesToRawLyrics(slides)).toBe('Line 1\n\nLine 2');
  });

  it('handles empty slides array', () => {
    expect(slidesToRawLyrics([])).toBe('');
  });

  it('handles single slide', () => {
    const slides: Slide[] = [{ id: '1', lines: ['Only line'] }];
    expect(slidesToRawLyrics(slides)).toBe('Only line');
  });

  it('roundtrips with parseLyricsToSlides (blank-line mode)', () => {
    const original =
      'Amazing grace\nHow sweet the sound\n\nThat saved\nA wretch like me';
    const slides = parseLyricsToSlides(original);
    const reconstructed = slidesToRawLyrics(slides);
    expect(reconstructed).toBe(original);
  });
});
