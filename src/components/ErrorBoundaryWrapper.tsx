import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

/**
 * Enhanced Error Boundary with logging and recovery options
 * Wraps critical components to prevent full app crashes
 */
export class ErrorBoundaryWrapper extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { componentName, onError } = this.props;
    
    logger.error(
      `Component error in ${componentName || 'Unknown'}`,
      {
        ...(componentName && { component: componentName }),
        errorId: this.state.errorId
      },
      error
    );

    this.setState({
      error,
      errorInfo
    });

    onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  override render() {
    const { hasError, error, errorId } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <Card className="max-w-2xl mx-auto my-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Si è verificato un errore
            </CardTitle>
            <CardDescription>
              {componentName ? `Errore nel componente: ${componentName}` : 'Errore inaspettato'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ci scusiamo per l'inconveniente. L'errore è stato registrato automaticamente.
            </p>
            
            <div className="flex gap-2">
              <Button onClick={this.handleReset} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Riprova
              </Button>
              <Button onClick={this.handleReload} variant="secondary">
                Ricarica Pagina
              </Button>
            </div>

            {import.meta.env.DEV && error && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Dettagli tecnici (solo sviluppo)
                </summary>
                <div className="mt-2 p-4 bg-muted rounded-md">
                  <p className="text-xs font-mono text-destructive mb-2">
                    ID: {errorId}
                  </p>
                  <p className="text-xs font-mono text-destructive mb-2">
                    {error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-xs overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}
