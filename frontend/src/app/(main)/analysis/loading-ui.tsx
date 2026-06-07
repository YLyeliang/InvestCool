import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export function AnalysisListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card p-0 overflow-hidden flex flex-col min-h-[400px]">
          <Skeleton width="100%" height="200px" radius="0" />
          <div className="p-6 space-y-4">
            <div className="flex gap-2">
              <Skeleton width="60px" height="18px" />
              <Skeleton width="80px" height="18px" />
            </div>
            <Skeleton width="90%" height="28px" />
            <Skeleton width="100%" height="60px" />
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
              <Skeleton width="80px" height="20px" />
              <Skeleton width="40px" height="20px" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
