import { getFrameStyle } from '../../renderer/shared/utils/frameStyles';
import type { Frame } from '../../shared/types/frame';

function makeFrame(overrides: Partial<Frame>): Frame {
  return {
    id: 'frame-1',
    name: 'Test Frame',
    type: 'css',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getFrameStyle', () => {
  it('returns empty object for null frame', () => {
    expect(getFrameStyle(null)).toEqual({});
  });

  describe('image frames', () => {
    it('returns border-image properties', () => {
      const frame = makeFrame({
        type: 'image',
        imagePath: '/path/to/frame.png',
        sliceSize: 40,
      });
      const style = getFrameStyle(frame);
      expect(style.borderImageSource).toContain('file:///path/to/frame.png');
      expect(style.borderImageSlice).toBe('40 fill');
      expect(style.borderImageWidth).toBe('40px');
      expect(style.borderImageRepeat).toBe('stretch');
    });

    it('uses default sliceSize of 30 when not specified', () => {
      const frame = makeFrame({
        type: 'image',
        imagePath: '/path/to/frame.png',
      });
      const style = getFrameStyle(frame);
      expect(style.borderImageSlice).toBe('30 fill');
      expect(style.borderImageWidth).toBe('30px');
    });

    it('includes padding when specified', () => {
      const frame = makeFrame({
        type: 'image',
        imagePath: '/path/to/frame.png',
        padding: { top: 10, right: 20, bottom: 30, left: 40 },
      });
      const style = getFrameStyle(frame);
      expect(style.padding).toBe('10px 20px 30px 40px');
    });

    it('returns empty object for image frame without imagePath', () => {
      const frame = makeFrame({ type: 'image' });
      expect(getFrameStyle(frame)).toEqual({});
    });
  });

  describe('CSS frames', () => {
    it('returns border with width and color', () => {
      const frame = makeFrame({
        type: 'css',
        borderWidth: 2,
        borderColor: '#ff0000',
      });
      const style = getFrameStyle(frame);
      expect(style.border).toBe('2px solid #ff0000');
    });

    it('returns borderRadius when specified', () => {
      const frame = makeFrame({
        type: 'css',
        borderRadius: 12,
      });
      const style = getFrameStyle(frame);
      expect(style.borderRadius).toBe('12px');
    });

    it('returns backgroundColor when specified', () => {
      const frame = makeFrame({
        type: 'css',
        backgroundColor: 'rgba(0,0,0,0.5)',
      });
      const style = getFrameStyle(frame);
      expect(style.backgroundColor).toBe('rgba(0,0,0,0.5)');
    });

    it('returns boxShadow when specified', () => {
      const frame = makeFrame({
        type: 'css',
        boxShadow: '0 0 10px rgba(0,0,0,0.5)',
      });
      const style = getFrameStyle(frame);
      expect(style.boxShadow).toBe('0 0 10px rgba(0,0,0,0.5)');
    });

    it('returns padding when specified', () => {
      const frame = makeFrame({
        type: 'css',
        padding: { top: 5, right: 10, bottom: 15, left: 20 },
      });
      const style = getFrameStyle(frame);
      expect(style.padding).toBe('5px 10px 15px 20px');
    });

    it('omits border when width or color is missing', () => {
      const frame1 = makeFrame({ type: 'css', borderWidth: 2 });
      expect(getFrameStyle(frame1).border).toBeUndefined();

      const frame2 = makeFrame({ type: 'css', borderColor: 'red' });
      expect(getFrameStyle(frame2).border).toBeUndefined();
    });

    it('omits borderRadius when not specified', () => {
      const frame = makeFrame({ type: 'css' });
      expect(getFrameStyle(frame).borderRadius).toBeUndefined();
    });
  });

  describe('unknown frame type', () => {
    it('returns empty object for unknown type', () => {
      const frame = makeFrame({ type: 'unknown' as Frame['type'] });
      expect(getFrameStyle(frame)).toEqual({});
    });
  });
});
