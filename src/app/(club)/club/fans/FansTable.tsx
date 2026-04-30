'use client'
import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getLoyaltyLevel, LOYALTY_CONFIG } from '@/types/database'
import type { LeaderboardEntry } from '@/types/database'

interface Props {
  fans: LeaderboardEntry[]
  checkinsByUser: Record<string, number>
  lastActivityByUser: Record<string, string>
}

const LEVEL_FILTERS = [
  { value: -1, label: 'Tous' },
  { value: 0,  label: 'Bronze'   },
  { value: 1,  label: 'Silver'   },
  { value: 2,  label: 'Gold'     },
  { value: 3,  label: 'Platinum' },
  { value: 4,  label: 'Diamond'  },
]

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short' }).format(new Date(iso))
}

export function FansTable({ fans, checkinsByUser, lastActivityByUser }: Props) {
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState(-1)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return fans.filter(fan => {
      const level = getLoyaltyLevel(fan.total_points ?? 0)
      if (levelFilter !== -1 && level !== levelFilter) return false
      if (!q) return true
      return (
        (fan.full_name ?? '').toLowerCase().includes(q) ||
        (fan.username ?? '').toLowerCase().includes(q)
      )
    })
  }, [fans, search, levelFilter])

  return (
    <div className="space-y-4">
      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(29,29,31,0.35)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un fan…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2"
            style={{
              background: '#f5f5f7',
              border: '1px solid rgba(0,0,0,0.08)',
              color: '#1d1d1f',
              outlineColor: '#E1001A',
            }}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {LEVEL_FILTERS.map(lf => {
            const cfg = lf.value >= 0 ? LOYALTY_CONFIG[lf.value as 0] : null
            const active = levelFilter === lf.value
            return (
              <button
                key={lf.value}
                onClick={() => setLevelFilter(lf.value)}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={
                  active && cfg
                    ? { border: `1px solid ${cfg.color}80`, background: cfg.color + '18', color: cfg.color }
                    : active
                    ? { border: '1px solid rgba(0,0,0,0.15)', background: 'rgba(0,0,0,0.06)', color: '#1d1d1f' }
                    : { border: '1px solid rgba(0,0,0,0.08)', background: '#f5f5f7', color: 'rgba(29,29,31,0.55)' }
                }
              >
                {lf.label}
              </button>
            )
          })}
        </div>
      </div>

      <p className="text-xs" style={{ color: 'rgba(29,29,31,0.45)' }}>{filtered.length} fan{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <Card variant="dark" className="text-center py-10">
          <Search className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(29,29,31,0.25)' }} />
          <p className="text-sm" style={{ color: 'rgba(29,29,31,0.45)' }}>Aucun fan ne correspond à ta recherche</p>
        </Card>
      ) : (
        <Card variant="dark">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <th className="pb-3 font-medium" style={{ color: 'rgba(29,29,31,0.45)' }}>#</th>
                  <th className="pb-3 font-medium" style={{ color: 'rgba(29,29,31,0.45)' }}>Fan</th>
                  <th className="pb-3 font-medium hidden sm:table-cell" style={{ color: 'rgba(29,29,31,0.45)' }}>Niveau</th>
                  <th className="pb-3 font-medium" style={{ color: 'rgba(29,29,31,0.45)' }}>Matchs</th>
                  <th className="pb-3 font-medium" style={{ color: 'rgba(29,29,31,0.45)' }}>Points</th>
                  <th className="pb-3 font-medium hidden md:table-cell" style={{ color: 'rgba(29,29,31,0.45)' }}>Saison</th>
                  <th className="pb-3 font-medium hidden lg:table-cell" style={{ color: 'rgba(29,29,31,0.45)' }}>Dernière activité</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((fan, i) => {
                  const level = getLoyaltyLevel(fan.total_points ?? 0)
                  const levelCfg = LOYALTY_CONFIG[level]
                  const checks = checkinsByUser[fan.user_id] ?? 0
                  const lastActivity = lastActivityByUser[fan.user_id]
                  const churnRisk = (fan.total_points ?? 0) < 200 && checks === 0

                  return (
                    <tr key={fan.user_id} className="transition-colors" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                      <td className="py-3 text-xs" style={{ color: 'rgba(29,29,31,0.35)' }}>{i + 1}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-black shrink-0 text-white">
                            {(fan.full_name ?? fan.username ?? '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium truncate max-w-[120px]" style={{ color: '#1d1d1f' }}>{fan.full_name ?? fan.username ?? 'Anonyme'}</p>
                            {churnRisk && <p className="text-[10px]" style={{ color: '#E1001A' }}>Risque churn</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 hidden sm:table-cell">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: levelCfg.color, background: levelCfg.color + '20' }}>
                          {levelCfg.name}
                        </span>
                      </td>
                      <td className="py-3">
                        <Badge variant="info">{checks}</Badge>
                      </td>
                      <td className="py-3 font-black" style={{ color: '#E1001A' }}>{(fan.total_points ?? 0).toLocaleString('fr-BE')}</td>
                      <td className="py-3 hidden md:table-cell" style={{ color: 'rgba(29,29,31,0.55)' }}>{(fan.season_points ?? 0).toLocaleString('fr-BE')}</td>
                      <td className="py-3 text-xs hidden lg:table-cell" style={{ color: 'rgba(29,29,31,0.40)' }}>{lastActivity ? fmtDate(lastActivity) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
