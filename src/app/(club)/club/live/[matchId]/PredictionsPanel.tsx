'use client'
import { useState, useEffect } from 'react'
import { TrendingUp, Plus, Play, Square, Check, Trash2, Loader2, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import type { Match, MatchMarket, MarketOption } from '@/types/database'

interface Props { match: Match }

const STATUS_LABELS: Record<string, string> = {
  open: 'Ouvert',
  closed: 'Fermé',
  settled: 'Réglé',
}
const STATUS_COLORS: Record<string, string> = {
  open: 'text-emerald-400',
  closed: 'text-amber-400',
  settled: 'text-gray-400',
}

export function PredictionsPanel({ match }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [markets, setMarkets] = useState<MatchMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [settleMarket, setSettleMarket] = useState<MatchMarket | null>(null)
  const [correctAnswer, setCorrectAnswer] = useState('')

  const [form, setForm] = useState({
    title: '',
    market_type: 'goalscorer',
    min_bet: 25,
    max_bet: 500,
    players: [
      { name: '', odds: '' },
      { name: '', odds: '' },
    ],
  })

  useEffect(() => {
    fetch(`/api/club/matches/${match.id}/markets`)
      .then(r => r.json())
      .then(setMarkets)
      .finally(() => setLoading(false))
  }, [match.id])

  function setPlayer(i: number, field: 'name' | 'odds', value: string) {
    setForm(f => {
      const players = [...f.players]
      players[i] = { ...players[i], [field]: value }
      return { ...f, players }
    })
  }

  async function createH2hMarket() {
    if (!match.odds_home || !match.odds_away) {
      toast('Ce match n\'a pas de cotes. Synchronise d\'abord les cotes.', 'error')
      return
    }
    setLoadingId('h2h')
    const options: MarketOption[] = [
      { name: match.home_team, odds: match.odds_home },
      { name: 'Match nul', odds: match.odds_draw ?? 3.00 },
      { name: match.away_team, odds: match.odds_away },
    ]
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Vainqueur du match', market_type: 'h2h', options, min_bet: 25, max_bet: 500 }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setMarkets(prev => [...prev, data])
      toast('Marché H2H créé !', 'success')
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoadingId(null) }
  }

  async function createCustomMarket(e: React.FormEvent) {
    e.preventDefault()
    const validPlayers = form.players.filter(p => p.name.trim() && parseFloat(p.odds) > 1)
    if (validPlayers.length < 2) { toast('Ajoute au moins 2 joueurs avec une cote > 1', 'error'); return }
    setLoadingId('create')
    const options: MarketOption[] = validPlayers.map(p => ({ name: p.name.trim(), odds: parseFloat(p.odds) }))
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title, market_type: form.market_type, options, min_bet: form.min_bet, max_bet: form.max_bet }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setMarkets(prev => [...prev, data])
      toast('Marché créé !', 'success')
      setShowCreate(false)
      setForm({ title: '', market_type: 'goalscorer', min_bet: 25, max_bet: 500, players: [{ name: '', odds: '' }, { name: '', odds: '' }] })
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoadingId(null) }
  }

  async function toggleActive(market: MatchMarket) {
    setLoadingId(market.id)
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets/${market.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !market.is_active }),
      })
      if (!res.ok) { toast('Erreur', 'error'); return }
      setMarkets(prev => prev.map(m => m.id === market.id ? { ...m, is_active: !m.is_active } : m))
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoadingId(null) }
  }

  async function closeMarket(market: MatchMarket) {
    setLoadingId(market.id + '_close')
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets/${market.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      if (!res.ok) { toast('Erreur', 'error'); return }
      setMarkets(prev => prev.map(m => m.id === market.id ? { ...m, status: 'closed' } : m))
      toast('Marché fermé aux nouvelles mises', 'success')
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoadingId(null) }
  }

  async function settleWithAnswer() {
    if (!settleMarket || !correctAnswer) return
    setLoadingId('settle')
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets/${settleMarket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'settled', correct_answer: correctAnswer }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setMarkets(prev => prev.map(m => m.id === settleMarket.id ? { ...m, status: 'settled', correct_answer: correctAnswer } : m))
      toast(`Réglé ! ${data.settled ?? 0} pari(s) traité(s)`, 'success')
      setSettleMarket(null)
      setCorrectAnswer('')
      router.refresh()
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoadingId(null) }
  }

  async function deleteMarket(marketId: string) {
    setLoadingId(marketId + '_del')
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets/${marketId}`, { method: 'DELETE' })
      if (!res.ok) { toast('Erreur', 'error'); return }
      setMarkets(prev => prev.filter(m => m.id !== marketId))
      toast('Marché supprimé', 'success')
    } catch { toast('Erreur réseau', 'error') }
    finally { setLoadingId(null) }
  }

  const hasH2h = markets.some(m => m.market_type === 'h2h')

  return (
    <Card variant="dark">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" /> Marchés de prédiction
        </h2>
        <div className="flex gap-2">
          {!hasH2h && match.odds_home && (
            <Button size="sm" variant="secondary" onClick={createH2hMarket} disabled={loadingId === 'h2h'}>
              {loadingId === 'h2h' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              + H2H
            </Button>
          )}
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Nouveau
          </Button>
        </div>
      </div>

      {loading && <p className="text-gray-500 text-sm text-center py-4">Chargement…</p>}

      {!loading && markets.length === 0 && (
        <div className="text-center py-6">
          <TrendingUp className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Aucun marché créé</p>
          <p className="text-gray-600 text-xs mt-1">
            {match.odds_home ? 'Crée le marché H2H automatiquement ou ajoute un premier buteur.' : 'Synchronise les cotes puis reviens ici.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {markets.map(market => {
          const opts = market.options as MarketOption[]
          return (
            <div key={market.id} className="p-3 rounded-xl bg-white/5 border border-white/8">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wide ${STATUS_COLORS[market.status]}`}>
                      {STATUS_LABELS[market.status]}
                    </span>
                    <span className="text-xs text-gray-500">{market.market_type}</span>
                    {!market.is_active && market.status === 'open' && (
                      <span className="text-xs text-gray-600 italic">masqué</span>
                    )}
                  </div>
                  <p className="font-semibold text-sm">{market.title}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    {opts.map(o => (
                      <span key={o.name} className={`text-xs px-2 py-0.5 rounded-full border ${
                        market.correct_answer === o.name
                          ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400'
                          : 'border-white/10 bg-white/5 text-gray-300'
                      }`}>
                        {o.name} <span className="text-amber-400 font-bold">x{o.odds.toFixed(2)}</span>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Mise : {market.min_bet}–{market.max_bet} pts
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {market.status === 'open' && (
                    <>
                      <button
                        onClick={() => toggleActive(market)}
                        disabled={loadingId === market.id}
                        className="text-xs px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
                      >
                        {market.is_active ? 'Masquer' : 'Afficher'}
                      </button>
                      <Button size="sm" variant="danger" onClick={() => closeMarket(market)} disabled={!!loadingId}>
                        {loadingId === market.id + '_close' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                      </Button>
                    </>
                  )}
                  {market.status === 'closed' && (
                    <Button size="sm" onClick={() => { setSettleMarket(market); setCorrectAnswer('') }}>
                      <Check className="w-3 h-3 mr-1" /> Régler
                    </Button>
                  )}
                  {market.status === 'open' && (
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
          <Input
            label="Titre du marché"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Ex : Premier buteur"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Mise min (pts)</label>
              <input
                type="number" min={1} value={form.min_bet}
                onChange={e => setForm(f => ({ ...f, min_bet: +e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Mise max (pts)</label>
              <input
                type="number" min={1} value={form.max_bet}
                onChange={e => setForm(f => ({ ...f, max_bet: +e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Options (joueurs/équipes)</label>
            {form.players.map((p, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={p.name} onChange={e => setPlayer(i, 'name', e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600"
                />
                <input
                  value={p.odds} onChange={e => setPlayer(i, 'odds', e.target.value)}
                  placeholder="Cote ex. 3.50" type="number" step="0.01" min="1.01"
                  className="w-28 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, players: [...f.players, { name: '', odds: '' }] }))}
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

      {/* Settle modal */}
      <Modal
        open={!!settleMarket}
        onClose={() => { setSettleMarket(null); setCorrectAnswer('') }}
        title={`Régler : ${settleMarket?.title}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Sélectionne la bonne réponse pour distribuer les gains.</p>
          <div className="space-y-2">
            {(settleMarket?.options as MarketOption[] ?? []).map(o => (
              <button
                key={o.name}
                onClick={() => setCorrectAnswer(o.name)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  correctAnswer === o.name
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                <span className="font-medium">{o.name}</span>
                <span className="text-amber-400 font-bold text-sm">x{o.odds.toFixed(2)}</span>
              </button>
            ))}
          </div>
          <Button
            className="w-full"
            disabled={!correctAnswer || loadingId === 'settle'}
            onClick={settleWithAnswer}
          >
            {loadingId === 'settle' ? <Loader2 className="w-4 h-4 animate-spin" /> : `Confirmer : ${correctAnswer || '…'}`}
          </Button>
        </div>
      </Modal>
    </Card>
  )
}
