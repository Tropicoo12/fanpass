'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Eye, EyeOff, Globe } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/home'
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }
    router.push(next)
    router.refresh()
  }

  async function handleGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black">Connexion</h2>
        <p className="text-gray-400 text-sm mt-1">Accède à ton espace supporter</p>
      </div>

      {params.get('error') && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          Une erreur est survenue. Réessaie.
        </div>
      )}

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 font-medium transition-all active:scale-95 disabled:opacity-50"
      >
        <Globe className="w-4 h-4" />
        Continuer avec Google
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-xs text-gray-500">ou</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <Input
          id="email"
          type="email"
          label="Email"
          placeholder="fan@club.be"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-300">Mot de passe</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 pr-11 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500/50 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full py-3">
          {loading ? 'Connexion…' : 'Se connecter'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-400">
        Pas encore de compte ?{' '}
        <Link href="/auth/signup" className="text-emerald-400 hover:text-emerald-300 font-medium">
          S'inscrire
        </Link>
      </p>
    </div>
  )
}
