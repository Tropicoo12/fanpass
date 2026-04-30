import { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: string
  change: string
  changeType: 'up' | 'down' | 'neutral'
  icon: ReactNode
  iconColor: string
}

export function KpiCard({ label, value, change, changeType, icon, iconColor }: KpiCardProps) {
  const changeColor =
    changeType === 'up' ? '#2e7d32' : changeType === 'down' ? '#E1001A' : 'rgba(29,29,31,0.40)'
  const changeBg =
    changeType === 'up' ? '#e8f5e9' : changeType === 'down' ? 'rgba(225,0,26,0.08)' : '#ebebed'

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid rgba(0,0,0,0.08)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: iconColor + '18',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
            fontSize: 20,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: changeColor,
            background: changeBg,
            borderRadius: 100,
            padding: '2px 8px',
          }}
        >
          {change}
        </span>
      </div>
      <div>
        <p
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#1d1d1f',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {value}
        </p>
        <p
          style={{
            fontSize: 13,
            color: 'rgba(29,29,31,0.55)',
            marginTop: 4,
            margin: 0,
          }}
        >
          {label}
        </p>
      </div>
    </div>
  )
}
