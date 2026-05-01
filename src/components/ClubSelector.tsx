'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Check } from 'lucide-react'

interface Club { id: string; name: string; primary_color: string }

interface Props {
  clubs: Club[]
  currentClubId: string
  primaryColor: string
  clubName: string
  userRole: string
}

export function ClubSelector({ clubs, currentClubId, primaryColor, clubName, userRole }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function selectClub(clubId: string) {
    if (clubId === currentClubId) { setOpen(false); return }
    setLoading(true)
    await fetch('/api/club/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ club_id: clubId }),
    })
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  // Non super-admin: simple display
  if (userRole !== 'super_admin') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: primaryColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {clubName[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clubName}</p>
          <p style={{ fontSize: 10, color: 'rgba(29,29,31,0.40)', margin: 0 }}>Admin</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={loading}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
        }}
      >
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: primaryColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {clubName[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clubName}</p>
          <p style={{ fontSize: 10, color: 'rgba(29,29,31,0.40)', margin: 0 }}>Super Admin ⚡</p>
        </div>
        <ChevronDown size={14} color="rgba(29,29,31,0.35)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 8,
          background: '#ffffff', borderRadius: 12, border: '1px solid rgba(0,0,0,0.10)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 50,
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(29,29,31,0.40)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 12px 6px', margin: 0 }}>
            Clubs
          </p>
          {clubs.map(club => (
            <button
              key={club.id}
              onClick={() => selectClub(club.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', background: 'transparent', border: 'none',
                cursor: 'pointer', transition: 'background 0.1s', textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{
                width: 26, height: 26, borderRadius: 7,
                background: club.primary_color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
              }}>
                {club.name[0]}
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#1d1d1f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {club.name}
              </span>
              {club.id === currentClubId && <Check size={13} color={club.primary_color} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
