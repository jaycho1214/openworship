import { distance } from 'fastest-levenshtein';
import type { Slide } from '../types/song';

// Use crypto.randomUUID() which is available in modern browsers and Node.js
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const DEFAULT_LINES_PER_SLIDE = 2;

/**
 * Section markers that indicate a new slide should start
 * Matches patterns like [Verse], [Chorus], [Bridge], [절], [후렴] etc.
 * Also matches reference patterns like [Chorus:ref] to repeat a section
 */
const SECTION_MARKER_REGEX = /^\[(.+)\]$/;
const SECTION_REF_REGEX = /^(.+):ref$/; // Matches "Chorus:ref" inside brackets

/**
 * Parse raw lyrics text into slides.
 * - Blank lines act as slide separators
 * - Section markers like [Verse], [Chorus] also trigger new slides
 * - Reference markers like [Chorus:ref] create references to existing sections
 * - If no blank lines, defaults to configured lines per slide
 * @param rawLyrics - The raw lyrics text
 * @param maxLinesPerSlide - Maximum lines per slide (null = unlimited, uses blank lines only)
 */
export function parseLyricsToSlides(
  rawLyrics: string,
  maxLinesPerSlide: number | null | undefined = undefined,
): Slide[] {
  // null = unlimited (no auto-splitting), undefined = use default (2 lines)
  const linesLimit =
    maxLinesPerSlide === null
      ? Infinity
      : (maxLinesPerSlide ?? DEFAULT_LINES_PER_SLIDE);
  const slides: Slide[] = [];
  const rawLines = rawLyrics.split('\n').map((line) => line.trim());

  // Check if blank lines are used as separators
  const hasBlankLineSeparators = rawLines.some(
    (line, index) =>
      line === '' &&
      index > 0 &&
      index < rawLines.length - 1 &&
      rawLines[index - 1] !== '' &&
      rawLines[index + 1] !== '',
  );

  if (hasBlankLineSeparators) {
    // Use blank lines as separators
    let currentSlide: string[] = [];
    let currentSection: string | undefined;

    for (const line of rawLines) {
      // Check for section markers
      const sectionMatch = line.match(SECTION_MARKER_REGEX);
      if (sectionMatch) {
        if (currentSlide.length > 0) {
          slides.push({
            id: generateId(),
            lines: currentSlide,
            section: currentSection,
          });
          currentSlide = [];
        }

        // Check if this is a reference
        const refMatch = sectionMatch[1].match(SECTION_REF_REGEX);
        if (refMatch) {
          // This is a reference - create a placeholder slide
          slides.push({
            id: generateId(),
            lines: [], // Empty - will be resolved from the referenced section
            sectionRef: refMatch[1], // The section name being referenced
          });
          currentSection = undefined;
        } else {
          currentSection = sectionMatch[1];
        }
        continue;
      }

      // Blank line = new slide
      if (line === '') {
        if (currentSlide.length > 0) {
          slides.push({
            id: generateId(),
            lines: currentSlide,
            section: currentSection,
          });
          currentSlide = [];
          currentSection = undefined; // Reset section after first slide in section
        }
        continue;
      }

      currentSlide.push(line);

      // Enforce max lines per slide (only if limit is set)
      if (linesLimit && currentSlide.length >= linesLimit) {
        slides.push({
          id: generateId(),
          lines: currentSlide,
          section: currentSection,
        });
        currentSlide = [];
        currentSection = undefined;
      }
    }

    if (currentSlide.length > 0) {
      slides.push({
        id: generateId(),
        lines: currentSlide,
        section: currentSection,
      });
    }
  } else {
    // No blank lines - use default 2 lines per slide
    const lines = rawLines.filter((line) => line.length > 0);
    let currentSlide: string[] = [];
    let currentSection: string | undefined;

    for (const line of lines) {
      const sectionMatch = line.match(SECTION_MARKER_REGEX);
      if (sectionMatch) {
        if (currentSlide.length > 0) {
          slides.push({
            id: generateId(),
            lines: currentSlide,
            section: currentSection,
          });
          currentSlide = [];
        }

        // Check if this is a reference
        const refMatch = sectionMatch[1].match(SECTION_REF_REGEX);
        if (refMatch) {
          // This is a reference - create a placeholder slide
          slides.push({
            id: generateId(),
            lines: [],
            sectionRef: refMatch[1],
          });
          currentSection = undefined;
        } else {
          currentSection = sectionMatch[1];
        }
        continue;
      }

      currentSlide.push(line);

      if (currentSlide.length >= linesLimit) {
        slides.push({
          id: generateId(),
          lines: currentSlide,
          section: currentSection,
        });
        currentSlide = [];
        currentSection = undefined;
      }
    }

    if (currentSlide.length > 0) {
      slides.push({
        id: generateId(),
        lines: currentSlide,
        section: currentSection,
      });
    }
  }

  return slides;
}

/**
 * Resolve section references in slides by copying content from original sections.
 * Returns a new array with references expanded to full content.
 */
export function resolveSectionReferences(slides: Slide[]): Slide[] {
  // First, build a map of section name -> slides in that section
  const sectionMap = new Map<string, Slide[]>();
  let currentSection: string | undefined;
  let currentSectionSlides: Slide[] = [];

  for (const slide of slides) {
    if (slide.sectionRef) {
      // Skip reference slides when building the map
      continue;
    }

    if (slide.section) {
      // New section starts
      if (currentSection && currentSectionSlides.length > 0) {
        sectionMap.set(currentSection, currentSectionSlides);
      }
      currentSection = slide.section;
      currentSectionSlides = [slide];
    } else if (currentSection) {
      // Continue current section
      currentSectionSlides.push(slide);
    }
  }

  // Save the last section
  if (currentSection && currentSectionSlides.length > 0) {
    sectionMap.set(currentSection, currentSectionSlides);
  }

  // Now resolve references
  const resolvedSlides: Slide[] = [];

  for (const slide of slides) {
    if (slide.sectionRef) {
      // Find the referenced section
      const referencedSlides = sectionMap.get(slide.sectionRef);
      if (referencedSlides && referencedSlides.length > 0) {
        // Copy all slides from the referenced section
        for (let i = 0; i < referencedSlides.length; i++) {
          const refSlide = referencedSlides[i];
          resolvedSlides.push({
            id: generateId(),
            lines: [...refSlide.lines],
            section: i === 0 ? `${slide.sectionRef} (ref)` : undefined,
            sectionRef: slide.sectionRef, // Keep the reference marker
          });
        }
      } else {
        // Section not found - push a placeholder
        resolvedSlides.push({
          ...slide,
          lines: [`[${slide.sectionRef} not found]`],
        });
      }
    } else {
      resolvedSlides.push(slide);
    }
  }

  return resolvedSlides;
}

/**
 * Convert slides back to raw lyrics with blank line separators
 */
export function slidesToRawLyrics(slides: Slide[]): string {
  return slides.map((slide) => slide.lines.join('\n')).join('\n\n');
}

/**
 * Get the total number of slides that would be created from lyrics
 */
export function countSlides(
  rawLyrics: string,
  maxLinesPerSlide: number | null | undefined = undefined,
): number {
  return parseLyricsToSlides(rawLyrics, maxLinesPerSlide).length;
}

/**
 * Normalize text for comparison (remove spaces, punctuation, lowercase)
 * Used for auto-advance matching
 */
export function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\.,!?'"~\-_]/g, '') // Remove whitespace and common punctuation
    .replace(/[ㄱ-ㅎㅏ-ㅣ]/g, ''); // Remove standalone Korean consonants/vowels
}

/**
 * Calculate similarity between two strings (0-1)
 * Uses Levenshtein distance for accurate string comparison
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeForMatching(str1);
  const norm2 = normalizeForMatching(str2);

  if (norm1.length === 0 || norm2.length === 0) return 0;
  if (norm1 === norm2) return 1;

  // Early termination: if length difference is too large, similarity is low
  const maxLen = Math.max(norm1.length, norm2.length);
  const lenDiff = Math.abs(norm1.length - norm2.length);
  if (lenDiff / maxLen > 0.7) {
    return 0.1; // Very different lengths = low similarity
  }

  // Use Levenshtein distance for accurate similarity
  const editDistance = distance(norm1, norm2);
  return 1 - editDistance / maxLen;
}
