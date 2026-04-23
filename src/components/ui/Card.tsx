import { cn } from '@/utils/cn'
import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'dark'
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl p-5',
        {
          'bg-white shadow-sm border border-gray-100': variant === 'default',
          'bg-white/10 backdrop-blur-sm border border-white/20': variant === 'glass',
          'bg-gray-900 border border-gray-800': variant === 'dark',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
