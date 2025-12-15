import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// @ts-ignore - vite-plugin-pwa virtual module
import { useRegisterSW } from 'virtual:pwa-register/react';

export function ServiceWorkerRegistration() {
  const [showReload, setShowReload] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl: string, registration: ServiceWorkerRegistration | undefined) {
      if (import.meta.env.DEV) {
        console.log('Service Worker registered:', swUrl);
      }
      
      // Check for updates every hour
      setInterval(() => {
        registration?.update();
      }, 60 * 60 * 1000);
    },
    onRegisterError(error: Error) {
      console.error('Service Worker registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowReload(true);
      toast('New version available', {
        description: 'Click to update to the latest version',
        action: {
          label: 'Update',
          onClick: () => {
            updateServiceWorker(true);
          },
        },
        duration: Infinity,
      });
    }
  }, [needRefresh, updateServiceWorker]);

  if (!showReload) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-background border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-start gap-3">
        <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-sm">New version available</p>
          <p className="text-sm text-muted-foreground mt-1">
            Update to get the latest features and improvements
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => {
                updateServiceWorker(true);
              }}
            >
              Update now
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowReload(false);
                setNeedRefresh(false);
              }}
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
