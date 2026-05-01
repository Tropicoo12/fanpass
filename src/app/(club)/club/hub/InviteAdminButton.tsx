'use client'
import { useState } from 'react'
import { UserPlus, Loader2, Copy, Check, X } from 'lucide-react'

interface Club { id: string; name: string }

export function InviteAdminButton({ clubs }: { clubs: Club[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ tempPassword: string; email: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ email: '', full_name: '', club_id: clubs[0]?.id ?? '' })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await fetch('/api/club/invite-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    setResult({ tempPassword: data.tempPassword, email: form.email })
    setLoading(false)
  }

  function copyCredentials() {
    const club = clubs.find(c => c.id === form.club_id)
    navigator.clipboard.writeText(
      `Accès FanPass Admin\nURL : https://fanpass-eklo.vercel.app/admin\nEmail : ${result?.email}\nMot de passe temporaire : ${result?.tempPassword}\nClub : ${club?.name}`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() { setOpen(false); setResult(null); setError(null); setForm({ email: '', full_name: '', club_id: clubs[0]?.id ?? '' }) }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.10)', color: '#1d1d1f', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
      >
        <UserPlus size={16} />
        Inviter un admin
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.40)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={e => { if (e.target === e.currentTarget) reset() }}>
          <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.08)', padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1d1d1f' }}>Inviter un administrateur</h2>
              <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(29,29,31,0.45)', padding: 4 }}><X size={18} /></button>
            </div>

            {!result ? (
              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Email *', key: 'email', type: 'email', placeholder: 'admin@club.be' },
                  { label: 'Nom complet', key: 'full_name', type: 'text', placeholder: 'Jean Dupont' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>{label}</label>
                    <input
                      type={type} placeholder={placeholder} required={key === 'email'}
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.12)', background: '#f5f5f7', color: '#1d1d1f', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Club *</label>
                  <select
                    value={form.club_id}
                    onChange={e => setForm(f => ({ ...f, club_id: e.target.value }))}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.12)', background: '#f5f5f7', color: '#1d1d1f', fontSize: 14, outline: 'none' }}
                  >
                    {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {error && <p style={{ margin: 0, fontSize: 13, color: '#c62828', background: '#ffebee', padding: '10px 14px', borderRadius: 10 }}>{error}</p>}

                <button type="submit" disabled={loading} style={{ padding: '13px 0', borderRadius: 14, background: '#1d1d1f', color: '#ffffff', fontSize: 15, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                  {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Créer le compte admin'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: 16, borderRadius: 14, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: 14, color: '#166534' }}>✓ Compte créé avec succès</p>
                  {[
                    { label: 'URL de connexion', val: 'https://fanpass-eklo.vercel.app/admin' },
                    { label: 'Email', val: result.email },
                    { label: 'Mot de passe temporaire', val: result.tempPassword },
                  ].map(r => (
                    <div key={r.label} style={{ marginBottom: 8 }}>
                      <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{r.label}</p>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1d1d1f', fontFamily: 'monospace' }}>{r.val}</p>
                    </div>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(29,29,31,0.45)' }}>
                  L&apos;admin devra changer son mot de passe à la première connexion.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={copyCredentials} style={{ flex: 1, padding: '11px 0', borderRadius: 12, background: copied ? '#f0fdf4' : '#1d1d1f', color: copied ? '#166534' : '#ffffff', border: copied ? '1px solid #bbf7d0' : 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copié !' : 'Copier les identifiants'}
                  </button>
                  <button onClick={reset} style={{ padding: '11px 16px', borderRadius: 12, background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)', color: '#1d1d1f', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
