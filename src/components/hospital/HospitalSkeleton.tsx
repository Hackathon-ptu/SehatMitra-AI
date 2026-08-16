import React from 'react';
import { Skeleton } from '../common/Skeleton';

export const HospitalSkeleton: React.FC = () => {
  return (
    <div className="w-full flex flex-col gap-4 animate-fade-in">
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width="60%" height="24px" />
        <Skeleton variant="text" width="40%" height="16px" />
      </div>

      <div className="p-5 rounded-lg border border-surface-border bg-surface-card flex flex-col gap-3">
        <Skeleton variant="text" width="70%" height="20px" />
        <Skeleton variant="text" width="90%" height="14px" />
        <div className="flex gap-2">
          <Skeleton variant="rectangular" width="80px" height="24px" className="rounded-md" />
          <Skeleton variant="rectangular" width="120px" height="24px" className="rounded-md" />
        </div>
        <Skeleton variant="rectangular" width="100%" height="36px" className="mt-2 rounded-md" />
      </div>

      <div className="p-4 rounded-lg border border-surface-border bg-surface-card flex flex-col gap-2">
        <Skeleton variant="text" width="50%" height="18px" />
        <Skeleton variant="text" width="80%" height="14px" />
      </div>
    </div>
  );
};
