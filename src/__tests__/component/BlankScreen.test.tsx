import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BlankScreen from '../../renderer/projection/components/BlankScreen';

describe('BlankScreen', () => {
  it('renders with data-testid', () => {
    render(<BlankScreen isBlank={false} />);
    expect(screen.getByTestId('projection-blank')).toBeInTheDocument();
  });

  it('has opacity 1 when isBlank is true', () => {
    render(<BlankScreen isBlank />);
    const el = screen.getByTestId('projection-blank');
    expect(el.style.opacity).toBe('1');
  });

  it('has opacity 0 when isBlank is false', () => {
    render(<BlankScreen isBlank={false} />);
    const el = screen.getByTestId('projection-blank');
    expect(el.style.opacity).toBe('0');
  });

  it('has transition style for smooth fade', () => {
    render(<BlankScreen isBlank={false} />);
    const el = screen.getByTestId('projection-blank');
    expect(el.style.transition).toBe('opacity 300ms ease-in-out');
  });

  it('has bg-black class for solid black overlay', () => {
    render(<BlankScreen isBlank />);
    const el = screen.getByTestId('projection-blank');
    expect(el.className).toContain('bg-black');
  });

  it('has z-50 to appear above content', () => {
    render(<BlankScreen isBlank />);
    const el = screen.getByTestId('projection-blank');
    expect(el.className).toContain('z-50');
  });

  it('has pointer-events-none so clicks pass through', () => {
    render(<BlankScreen isBlank />);
    const el = screen.getByTestId('projection-blank');
    expect(el.className).toContain('pointer-events-none');
  });
});
