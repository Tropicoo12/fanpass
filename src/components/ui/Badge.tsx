import { cn } from '@/utils/cn'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'level-gold' | 'level-silver' | 'level-platinum'
}

export function Badge({ className, variant = 'neutral', children, ...props }: BadgeProps) {
  const gradientVariants = ['level-gold', 'level-platinum']
  const isGradient = gradientVariants.includes(variant ?? '')

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        {
          'bg-[#e8f5e9] text-[#2e7d32]': variant === 'success',
          'bg-[#fff8e1] text-[#c8860a]': variant === 'warning',
          'text-[#E1001A]': variant === 'error',
          'bg-blue-100 text-blue-700': variant === 'info',
          'bg-[#ebebed] text-[rgba(29,29,31,0.55)]': variant === 'neutral',
          'text-white': isGradient,
          'bg-[#e0e0e0] text-[#616161]': variant === 'level-silver',
        },
        className
      )}
      style={{
        ...(variant === 'error' ? { background: 'rgba(225,0,26,0.1)' } : {}),
        ...(variant === 'level-gold' ? { background: 'linear-gradient(135deg,#f6d365,#fda085)' } : {}),
        ...(variant === 'level-platinum' ? { background: 'linear-gradient(135deg,#a18cd1,#fbc2eb)' } : {}),
        ...props.style,
      }}
      {...props}
    >
      {children}
    </span>
  )
}
