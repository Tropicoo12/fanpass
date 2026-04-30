import { cn } from '@/utils/cn'
import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'surface' | 'glass' | 'dark'
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[20px] p-5',
        {
          'bg-white border': variant === 'default' || variant === 'dark',
          'bg-[#f5f5f7] border': variant === 'surface',
          'bg-white/10 backdrop-blur-sm border border-white/20': variant === 'glass',
        },
        className
      )}
      style={{
        ...(['default', 'surface', 'dark'].includes(variant ?? '') ? { borderColor: 'rgba(0,0,0,0.08)' } : {}),
        ...props.style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
