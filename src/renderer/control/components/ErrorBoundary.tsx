import { Component, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error display component with translation support
function ErrorDisplay({
  error,
  onRetry,
}: {
  error: Error | null;
  onRetry: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        {t('errorOccurred')}
      </h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">
        {error?.message || t('error')}
      </p>
      <Button onClick={onRetry} variant="outline" className="gap-2">
        <RefreshCw className="w-4 h-4" />
        {t('retry') || 'Retry'}
      </Button>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { hasError, error } = this.state;
    const { fallback, children } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }
      return <ErrorDisplay error={error} onRetry={this.handleRetry} />;
    }

    return children;
  }
}

// Loading skeleton component
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-muted rounded ${className || ''}`} />
  );
}

// Loading state for sessions/setlist
export function SessionListSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <LoadingSkeleton className="h-12 w-full" />
      <LoadingSkeleton className="h-12 w-full" />
      <LoadingSkeleton className="h-12 w-3/4" />
    </div>
  );
}

// Loading state for setlist items
export function SetlistSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <LoadingSkeleton className="h-10 w-full" />
      <div className="pl-4 space-y-1">
        <LoadingSkeleton className="h-6 w-full" />
        <LoadingSkeleton className="h-6 w-3/4" />
        <LoadingSkeleton className="h-6 w-5/6" />
      </div>
      <LoadingSkeleton className="h-10 w-full" />
      <div className="pl-4 space-y-1">
        <LoadingSkeleton className="h-6 w-full" />
        <LoadingSkeleton className="h-6 w-2/3" />
      </div>
    </div>
  );
}

// Font loading progress indicator
export function FontLoadingIndicator({
  progress,
  total,
}: {
  progress: number;
  total: number;
}) {
  const { t } = useTranslation();
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  if (progress >= total) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <div className="text-xs">
          <p className="font-medium text-foreground">{t('loading')}</p>
          <p className="text-muted-foreground">
            {t('font')} {progress}/{total} ({percentage}%)
          </p>
        </div>
      </div>
    </div>
  );
}
