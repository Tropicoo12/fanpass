'use client'
import { useState } from 'react'
import { Plus, Trash2, Eye, EyeOff, Check, Loader2, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import type { Match, MatchMarket, MarketOption } from '@/types/database'

interface Props {
  match: Match
  initialMarkets: MatchMarket[]
}

export function TabBetting({ match, initialMarkets }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [markets, setMarkets] = useState<MatchMarket[]>(initialMarkets)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [settlingId, setSettlingId] = useState<string | null>(null)
  const [settleOption, setSettleOption] = useState<Record<string, string>>({})

  const hasH2hOdds = match.odds_home && match.odds_draw && match.odds_away
  const h2hAlreadyCreated = markets.some(m => m.market_key === 'h2h')

  async function addH2hMarket() {
    setLoadingId('h2h')
    try {
      const options: MarketOption[] = [
        { label: `${match.home_team} gagne`, odds: match.odds_home!, key: 'home' },
        { label: 'Match nul', odds: match.odds_draw!, key: 'draw' },
        { label: `${match.away_team} gagne`, odds: match.odds_away!, key: 'away' },
      ]
      const res = await fetch(`/api/club/matches/${match.id}/markets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_key: 'h2h',
          market_label: '1X2 — Résultat du match',
          market_emoji: '⚽',
          options,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setMarkets(prev => [...prev, data.market])
      toast('Marché créé !', 'success')
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  async function togglePublish(market: MatchMarket) {
    setLoadingId(market.id)
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets/${market.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !market.is_published }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setMarkets(prev => prev.map(m => m.id === market.id ? data.market : m))
      toast(market.is_published ? 'Marché dépublié' : 'Marché publié !', 'success')
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  async function settleMarket(market: MatchMarket) {
    const correct = settleOption[market.id]
    if (!correct) { toast('Sélectionne l\'option gagnante', 'error'); return }
    setSettlingId(market.id)
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets/${market.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_settled: true, correct_option: correct }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setMarkets(prev => prev.map(m => m.id === market.id ? data.market : m))
      toast('Marché réglé, points distribués !', 'success')
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setSettlingId(null)
    }
  }

  async function deleteMarket(marketId: string) {
    setLoadingId(marketId)
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets/${marketId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setMarkets(prev => prev.filter(m => m.id !== marketId))
      toast('Marché supprimé', 'success')
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  function getStatusBadge(market: MatchMarket) {
    if (market.is_settled) return <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Réglé</span>
    if (market.is_published) return <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Publié</span>
    return <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">Brouillon</span>
  }

  return (
    <div className="space-y-5">
      {/* Available odds section */}
      {hasH2hOdds && (
        <Card variant="dark">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            Marchés disponibles
          </h2>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div>
              <p className="font-semibold text-sm">⚽ 1X2 — Résultat du match</p>
              <div className="flex gap-3 mt-1.5 text-xs">
                <span>
                  <span className="text-gray-400">{match.home_team}: </span>
                  <span className="text-amber-400 font-bold">{match.odds_home?.toFixed(2)}</span>
                </span>
                <span>
                  <span className="text-gray-400">Nul: </span>
                  <span className="text-amber-400 font-bold">{match.odds_draw?.toFixed(2)}</span>
                </span>
                <span>
                  <span className="text-gray-400">{match.away_team}: </span>
                  <span className="text-amber-400 font-bold">{match.odds_away?.toFixed(2)}</span>
                </span>
              </div>
            </div>
            <Button
              size="sm"
              onClick={addH2hMarket}
              disabled={loadingId === 'h2h' || h2hAlreadyCreated}
            >
              {loadingId === 'h2h' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : h2hAlreadyCreated ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <><Plus className="w-3.5 h-3.5 mr-1" />Ajouter</>
              )}
            </Button>
          </div>
        </Card>
      )}

      {!hasH2hOdds && (
        <Card variant="dark">
          <p className="text-sm text-gray-400 text-center py-2">
            Aucune cote disponible pour ce match. Synchronise les cotes via les paramètres.
          </p>
        </Card>
      )}

      {/* Configured markets */}
      <Card variant="dark">
        <h2 className="font-bold mb-3">Marchés configurés</h2>
        {markets.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Aucun marché créé pour ce match</p>
        ) : (
          <div className="space-y-3">
            {markets.map(market => {
              const options = market.options as unknown as MarketOption[]
              const isLoading = loadingId === market.id
              const isSettling = settlingId === market.id
              return (
                <div key={market.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base">{market.market_emoji}</span>
                        <p className="font-semibold text-sm">{market.market_label}</p>
                        {getStatusBadge(market)}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{market.bet_count} pari{market.bet_count !== 1 ? 's' : ''}</span>
                        {market.closes_at && (
                          <span>Ferme {new Date(market.closes_at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {!market.is_settled && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => togglePublish(market)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : market.is_published ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}
                      {!market.is_published && !market.is_settled && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deleteMarket(market.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="flex flex-wrap gap-2">
                    {options.map(opt => (
                      <span key={opt.key} className={`text-xs px-2.5 py-1 rounded-lg border ${
                        market.correct_option === opt.key
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-gray-300'
                      }`}>
                        {opt.label} <span className="text-amber-400 font-bold">{opt.odds.toFixed(2)}</span>
                      </span>
                    ))}
                  </div>

                  {/* Settle section — show when match is finished */}
                  {match.status === 'finished' && !market.is_settled && (
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <p className="text-xs text-gray-400 font-medium">Régler le marché</p>
                      <div className="flex flex-wrap gap-2">
                        {options.map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => setSettleOption(prev => ({ ...prev, [market.id]: opt.key }))}
                            className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                              settleOption[market.id] === opt.key
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => settleMarket(market)}
                        disabled={isSettling || !settleOption[market.id]}
                      >
                        {isSettling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Distribuer les points</>}
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
