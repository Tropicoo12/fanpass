'use client'
import { useState, useEffect, useRef } from 'react'
import { TrendingUp, Plus, Check, Trash2, Loader2, Eye, EyeOff, Zap } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import type { Match, MatchMarket, MarketOption } from '@/types/database'

interface Props { match: Match }

/** Determine H2H winner key from final score */
function h2hWinner(home: number | null, away: number | null): 'home' | 'draw' | 'away' | null {
  if (home === null || away === null) return null
  if (home > away) return 'home'
  if (home < away) return 'away'
  return 'draw'
}

/** A market is H2H if its options contain home/draw/away keys */
function isH2hMarket(opts: MarketOption[]) {
  return opts.some(o => o.key === 'home') && opts.some(o => o.key === 'away')
}

export function PredictionsPanel({ match }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [markets, setMarkets] = useState<MatchMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [settleMarket, setSettleMarket] = useState<MatchMarket | null>(null)
  const [correctOption, setCorrectOption] = useState('')
  const autoSettledRef = useRef(false)

  const [form, setForm] = useState({
    market_label: '',
    market_emoji: '⚽',
    options: [
      { label: '', key: '', odds: '' },
      { label: '', key: '', odds: '' },
    ],
  })

  useEffect(() => {
    fetch(`/api/club/matches/${match.id}/markets`)
      .then(r => r.json())
      .then(data => setMarkets(data.markets ?? []))
      .finally(() => setLoading(false))
  }, [match.id])

  // Auto-settle H2H markets when match is finished
  useEffect(() => {
    if (match.status !== 'finished') return
    if (autoSettledRef.current) return
    if (markets.length === 0) return

    const winner = h2hWinner(match.home_score, match.away_score)
    if (!winner) return

    const unsettledH2h = markets.filter(m => {
      const opts = m.options as unknown as MarketOption[]
      return !m.is_settled && isH2hMarket(opts)
    })
    if (unsettledH2h.length === 0) return

    autoSettledRef.current = true

    Promise.all(unsettledH2h.map(market =>
      fetch(`/api/club/matches/${match.id}/markets/${market.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_settled: true, correct_option: winner }),
      }).then(res => {
        if (res.ok) {
          setMarkets(prev => prev.map(m =>
            m.id === market.id ? { ...m, is_settled: true, correct_option: winner, is_published: false } : m
          ))
        }
      })
    )).then(() => {
      toast('Marchés H2H réglés automatiquement — gains distribués ✓', 'success')
      router.refresh()
    })
  }, [match.status, match.home_score, match.away_score, markets, match.id, toast, router])

  function setOption(i: number, field: 'label' | 'odds', value: string) {
    setForm(f => {
      const options = [...f.options]
      const key = field === 'label' ? value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') : options[i].key
      options[i] = { ...options[i], [field]: value, key: field === 'label' ? key : options[i].key }
      return { ...f, options }
    })
  }

  async function createH2hMarket() {
    if (!match.odds_home || !match.odds_away) {
      toast('Ce match n\'a pas de cotes. Synchronise d\'abord les cotes.', 'error')
      return
    }
    setLoadingId('h2h')
    const options: MarketOption[] = [
      { key: 'home', label: match.home_team, odds: match.odds_home },
      { key: 'draw', label: 'Match nul', odds: match.odds_draw ?? 3.00 },
      { key: 'away', label: match.away_team, odds: match.odds_away },
    ]
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_key: 'h2h', market_label: '1X2 — Résultat du match', market_emoji: '🏆', options }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setMarkets(prev => [...prev, data.market])
      toast('Marché H2H créé — se règle automatiquement à la fin du match', 'success')
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoadingId(null) }
  }

  async function createCustomMarket(e: React.FormEvent) {
    e.preventDefault()
    const validOptions = form.options.filter(o => o.label.trim() && parseFloat(o.odds) > 1)
    if (validOptions.length < 2) { toast('Ajoute au moins 2 options avec une cote > 1', 'error'); return }
    setLoadingId('create')
    const options: MarketOption[] = validOptions.map((o, i) => ({
      key: o.key || `option_${i}`,
      label: o.label.trim(),
      odds: parseFloat(o.odds),
    }))
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_key: form.market_label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'custom',
          market_label: form.market_label,
          market_emoji: form.market_emoji,
          options,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setMarkets(prev => [...prev, data.market])
      toast('Marché créé !', 'success')
      setShowCreate(false)
      setForm({ market_label: '', market_emoji: '⚽', options: [{ label: '', key: '', odds: '' }, { label: '', key: '', odds: '' }] })
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoadingId(null) }
  }

  async function togglePublish(market: MatchMarket) {
    setLoadingId(market.id)
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets/${market.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !market.is_published }),
      })
      if (!res.ok) { toast('Erreur', 'error'); return }
      setMarkets(prev => prev.map(m => m.id === market.id ? { ...m, is_published: !m.is_published } : m))
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoadingId(null) }
  }

  async function settleWithOption() {
    if (!settleMarket || !correctOption) return
    setLoadingId('settle')
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets/${settleMarket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_settled: true, correct_option: correctOption }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setMarkets(prev => prev.map(m => m.id === settleMarket.id
        ? { ...m, is_settled: true, correct_option: correctOption } : m))
      toast('Marché réglé — gains distribués !', 'success')
      setSettleMarket(null)
      setCorrectOption('')
      router.refresh()
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoadingId(null) }
  }

  async function deleteMarket(marketId: string) {
    setLoadingId(marketId + '_del')
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets/${marketId}`, { method: 'DELETE' })
      if (!res.ok) { toast('Impossible de supprimer un marché publié', 'error'); return }
      setMarkets(prev => prev.filter(m => m.id !== marketId))
      toast('Marché supprimé', 'success')
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoadingId(null) }
  }

  const hasH2h = markets.some(m => {
    const opts = m.options as unknown as MarketOption[]
    return isH2hMarket(opts)
  })

  return (
    <Card variant="dark">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" /> Marchés de prédiction
        </h2>
        <div className="flex gap-2">
          {!hasH2h && match.odds_home && match.status !== 'finished' && (
            <Button size="sm" variant="secondary" onClick={createH2hMarket} disabled={loadingId === 'h2h'}>
              {loadingId === 'h2h' ? <Loader2 className="w-3 h-3 animate-spin" /> : '+ H2H'}
            </Button>
          )}
          {match.status !== 'finished' && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Nouveau
            </Button>
          )}
        </div>
      </div>

      {/* Auto-settle notice */}
      {match.status === 'finished' && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          Match terminé — les marchés H2H sont réglés automatiquement. Les marchés personnalisés nécessitent une validation manuelle.
        </div>
      )}

      {loading && <p className="text-gray-500 text-sm text-center py-4">Chargement…</p>}

      {!loading && markets.length === 0 && (
        <div className="text-center py-6">
          <TrendingUp className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Aucun marché créé</p>
          <p className="text-gray-600 text-xs mt-1">
            {match.odds_home ? 'Crée le marché H2H automatiquement ou ajoute un marché custom.' : 'Synchronise les cotes puis reviens ici.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {markets.map(market => {
          const opts = market.options as unknown as MarketOption[]
          const isH2h = isH2hMarket(opts)
          const statusLabel = market.is_settled ? 'Réglé' : market.is_published ? 'Ouvert' : 'Fermé'
          const statusColor = market.is_settled ? 'text-gray-400' : market.is_published ? 'text-emerald-400' : 'text-amber-400'
          return (
            <div key={market.id} className="p-3 rounded-xl bg-white/5 border border-white/8">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wide ${statusColor}`}>{statusLabel}</span>
                    {isH2h && !market.is_settled && match.status !== 'finished' && (
                      <span className="text-xs text-emerald-500/70 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" /> Auto à la fin
                      </span>
                    )}
                    {isH2h && market.is_settled && (
                      <span className="text-xs text-emerald-500/70 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" /> Auto-réglé
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm">{market.market_label}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {opts.map(o => (
                      <span key={o.key} className={`text-xs px-2 py-0.5 rounded-full border ${
                        market.correct_option === o.key
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                          : 'border-white/10 bg-white/5 text-gray-300'
                      }`}>
                        {o.label} <span className="text-amber-400 font-bold">×{o.odds.toFixed(2)}</span>
                      </span>
                    ))}
                  </div>
                  {market.bet_count > 0 && (
                    <p className="text-xs text-gray-600 mt-1">{market.bet_count} pari(s)</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {!market.is_settled && match.status !== 'finished' && (
                    <button
                      onClick={() => togglePublish(market)}
                      disabled={loadingId === market.id}
                      className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors flex items-center gap-1"
                    >
                      {loadingId === market.id ? <Loader2 className="w-3 h-3 animate-spin" /> : market.is_published ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {market.is_published ? 'Fermer' : 'Ouvrir'}
                    </button>
                  )}
                  {/* Manual settle only for non-H2H markets */}
                  {!market.is_settled && !isH2h && (
                    <Button size="sm" onClick={() => { setSettleMarket(market); setCorrectOption('') }}>
                      <Check className="w-3 h-3 mr-1" /> Régler
                    </Button>
                  )}
                  {!market.is_published && !market.is_settled && match.status !== 'finished' && (
                    <button
                      onClick={() => deleteMarket(market.id)}
                      disabled={!!loadingId}
                      className="text-xs px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create market modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouveau marché" size="lg">
        <form onSubmit={createCustomMarket} className="space-y-4">
          <div className="flex gap-3">
            <div className="w-20">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Emoji</label>
              <input
                value={form.market_emoji}
                onChange={e => setForm(f => ({ ...f, market_emoji: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-center text-xl focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <Input
                label="Titre du marché"
                value={form.market_label}
                onChange={e => setForm(f => ({ ...f, market_label: e.target.value }))}
                placeholder="Ex : Premier buteur"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Options</label>
            {form.options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={o.label} onChange={e => setOption(i, 'label', e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600"
                />
                <input
                  value={o.odds} onChange={e => setOption(i, 'odds', e.target.value)}
                  placeholder="Cote" type="number" step="0.01" min="1.01"
                  className="w-24 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, options: [...f.options, { label: '', key: '', odds: '' }] }))}
              className="text-xs text-emerald-400 hover:text-emerald-300 mt-1"
            >
              + Ajouter une option
            </button>
          </div>
          <Button type="submit" className="w-full" disabled={loadingId === 'create'}>
            {loadingId === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer le marché'}
          </Button>
        </form>
      </Modal>

      {/* Settle modal — custom markets only */}
      <Modal
        open={!!settleMarket}
        onClose={() => { setSettleMarket(null); setCorrectOption('') }}
        title={`Résultat : ${settleMarket?.market_label}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Sélectionne la bonne réponse pour distribuer les gains automatiquement.</p>
          <div className="space-y-2">
            {(settleMarket?.options as unknown as MarketOption[] ?? []).map(o => (
              <button
                key={o.key}
                onClick={() => setCorrectOption(o.key)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  correctOption === o.key
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <span className="font-medium">{o.label}</span>
                <span className="text-amber-400 font-bold text-sm">×{o.odds.toFixed(2)}</span>
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={!correctOption || loadingId === 'settle'}
            onClick={settleWithOption}
          >
            {loadingId === 'settle' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer et distribuer les gains'}
          </Button>
        </div>
      </Modal>
    </Card>
  )
}
