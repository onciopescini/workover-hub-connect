import { lazy, Suspense } from 'react';
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load the heavy map component
const SpaceMap = lazy(() => import('./SpaceMap').then(module => ({ default: module.SpaceMap })));

export const LazySpaceMap = (props: any) => (
  <Suspense fallback={<Skeleton className="w-full h-[400px] rounded-lg" />}>
    <SpaceMap {...props} />
  </Suspense>
);
