interface ProgressBarProps {
  value: number
  color: string
  height?: number
  className?: string
}

export function ProgressBar({ value, color, height = 6, className }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value))
  return (
    <div
      className={className}
      style={{
        background: '#ebebed',
        borderRadius: 9999,
        height,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <div
        style={{
          width: `${clampedValue}%`,
          height: '100%',
          background: color,
          borderRadius: 9999,
          transition: 'width 0.7s ease',
        }}
      />
    </div>
  )
}
