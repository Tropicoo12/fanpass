import Link from 'next/link'
import { ReactNode } from 'react'

interface NavItemProps {
  icon: ReactNode
  label: string
  active: boolean
  href: string
  primaryColor: string
}

export function NavItem({ icon, label, active, href, primaryColor }: NavItemProps) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '8px 12px',
        textDecoration: 'none',
        position: 'relative',
      }}
    >
      <span
        style={{
          fontSize: 24,
          color: active ? primaryColor : 'rgba(29,29,31,0.35)',
          transition: 'color 0.15s',
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: active ? 600 : 400,
          color: active ? primaryColor : 'rgba(29,29,31,0.40)',
          transition: 'color 0.15s',
        }}
      >
        {label}
      </span>
      {active && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: primaryColor,
          }}
        />
      )}
    </Link>
  )
}
