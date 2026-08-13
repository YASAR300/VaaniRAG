import React from 'react';
import { cn } from '@/lib/utils';

export function StatusDot({ status = 'green', pulse = true, className }) {
  const statusColors = {
    green: 'bg-emerald-400',
    amber: 'bg-amber-400',
    gray: 'bg-slate-500',
    red: 'bg-red-400',
  };

  const pulseColors = {
    green: 'bg-emerald-400/50',
    amber: 'bg-amber-400/50',
    gray: 'bg-slate-500/50',
    red: 'bg-red-400/50',
  };

  return (
    <span className={cn('relative flex h-2.5 w-2.5 items-center justify-center', className)}>
      {pulse && (
        <span
          className={cn(
            'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
            pulseColors[status]
          )}
        />
      )}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', statusColors[status])} />
    </span>
  );
}
