import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ErrorBoundary,
  LoadingSkeleton,
  SessionListSkeleton,
  SetlistSkeleton,
} from '../../renderer/control/components/ErrorBoundary';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        errorOccurred: 'An error occurred',
        error: 'Something went wrong',
        retry: 'Retry',
        loading: 'Loading...',
        font: 'Font',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en' },
  }),
}));

// Component that throws an error
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div data-testid="child">Child content</div>;
}

describe('ErrorBoundary', () => {
  // Suppress console.error during error boundary tests
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalConsoleError;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary
        fallback={<div data-testid="fallback">Custom fallback</div>}
      >
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('shows retry button in default error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('clears error state when retry is clicked', () => {
    // Use a component whose throw behavior can be controlled externally
    let shouldThrow = true;
    function ConditionalThrow() {
      if (shouldThrow) throw new Error('Boom');
      return <div data-testid="child">Recovered</div>;
    }

    render(
      <ErrorBoundary>
        <ConditionalThrow />
      </ErrorBoundary>,
    );

    // Error UI should be showing
    expect(screen.getByText('An error occurred')).toBeInTheDocument();

    // Fix the error condition, then click retry
    shouldThrow = false;
    fireEvent.click(screen.getByText('Retry'));

    // Child should be visible again
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('calls componentDidCatch with error info', () => {
    const spy = jest.spyOn(ErrorBoundary.prototype, 'componentDidCatch');

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow />
      </ErrorBoundary>,
    );

    expect(spy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );

    spy.mockRestore();
  });
});

describe('LoadingSkeleton', () => {
  it('renders with animate-pulse class', () => {
    const { container } = render(<LoadingSkeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('animate-pulse');
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingSkeleton className="h-12 w-full" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-12');
    expect(el.className).toContain('w-full');
  });

  it('renders with bg-muted class', () => {
    const { container } = render(<LoadingSkeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('bg-muted');
  });
});

describe('SessionListSkeleton', () => {
  it('renders 3 skeleton items', () => {
    const { container } = render(<SessionListSkeleton />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(3);
  });
});

describe('SetlistSkeleton', () => {
  it('renders multiple skeleton items for setlist layout', () => {
    const { container } = render(<SetlistSkeleton />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(5);
  });
});
