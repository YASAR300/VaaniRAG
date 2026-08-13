import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    leadingIcon: LeadingIcon,
    trailingIcon: TrailingIcon,
    loading = false,
    disabled = false,
    className,
    ...props
  },
  ref
) {
  const variantStyles = {
    primary:
      'bg-accent text-accent-foreground hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-accent shadow-lg shadow-accent/20',
    secondary:
      'bg-surface-2 border border-border text-foreground hover:bg-surface-3 hover:border-border/80 focus-visible:ring-2 focus-visible:ring-accent',
    ghost:
      'bg-transparent text-muted-foreground hover:text-foreground hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-accent',
    pill:
      'rounded-full bg-surface-2 border border-border text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors',
  };

  const activePillStyle = variant === 'pill' && props.active ? 'bg-emerald-500 text-slate-950 font-semibold border-emerald-400 hover:bg-emerald-400' : '';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-sm gap-2 rounded-xl',
    lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
  };

  const isPillSize = variant === 'pill' ? 'h-8 px-3.5 text-xs' : sizeStyles[size];

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none select-none',
        variantStyles[variant],
        activePillStyle,
        isPillSize,
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        LeadingIcon && <LeadingIcon className="w-4 h-4 shrink-0" />
      )}
      <span>{children}</span>
      {!loading && TrailingIcon && <TrailingIcon className="w-4 h-4 shrink-0" />}
    </button>
  );
});
