'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ScanQrCode, Trophy, Gift, BarChart3 } from 'lucide-react'

const navItems = [
  { href: '/home',       icon: Home,       label: 'Accueil'     },
  { href: '/scan',       icon: ScanQrCode, label: 'Scan'        },
  { href: '/pronostics', icon: Trophy,     label: 'Pronos'      },
  { href: '/rewards',    icon: Gift,       label: 'Récompenses' },
  { href: '/classement', icon: BarChart3,  label: 'Classement'  },
]

interface Props {
  primaryColor?: string
}

export function FanNav({ primaryColor = '#E1001A' }: Props) {
  const pathname = usePathname()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        zIndex: 40,
      }}
    >
      <div style={{ maxWidth: 430, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingTop: 8, paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}>
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '4px 10px',
                textDecoration: 'none',
                position: 'relative',
              }}
            >
              <Icon
                size={22}
                style={{ color: active ? primaryColor : 'rgba(29,29,31,0.35)', transition: 'color 0.15s' }}
              />
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
                    bottom: -2,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: primaryColor,
                  }}
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
