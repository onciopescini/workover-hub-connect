import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Mail } from 'lucide-react';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  type?: 'page' | 'component' | 'critical';
}

/**
 * Componente fallback per errori customizzabile
 */
export function ErrorFallback({ error, resetError, type = 'component' }: ErrorFallbackProps) {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleContact = () => {
    window.location.href = '/contact';
  };

  // Critical error - full page
  if (type === 'critical') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-lg border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              <CardTitle>Errore Critico</CardTitle>
            </div>
            <CardDescription>
              Si è verificato un errore critico. Ti consigliamo di ricaricare la pagina.
            </CardDescription>
          </CardHeader>

          {error && (
            <CardContent>
              <div className="p-3 bg-destructive/10 rounded-md text-sm">
                {error.message}
              </div>
            </CardContent>
          )}

          <CardFooter className="flex flex-col gap-2">
            <div className="flex gap-2 w-full">
              <Button onClick={handleReload} variant="default" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Ricarica Pagina
              </Button>
              <Button onClick={handleGoHome} variant="outline" className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </div>
            <Button onClick={handleContact} variant="ghost" className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Contatta il Supporto
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Page error - full page but less dramatic
  if (type === 'page') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-lg">Errore nel Caricamento</CardTitle>
            </div>
            <CardDescription>
              Non è stato possibile caricare questa pagina.
            </CardDescription>
          </CardHeader>

          <CardFooter className="flex gap-2">
            {resetError && (
              <Button onClick={resetError} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Riprova
              </Button>
            )}
            <Button onClick={handleGoHome} className="flex-1">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Component error - inline
  return (
    <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm mb-1">Errore nel Componente</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Questo componente ha riscontrato un errore.
          </p>
          {resetError && (
            <Button onClick={resetError} size="sm" variant="outline">
              <RefreshCw className="h-3 w-3 mr-2" />
              Riprova
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
