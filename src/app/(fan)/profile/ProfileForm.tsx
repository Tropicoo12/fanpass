'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProfileData {
  full_name: string
  username: string
  phone: string
  birth_year: number | null
}

interface Props {
  initialData: ProfileData
  primaryColor: string
}

export function ProfileForm({ initialData, primaryColor }: Props) {
  const router = useRouter()
  const [form, setForm] = useState(initialData)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch('/api/fan/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: form.full_name.trim() || null,
        username: form.username.trim() || null,
        phone: form.phone.trim() || null,
        birth_year: form.birth_year ? Number(form.birth_year) : null,
      }),
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur lors de la sauvegarde')
    } else {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.12)',
    fontSize: 15,
    color: '#1d1d1f',
    background: '#f5f5f7',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'rgba(29,29,31,0.55)',
    marginBottom: 6,
    display: 'block',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.08)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>Informations personnelles</h2>

        <div>
          <label style={labelStyle}>Nom complet</label>
          <input
            style={fieldStyle}
            type="text"
            placeholder="Jean Dupont"
            value={form.full_name}
            onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
          />
        </div>

        <div>
          <label style={labelStyle}>Nom d&apos;utilisateur</label>
          <input
            style={fieldStyle}
            type="text"
            placeholder="jeandupont"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          />
        </div>

        <div>
          <label style={labelStyle}>Téléphone</label>
          <input
            style={fieldStyle}
            type="tel"
            placeholder="+32 470 00 00 00"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
          />
        </div>

        <div>
          <label style={labelStyle}>Année de naissance</label>
          <input
            style={fieldStyle}
            type="number"
            placeholder="1990"
            min={1920}
            max={new Date().getFullYear() - 13}
            value={form.birth_year ?? ''}
            onChange={e => setForm(f => ({ ...f, birth_year: e.target.value ? Number(e.target.value) : null }))}
          />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: '#e03131', margin: 0, padding: '10px 14px', background: 'rgba(224,49,49,0.08)', borderRadius: 10 }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '13px 0',
            borderRadius: 14,
            background: saved ? '#2e7d32' : primaryColor,
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          {saving ? 'Sauvegarde...' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
        </button>
      </div>
    </form>
  )
}
