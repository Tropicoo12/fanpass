'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Lock, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  club: { id: string; name: string; slug: string; primary_color: string; secondary_color: string; logo_url: string | null }
}

export function JoinForm({ club }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })

  const primaryColor = club.primary_color || '#10b981'

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    if (mode === 'signup') {
      // Redirect back to THIS join page after email verification
      // so the server can associate the fan with the correct club
      const redirectTo = `${window.location.origin}/rejoindre/${club.slug}`
      const { data, error: signupError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { full_name: form.full_name },
          emailRedirectTo: redirectTo,
        },
      })
      if (signupError) { setError(signupError.message); setLoading(false); return }

      // No session = email confirmation required → show "check your email"
      if (!data.session) {
        setEmailSent(true)
        setLoading(false)
        return
      }
      // Session exists immediately (email confirmation disabled) → join directly
    } else {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })
      if (loginError) { setError('Email ou mot de passe incorrect'); setLoading(false); return }
    }

    // Associate with club (works when session is active = login or immediate signup)
    const res = await fetch('/api/fan/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ club_id: club.id }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? "Erreur lors de l'association au club")
      setLoading(false)
      return
    }

    router.push('/home')
  }

  const inputStyle = {
    width: '100%',
    padding: '13px 14px 13px 42px',
    borderRadius: 14,
    border: '1px solid rgba(0,0,0,0.12)',
    background: '#f5f5f7',
    color: '#1d1d1f',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  // Club header — shared between all states
  const ClubHeader = () => (
    <div style={{ background: primaryColor, borderRadius: 20, padding: '28px 24px', marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {club.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={club.logo_url} alt={club.name} style={{ width: 72, height: 72, objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.20))' }} />
      ) : (
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900, color: club.secondary_color || '#ffffff' }}>
          {club.name[0]}
        </div>
      )}
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: `${club.secondary_color || '#ffffff'}99`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Rejoindre
        </p>
        <h1 style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 900, color: club.secondary_color || '#ffffff' }}>
          {club.name}
        </h1>
      </div>
    </div>
  )

  if (emailSent) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f5f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <ClubHeader />
          <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.08)', padding: '28px 24px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>📬</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#1d1d1f' }}>Vérifie ton email</h2>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: 'rgba(29,29,31,0.55)', lineHeight: 1.6 }}>
              Un lien de confirmation a été envoyé à
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 14, fontWeight: 700, color: '#1d1d1f' }}>{form.email}</p>
            <p style={{ margin: 0, fontSize: 13, color: 'rgba(29,29,31,0.45)', lineHeight: 1.5 }}>
              Clique sur le lien dans l&apos;email pour activer ton compte et rejoindre <strong>{club.name}</strong> automatiquement.
            </p>
          </div>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(29,29,31,0.35)' }}>
            Plateforme FanPass — vos données restent privées
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f7', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <ClubHeader />

        {/* Auth form */}
        <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.08)', padding: '24px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

          {/* Toggle */}
          <div style={{ display: 'flex', background: '#f5f5f7', borderRadius: 12, padding: 4, marginBottom: 20 }}>
            {(['signup', 'login'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null) }} style={{
                flex: 1, padding: '9px 0', borderRadius: 9, fontSize: 14, fontWeight: 600,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: mode === m ? '#ffffff' : 'transparent',
                color: mode === m ? '#1d1d1f' : 'rgba(29,29,31,0.45)',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
              }}>
                {m === 'signup' ? 'Créer un compte' : 'Se connecter'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {mode === 'signup' && (
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(29,29,31,0.35)', pointerEvents: 'none' }} />
                <input style={inputStyle} placeholder="Prénom et nom" value={form.full_name} onChange={set('full_name')} required />
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(29,29,31,0.35)', pointerEvents: 'none' }} />
              <input style={inputStyle} type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(29,29,31,0.35)', pointerEvents: 'none' }} />
              <input style={inputStyle} type="password" placeholder="Mot de passe" value={form.password} onChange={set('password')} required minLength={6} />
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: 13, color: '#c62828', background: '#ffebee', padding: '10px 14px', borderRadius: 10 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4, padding: '14px 0', borderRadius: 14,
                background: primaryColor, color: club.secondary_color || '#ffffff',
                fontSize: 15, fontWeight: 700, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading
                ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                : mode === 'signup' ? `Rejoindre ${club.name}` : 'Se connecter'
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'rgba(29,29,31,0.35)' }}>
          Plateforme FanPass — vos données restent privées
        </p>
      </div>
    </div>
  )
}
