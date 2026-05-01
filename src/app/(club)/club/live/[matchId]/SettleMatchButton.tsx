'use client'
import { useState } from 'react'
import { CheckCircle, Loader2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import type { Match } from '@/types/database'

interface Props {
  match: Match
  pronoCount: number
}

export function SettleMatchButton({ match, pronoCount }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [loading, setLoading] = useState(false)

  if (match.status === 'finished') {
    return (
      <div
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
        style={{ background: 'rgba(52,199,89,0.08)', color: '#34c759' }}
      >
        <CheckCircle className="w-4 h-4" />
        Terminé — {match.home_score}-{match.away_score}
      </div>
    )
  }

  async function handleSettle() {
    const h = parseInt(homeScore)
    const a = parseInt(awayScore)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      toast('Score invalide', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/club/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'finished', home_score: h, away_score: a }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      toast(`Match terminé ! ${pronoCount} pronostic${pronoCount !== 1 ? 's' : ''} réglé${pronoCount !== 1 ? 's' : ''}.`, 'success')
      setOpen(false)
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        style={{ background: '#1d1d1f', color: '#ffffff' }}
      >
        <Trophy className="w-3.5 h-3.5 mr-1.5" />
        Terminer le match
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)' }}
          >
            <div>
              <h2 className="text-lg font-black" style={{ color: '#1d1d1f' }}>Terminer le match</h2>
              <p className="text-sm mt-1" style={{ color: 'rgba(29,29,31,0.55)' }}>
                Saisis le score final. Les pronostics ({pronoCount}) seront réglés automatiquement.
              </p>
            </div>

            {/* Score inputs */}
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center">
                <p className="text-xs font-medium mb-1.5" style={{ color: 'rgba(29,29,31,0.55)' }}>
                  {match.home_team}
                </p>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  placeholder="0"
                  className="w-full text-center text-3xl font-black rounded-xl py-3 outline-none"
                  style={{
                    background: '#f5f5f7',
                    border: '1px solid rgba(0,0,0,0.08)',
                    color: '#1d1d1f',
                  }}
                />
              </div>

              <span className="text-2xl font-black" style={{ color: 'rgba(29,29,31,0.30)' }}>—</span>

              <div className="flex-1 text-center">
                <p className="text-xs font-medium mb-1.5" style={{ color: 'rgba(29,29,31,0.55)' }}>
                  {match.away_team}
                </p>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  placeholder="0"
                  className="w-full text-center text-3xl font-black rounded-xl py-3 outline-none"
                  style={{
                    background: '#f5f5f7',
                    border: '1px solid rgba(0,0,0,0.08)',
                    color: '#1d1d1f',
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{
                  background: 'rgba(0,0,0,0.04)',
                  color: 'rgba(29,29,31,0.70)',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSettle}
                disabled={loading || homeScore === '' || awayScore === ''}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                style={{ background: '#1d1d1f', color: '#ffffff' }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Confirmer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
