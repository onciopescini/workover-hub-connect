import React, { Suspense } from 'react';
import { cn } from '@/lib/utils';

// Lazy load AnimatedBackground per ridurre LCP
const AnimatedBackground = React.lazy(() => 
  import('@/components/ui/AnimatedBackground').then(module => ({
    default: module.AnimatedBackground
  }))
);

interface LazyAnimatedBackgroundProps {
  className?: string;
  particleCount?: number;
}

/**
 * Static fallback gradient - più leggero, nessuna animazione
 */
function StaticBackgroundFallback({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-emerald-50 to-purple-50" />
    </div>
  );
}

/**
 * Wrapper per AnimatedBackground con lazy loading e fallback statico
 * Migliora LCP caricando lo sfondo animato dopo il contenuto critico
 */
export function LazyAnimatedBackground({ className, particleCount = 50 }: LazyAnimatedBackgroundProps) {
  const props = className ? { className, particleCount } : { particleCount };
  const fallbackProps = className ? { className } : {};
  
  return (
    <Suspense fallback={<StaticBackgroundFallback {...fallbackProps} />}>
      <AnimatedBackground {...props} />
    </Suspense>
  );
}
