'use client'

import { useState } from 'react'
import { Check, Gift, Loader2, Play, Square, Target, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import type { Activation, Match, MatchMarket } from '@/types/database'
import { TabBetting } from './TabBetting'
import { TabLiveActivations } from './TabLiveActivations'
import { TabFreeActivations } from './TabFreeActivations'

type TabId = 'betting' | 'live' | 'free'

interface Props {
  match: Match
  activations: Activation[]
  markets: MatchMarket[]
  checkinCount: number
  pronoCount: number
}

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'betting', label: 'Paris pré-match', icon: Target },
  { id: 'live', label: 'Live activations', icon: Zap },
  { id: 'free', label: 'Activations libres', icon: Gift },
]

export function MatchTabs({ match, activations, markets, checkinCount, pronoCount }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<TabId>('betting')
  const [marketList, setMarketList] = useState(markets)
  const [matchStatus, setMatchStatus] = useState(match.status)
  const [homeScore, setHomeScore] = useState(match.home_score ?? 0)
  const [awayScore, setAwayScore] = useState(match.away_score ?? 0)
  const [updatingMatch, setUpdatingMatch] = useState(false)

  function upsertMarket(nextMarket: MatchMarket) {
    setMarketList(prev => {
      const exists = prev.some(market => market.id === nextMarket.id)
      return exists
        ? prev.map(market => market.id === nextMarket.id ? nextMarket : market)
        : [nextMarket, ...prev]
    })
    router.refresh()
  }

  function removeMarket(marketId: string) {
    setMarketList(prev => prev.filter(market => market.id !== marketId))
    router.refresh()
  }

  async function updateMatchStatus(status: Match['status']) {
    setUpdatingMatch(true)
    try {
      const res = await fetch(`/api/club/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, home_score: homeScore, away_score: awayScore }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast(data.error ?? 'Erreur match', 'error')
        return
      }
      setMatchStatus(status)
      toast(status === 'live' ? 'Match démarré' : status === 'finished' ? 'Match terminé' : 'Match mis à jour', 'success')
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setUpdatingMatch(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Check-ins', value: checkinCount.toString() },
          { label: 'Pronostics', value: pronoCount.toString() },
          { label: 'Marchés', value: marketList.length.toString() },
        ].map(stat => (
          <Card key={stat.label} variant="dark" className="text-center">
            <p className="text-xl font-black">{stat.value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{stat.label}</p>
          </Card>
        ))}
      </div>

      <Card variant="dark" className="space-y-4 border border-white/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Contrôle du match</h2>
            <p className="mt-1 text-xs text-gray-500">Score, statut et clôture des pronostics classiques</p>
          </div>
          <Badge variant={matchStatus === 'live' ? 'success' : matchStatus === 'upcoming' ? 'info' : 'neutral'}>
            {matchStatus === 'live' ? 'En direct' : matchStatus === 'upcoming' ? 'À venir' : 'Terminé'}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {matchStatus === 'upcoming' && (
            <Button type="button" onClick={() => updateMatchStatus('live')} disabled={updatingMatch}>
              {updatingMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Démarrer
            </Button>
          )}

          {matchStatus === 'live' && (
            <>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={homeScore}
                  onChange={event => setHomeScore(Number(event.target.value))}
                  className="w-12 bg-transparent text-center text-xl font-black focus:outline-none"
                  aria-label="Score domicile"
                />
                <span className="font-black text-gray-500">-</span>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={awayScore}
                  onChange={event => setAwayScore(Number(event.target.value))}
                  className="w-12 bg-transparent text-center text-xl font-black focus:outline-none"
                  aria-label="Score extérieur"
                />
              </div>
              <Button type="button" variant="secondary" onClick={() => updateMatchStatus('live')} disabled={updatingMatch}>
                Sauvegarder score
              </Button>
              <Button type="button" variant="danger" onClick={() => updateMatchStatus('finished')} disabled={updatingMatch}>
                <Square className="mr-2 h-4 w-4" />
                Terminer
              </Button>
            </>
          )}

          {matchStatus === 'finished' && (
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
              <Check className="h-4 w-4" />
              Score final : {homeScore} - {awayScore}
            </div>
          )}
        </div>
      </Card>

      <div className="overflow-x-auto scrollbar-none">
        <div className="flex min-w-max gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`live-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  active ? 'bg-emerald-500 text-white' : 'text-gray-300 hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div data-testid={`live-tab-panel-${activeTab}`}>
        {activeTab === 'betting' && (
          <TabBetting
            match={match}
            markets={marketList.filter(market => market.market_key === 'h2h')}
            onMarketCreated={upsertMarket}
            onMarketUpdated={upsertMarket}
            onMarketDeleted={removeMarket}
          />
        )}
        {activeTab === 'live' && (
          <TabLiveActivations
            match={match}
            markets={marketList.filter(market => market.market_key === 'live_bet')}
            onMarketCreated={upsertMarket}
            onMarketUpdated={upsertMarket}
            onMarketDeleted={removeMarket}
          />
        )}
        {activeTab === 'free' && (
          <TabFreeActivations match={match} activations={activations} />
        )}
      </div>
    </div>
  )
}
