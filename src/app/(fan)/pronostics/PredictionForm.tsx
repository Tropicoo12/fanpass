'use client'
import { useState } from 'react'
import { Trophy, Minus, Plus, Loader2, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type { Match, Pronostic } from '@/types/database'
import { useRouter } from 'next/navigation'

interface Props {
  match: Match
  existing: Pronostic | null
  userPoints?: number
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

const BET_STEPS = [0, 25, 50, 100, 200, 500]

export function PredictionForm({ match, existing, userPoints = 0 }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [home, setHome] = useState(existing?.predicted_home_score ?? 0)
  const [away, setAway] = useState(existing?.predicted_away_score ?? 0)
  const [bet, setBet] = useState(existing?.points_bet ?? 0)
  const [loading, setLoading] = useState(false)
  const isLocked = match.status !== 'upcoming' || !!existing

  const hasOdds = match.odds_home !== null || match.odds_draw !== null || match.odds_away !== null
  const fmtDate = new Intl.DateTimeFormat('fr-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(match.match_date))

  // Derive multiplier from predicted outcome
  function getMultiplier(): number | null {
    if (!hasOdds) return null
    if (home > away) return match.odds_home
    if (away > home) return match.odds_away
    return match.odds_draw
  }
  const multiplier = getMultiplier()
  const potentialWin = multiplier && bet > 0 ? Math.round(bet * multiplier) : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked) return
    if (bet > userPoints) { toast(`Solde insuffisant (${userPoints} pts disponibles)`, 'error'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/pronostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          homeScore: home,
          awayScore: away,
          pointsBet: bet,
          oddsMultiplier: multiplier,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      const msg = bet > 0
        ? `Pronostic enregistré ! ${bet} pts misés 🎯`
        : 'Pronostic enregistré ! 🎯'
      toast(msg, 'success')
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
          {match.status === 'upcoming' && !existing && <Badge variant="neutral">Ouvert</Badge>}
          {existing && <Badge variant="info">Enregistré</Badge>}
        </div>
      </div>

      <form onSubmit={submit}>
        {/* Teams + score */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-black text-lg mx-auto mb-2">
              {match.home_team.slice(0, 2).toUpperCase()}
            </div>
            <p className="text-sm font-bold">{match.home_team}</p>
            {hasOdds && match.odds_home && (
              <p className="text-xs text-amber-400 mt-1 font-bold">x{match.odds_home.toFixed(2)}</p>
            )}
          </div>
          <div className="flex flex-col items-center gap-3">
            <span className="text-gray-600 text-xs font-medium">Score prédit</span>
            <div className="flex items-center gap-2">
              <ScoreInput value={home} onChange={setHome} disabled={isLocked} />
              <span className="text-gray-400 font-black">–</span>
              <ScoreInput value={away} onChange={setAway} disabled={isLocked} />
            </div>
            {hasOdds && match.odds_draw && (
              <p className="text-xs text-gray-400">Nul : <span className="text-amber-400 font-bold">x{match.odds_draw.toFixed(2)}</span></p>
            )}
          </div>
          <div className="flex-1 text-center">
            <div className="w-12 h-12 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-black text-lg mx-auto mb-2">
              {match.away_team.slice(0, 2).toUpperCase()}
            </div>
            <p className="text-sm font-bold">{match.away_team}</p>
            {hasOdds && match.odds_away && (
              <p className="text-xs text-amber-400 mt-1 font-bold">x{match.odds_away.toFixed(2)}</p>
            )}
          </div>
        </div>

        {/* Odds bet section */}
        {hasOdds && !isLocked && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">Mise de points (optionnel)</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {BET_STEPS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setBet(s)}
                  disabled={s > userPoints}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    bet === s
                      ? 'bg-amber-500 text-black'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-30'
                  }`}
                >
                  {s === 0 ? 'Sans mise' : `${s} pts`}
                </button>
              ))}
            </div>
            {bet > 0 && multiplier && (
              <p className="text-xs text-emerald-400 mt-2 font-bold">
                Gain potentiel : {potentialWin?.toLocaleString('fr-BE')} pts (x{multiplier.toFixed(2)})
              </p>
            )}
            {bet > 0 && !multiplier && (
              <p className="text-xs text-gray-500 mt-2">Choisis un score pour voir ton multiplicateur</p>
            )}
          </div>
        )}

        {/* Fixed points info (no odds) */}
        {!hasOdds && (
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
        )}

        {/* Existing bet info */}
        {existing?.points_bet && existing.points_bet > 0 && (
          <div className="mt-3 text-xs text-amber-400 font-medium">
            Mise enregistrée : {existing.points_bet} pts · Cote x{existing.odds_multiplier?.toFixed(2)}
          </div>
        )}

        {!isLocked && (
          <Button type="submit" disabled={loading} className="w-full mt-4">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : bet > 0 ? `Valider · Miser ${bet} pts` : 'Valider mon pronostic'}
          </Button>
        )}
        {isLocked && match.status === 'upcoming' && existing && (
          <p className="text-xs text-center text-gray-500 mt-3">Pronostic verrouillé</p>
        )}
        {isLocked && match.status !== 'upcoming' && (
          <p className="text-xs text-center text-gray-500 mt-3">
            {match.status === 'live' ? 'Les pronostics sont fermés — match en cours.' : 'Match terminé.'}
          </p>
        )}
      </form>
    </Card>
  )
}
