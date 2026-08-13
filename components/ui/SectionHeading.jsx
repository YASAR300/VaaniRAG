import React from 'react';
import { cn } from '@/lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
}) {
  const alignStyles = {
    center: 'text-center mx-auto max-w-3xl',
    left: 'text-left max-w-2xl',
  };

  return (
    <div className={cn('mb-12 space-y-3', alignStyles[align], className)}>
      {eyebrow && (
        <span className="inline-block text-xs font-mono font-semibold uppercase tracking-widest text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
          {eyebrow}
        </span>
      )}
      {title && (
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
          {title}
        </h2>
      )}
      {subtitle && (
        <p className="text-base text-muted-foreground leading-relaxed font-normal">
          {subtitle}
        </p>
      )}
    </div>
  );
}
