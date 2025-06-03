
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { logger } from '@/lib/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  lastErrorTime: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  maxRetries?: number;
  resetTimeoutMs?: number;
  showErrorDetails?: boolean;
  level?: 'page' | 'component' | 'critical';
}

interface ErrorReport {
  errorId: string;
  message: string;
  stack?: string;
  componentStack: string;
  timestamp: string;
  url: string;
  userAgent: string;
  retryCount: number;
  level: string;
  userId?: string;
  sessionId: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      lastErrorTime: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = this.generateErrorId();
    const currentTime = Date.now();
    const timeSinceLastError = currentTime - this.state.lastErrorTime;
    
    // Increment retry count if error happened within reset timeout
    const retryCount = timeSinceLastError < (this.props.resetTimeoutMs || 5000) 
      ? this.state.retryCount + 1 
      : 1;

    this.setState({
      error,
      errorInfo,
      errorId,
      retryCount,
      lastErrorTime: currentTime,
    });

    // Log the error with appropriate level
    const level = this.props.level || 'component';
    const context = `ErrorBoundary-${level}`;
    
    if (retryCount >= (this.props.maxRetries || 3)) {
      logger.critical(
        `Critical error in ${level}: Maximum retries exceeded`,
        error,
        context,
        {
          errorId,
          componentStack: errorInfo.componentStack,
          retryCount,
          level,
        }
      );
    } else {
      logger.error(
        `Error caught in ${level} boundary`,
        error,
        context,
        {
          errorId,
          componentStack: errorInfo.componentStack,
          retryCount,
          level,
        }
      );
    }

    // Create detailed error report
    const errorReport = this.createErrorReport(error, errorInfo, errorId, retryCount);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }

    // Send error report to monitoring service (placeholder)
    this.sendErrorReport(errorReport);

    // Set up automatic reset timer
    this.setupResetTimer();
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createErrorReport(
    error: Error, 
    errorInfo: ErrorInfo, 
    errorId: string, 
    retryCount: number
  ): ErrorReport {
    return {
      errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      retryCount,
      level: this.props.level || 'component',
      sessionId: logger.getBufferSize().toString(), // Using buffer size as session indicator
    };
  }

  private async sendErrorReport(errorReport: ErrorReport): Promise<void> {
    try {
      // Placeholder for error reporting service
      // This could integrate with Supabase Edge Functions or external services
      logger.info(
        'Error report generated',
        'ErrorBoundary-Reporting',
        { errorReport }
      );
      
      // In a real implementation, this would send to your error tracking service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });
    } catch (reportingError) {
      logger.error(
        'Failed to send error report',
        reportingError instanceof Error ? reportingError : new Error('Unknown reporting error'),
        'ErrorBoundary-Reporting'
      );
    }
  }

  private setupResetTimer(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    const resetTimeout = this.props.resetTimeoutMs || 10000; // 10 seconds default
    
    this.resetTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: 0,
        lastErrorTime: 0,
      });
    }, resetTimeout);
  }

  private handleRetry = (): void => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount < maxRetries) {
      logger.info(
        `User initiated retry (${this.state.retryCount + 1}/${maxRetries})`,
        'ErrorBoundary-Retry',
        { errorId: this.state.errorId }
      );
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      });
    }
  };

  private handleGoHome = (): void => {
    logger.info(
      'User navigated to home from error boundary',
      'ErrorBoundary-Navigation',
      { errorId: this.state.errorId }
    );
    
    window.location.href = '/';
  };

  private handleReportBug = (): void => {
    const { error, errorInfo, errorId } = this.state;
    
    logger.info(
      'User initiated bug report',
      'ErrorBoundary-BugReport',
      { errorId }
    );

    // Create bug report URL with error details
    const bugReportData = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    const reportUrl = `/support?error=${encodeURIComponent(JSON.stringify(bugReportData))}`;
    window.open(reportUrl, '_blank');
  };

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId, retryCount } = this.state;
      const maxRetries = this.props.maxRetries || 3;
      const canRetry = retryCount < maxRetries;
      const level = this.props.level || 'component';
      const showDetails = this.props.showErrorDetails ?? (process.env.NODE_ENV === 'development');

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="flex flex-col items-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
                
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {level === 'critical' ? 'Critical System Error' : 
                   level === 'page' ? 'Page Error' : 'Something went wrong'}
                </h2>
                
                <p className="text-sm text-gray-600 text-center mb-6">
                  {level === 'critical' 
                    ? 'A critical error has occurred. Please contact support immediately.'
                    : 'We encountered an unexpected error. Our team has been notified.'
                  }
                </p>

                {showDetails && (
                  <Alert className="mb-6 w-full">
                    <Bug className="h-4 w-4" />
                    <AlertTitle>Error Details (Development)</AlertTitle>
                    <AlertDescription className="text-xs font-mono mt-2 break-all">
                      <div><strong>ID:</strong> {errorId}</div>
                      <div><strong>Message:</strong> {error?.message}</div>
                      {retryCount > 0 && (
                        <div><strong>Retries:</strong> {retryCount}/{maxRetries}</div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col space-y-3 w-full">
                  {canRetry && (
                    <Button 
                      onClick={this.handleRetry}
                      className="w-full flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try Again ({maxRetries - retryCount} left)
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    onClick={this.handleGoHome}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Go to Homepage
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={this.handleReportBug}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <Bug className="h-4 w-4" />
                    Report Bug
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience wrapper for functional components
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Hook for error reporting from functional components
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, context?: string) => {
    logger.error(
      'Manual error report from component',
      error,
      context || 'useErrorHandler',
      {
        manualReport: true,
        timestamp: new Date().toISOString(),
      }
    );

    // Re-throw to trigger error boundary if needed
    throw error;
  }, []);

  return { handleError };
};

export default ErrorBoundary;
