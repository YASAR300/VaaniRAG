import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('rounded-md animate-shimmer bg-surface-2', className)}
      {...props}
    />
  );
}
