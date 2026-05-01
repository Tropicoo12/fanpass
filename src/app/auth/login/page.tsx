'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Eye, EyeOff, Loader2, Zap } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/home'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }
    router.push(next)
    router.refresh()
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
        <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#1d1d1f' }}>Connexion</h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: 'rgba(29,29,31,0.45)' }}>
          Accède à ton espace fan
        </p>

        {params.get('error') && (
          <p style={{ fontSize: 13, color: '#c62828', background: '#ffebee', padding: '10px 14px', borderRadius: 10, marginBottom: 16 }}>
            Une erreur est survenue. Réessaie.
          </p>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(29,29,31,0.35)', pointerEvents: 'none' }} />
            <input style={inputStyle} type="email" placeholder="ton@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" autoFocus />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(29,29,31,0.35)', pointerEvents: 'none' }} />
            <input style={{ ...inputStyle, paddingRight: 44 }} type={showPw ? 'text' : 'password'} placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
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
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Se connecter'}
          </button>
        </form>
      </div>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: 'rgba(29,29,31,0.45)' }}>
        Pas encore de compte ?{' '}
        <a href="/auth/signup" style={{ color: '#1d1d1f', fontWeight: 600, textDecoration: 'underline' }}>
          S&apos;inscrire
        </a>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'rgba(29,29,31,0.4)' }} />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
