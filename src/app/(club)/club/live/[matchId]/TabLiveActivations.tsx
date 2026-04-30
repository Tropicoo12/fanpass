'use client'
import { useState, useEffect } from 'react'
import { Zap, Plus, Minus, Square, Loader2, Clock, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import type { Match, MatchMarket, MarketOption } from '@/types/database'

interface Props {
  match: Match
  liveMarkets: MatchMarket[]
}

const DURATIONS = [
  { label: '2 min', minutes: 2 },
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
]

const QUICK_OPTIONS: { label: string; odds: string }[] = [
  { label: 'But équipe domicile', odds: '2.50' },
  { label: 'But équipe visiteuse', odds: '3.00' },
  { label: 'Aucun but', odds: '1.80' },
  { label: 'Carton jaune', odds: '2.20' },
  { label: 'Carton rouge', odds: '5.00' },
]

function useCountdown(closesAt: string | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  if (!closesAt) return null
  const diff = Math.max(0, new Date(closesAt).getTime() - now)
  if (diff === 0) return 'Expiré'
  return `${Math.floor(diff / 60000)}:${String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')}`
}

function LiveMarketCard({ market, matchId, onClose }: {
  market: MatchMarket
  matchId: string
  onClose: (id: string) => void
}) {
  const countdown = useCountdown(market.closes_at)
  const options = market.options as unknown as MarketOption[]
  const isExpired = market.closes_at && new Date(market.closes_at) < new Date()

  return (
    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-medium text-sm">{market.market_label}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            {market.closes_at && (
              <span className={`flex items-center gap-1 font-mono ${isExpired ? 'text-red-400' : 'text-blue-300'}`}>
                <Clock className="w-3 h-3" />
                {countdown}
              </span>
            )}
            <span>{market.bet_count} pari{market.bet_count !== 1 ? 's' : ''}</span>
          </div>
        </div>
        {!market.is_settled && (
          <Button size="sm" variant="danger" onClick={() => onClose(market.id)}>
            <Square className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <span key={o.key} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300">
            {o.label} <span className="text-amber-400 font-bold">x{o.odds.toFixed(2)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function TabLiveActivations({ match, liveMarkets: initialMarkets }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const [markets, setMarkets] = useState<MatchMarket[]>(initialMarkets)
  const [duration, setDuration] = useState(5)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState([
    { label: '', odds: '' },
    { label: '', odds: '' },
  ])
  const [creating, setCreating] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  function setOptionField(i: number, field: 'label' | 'odds', value: string) {
    setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: value } : o))
  }

  function addOption() {
    setOptions(prev => [...prev, { label: '', odds: '' }])
  }

  function removeOption(i: number) {
    if (options.length <= 2) return
    setOptions(prev => prev.filter((_, idx) => idx !== i))
  }

  function applyQuickOption(quick: { label: string; odds: string }) {
    const emptyIdx = options.findIndex(o => !o.label.trim())
    if (emptyIdx >= 0) {
      setOptionField(emptyIdx, 'label', quick.label)
      setOptionField(emptyIdx, 'odds', quick.odds)
    } else {
      setOptions(prev => [...prev, { label: quick.label, odds: quick.odds }])
    }
  }

  async function launch(e: React.FormEvent) {
    e.preventDefault()
    if (!question.trim()) { toast('Question requise', 'error'); return }

    const validOptions = options.filter(o => o.label.trim() && parseFloat(o.odds) > 1)
    if (validOptions.length < 2) { toast('Au moins 2 options avec cotes valides (> 1)', 'error'); return }

    const marketOptions: MarketOption[] = validOptions.map((o, i) => ({
      key: `opt_${i}`,
      label: o.label.trim(),
      odds: parseFloat(o.odds),
    }))

    const closesAt = new Date(Date.now() + duration * 60 * 1000).toISOString()
    setCreating(true)
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_key: 'live_bet',
          market_label: question.trim(),
          market_emoji: '⚡',
          options: marketOptions,
          is_published: true,
          closes_at: closesAt,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setMarkets(prev => [data.market, ...prev])
      setQuestion('')
      setOptions([{ label: '', odds: '' }, { label: '', odds: '' }])
      toast('Pari live lancé ! Les fans peuvent miser maintenant.', 'success')
      router.refresh()
    } catch { toast('Erreur réseau', 'error') }
    finally { setCreating(false) }
  }

  async function closeMarket(id: string) {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: false }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setMarkets(prev => prev.map(m => m.id === id ? data.market : m))
      toast('Pari fermé', 'success')
      router.refresh()
    } finally { setLoadingId(null) }
  }

  const activeMarkets = markets.filter(m => m.is_published && !m.is_settled)
  const pastMarkets = markets.filter(m => !m.is_published || m.is_settled)

  return (
    <div className="space-y-5">
      {/* Active live bets */}
      {activeMarkets.length > 0 && (
        <Card variant="dark">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Paris live en cours ({activeMarkets.length})
          </h2>
          <div className="space-y-2">
            {activeMarkets.map(m => (
              <LiveMarketCard
                key={m.id}
                market={m}
                matchId={match.id}
                onClose={closeMarket}
              />
            ))}
          </div>
        </Card>
      )}

      {/* Create live bet */}
      <Card variant="dark">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-400" />
          Lancer un pari live
        </h2>
        <form onSubmit={launch} className="space-y-4">
          <Input
            label="Question *"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Que se passe-t-il dans les 5 prochaines minutes ?"
          />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Durée</label>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button key={d.minutes} type="button" onClick={() => setDuration(d.minutes)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    duration === d.minutes
                      ? 'bg-blue-500/20 border-blue-500/60 text-blue-300'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Suggestions rapides</label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_OPTIONS.map(q => (
                <button key={q.label} type="button" onClick={() => applyQuickOption(q)}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-gray-300"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options with odds */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">
                Options avec cotes <span className="text-amber-400 flex items-center gap-1 inline-flex"><TrendingUp className="w-3 h-3" /></span>
              </label>
              <button type="button" onClick={addOption} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Ajouter
              </button>
            </div>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={opt.label}
                    onChange={e => setOptionField(i, 'label', e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-blue-500/50 placeholder:text-gray-600"
                  />
                  <input
                    type="number"
                    value={opt.odds}
                    onChange={e => setOptionField(i, 'odds', e.target.value)}
                    placeholder="Cote"
                    step="0.01"
                    min="1.01"
                    className="w-20 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-amber-400 font-bold text-center focus:outline-none focus:border-amber-500/50 placeholder:text-gray-600"
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)} className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={creating} className="w-full bg-blue-500 hover:bg-blue-600 active:scale-95">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4 mr-2" />Lancer le pari live</>}
          </Button>
        </form>
      </Card>

      {/* Past markets */}
      {pastMarkets.length > 0 && (
        <Card variant="dark">
          <h2 className="font-bold mb-3 text-sm text-gray-400">Historique</h2>
          <div className="space-y-2">
            {pastMarkets.map(m => {
              const opts = m.options as unknown as MarketOption[]
              return (
                <div key={m.id} className="p-3 rounded-xl bg-white/3 border border-white/5">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-gray-300">{m.market_label}</p>
                    <span className="text-xs text-gray-500">{m.bet_count} paris</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {opts.map(o => (
                      <span key={o.key} className={`text-xs px-2 py-0.5 rounded-lg border ${
                        m.correct_option === o.key
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 border-white/8 text-gray-400'
                      }`}>
                        {o.label} x{o.odds.toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
