'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Globe, Eye, EyeOff } from 'lucide-react'

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
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setDone(true)
  }

  async function handleGoogle() {
    setLoading(true)
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="text-5xl">📬</div>
        <h2 className="text-xl font-black">Vérifie ton email</h2>
        <p className="text-gray-400 text-sm">
          Un lien de confirmation a été envoyé à <strong className="text-white">{email}</strong>.
          Clique dessus pour activer ton compte.
        </p>
        <Button variant="secondary" onClick={() => router.push('/auth/login')} className="w-full">
          Retour à la connexion
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black">Créer un compte</h2>
        <p className="text-gray-400 text-sm mt-1">Rejoins la communauté des fans</p>
      </div>

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

      <form onSubmit={handleSignup} className="space-y-4">
        <Input
          id="name"
          label="Prénom et nom"
          placeholder="Marc Dupont"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          required
          autoComplete="name"
        />
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
              placeholder="8 caractères minimum"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
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
          {loading ? 'Création…' : 'Créer mon compte'}
        </Button>

        <p className="text-center text-xs text-gray-500">
          En t'inscrivant, tu acceptes les conditions d'utilisation.
        </p>
      </form>

      <p className="text-center text-sm text-gray-400">
        Déjà un compte ?{' '}
        <Link href="/auth/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Se connecter
        </Link>
      </p>
    </div>
  )
}
