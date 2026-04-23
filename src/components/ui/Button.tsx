import { cn } from '@/utils/cn'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95': variant === 'primary',
            'bg-white/10 text-white hover:bg-white/20 active:scale-95': variant === 'secondary',
            'text-white hover:bg-white/10 active:scale-95': variant === 'ghost',
            'bg-red-500 text-white hover:bg-red-600 active:scale-95': variant === 'danger',
          },
          {
            'text-sm px-3 py-1.5': size === 'sm',
            'text-base px-5 py-2.5': size === 'md',
            'text-lg px-7 py-3.5': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
