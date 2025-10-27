import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Componente di loading riutilizzabile
 */
export function ComponentLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center min-h-[200px] ${className}`}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * Higher-order component per lazy loading con suspense automatico
 */
export function lazyWithSuspense<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback: React.ReactNode = <ComponentLoader />
) {
  const LazyComponent = lazy(importFunc);

  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={fallback}>
      <div className="relative w-full h-full">
        <LazyComponent {...props} />
      </div>
    </Suspense>
  );
}

/**
 * Lazy loading per componenti pesanti
 * 
 * Nota: I componenti vengono caricati solo quando necessari.
 * Se un componente non esiste, viene caricato un placeholder.
 */

// Maps (mapbox è pesante ~200KB)
export const LazySpaceMap = lazyWithSuspense(
  () => import('@/components/spaces/SpaceMap').then(m => ({ default: (m as any).SpaceMap || (m as any).default || (() => null) }))
);

// Calendar components (react-day-picker + date-fns sono pesanti)
export const LazyCalendar = lazyWithSuspense(
  () => import('@/components/ui/calendar').then(m => ({ default: (m as any).Calendar || (m as any).default || (() => null) }))
);

/**
 * Preload function per componenti lazy
 * Usare onMouseEnter/onFocus per preload prima del click
 */
export function preloadComponent(importFunc: () => Promise<any>) {
  return () => {
    importFunc();
  };
}

/**
 * Hook per preload al hover
 */
export function usePreloadOnHover(importFunc: () => Promise<any>) {
  const handleMouseEnter = () => {
    importFunc();
  };

  return { onMouseEnter: handleMouseEnter, onFocus: handleMouseEnter };
}

/**
 * Esempio di utilizzo:
 * 
 * ```tsx
 * import { LazySpaceMap, usePreloadOnHover } from '@/components/optimization/LazyComponents';
 * 
 * // Nel componente:
 * const preloadProps = usePreloadOnHover(() => import('@/components/spaces/SpaceMap'));
 * 
 * <button {...preloadProps}>
 *   View Map
 * </button>
 * 
 * {showMap && <LazySpaceMap />}
 * ```
 */
