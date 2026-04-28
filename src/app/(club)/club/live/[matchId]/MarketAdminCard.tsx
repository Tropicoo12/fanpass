'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Clock, Loader2, Radio, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import type { Match, MatchMarket } from '@/types/database'
import { parseMarketOptions } from './marketTypes'

interface Props {
  match: Match
  market: MatchMarket
  onMarketUpdated: (market: MatchMarket) => void
  onMarketDeleted: (marketId: string) => void
}

function formatCountdown(ms: number) {
  if (ms <= 0) return 'Expire'
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function MarketAdminCard({ match, market, onMarketUpdated, onMarketDeleted }: Props) {
  const { toast } = useToast()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [selectedCorrect, setSelectedCorrect] = useState(market.correct_option ?? '')
  const [now, setNow] = useState(() => Date.now())

  const options = useMemo(() => parseMarketOptions(market.options), [market.options])
  const remainingMs = market.closes_at ? new Date(market.closes_at).getTime() - now : null
  const expired = remainingMs !== null && remainingMs <= 0

  useEffect(() => {
    if (!market.closes_at || market.is_settled) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [market.closes_at, market.is_settled])

  async function patchMarket(action: 'publish' | 'unpublish' | 'settle') {
    setLoadingAction(action)
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets/${market.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          correct_option: action === 'settle' ? selectedCorrect : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast(data.error ?? 'Erreur marché', 'error')
        return
      }
      onMarketUpdated(data.market)
      toast(action === 'settle' ? 'Marché clôturé' : 'Marché mis à jour', 'success')
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoadingAction(null)
    }
  }

  async function deleteMarket() {
    setLoadingAction('delete')
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets/${market.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        toast(data.error ?? 'Suppression impossible', 'error')
        return
      }
      onMarketDeleted(market.id)
      toast('Marché supprimé', 'success')
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <Card variant="dark" className="space-y-4 border border-white/5 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{market.market_emoji}</span>
            <h3 className="font-bold text-sm leading-tight">{market.market_label}</h3>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <Badge variant={market.is_settled ? 'neutral' : market.is_published ? 'success' : 'warning'}>
              {market.is_settled ? 'Clôturé' : market.is_published ? 'Publié' : 'Brouillon'}
            </Badge>
            <span>{market.bet_count} mises</span>
            {remainingMs !== null && !market.is_settled && (
              <span className={expired ? 'text-red-400' : 'text-amber-400'}>
                {formatCountdown(remainingMs)}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {!market.is_settled && (
            <Button
              type="button"
              size="sm"
              variant={market.is_published ? 'secondary' : 'primary'}
              aria-label={market.is_published ? 'Dépublier le marché' : 'Publier le marché'}
              onClick={() => patchMarket(market.is_published ? 'unpublish' : 'publish')}
              disabled={loadingAction !== null}
            >
              {loadingAction === 'publish' || loadingAction === 'unpublish'
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Radio className="h-3.5 w-3.5" />}
            </Button>
          )}
          {!market.is_settled && market.bet_count === 0 && (
            <Button
              type="button"
              size="sm"
              variant="danger"
              aria-label="Supprimer le marché"
              onClick={deleteMarket}
              disabled={loadingAction !== null}
            >
              {loadingAction === 'delete' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        {options.map(option => (
          <button
            key={option.key}
            type="button"
            onClick={() => setSelectedCorrect(option.key)}
            disabled={market.is_settled}
            className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
              selectedCorrect === option.key
                ? 'border-emerald-500 bg-emerald-500/15'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <span className="font-medium">{option.label}</span>
            <span className="font-bold text-amber-400">x{option.odds.toFixed(2)}</span>
          </button>
        ))}
      </div>

      {!market.is_settled && (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => patchMarket('settle')}
          disabled={!selectedCorrect || loadingAction !== null}
        >
          {loadingAction === 'settle' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Valider le résultat
        </Button>
      )}

      {market.is_settled && (
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <Clock className="h-4 w-4" />
          Résultat validé
        </div>
      )}
    </Card>
  )
}
