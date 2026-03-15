/**
 * Lightweight test setup for unit/integration/component tests.
 * Unlike .erb/scripts/check-build-exists.ts, this does NOT require
 * the renderer or main process to be built.
 */
import { TextEncoder, TextDecoder } from 'node:util';

// JSDOM does not implement TextEncoder and TextDecoder
if (!global.TextEncoder) {
  global.TextEncoder = TextEncoder;
}
if (!global.TextDecoder) {
  // @ts-ignore
  global.TextDecoder = TextDecoder;
}
