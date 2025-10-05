import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { sreLogger } from '@/lib/sre-logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

/**
 * Error Boundary globale con Sentry integration
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { errorCount } = this.state;
    const newErrorCount = errorCount + 1;

    // Log error
    sreLogger.error('React Error Boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorCount: newErrorCount,
    });

    // Report to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        errorBoundary: true,
        errorCount: newErrorCount.toString(),
      },
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Update state
    this.setState({
      errorInfo,
      errorCount: newErrorCount,
    });

    // Auto-recover after 3 errors
    if (newErrorCount >= 3) {
      sreLogger.warn('Too many errors, forcing page reload');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  override render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback, showDetails = false } = this.props;

    if (hasError) {
      // Custom fallback
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>Qualcosa è andato storto</CardTitle>
              </div>
              <CardDescription>
                {errorCount >= 3
                  ? 'Troppi errori rilevati. Reindirizzamento alla home...'
                  : 'Si è verificato un errore imprevisto. Riprova o torna alla home.'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {showDetails && error && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Dettagli errore:</div>
                  <div className="p-3 bg-muted rounded-md text-sm font-mono overflow-auto max-h-40">
                    {error.message}
                  </div>
                  {errorInfo && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Stack trace
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-60">
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {!showDetails && (
                <p className="text-sm text-muted-foreground">
                  L'errore è stato registrato e verrà analizzato dal nostro team.
                </p>
              )}
            </CardContent>

            <CardFooter className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Riprova
              </Button>
              <Button onClick={this.handleGoHome} className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Vai alla Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return children;
  }
}

/**
 * HOC per wrappare componenti con Error Boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
