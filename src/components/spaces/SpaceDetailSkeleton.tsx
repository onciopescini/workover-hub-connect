import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

export const SpaceDetailSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Main Content (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">

          {/* Hero Section Skeleton */}
          <div className="space-y-4">
             {/* Title & Meta */}
             <div className="space-y-2">
                <Skeleton className="h-8 w-3/4 md:w-1/2" />
                <Skeleton className="h-4 w-1/3" />
             </div>

             {/* Gallery Skeleton */}
             <div className="hidden md:grid grid-cols-4 gap-2 h-96">
                <div className="col-span-2 relative">
                   <Skeleton className="h-full w-full rounded-l-2xl" />
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-2">
                   <Skeleton className="h-full w-full" />
                   <Skeleton className="h-full w-full rounded-tr-2xl" />
                   <Skeleton className="h-full w-full" />
                   <Skeleton className="h-full w-full rounded-br-2xl" />
                </div>
             </div>
             {/* Mobile Gallery Skeleton */}
             <div className="md:hidden aspect-[4/3] w-full">
                <Skeleton className="h-full w-full rounded-xl" />
             </div>
          </div>

          {/* Info Cards Skeleton */}
          <div className="space-y-6 pt-4">
             <div className="flex gap-4">
                <Skeleton className="h-24 w-24 rounded-lg" />
                <Skeleton className="h-24 w-24 rounded-lg" />
                <Skeleton className="h-24 w-24 rounded-lg" />
             </div>
             <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
             </div>
          </div>

          {/* Host Profile Skeleton */}
          <div className="flex items-center gap-4 py-6 border-t border-b border-gray-100">
             <Skeleton className="h-16 w-16 rounded-full" />
             <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
             </div>
          </div>

        </div>

        {/* Right Column: Sticky Booking Card Skeleton (1/3 width) */}
        <div className="lg:col-span-1 hidden lg:block">
          <div className="sticky top-24">
             <div className="border border-gray-200 rounded-xl p-6 space-y-6 bg-white">
                <div className="flex justify-between items-baseline">
                   <Skeleton className="h-8 w-24" />
                   <Skeleton className="h-4 w-16" />
                </div>
                <div className="space-y-4">
                   <Skeleton className="h-12 w-full rounded-md" />
                   <Skeleton className="h-12 w-full rounded-md" />
                </div>
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="space-y-2 pt-4">
                   <Skeleton className="h-4 w-full" />
                   <Skeleton className="h-4 w-full" />
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};
