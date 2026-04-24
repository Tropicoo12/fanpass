'use client'
import { useState } from 'react'
import { Trophy, Minus, Plus, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type { Match, Pronostic } from '@/types/database'
import { useRouter } from 'next/navigation'

interface Props {
  match: Match
  existing: Pronostic | null
}

function ScoreInput({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value === 0}
        className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-10 text-center text-2xl font-black tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(20, value + 1))}
        disabled={disabled}
        className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 flex items-center justify-center transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  )
}

export function PredictionForm({ match, existing }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [home, setHome] = useState(existing?.predicted_home_score ?? 0)
  const [away, setAway] = useState(existing?.predicted_away_score ?? 0)
  const [loading, setLoading] = useState(false)
  const isLocked = match.status !== 'upcoming'

  const fmtDate = new Intl.DateTimeFormat('fr-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(match.match_date))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked) return
    setLoading(true)
    try {
      const res = await fetch('/api/pronostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: match.id, homeScore: home, awayScore: away }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      toast(existing ? 'Pronostic mis à jour !' : 'Pronostic enregistré ! +points si tu as raison 🎯', 'success')
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="dark" className="border border-white/8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Pronostic</p>
          <p className="text-xs text-gray-400 mt-0.5">{fmtDate}</p>
        </div>
        <div className="flex items-center gap-2">
          {match.status === 'live' && <Badge variant="success">Live</Badge>}
          {match.status === 'upcoming' && <Badge variant="neutral">Ouvert</Badge>}
          {existing && match.status === 'upcoming' && <Badge variant="info">Modifiable</Badge>}
        </div>
      </div>

      <form onSubmit={submit}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-2xl mx-auto mb-2">🦁</div>
            <p className="text-sm font-bold">{match.home_team}</p>
          </div>
          <div className="flex flex-col items-center gap-3">
            <span className="text-gray-600 text-xs font-medium">Score prédit</span>
            <div className="flex items-center gap-2">
              <ScoreInput value={home} onChange={setHome} disabled={isLocked} />
              <span className="text-gray-400 font-black">–</span>
              <ScoreInput value={away} onChange={setAway} disabled={isLocked} />
            </div>
          </div>
          <div className="flex-1 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-2xl mx-auto mb-2">🦄</div>
            <p className="text-sm font-bold">{match.away_team}</p>
          </div>
        </div>

        {/* Points info */}
        <div className="flex gap-3 mt-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>Score exact : <strong className="text-amber-400">+{match.prediction_points_exact} pts</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-blue-400" />
            <span>Vainqueur : <strong className="text-blue-400">+{match.prediction_points_winner} pts</strong></span>
          </div>
        </div>

        {!isLocked && (
          <Button type="submit" disabled={loading} className="w-full mt-4">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : existing ? 'Mettre à jour' : 'Valider mon pronostic'}
          </Button>
        )}
        {isLocked && (
          <p className="text-xs text-center text-gray-500 mt-3">
            {match.status === 'live' ? 'Les pronostics sont fermés — match en cours.' : 'Match terminé.'}
          </p>
        )}
      </form>
    </Card>
  )
}
