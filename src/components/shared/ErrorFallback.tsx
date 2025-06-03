
import React from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createContextualLogger } from '@/lib/logger';

export interface ErrorFallbackProps {
  error?: Error;
  errorId?: string;
  context?: string;
  level?: 'component' | 'page' | 'critical';
  onRetry?: () => void;
  onGoHome?: () => void;
  onReportBug?: () => void;
  canRetry?: boolean;
  showDetails?: boolean;
  className?: string;
}

const logger = createContextualLogger('ErrorFallback');

export function ErrorFallback({
  error,
  errorId,
  context = 'unknown',
  level = 'component',
  onRetry,
  onGoHome,
  onReportBug,
  canRetry = true,
  showDetails = process.env.NODE_ENV === 'development',
  className
}: ErrorFallbackProps) {
  const handleRetry = () => {
    logger.info('User retried from error fallback', context, {
      action: 'error_retry',
      errorId,
      level
    });
    onRetry?.();
  };

  const handleGoHome = () => {
    logger.info('User navigated home from error fallback', context, {
      action: 'error_navigate_home',
      errorId,
      level
    });
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  };

  const handleReportBug = () => {
    logger.info('User reported bug from error fallback', context, {
      action: 'error_report_bug',
      errorId,
      level
    });
    
    if (onReportBug) {
      onReportBug();
    } else {
      const bugReportData = {
        errorId,
        message: error?.message,
        stack: error?.stack,
        context,
        level,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };
      
      const reportUrl = `/support?error=${encodeURIComponent(JSON.stringify(bugReportData))}`;
      window.open(reportUrl, '_blank');
    }
  };

  const getErrorTitle = () => {
    switch (level) {
      case 'critical':
        return 'Errore Critico del Sistema';
      case 'page':
        return 'Errore di Pagina';
      default:
        return 'Qualcosa è andato storto';
    }
  };

  const getErrorMessage = () => {
    switch (level) {
      case 'critical':
        return 'Si è verificato un errore critico. Il nostro team è stato notificato automaticamente.';
      case 'page':
        return 'Si è verificato un errore durante il caricamento di questa pagina.';
      default:
        return 'Si è verificato un errore inaspettato. Puoi provare a ricaricare o tornare alla homepage.';
    }
  };

  if (level === 'component') {
    return (
      <div className={className}>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Errore del Componente</AlertTitle>
          <AlertDescription className="text-red-700">
            {error?.message || 'Si è verificato un errore inaspettato.'}
            {canRetry && (
              <Button
                variant="link"
                size="sm"
                onClick={handleRetry}
                className="text-red-600 hover:text-red-800 p-0 h-auto ml-2"
              >
                Riprova
              </Button>
            )}
          </AlertDescription>
        </Alert>
        
        {showDetails && error && (
          <details className="mt-2 text-xs text-gray-600">
            <summary className="cursor-pointer">Dettagli tecnici</summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex flex-col items-center">
            <AlertTriangle className={`h-12 w-12 mb-4 ${
              level === 'critical' ? 'text-red-600' : 'text-amber-500'
            }`} />
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {getErrorTitle()}
            </h2>
            
            <p className="text-sm text-gray-600 text-center mb-6">
              {getErrorMessage()}
            </p>

            {showDetails && error && errorId && (
              <Alert className="mb-6 w-full">
                <Bug className="h-4 w-4" />
                <AlertTitle>Dettagli Errore (Sviluppo)</AlertTitle>
                <AlertDescription className="text-xs font-mono mt-2 break-all">
                  <div><strong>ID:</strong> {errorId}</div>
                  <div><strong>Messaggio:</strong> {error.message}</div>
                  <div><strong>Contesto:</strong> {context}</div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col space-y-3 w-full">
              {canRetry && (
                <Button 
                  onClick={handleRetry}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Riprova
                </Button>
              )}
              
              <Button 
                variant="outline"
                onClick={handleGoHome}
                className="w-full flex items-center justify-center gap-2"
              >
                <Home className="h-4 w-4" />
                Torna alla Homepage
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleReportBug}
                className="w-full flex items-center justify-center gap-2"
              >
                <Bug className="h-4 w-4" />
                Segnala il Problema
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
