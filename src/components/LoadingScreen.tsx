
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  variant?: 'spinner' | 'skeleton' | 'branded';
  message?: string;
  showProgress?: boolean;
  progress?: number;
  className?: string;
  context?: string;
}

const LoadingScreen = ({ 
  variant = 'spinner',
  message = 'Caricamento...',
  showProgress = false,
  progress,
  className,
  context = 'app'
}: LoadingScreenProps) => {
  if (variant === 'skeleton') {
    return (
      <div className={cn("min-h-screen bg-gray-50 p-4", className)}>
        <div className="max-w-4xl mx-auto space-y-6">
          <LoadingOverlay
            isLoading={true}
            variant="skeleton"
            context={context}
            skeletonConfig={{ variant: 'card', showImage: true, rows: 3 }}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LoadingOverlay
              isLoading={true}
              variant="skeleton"
              context={context}
              skeletonConfig={{ variant: 'card', rows: 2 }}
            />
            <LoadingOverlay
              isLoading={true}
              variant="skeleton"
              context={context}
              skeletonConfig={{ variant: 'card', rows: 2 }}
            />
          </div>
          <LoadingOverlay
            isLoading={true}
            variant="skeleton"
            context={context}
            skeletonConfig={{ variant: 'list', rows: 4, showAvatar: true }}
          />
        </div>
      </div>
    );
  }

  if (variant === 'branded') {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center",
        "bg-gradient-to-br from-indigo-50 to-emerald-50",
        className
      )}>
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
          <div className="mb-6">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LoadingOverlay
                isLoading={true}
                variant="spinner"
                context={context}
                className="w-8 h-8"
              />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Workover
            </h2>
          </div>
          
          <LoadingOverlay
            isLoading={true}
            variant="spinner"
            message={message}
            progress={showProgress ? progress : undefined}
            context={context}
          />
          
          {showProgress && progress !== undefined && (
            <div className="mt-4">
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default spinner variant
  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-gray-50", className)}>
      <LoadingOverlay
        isLoading={true}
        variant="spinner"
        message={message}
        progress={showProgress ? progress : undefined}
        context={context}
        className="text-indigo-500"
      />
    </div>
  );
};

export default LoadingScreen;
