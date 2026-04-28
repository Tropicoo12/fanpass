'use client'

import { useMemo, useState } from 'react'
import { Loader2, Save, Target } from 'lucide-react'
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

function parseOdds(value: string) {
  const numeric = Number(value.replace(',', '.'))
  return Number.isFinite(numeric) && numeric > 1 ? Number(numeric.toFixed(2)) : null
}

export function TabBetting({ match, markets, onMarketCreated, onMarketUpdated, onMarketDeleted }: Props) {
  const { toast } = useToast()
  const [savingOdds, setSavingOdds] = useState(false)
  const [creatingMarket, setCreatingMarket] = useState(false)
  const [odds, setOdds] = useState({
    home: match.odds_home?.toString() ?? '',
    draw: match.odds_draw?.toString() ?? '',
    away: match.odds_away?.toString() ?? '',
  })

  const parsedOdds = useMemo(() => ({
    home: parseOdds(odds.home),
    draw: parseOdds(odds.draw),
    away: parseOdds(odds.away),
  }), [odds])

  const oddsAreValid = parsedOdds.home !== null && parsedOdds.draw !== null && parsedOdds.away !== null

  function setOdd(key: keyof typeof odds, value: string) {
    setOdds(prev => ({ ...prev, [key]: value }))
  }

  async function saveOdds() {
    if (!oddsAreValid) {
      toast('Renseigne les 3 cotes avec une valeur supérieure à 1', 'error')
      return
    }

    setSavingOdds(true)
    try {
      const res = await fetch(`/api/club/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          odds_home: parsedOdds.home,
          odds_draw: parsedOdds.draw,
          odds_away: parsedOdds.away,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast(data.error ?? 'Erreur cotes', 'error')
        return
      }
      toast('Cotes sauvegardées', 'success')
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setSavingOdds(false)
    }
  }

  async function createH2HMarket() {
    if (!oddsAreValid) {
      toast('Sauvegarde des cotes valides avant de créer le marché', 'error')
      return
    }

    setCreatingMarket(true)
    try {
      const res = await fetch(`/api/club/matches/${match.id}/markets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_key: 'h2h',
          market_label: `${match.home_team} / Nul / ${match.away_team}`,
          market_emoji: '⚽',
          options: [
            { key: 'home', label: match.home_team, odds: parsedOdds.home },
            { key: 'draw', label: 'Nul', odds: parsedOdds.draw },
            { key: 'away', label: match.away_team, odds: parsedOdds.away },
          ],
          is_published: false,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast(data.error ?? 'Création impossible', 'error')
        return
      }
      onMarketCreated(data.market)
      toast('Marché créé', 'success')
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setCreatingMarket(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card variant="dark" className="space-y-4 border border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <Target className="h-4 w-4 text-emerald-400" />
              Paris pré-match
            </h2>
            <p className="mt-1 text-xs text-gray-500">Marché principal en 1N2</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input
            label={match.home_team}
            inputMode="decimal"
            value={odds.home}
            onChange={event => setOdd('home', event.target.value)}
            placeholder="1.80"
          />
          <Input
            label="Nul"
            inputMode="decimal"
            value={odds.draw}
            onChange={event => setOdd('draw', event.target.value)}
            placeholder="3.20"
          />
          <Input
            label={match.away_team}
            inputMode="decimal"
            value={odds.away}
            onChange={event => setOdd('away', event.target.value)}
            placeholder="2.40"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button type="button" variant="secondary" onClick={saveOdds} disabled={savingOdds}>
            {savingOdds ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Sauvegarder les cotes
          </Button>
          <Button type="button" onClick={createH2HMarket} disabled={creatingMarket || !oddsAreValid}>
            {creatingMarket ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="mr-2 h-4 w-4" />}
            Créer marché
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-300">Marchés pré-match</h3>
        {markets.length === 0 ? (
          <Card variant="dark" className="border border-white/5 py-8 text-center">
            <p className="text-sm text-gray-500">Aucun marché pré-match</p>
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
