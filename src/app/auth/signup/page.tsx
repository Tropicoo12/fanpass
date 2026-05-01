'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff, User, Loader2, Zap } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Mot de passe trop court (8 caractères minimum).'); return }
    setLoading(true)
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }
    setDone(true)
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

  if (done) {
    return (
      <div>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="#ffffff" fill="#ffffff" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1d1d1f', lineHeight: 1.1 }}>FanPass</p>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: 'rgba(29,29,31,0.40)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Espace supporter</p>
          </div>
        </div>
        <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.08)', padding: '32px 24px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>📬</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#1d1d1f' }}>Vérifie ton email</h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(29,29,31,0.55)', lineHeight: 1.6 }}>
            Un lien de confirmation a été envoyé à{' '}
            <strong style={{ color: '#1d1d1f' }}>{email}</strong>.
            Clique dessus pour activer ton compte.
          </p>
          <button
            onClick={() => router.push('/auth/login')}
            style={{ width: '100%', padding: '14px 0', borderRadius: 14, background: '#f5f5f7', color: '#1d1d1f', fontSize: 15, fontWeight: 600, border: '1px solid rgba(0,0,0,0.10)', cursor: 'pointer' }}
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 28 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: '#1d1d1f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={20} color="#ffffff" fill="#ffffff" />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1d1d1f', lineHeight: 1.1 }}>FanPass</p>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: 'rgba(29,29,31,0.40)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Espace supporter</p>
        </div>
      </div>

      {/* Card */}
      <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.08)', padding: '28px 24px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#1d1d1f' }}>Créer un compte</h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(29,29,31,0.45)' }}>
          Rejoins la communauté des fans
        </p>

        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Full name */}
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(29,29,31,0.35)', pointerEvents: 'none' }} />
            <input style={inputStyle} type="text" placeholder="Prénom et nom" value={fullName} onChange={e => setFullName(e.target.value)} required autoComplete="name" autoFocus />
          </div>

          {/* Email */}
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(29,29,31,0.35)', pointerEvents: 'none' }} />
            <input style={inputStyle} type="email" placeholder="ton@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(29,29,31,0.35)', pointerEvents: 'none' }} />
            <input
              style={{ ...inputStyle, paddingRight: 44 }}
              type={showPw ? 'text' : 'password'}
              placeholder="8 caractères minimum"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(29,29,31,0.35)', padding: 0, display: 'flex' }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && <p style={{ margin: 0, fontSize: 13, color: '#c62828', background: '#ffebee', padding: '10px 14px', borderRadius: 10 }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 4, padding: '14px 0', borderRadius: 14, background: '#1d1d1f', color: '#ffffff', fontSize: 15, fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Créer mon compte'}
          </button>

          <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: 'rgba(29,29,31,0.35)' }}>
            En t'inscrivant, tu acceptes les conditions d'utilisation.
          </p>
        </form>
      </div>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'rgba(29,29,31,0.45)' }}>
        Déjà un compte ?{' '}
        <a href="/auth/login" style={{ color: '#1d1d1f', fontWeight: 600, textDecoration: 'underline' }}>
          Se connecter
        </a>
      </p>
    </div>
  )
}
