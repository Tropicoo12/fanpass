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
  selection: string
  odds_at_bet: number
  points_bet: number
  status: 'pending' | 'won' | 'lost'
  points_earned: number | null
}

interface Market {
  id: string
  title: string
  market_type: string
  options: MarketOption[]
  status: 'open' | 'closed' | 'settled'
  min_bet: number
  max_bet: number
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
  const [bet, setBet] = useState(market.min_bet)
  const [loading, setLoading] = useState(false)
  const opts = market.options as MarketOption[]

  const chosen = opts.find(o => o.name === selection)
  const potentialWin = chosen && bet > 0 ? Math.round(bet * chosen.odds) : null

  const isLocked = !!market.myBet || market.status !== 'open'

  async function submit() {
    if (!selection) { toast('Choisis une option', 'error'); return }
    if (bet < market.min_bet) { toast(`Mise minimum : ${market.min_bet} pts`, 'error'); return }
    if (bet > userPoints) { toast(`Solde insuffisant (${userPoints} pts)`, 'error'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/markets/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketId: market.id, selection, pointsBet: bet }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      toast(`Mise enregistrée ! Gain potentiel : ${data.potentialWin} pts`, 'success')
      router.refresh()
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoading(false) }
  }

  const existing = market.myBet

  return (
    <Card variant="dark" className="border border-white/8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-sm">{market.title}</span>
        </div>
        {market.status === 'open' && !existing && <Badge variant="neutral">Ouvert</Badge>}
        {market.status === 'closed' && <Badge variant="info"><Clock className="w-3 h-3 mr-1 inline" />Fermé</Badge>}
        {market.status === 'settled' && <Badge variant="neutral">Réglé</Badge>}
      </div>

      {/* Existing bet state */}
      {existing && (
        <div className={`p-3 rounded-xl mb-3 border ${
          existing.status === 'won'
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : existing.status === 'lost'
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{existing.selection}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {existing.points_bet} pts misés · cote x{existing.odds_at_bet.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              {existing.status === 'pending' && (
                <p className="text-xs text-amber-400 font-medium">En attente</p>
              )}
              {existing.status === 'won' && (
                <p className="text-sm text-emerald-400 font-black">+{existing.points_earned} pts</p>
              )}
              {existing.status === 'lost' && (
                <p className="text-sm text-red-400 font-bold">Raté</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-2">
        {opts.map(o => {
          const isSelected = selection === o.name
          const isBetOn = existing?.selection === o.name
          return (
            <button
              key={o.name}
              onClick={() => { if (!isLocked) setSelection(o.name) }}
              disabled={isLocked}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                isBetOn && existing?.status === 'won'
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                  : isBetOn
                  ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                  : isSelected
                  ? 'border-amber-500/50 bg-amber-500/15 text-white'
                  : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/8 disabled:cursor-not-allowed'
              }`}
            >
              <span className="font-medium text-sm">{o.name}</span>
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
            <p className="text-xs text-gray-400 mb-2">Mise ({market.min_bet}–{market.max_bet} pts)</p>
            <div className="flex gap-2 flex-wrap">
              {BET_STEPS.filter(s => s <= market.max_bet && s >= market.min_bet).map(s => (
                <button
                  key={s}
                  onClick={() => setBet(s)}
                  disabled={s > userPoints}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    bet === s
                      ? 'bg-amber-500 text-black'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-30'
                  }`}
                >
                  {s} pts
                </button>
              ))}
            </div>
          </div>
          {selection && bet > 0 && (
            <p className="text-xs text-emerald-400 font-bold">
              Gain potentiel si {selection} : {potentialWin?.toLocaleString('fr-BE')} pts
            </p>
          )}
          <Button onClick={submit} disabled={loading || !selection} className="w-full">
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : `Miser ${bet} pts${selection ? ` sur ${selection}` : ''}`
            }
          </Button>
        </div>
      )}

      {isLocked && !existing && market.status !== 'open' && (
        <p className="text-xs text-center text-gray-500 mt-3">
          {market.status === 'closed' ? 'Les mises sont fermées' : 'Marché réglé'}
        </p>
      )}
    </Card>
  )
}
