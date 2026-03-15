import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NoteOverlay from '../../renderer/projection/components/NoteOverlay';

describe('NoteOverlay', () => {
  describe('visibility', () => {
    it('renders with data-testid', () => {
      render(<NoteOverlay isVisible={false} />);
      expect(screen.getByTestId('projection-note-overlay')).toBeInTheDocument();
    });

    it('has opacity 1 when visible', () => {
      render(<NoteOverlay isVisible content="Hello" />);
      const el = screen.getByTestId('projection-note-overlay');
      expect(el.style.opacity).toBe('1');
    });

    it('has opacity 0 when hidden', () => {
      render(<NoteOverlay isVisible={false} content="Hello" />);
      const el = screen.getByTestId('projection-note-overlay');
      expect(el.style.opacity).toBe('0');
    });
  });

  describe('text content', () => {
    it('renders text content', () => {
      render(<NoteOverlay isVisible content="Welcome everyone" />);
      expect(screen.getByText('Welcome everyone')).toBeInTheDocument();
    });

    it('splits multiline content into separate paragraphs', () => {
      render(<NoteOverlay isVisible content={'Line 1\nLine 2\nLine 3'} />);
      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
      expect(screen.getByText('Line 3')).toBeInTheDocument();
    });

    it('filters out blank lines', () => {
      const { container } = render(
        <NoteOverlay isVisible content={'Line 1\n\nLine 2'} />,
      );
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(2);
    });

    it('renders nothing when content is empty', () => {
      const { container } = render(<NoteOverlay isVisible content="" />);
      const paragraphs = container.querySelectorAll('p');
      expect(paragraphs).toHaveLength(0);
    });
  });

  describe('position', () => {
    it('positions at bottom by default', () => {
      render(<NoteOverlay isVisible content="Test" />);
      const el = screen.getByTestId('projection-note-overlay');
      expect(el.style.bottom).toBe('0px');
    });

    it('positions at top when position="top"', () => {
      render(<NoteOverlay isVisible content="Test" position="top" />);
      const el = screen.getByTestId('projection-note-overlay');
      expect(el.style.top).toBe('0px');
    });

    it('applies translateY(0) when visible at bottom', () => {
      render(<NoteOverlay isVisible content="Test" position="bottom" />);
      const el = screen.getByTestId('projection-note-overlay');
      expect(el.style.transform).toBe('translateY(0)');
    });

    it('applies translateY(100%) when hidden at bottom', () => {
      render(
        <NoteOverlay isVisible={false} content="Test" position="bottom" />,
      );
      const el = screen.getByTestId('projection-note-overlay');
      expect(el.style.transform).toBe('translateY(100%)');
    });

    it('applies translateY(-100%) when hidden at top', () => {
      render(<NoteOverlay isVisible={false} content="Test" position="top" />);
      const el = screen.getByTestId('projection-note-overlay');
      expect(el.style.transform).toBe('translateY(-100%)');
    });
  });

  describe('image content', () => {
    it('renders image when contentType is "image"', () => {
      render(
        <NoteOverlay
          isVisible
          contentType="image"
          imagePath="/path/to/image.png"
        />,
      );
      const img = screen.getByAltText('Note overlay');
      expect(img).toBeInTheDocument();
      expect(img.getAttribute('src')).toContain('file:///path/to/image.png');
    });

    it('falls back to text when contentType is "image" but no imagePath', () => {
      render(
        <NoteOverlay isVisible contentType="image" content="Fallback text" />,
      );
      expect(screen.getByText('Fallback text')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has z-40 for proper layering', () => {
      render(<NoteOverlay isVisible content="Test" />);
      const el = screen.getByTestId('projection-note-overlay');
      expect(el.className).toContain('z-40');
    });

    it('has transition for smooth animation', () => {
      render(<NoteOverlay isVisible content="Test" />);
      const el = screen.getByTestId('projection-note-overlay');
      expect(el.style.transition).toContain('opacity');
      expect(el.style.transition).toContain('transform');
    });
  });
});
