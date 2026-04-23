import { cn } from '@/utils/cn'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral'
}

export function Badge({ className, variant = 'neutral', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        {
          'bg-emerald-100 text-emerald-700': variant === 'success',
          'bg-amber-100 text-amber-700': variant === 'warning',
          'bg-red-100 text-red-700': variant === 'error',
          'bg-blue-100 text-blue-700': variant === 'info',
          'bg-gray-100 text-gray-600': variant === 'neutral',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
