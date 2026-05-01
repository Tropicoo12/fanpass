'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Users, Gift,
  Megaphone, BarChart3, Building2, Settings, PlusCircle, LayoutGrid,
} from 'lucide-react'

const mainNav = [
  { href: '/club/dashboard',  icon: LayoutDashboard, label: 'Dashboard'    },
  { href: '/club/fans',       icon: Users,           label: 'Fans'         },
  { href: '/club/analytics',  icon: BarChart3,       label: 'Analytics'    },
  { href: '/club/rewards',    icon: Gift,            label: 'Récompenses'  },
  { href: '/club/sponsors',   icon: Building2,       label: 'Sponsors'     },
]

const toolsNav = [
  { href: '/club/notifications', icon: Megaphone, label: 'Notifications' },
  { href: '/club/matches',       icon: Calendar,  label: 'Matchs'        },
  { href: '/club/settings',      icon: Settings,  label: 'Paramètres'    },
]

interface ClubSidebarNavProps {
  primaryColor?: string
  userRole?: string
}

export function ClubSidebarNav({ primaryColor = '#E1001A', userRole }: ClubSidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav style={{ flex: 1, padding: '8px 12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(29,29,31,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 8px 4px', margin: 0 }}>
        Vue générale
      </p>
      {mainNav.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 10,
              textDecoration: 'none',
              background: active ? `${primaryColor}12` : 'transparent',
              color: active ? primaryColor : 'rgba(29,29,31,0.55)',
              fontWeight: active ? 600 : 500,
              fontSize: 14,
              transition: 'all 0.15s',
            }}
          >
            <Icon size={16} style={{ flexShrink: 0 }} />
            {label}
          </Link>
        )
      })}

      <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '8px 0' }} />

      <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(29,29,31,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px', margin: 0 }}>
        Outils
      </p>
      {toolsNav.map(({ href, icon: Icon, label }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 10,
              textDecoration: 'none',
              background: active ? `${primaryColor}12` : 'transparent',
              color: active ? primaryColor : 'rgba(29,29,31,0.55)',
              fontWeight: active ? 600 : 500,
              fontSize: 14,
              transition: 'all 0.15s',
            }}
          >
            <Icon size={16} style={{ flexShrink: 0 }} />
            {label}
          </Link>
        )
      })}

      {userRole === 'super_admin' && (
        <>
          <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '8px 0' }} />
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(29,29,31,0.35)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 8px', margin: 0 }}>
            Super Admin
          </p>
          <Link
            href="/club/hub"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 10,
              textDecoration: 'none',
              background: pathname.startsWith('/club/hub') ? `${primaryColor}12` : 'transparent',
              color: pathname.startsWith('/club/hub') ? primaryColor : 'rgba(29,29,31,0.55)',
              fontWeight: pathname.startsWith('/club/hub') ? 600 : 500,
              fontSize: 14,
              transition: 'all 0.15s',
            }}
          >
            <LayoutGrid size={16} style={{ flexShrink: 0 }} />
            Hub clubs
          </Link>
          <Link
            href="/club/onboarding"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 10,
              textDecoration: 'none',
              background: pathname.startsWith('/club/onboarding') ? `${primaryColor}12` : 'transparent',
              color: pathname.startsWith('/club/onboarding') ? primaryColor : 'rgba(29,29,31,0.55)',
              fontWeight: pathname.startsWith('/club/onboarding') ? 600 : 500,
              fontSize: 14,
              transition: 'all 0.15s',
            }}
          >
            <PlusCircle size={16} style={{ flexShrink: 0 }} />
            Créer un club
          </Link>
        </>
      )}
    </nav>
  )
}

export function ClubMobileNav() {
  const pathname = usePathname()
  const allNav = [...mainNav, ...toolsNav]

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
      className="lg:hidden"
    >
      <div style={{ display: 'flex', alignItems: 'center', overflowX: 'auto' }} className="scrollbar-none">
        {allNav.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '8px 12px',
                textDecoration: 'none',
                minWidth: 60,
                color: active ? '#E1001A' : 'rgba(29,29,31,0.40)',
              }}
            >
              <Icon size={18} />
              <span style={{ fontSize: 9, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
