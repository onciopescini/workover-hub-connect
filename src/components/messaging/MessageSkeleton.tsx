import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export const MessageSkeleton = () => {
  return (
    <Card className="h-full flex flex-col overflow-hidden border-0 shadow-none sm:border sm:shadow-sm">
      {/* Header Skeleton */}
      <CardHeader className="border-b py-3 flex-shrink-0 bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </CardHeader>

      {/* Messages Skeleton */}
      <CardContent className="flex-1 p-4 space-y-6 overflow-hidden flex flex-col justify-end">
        {/* Simulating a conversation history */}
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-48 rounded-lg rounded-tl-none" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        <div className="flex gap-3 flex-row-reverse">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="space-y-2 flex flex-col items-end">
            <Skeleton className="h-16 w-64 rounded-lg rounded-tr-none" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-20 w-56 rounded-lg rounded-tl-none" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        <div className="flex gap-3 flex-row-reverse">
           <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
           <div className="space-y-2 flex flex-col items-end">
             <Skeleton className="h-10 w-40 rounded-lg rounded-tr-none" />
             <Skeleton className="h-4 w-12" />
           </div>
         </div>
      </CardContent>

      {/* Composer Skeleton */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-end gap-2">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="h-10 w-10 rounded-md" />
        </div>
      </div>
    </Card>
  );
};
