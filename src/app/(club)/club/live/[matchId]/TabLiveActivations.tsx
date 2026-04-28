'use client'

import { useState } from 'react'
import { Loader2, Plus, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import type { Match, MatchMarket } from '@/types/database'
import { MarketAdminCard } from './MarketAdminCard'

interface Props {
  match: Match
  markets: MatchMarket[]
  onMarketCreated: (market: MatchMarket) => void
  onMarketUpdated: (market: MatchMarket) => void
  onMarketDeleted: (marketId: string) => void
}

const DURATIONS = [2, 5, 10]

export function TabLiveActivations({ match, markets, onMarketCreated, onMarketUpdated, onMarketDeleted }: Props) {
  const { toast } = useToast()
  const [creating, setCreating] = useState(false)
  const [question, setQuestion] = useState('')
  const [duration, setDuration] = useState(5)
  const [options, setOptions] = useState([
    { label: '', odds: '1.80' },
    { label: '', odds: '2.10' },
    { label: '', odds: '3.00' },
  ])

  function setOption(index: number, key: 'label' | 'odds', value: string) {
    setOptions(prev => prev.map((option, i) => i === index ? { ...option, [key]: value } : option))
  }

  async function createLiveMarket(event: React.FormEvent) {
    event.preventDefault()
    const cleanOptions = options
      .map((option, index) => ({
        key: `option_${index + 1}`,
        label: option.label.trim(),
        odds: Number(option.odds.replace(',', '.')),
      }))
      .filter(option => option.label && Number.isFinite(option.odds) && option.odds > 1)

    if (!question.trim() || cleanOptions.length < 2) {
      toast('Ajoute une question et au moins 2 options valides', 'error')
      return
    }

    setCreating(true)
    try {
      const closesAt = new Date(Date.now() + duration * 60_000).toISOString()
      const res = await fetch(`/api/club/matches/${match.id}/markets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_key: 'live_bet',
          market_label: question.trim(),
          market_emoji: '⚡',
          options: cleanOptions,
          is_published: true,
          closes_at: closesAt,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast(data.error ?? 'Création impossible', 'error')
        return
      }
      onMarketCreated(data.market)
      setQuestion('')
      setOptions([
        { label: '', odds: '1.80' },
        { label: '', odds: '2.10' },
        { label: '', odds: '3.00' },
      ])
      toast('Pari live publié', 'success')
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card variant="dark" className="space-y-4 border border-white/5">
        <div>
          <h2 className="flex items-center gap-2 font-bold">
            <Zap className="h-4 w-4 text-amber-400" />
            Live activations
          </h2>
          <p className="mt-1 text-xs text-gray-500">Paris courts publiés immédiatement</p>
        </div>

        <form onSubmit={createLiveMarket} className="space-y-4">
          <Input
            label="Question"
            value={question}
            onChange={event => setQuestion(event.target.value)}
            placeholder="Qui marquera le prochain but ?"
            required
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Options et cotes</label>
            {options.map((option, index) => (
              <div key={index} className="grid grid-cols-[1fr_5rem] gap-2">
                <input
                  value={option.label}
                  onChange={event => setOption(index, 'label', event.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  value={option.odds}
                  onChange={event => setOption(index, 'odds', event.target.value)}
                  inputMode="decimal"
                  aria-label={`Cote option ${index + 1}`}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center text-sm font-bold text-amber-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-300">Durée</p>
            <div className="grid grid-cols-3 gap-2">
              {DURATIONS.map(minutes => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDuration(minutes)}
                  className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
                    duration === minutes
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {minutes} min
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Publier le pari live
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-300">Paris live</h3>
        {markets.length === 0 ? (
          <Card variant="dark" className="border border-white/5 py-8 text-center">
            <p className="text-sm text-gray-500">Aucun pari live</p>
          </Card>
        ) : (
          markets.map(market => (
            <MarketAdminCard
              key={market.id}
              match={match}
              market={market}
              onMarketUpdated={onMarketUpdated}
              onMarketDeleted={onMarketDeleted}
            />
          ))
        )}
      </div>
    </div>
  )
}
