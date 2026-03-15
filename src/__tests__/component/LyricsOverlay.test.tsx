import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LyricsOverlay from '../../renderer/projection/components/LyricsOverlay';

describe('LyricsOverlay', () => {
  describe('rendering', () => {
    it('renders lyrics lines', () => {
      render(
        <LyricsOverlay lines={['Amazing grace', 'How sweet the sound']} />,
      );
      expect(screen.getByText('Amazing grace')).toBeInTheDocument();
      expect(screen.getByText('How sweet the sound')).toBeInTheDocument();
    });

    it('renders nothing for empty lines', () => {
      const { container } = render(<LyricsOverlay lines={[]} />);
      expect(
        container.querySelector('[data-testid="projection-lyrics"]'),
      ).not.toBeInTheDocument();
    });

    it('renders with data-testid attributes', () => {
      render(<LyricsOverlay lines={['Test']} />);
      expect(
        screen.getByTestId('projection-lyrics-wrapper'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('projection-lyrics')).toBeInTheDocument();
    });
  });

  describe('visibility', () => {
    it('has opacity 1 when not hidden', () => {
      render(<LyricsOverlay lines={['Test']} isHidden={false} />);
      const wrapper = screen.getByTestId('projection-lyrics-wrapper');
      expect(wrapper.style.opacity).toBe('1');
    });

    it('has opacity 0 when hidden', () => {
      render(<LyricsOverlay lines={['Test']} isHidden />);
      const wrapper = screen.getByTestId('projection-lyrics-wrapper');
      expect(wrapper.style.opacity).toBe('0');
    });
  });

  describe('font settings', () => {
    it('applies custom font family', () => {
      render(<LyricsOverlay lines={['Test']} fontFamily="Noto Sans KR" />);
      const text = screen.getByText('Test');
      expect(text.style.fontFamily).toBe('Noto Sans KR');
    });

    it('does not set fontFamily when set to "inherit"', () => {
      render(<LyricsOverlay lines={['Test']} fontFamily="inherit" />);
      const text = screen.getByText('Test');
      expect(text.style.fontFamily).toBe('');
    });

    it('applies default font size from settings', () => {
      render(<LyricsOverlay lines={['Test']} />);
      const text = screen.getByText('Test');
      expect(text.style.fontSize).toBe('72px'); // defaultProjectionSettings.fontSize
    });

    it('applies per-slide font size override', () => {
      render(<LyricsOverlay lines={['Test']} slideFontSize={96} />);
      const text = screen.getByText('Test');
      expect(text.style.fontSize).toBe('96px');
    });
  });

  describe('text styling', () => {
    it('applies text color from settings', () => {
      render(<LyricsOverlay lines={['Test']} />);
      const text = screen.getByText('Test');
      // JSDOM normalizes hex to rgb
      expect(text.style.color).toBe('rgb(255, 255, 255)');
    });

    it('applies text shadow when enabled (default)', () => {
      render(<LyricsOverlay lines={['Test']} />);
      const text = screen.getByText('Test');
      // Default has textShadow enabled
      expect(text.style.textShadow).toBeTruthy();
    });

    it('omits text shadow when disabled', () => {
      render(
        <LyricsOverlay
          lines={['Test']}
          settings={{
            fontSize: 72,
            textColor: '#ffffff',
            textShadow: {
              enabled: false,
              offsetX: 0,
              offsetY: 0,
              blur: 8,
              color: 'rgba(0,0,0,0.9)',
            },
            textOutline: { enabled: false, width: 2, color: '#000000' },
            backgroundDim: 0,
            animation: 'none',
            displayMode: 'fullscreen',
            textAlign: { horizontal: 'center', vertical: 'middle' },
          }}
        />,
      );
      const text = screen.getByText('Test');
      expect(text.style.textShadow).toBeFalsy();
    });
  });

  describe('banner ad offset', () => {
    it('adds bottom offset when banner ad is at bottom', () => {
      render(
        <LyricsOverlay
          lines={['Test']}
          isBannerAdVisible
          bannerAdPosition="bottom"
        />,
      );
      const lyrics = screen.getByTestId('projection-lyrics');
      // Bottom offset should be non-zero
      expect(parseInt(lyrics.style.bottom, 10)).toBeGreaterThan(0);
    });

    it('adds top offset when banner ad is at top', () => {
      render(
        <LyricsOverlay
          lines={['Test']}
          isBannerAdVisible
          bannerAdPosition="top"
        />,
      );
      const lyrics = screen.getByTestId('projection-lyrics');
      expect(parseInt(lyrics.style.top as string, 10)).toBeGreaterThan(0);
    });

    it('no offset when banner is not visible', () => {
      render(<LyricsOverlay lines={['Test']} isBannerAdVisible={false} />);
      const lyrics = screen.getByTestId('projection-lyrics');
      expect(parseInt(lyrics.style.top as string, 10)).toBe(0);
      expect(parseInt(lyrics.style.bottom, 10)).toBe(0);
    });
  });

  describe('overlay note offset', () => {
    it('adds bottom offset when overlay note is visible at bottom', () => {
      render(
        <LyricsOverlay
          lines={['Test']}
          isOverlayNoteVisible
          overlayNotePosition="bottom"
        />,
      );
      const lyrics = screen.getByTestId('projection-lyrics');
      expect(parseInt(lyrics.style.bottom, 10)).toBeGreaterThan(0);
    });

    it('adds top offset when overlay note is visible at top', () => {
      render(
        <LyricsOverlay
          lines={['Test']}
          isOverlayNoteVisible
          overlayNotePosition="top"
        />,
      );
      const lyrics = screen.getByTestId('projection-lyrics');
      expect(parseInt(lyrics.style.top as string, 10)).toBeGreaterThan(0);
    });
  });

  describe('multiple lines', () => {
    it('renders each line as a separate paragraph', () => {
      const { container } = render(
        <LyricsOverlay lines={['Line 1', 'Line 2', 'Line 3']} />,
      );
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(3);
    });

    it('each line has font-bold class', () => {
      const { container } = render(
        <LyricsOverlay lines={['Line 1', 'Line 2']} />,
      );
      const paragraphs = container.querySelectorAll('p');
      paragraphs.forEach((p) => {
        expect(p.className).toContain('font-bold');
      });
    });
  });

  describe('slide overrides', () => {
    it('applies slide-specific font size override', () => {
      render(
        <LyricsOverlay lines={['Test']} slideOverrides={{ fontSize: 120 }} />,
      );
      const text = screen.getByText('Test');
      expect(text.style.fontSize).toBe('120px');
    });
  });

  describe('frame support', () => {
    it('renders without frame by default', () => {
      render(<LyricsOverlay lines={['Test']} />);
      const lyrics = screen.getByTestId('projection-lyrics');
      const frameContainer = lyrics.querySelector('div');
      expect(frameContainer?.className).not.toContain('p-4');
    });

    it('adds internal padding when frame is set', () => {
      render(
        <LyricsOverlay
          lines={['Test']}
          frame={{
            id: 'f1',
            name: 'Test Frame',
            type: 'css',
            borderWidth: 2,
            borderColor: '#fff',
            createdAt: '',
            updatedAt: '',
          }}
        />,
      );
      const lyrics = screen.getByTestId('projection-lyrics');
      const frameContainer = lyrics.querySelector('div');
      expect(frameContainer?.className).toContain('p-4');
    });
  });
});
