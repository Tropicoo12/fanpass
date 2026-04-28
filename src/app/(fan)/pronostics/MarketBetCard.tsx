'use client'

import { useMemo, useState } from 'react'
import { Loader2, Ticket, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import type { Json, Match, MatchBet, MatchMarket } from '@/types/database'

type MarketOption = {
  key: string
  label: string
  odds: number
}

interface Props {
  match: Match
  markets: MatchMarket[]
  userBets: MatchBet[]
  userPoints: number
}

const BET_STEPS = [25, 50, 100, 200, 500]

function parseOptions(value: Json): MarketOption[] {
  if (!Array.isArray(value)) return []

  return value.filter((option): option is MarketOption => {
    if (!option || typeof option !== 'object' || Array.isArray(option)) return false
    const item = option as Record<string, Json | undefined>
    const odds = Number(item.odds)
    return (
      typeof item.key === 'string' &&
      typeof item.label === 'string' &&
      Number.isFinite(odds)
    )
  }).map(option => ({ ...option, odds: Number(option.odds) }))
}

function MarketEntry({
  match,
  market,
  existingBet,
  userPoints,
}: {
  match: Match
  market: MatchMarket
  existingBet: MatchBet | undefined
  userPoints: number
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedOption, setSelectedOption] = useState('')
  const [stake, setStake] = useState(50)
  const [loading, setLoading] = useState(false)
  const [now] = useState(() => Date.now())
  const options = useMemo(() => parseOptions(market.options), [market.options])
  const selected = options.find(option => option.key === selectedOption)
  const potentialWin = selected ? Math.round(stake * selected.odds) : null
  const closesAt = market.closes_at ? new Date(market.closes_at) : null
  const isExpired = closesAt ? closesAt.getTime() <= now : false
  const isClosed = Boolean(existingBet || market.is_settled || !market.is_published || isExpired)

  async function submitBet() {
    if (!selectedOption) {
      toast('Choisis une option', 'error')
      return
    }
    if (stake > userPoints) {
      toast(`Solde insuffisant (${userPoints} pts disponibles)`, 'error')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/fan/matches/${match.id}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketId: market.id,
          selectedOption,
          pointsStaked: stake,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast(data.error ?? 'Mise refusée', 'error')
        return
      }
      toast('Mise enregistrée', 'success')
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="dark" className="border border-white/5 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span>{market.market_emoji}</span>
            <h3 className="text-sm font-bold leading-tight">{market.market_label}</h3>
          </div>
          <p className="mt-1 text-xs text-gray-500">{market.bet_count} mises</p>
        </div>
        <Badge variant={existingBet ? 'info' : isExpired ? 'neutral' : 'success'}>
          {existingBet ? 'Misé' : isExpired ? 'Fermé' : 'Ouvert'}
        </Badge>
      </div>

      <div className="grid gap-2">
        {options.map(option => (
          <button
            key={option.key}
            type="button"
            onClick={() => setSelectedOption(option.key)}
            disabled={isClosed}
            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
              selectedOption === option.key || existingBet?.selected_option === option.key
                ? 'border-emerald-500 bg-emerald-500/15'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            } disabled:opacity-70`}
          >
            <span className="font-medium">{option.label}</span>
            <span className="font-bold text-amber-400">x{option.odds.toFixed(2)}</span>
          </button>
        ))}
      </div>

      {existingBet ? (
        <div className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-xs text-gray-300">
          Mise : <strong>{existingBet.points_staked} pts</strong> · Gain potentiel : <strong>{existingBet.potential_win} pts</strong>
        </div>
      ) : (
        !isClosed && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {BET_STEPS.map(step => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setStake(step)}
                  disabled={step > userPoints}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition-colors ${
                    stake === step
                      ? 'bg-amber-500 text-black'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-30'
                  }`}
                >
                  {step} pts
                </button>
              ))}
            </div>

            {potentialWin !== null && (
              <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                Gain potentiel : {potentialWin} pts
              </p>
            )}

            <Button type="button" className="w-full" onClick={submitBet} disabled={loading || !selectedOption}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="mr-2 h-4 w-4" />}
              Miser {stake} pts
            </Button>
          </div>
        )
      )}
    </Card>
  )
}

export function MarketBetCard({ match, markets, userBets, userPoints }: Props) {
  if (markets.length === 0) return null

  return (
    <div className="space-y-3">
      {markets.map(market => (
        <MarketEntry
          key={market.id}
          match={match}
          market={market}
          existingBet={userBets.find(bet => bet.match_market_id === market.id)}
          userPoints={userPoints}
        />
      ))}
    </div>
  )
}
