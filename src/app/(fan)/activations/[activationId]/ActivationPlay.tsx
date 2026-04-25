'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Activation } from '@/types/database'

interface Props {
  activation: Activation
  alreadyAnswered: boolean
  initialPointsEarned?: number
}

export function ActivationPlay({ activation, alreadyAnswered, initialPointsEarned }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<string | null>(null)
  const [momentText, setMomentText] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(alreadyAnswered)
  const [pointsEarned, setPointsEarned] = useState<number | null>(initialPointsEarned ?? null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [error, setError] = useState('')

  const options = Array.isArray(activation.options) ? (activation.options as string[]) : []

  async function submit() {
    const answer =
      activation.type === 'moment' ? momentText.trim()
      : activation.type === 'poll' || activation.type === 'trivia' ? selected
      : selected ?? momentText.trim()

    if (!answer) { setError('Choisis une réponse.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/activations/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activationId: activation.id, answer }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); return }
      setPointsEarned(data.pointsEarned)
      setIsCorrect(data.isCorrect)
      setDone(true)
      router.refresh()
    } catch {
      setError('Erreur réseau. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <Card variant="dark" className="border border-emerald-500/40 text-center py-8 space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-black text-emerald-400">
            {isCorrect === true ? 'Bonne réponse !' : isCorrect === false ? 'Raté !' : 'Réponse enregistrée !'}
          </h2>
          {pointsEarned !== null && pointsEarned > 0 && (
            <div className="mt-3 inline-block px-6 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-2xl font-black text-emerald-400">+{pointsEarned} pts</p>
            </div>
          )}
          {isCorrect === false && <p className="text-gray-400 text-sm mt-2">La bonne réponse était : {activation.correct_answer}</p>}
        </div>
        <Button variant="secondary" onClick={() => router.push('/home')} className="mx-auto">
          Retour à l'accueil
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {(activation.type === 'poll' || activation.type === 'trivia') && options.length > 0 && (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelected(opt)}
              className={`w-full px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all ${
                selected === opt
                  ? 'border-emerald-500 bg-emerald-500/15 text-white'
                  : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {activation.type === 'moment' && (
        <textarea
          value={momentText}
          onChange={e => setMomentText(e.target.value)}
          placeholder="Décris ce moment fort…"
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none placeholder:text-gray-600"
        />
      )}

      {activation.type === 'prediction' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Ta prédiction</label>
          <input
            value={momentText}
            onChange={e => setMomentText(e.target.value)}
            placeholder="Ex: 2-1"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600"
          />
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <Button
        onClick={submit}
        disabled={loading}
        className="w-full"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Valider · +${activation.points_reward} pts`}
      </Button>
    </div>
  )
}
