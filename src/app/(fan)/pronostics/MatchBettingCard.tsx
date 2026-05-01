'use client'
import { useState } from 'react'
import { Calendar, MapPin, Lock, QrCode, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { MarketBetCard } from './MarketBetCard'
import type { MarketOption } from '@/types/database'

interface MyBet {
  selected_option: string; odds: number; points_staked: number
  is_settled: boolean; points_won: number | null
}

interface Market {
  id: string; match_id: string; market_label: string; market_emoji: string
  options: MarketOption[]; is_settled: boolean; closes_at: string | null
  correct_option: string | null; myBet: MyBet | null
}

interface Match {
  id: string; home_team: string; away_team: string; match_date: string
  status: string; venue: string | null
  odds_home: number | null; odds_draw: number | null; odds_away: number | null
}

interface Props {
  match: Match
  isCheckedIn: boolean
  markets: Market[]
  userPoints: number
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('fr-BE', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export function MatchBettingCard({ match, isCheckedIn, markets, userPoints }: Props) {
  const [expanded, setExpanded] = useState(true)
  const isLive = match.status === 'live'
  const hasMarkets = markets.length > 0
  const activeBets = markets.filter(m => m.myBet && !m.is_settled).length

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 20,
      border: '1px solid rgba(0,0,0,0.06)',
      overflow: 'hidden',
    }}>
      {/* Match header */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', padding: '16px 16px 14px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Live badge */}
            {isLive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: 'rgba(225,0,26,0.08)', color: '#E1001A',
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 100,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#E1001A',
                    animation: 'pulse 1.5s infinite',
                    display: 'inline-block',
                  }} />
                  EN DIRECT
                </span>
              </div>
            )}

            {/* Teams */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              {/* Home */}
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: 'rgba(225,0,26,0.08)', border: '1px solid rgba(225,0,26,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: '#E1001A', margin: '0 auto 4px',
                }}>
                  {match.home_team.slice(0, 2).toUpperCase()}
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>{match.home_team}</p>
              </div>

              {/* VS + odds */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.30)', margin: '0 0 4px' }}>VS</p>
                {match.odds_home && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[
                      { label: '1', val: match.odds_home },
                      { label: 'N', val: match.odds_draw },
                      { label: '2', val: match.odds_away },
                    ].map(o => o.val && (
                      <div key={o.label} style={{
                        background: '#f5f5f7', borderRadius: 6, padding: '2px 5px', textAlign: 'center',
                      }}>
                        <p style={{ fontSize: 9, color: 'rgba(29,29,31,0.40)', margin: 0 }}>{o.label}</p>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#c8860a', margin: 0 }}>{o.val.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Away */}
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: 'rgba(29,29,31,0.55)', margin: '0 auto 4px',
                }}>
                  {match.away_team.slice(0, 2).toUpperCase()}
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>{match.away_team}</p>
              </div>
            </div>

            {/* Date + venue */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(29,29,31,0.45)' }}>
                <Calendar size={11} />
                {fmtDate(match.match_date)}
              </span>
              {match.venue && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'rgba(29,29,31,0.45)' }}>
                  <MapPin size={11} />
                  {match.venue}
                </span>
              )}
            </div>
          </div>

          {/* Expand + checkin badge */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            {isCheckedIn ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(52,199,89,0.10)', color: '#34c759',
                fontSize: 10, fontWeight: 700, padding: '4px 8px', borderRadius: 100,
                border: '1px solid rgba(52,199,89,0.20)',
              }}>
                ✓ Au stade
              </span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#f5f5f7', color: 'rgba(29,29,31,0.45)',
                fontSize: 10, fontWeight: 600, padding: '4px 8px', borderRadius: 100,
              }}>
                <Lock size={9} /> Non vérifié
              </span>
            )}
            {activeBets > 0 && (
              <span style={{
                background: 'rgba(225,0,26,0.08)', color: '#E1001A',
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
              }}>
                {activeBets} pari{activeBets > 1 ? 's' : ''}
              </span>
            )}
            {expanded
              ? <ChevronUp size={16} color="rgba(29,29,31,0.30)" />
              : <ChevronDown size={16} color="rgba(29,29,31,0.30)" />
            }
          </div>
        </div>
      </button>

      {/* Markets section */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          {!isCheckedIn ? (
            /* Stadium gate */
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <QrCode size={22} color="rgba(29,29,31,0.35)" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', margin: '0 0 4px' }}>
                Réservé aux supporters au stade
              </p>
              <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.50)', margin: '0 0 16px' }}>
                Scanne le QR code à l&apos;entrée pour débloquer les paris en cotes réelles
              </p>
              <Link
                href="/scan"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#1d1d1f', color: '#fff',
                  padding: '10px 20px', borderRadius: 12,
                  fontSize: 13, fontWeight: 700, textDecoration: 'none',
                }}
              >
                <QrCode size={14} /> Scanner mon billet
              </Link>
            </div>
          ) : !hasMarkets ? (
            /* No markets yet */
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.45)', margin: 0 }}>
                🕐 Paris bientôt disponibles
              </p>
              <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.35)', margin: '4px 0 0' }}>
                Le club publiera les marchés avant le coup d&apos;envoi
              </p>
            </div>
          ) : (
            /* Markets list */
            <div style={{ padding: '12px 12px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(29,29,31,0.40)', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 4px 10px' }}>
                {markets.length} marché{markets.length > 1 ? 's' : ''} disponible{markets.length > 1 ? 's' : ''}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {markets.map(m => (
                  <MarketBetCard key={m.id} market={m} userPoints={userPoints} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
