'use client'
import { useState } from 'react'
import { TrendingUp, Loader2, Check, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import type { MarketOption } from '@/types/database'

interface MyBet {
  selected_option: string
  odds: number
  points_staked: number
  is_settled: boolean
  points_won: number | null
}

interface Market {
  id: string
  match_id: string
  market_label: string
  market_emoji: string
  options: MarketOption[]
  is_settled: boolean
  closes_at: string | null
  correct_option: string | null
  myBet: MyBet | null
}

interface Props {
  market: Market
  userPoints: number
}

const BET_STEPS = [25, 50, 100, 200, 500]

export function MarketBetCard({ market, userPoints }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [selection, setSelection] = useState<string>('')
  const [bet, setBet] = useState(50)
  const [loading, setLoading] = useState(false)

  const isClosed = market.is_settled || (!!market.closes_at && new Date(market.closes_at) < new Date())
  const isLocked = !!market.myBet || isClosed

  const chosen = market.options.find(o => o.key === selection)
  const potentialWin = chosen && bet > 0 ? Math.round(bet * chosen.odds) : null

  async function submit() {
    if (!selection) { toast('Choisis une option', 'error'); return }
    if (bet > userPoints) { toast(`Solde insuffisant (${userPoints} pts)`, 'error'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/fan/matches/${market.match_id}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_id: market.id, selected_option: selection, points_staked: bet }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      toast(`Mise enregistrée ! Gain potentiel : ${Math.round(bet * (chosen?.odds ?? 1))} pts`, 'success')
      router.refresh()
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoading(false) }
  }

  const existing = market.myBet

  return (
    <Card variant="dark" className="border border-white/8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{market.market_emoji}</span>
          <span className="font-semibold text-sm">{market.market_label}</span>
        </div>
        {market.is_settled && <Badge variant="neutral">Réglé</Badge>}
        {!market.is_settled && isClosed && <Badge variant="info"><Clock className="w-3 h-3 mr-1 inline" />Fermé</Badge>}
        {!market.is_settled && !isClosed && !existing && <Badge variant="neutral">Ouvert</Badge>}
      </div>

      {/* Existing bet */}
      {existing && (
        <div className={`p-3 rounded-xl mb-3 border ${
          existing.is_settled && existing.points_won && existing.points_won > 0
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : existing.is_settled
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{existing.selected_option}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {existing.points_staked} pts · cote x{existing.odds.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              {!existing.is_settled && <p className="text-xs text-amber-400 font-medium">En attente</p>}
              {existing.is_settled && existing.points_won && existing.points_won > 0 && (
                <p className="text-sm text-emerald-400 font-black">+{existing.points_won} pts</p>
              )}
              {existing.is_settled && (!existing.points_won || existing.points_won === 0) && (
                <p className="text-sm text-red-400 font-bold">Raté</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-2">
        {market.options.map(o => {
          const isSelected = selection === o.key
          const isBetOn = existing?.selected_option === o.key
          const isWinner = market.correct_option === o.key
          return (
            <button
              key={o.key}
              onClick={() => { if (!isLocked) setSelection(o.key) }}
              disabled={isLocked}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                isWinner
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                  : isBetOn
                  ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                  : isSelected
                  ? 'border-amber-500/50 bg-amber-500/15 text-white'
                  : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/8 disabled:cursor-not-allowed'
              }`}
            >
              <span className="font-medium text-sm">{o.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-black text-sm">x{o.odds.toFixed(2)}</span>
                {isBetOn && <Check className="w-4 h-4 text-blue-400" />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Bet selector */}
      {!isLocked && (
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs text-gray-400 mb-2">Mise (pts)</p>
            <div className="flex gap-2 flex-wrap">
              {BET_STEPS.map(s => (
                <button
                  key={s}
                  onClick={() => setBet(s)}
                  disabled={s > userPoints}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    bet === s ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-30'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {selection && bet > 0 && chosen && (
            <p className="text-xs text-emerald-400 font-bold">
              Gain potentiel : {potentialWin?.toLocaleString('fr-BE')} pts
            </p>
          )}
          <Button onClick={submit} disabled={loading || !selection} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Miser ${bet} pts${chosen ? ` sur "${chosen.label}"` : ''}`}
          </Button>
        </div>
      )}

      {isLocked && !existing && isClosed && (
        <p className="text-xs text-center text-gray-500 mt-3">
          {market.is_settled ? 'Marché réglé' : 'Les mises sont fermées'}
        </p>
      )}
    </Card>
  )
}
