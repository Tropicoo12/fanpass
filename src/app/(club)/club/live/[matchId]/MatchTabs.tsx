'use client'
import { useState } from 'react'
import type { Match, Activation, MatchMarket } from '@/types/database'
import { TabBetting } from './TabBetting'
import { TabLiveActivations } from './TabLiveActivations'
import { TabFreeActivations } from './TabFreeActivations'
import { LiveMatchControl } from './LiveMatchControl'

interface Props {
  match: Match
  activations: Activation[]
  markets: MatchMarket[]
}

const TABS = [
  { id: 'betting',    label: '⚽ Paris pré-match' },
  { id: 'live',       label: '⚡ Live activations' },
  { id: 'free',       label: '🎁 Activations libres' },
] as const

type TabId = typeof TABS[number]['id']

export function MatchTabs({ match, activations, markets }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('betting')

  const liveMarkets = markets.filter(m => m.market_key === 'live_bet')
  const freeActivations = activations.filter(a => a.type !== 'prediction')

  return (
    <div className="space-y-4">
      {/* Match control strip — always visible */}
      <LiveMatchControl match={match} activations={activations} compact />

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/5">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'betting' && (
        <TabBetting match={match} initialMarkets={markets} />
      )}
      {activeTab === 'live' && (
        <TabLiveActivations match={match} liveMarkets={liveMarkets} />
      )}
      {activeTab === 'free' && (
        <TabFreeActivations match={match} activations={freeActivations} />
      )}
    </div>
  )
}
