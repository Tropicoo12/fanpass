'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import type { Club } from '@/types/database'

interface Props { club: Club }

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid rgba(0,0,0,0.10)',
  background: '#f5f5f7',
  color: '#1d1d1f',
  fontSize: 14,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(29,29,31,0.55)',
  marginBottom: 6,
  display: 'block',
}

const sectionStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid rgba(0,0,0,0.08)',
  padding: 24,
}

export function ClubSettingsForm({ club }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: club.name ?? '',
    logo_url: club.logo_url ?? '',
    primary_color: club.primary_color ?? '#E1001A',
    secondary_color: club.secondary_color ?? '#ffffff',
    stadium_name: club.stadium_name ?? '',
    city: club.city ?? '',
    team_name: club.team_name ?? '',
    competition_code: club.competition_code ?? '',
  })

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/club/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, logo_url: form.logo_url || null }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      toast('Paramètres sauvegardés', 'success')
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Identité */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', margin: '0 0 20px' }}>
          Identité du club
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Nom du club</label>
            <input style={inputStyle} value={form.name} onChange={set('name')} placeholder="ex : Standard de Liège" />
          </div>

          <div>
            <label style={labelStyle}>URL du logo</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {form.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.logo_url}
                  alt="logo"
                  style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain', border: '1px solid rgba(0,0,0,0.10)', background: '#f5f5f7', padding: 4 }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={form.logo_url}
                onChange={set('logo_url')}
                placeholder="https://…/logo.png"
              />
            </div>
            <p style={{ fontSize: 11, color: 'rgba(29,29,31,0.40)', margin: '4px 0 0' }}>
              URL directe vers l&apos;image (PNG ou SVG recommandé, fond transparent)
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Couleur principale</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={set('primary_color')}
                  style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid rgba(0,0,0,0.10)', cursor: 'pointer', padding: 2, background: '#f5f5f7' }}
                />
                <input
                  style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
                  value={form.primary_color}
                  onChange={set('primary_color')}
                  placeholder="#E1001A"
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Couleur secondaire</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={set('secondary_color')}
                  style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid rgba(0,0,0,0.10)', cursor: 'pointer', padding: 2, background: '#f5f5f7' }}
                />
                <input
                  style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
                  value={form.secondary_color}
                  onChange={set('secondary_color')}
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 12,
              background: form.primary_color,
              color: form.secondary_color,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.20)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 800,
              }}
            >
              {form.name.slice(0, 1).toUpperCase() || 'C'}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{form.name || 'Nom du club'}</p>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.75 }}>{form.city || 'Ville'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stade */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', margin: '0 0 20px' }}>
          Stade & localisation
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Nom du stade</label>
            <input style={inputStyle} value={form.stadium_name} onChange={set('stadium_name')} placeholder="ex : Stade de Sclessin" />
          </div>
          <div>
            <label style={labelStyle}>Ville</label>
            <input style={inputStyle} value={form.city} onChange={set('city')} placeholder="ex : Liège" />
          </div>
        </div>
      </div>

      {/* Synchronisation matchs */}
      <div style={sectionStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', margin: '0 0 4px' }}>
          Synchronisation des matchs
        </h2>
        <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.45)', margin: '0 0 20px' }}>
          Utilisé pour importer les matchs et cotes depuis l'API football
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Nom de l'équipe (API)</label>
            <input style={inputStyle} value={form.team_name} onChange={set('team_name')} placeholder="ex : Standard Liège" />
          </div>
          <div>
            <label style={labelStyle}>Code compétition</label>
            <input style={inputStyle} value={form.competition_code} onChange={set('competition_code')} placeholder="ex : BSL" />
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        style={{
          padding: '13px 0',
          borderRadius: 12,
          background: '#1d1d1f',
          color: '#ffffff',
          fontSize: 15,
          fontWeight: 700,
          border: 'none',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        {saving ? 'Sauvegarde…' : 'Sauvegarder'}
      </button>
    </div>
  )
}
