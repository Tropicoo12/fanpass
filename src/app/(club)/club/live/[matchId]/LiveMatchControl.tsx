'use client'
import { useState, useEffect } from 'react'
import { Zap, Plus, Play, Square, Check, Users, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import type { Match, Activation } from '@/types/database'

interface Props {
  match: Match
  activations: Activation[]
  compact?: boolean
}

const ACTIVATION_TYPES = [
  { value: 'trivia',     label: '🧠 Trivia',     desc: 'Question avec bonne réponse' },
  { value: 'poll',       label: '📊 Sondage',     desc: 'Vote sans bonne réponse'     },
  { value: 'moment',     label: '📸 Moment',      desc: 'Partage de moment fort'      },
  { value: 'prediction', label: '⚽ Pronostic live', desc: 'Prédiction en temps réel' },
]

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'text-amber-400',
  active:    'text-emerald-400',
  closed:    'text-gray-400',
}

export function LiveMatchControl({ match, activations: initialActivations, compact = false }: Props) {
  const router = useRouter()
  const { toast } = useToast()

  const [activationList, setActivationList] = useState<Activation[]>(initialActivations)
  const [creating, setCreating] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [matchStatus, setMatchStatus] = useState(match.status)
  const [updatingMatch, setUpdatingMatch] = useState(false)
  const [syncingScore, setSyncingScore] = useState(false)
  const [homeScore, setHomeScore] = useState(match.home_score ?? 0)
  const [awayScore, setAwayScore] = useState(match.away_score ?? 0)

  useEffect(() => {
    setHomeScore(match.home_score ?? 0)
    setAwayScore(match.away_score ?? 0)
  }, [match.home_score, match.away_score])

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'poll' as Activation['type'],
    options: ['', '', '', ''],
    correct_answer: '',
    points_reward: 25,
  })

  function setField(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }
  function setOption(i: number, v: string) {
    setForm(f => { const o = [...f.options]; o[i] = v; return { ...f, options: o } })
  }

  async function createActivation(e: React.FormEvent) {
    e.preventDefault()
    setLoadingId('create')
    const opts = form.options.filter(o => o.trim())
    try {
      const res = await fetch('/api/club/activations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: match.id,
          club_id: match.club_id,
          title: form.title,
          description: form.description,
          type: form.type,
          options: opts.length ? opts : null,
          correct_answer: form.type === 'trivia' ? form.correct_answer : null,
          points_reward: form.points_reward,
          status: 'scheduled',
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      toast('Activation créée !', 'success')
      setActivationList(prev => [data.activation, ...prev])
      setCreating(false)
      setForm({ title: '', description: '', type: 'poll', options: ['', '', '', ''], correct_answer: '', points_reward: 25 })
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  async function updateActivationStatus(id: string, status: 'active' | 'closed') {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/club/activations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      toast(status === 'active' ? 'Activation lancée !' : 'Activation fermée', 'success')
      setActivationList(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  async function updateMatchStatus(status: string) {
    setUpdatingMatch(true)
    try {
      const res = await fetch(`/api/club/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, home_score: homeScore, away_score: awayScore }),
      })
      if (!res.ok) { toast('Erreur', 'error'); return }
      setMatchStatus(status as any)
      toast(`Match mis à jour : ${status}`, 'success')
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setUpdatingMatch(false)
    }
  }

  async function syncScoreFromApi() {
    setSyncingScore(true)
    try {
      const res = await fetch(`/api/club/matches/${match.id}/sync-score`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur sync', 'error'); return }
      setHomeScore(data.home_score)
      setAwayScore(data.away_score)
      toast(`Score synchronisé : ${data.home_score} – ${data.away_score}`, 'success')
      router.refresh()
    } catch { toast('Erreur réseau', 'error') }
    finally { setSyncingScore(false) }
  }

  if (compact) {
    const scoreDirty = homeScore !== (match.home_score ?? 0) || awayScore !== (match.away_score ?? 0)

    return (
      <Card variant="dark">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">Contrôle du match</h2>
          {matchStatus === 'live' && (
            <Button variant="danger" size="sm" onClick={() => updateMatchStatus('finished')} disabled={updatingMatch}>
              {updatingMatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 mr-1.5" />}
              Terminer
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3">
          {matchStatus === 'upcoming' && (
            <Button onClick={() => updateMatchStatus('live')} disabled={updatingMatch} variant="primary">
              {updatingMatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Démarrer le match
            </Button>
          )}
          {matchStatus === 'live' && (
            <div className="flex items-center gap-3">
              {/* Score stepper */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl border border-gray-200 px-3 py-2 flex-1">
                {/* Home */}
                <div className="flex items-center gap-1.5 flex-1 justify-center">
                  <button type="button" onClick={() => setHomeScore(s => Math.max(0, s - 1))}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm flex items-center justify-center">−</button>
                  <span className="text-2xl font-black text-gray-900 w-8 text-center">{homeScore}</span>
                  <button type="button" onClick={() => setHomeScore(s => s + 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm flex items-center justify-center">+</button>
                </div>
                <span className="text-gray-400 font-black text-xl">–</span>
                {/* Away */}
                <div className="flex items-center gap-1.5 flex-1 justify-center">
                  <button type="button" onClick={() => setAwayScore(s => Math.max(0, s - 1))}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm flex items-center justify-center">−</button>
                  <span className="text-2xl font-black text-gray-900 w-8 text-center">{awayScore}</span>
                  <button type="button" onClick={() => setAwayScore(s => s + 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-sm flex items-center justify-center">+</button>
                </div>
              </div>
              {/* Save button — highlighted when dirty */}
              <Button
                variant={scoreDirty ? 'primary' : 'secondary'}
                onClick={() => updateMatchStatus('live')}
                disabled={updatingMatch || !scoreDirty}
                className="shrink-0"
              >
                {updatingMatch ? <Loader2 className="w-4 h-4 animate-spin" /> : scoreDirty ? '💾 Sauvegarder' : '✓ Sauvegardé'}
              </Button>
              {(match as any).external_id && (
                <button
                  type="button"
                  onClick={syncScoreFromApi}
                  disabled={syncingScore}
                  title="Synchroniser le score depuis l'API"
                  className="shrink-0 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 text-sm font-semibold hover:bg-blue-100 transition-colors disabled:opacity-50"
                >
                  {syncingScore ? '⏳' : '🔄 Sync'}
                </button>
              )}
            </div>
          )}
          {matchStatus === 'finished' && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
              <Check className="w-4 h-4" />
              <span className="text-sm font-semibold">Match terminé · Score final : {homeScore} – {awayScore}</span>
            </div>
          )}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Match control */}
      <Card variant="dark">
        <h2 className="font-bold mb-4">Contrôle du match</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {matchStatus === 'upcoming' && (
            <Button onClick={() => updateMatchStatus('live')} disabled={updatingMatch} variant="primary">
              {updatingMatch ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Démarrer le match
            </Button>
          )}
          {matchStatus === 'live' && (
            <>
              <div className="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-xl border border-gray-200">
                <input type="number" min={0} max={20} value={homeScore} onChange={e => setHomeScore(+e.target.value)}
                  className="w-10 text-center text-xl font-black bg-transparent focus:outline-none text-gray-900" />
                <span className="text-gray-500 font-black">–</span>
                <input type="number" min={0} max={20} value={awayScore} onChange={e => setAwayScore(+e.target.value)}
                  className="w-10 text-center text-xl font-black bg-transparent focus:outline-none text-gray-900" />
              </div>
              <Button variant="secondary" onClick={() => updateMatchStatus('live')} disabled={updatingMatch}>
                Sauvegarder score
              </Button>
              <Button variant="danger" onClick={() => updateMatchStatus('finished')} disabled={updatingMatch}>
                <Square className="w-4 h-4 mr-2" /> Terminer
              </Button>
            </>
          )}
          {matchStatus === 'finished' && (
            <div className="flex items-center gap-2 text-emerald-400">
              <Check className="w-4 h-4" />
              <span className="text-sm font-semibold">Match terminé · Score final : {homeScore} – {awayScore}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Activations */}
      <Card variant="dark">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" /> Activations
          </h2>
          <Button onClick={() => setCreating(true)} size="sm">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Nouvelle
          </Button>
        </div>

        {activationList.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-4">Aucune activation créée</p>
        )}

        <div className="space-y-3">
          {activationList.map(act => (
            <div key={act.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-wide ${STATUS_COLORS[act.status]}`}>
                    {act.status}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{act.type}</span>
                </div>
                <p className="font-medium text-sm mt-0.5">{act.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{act.response_count}</span>
                  <span>+{act.points_reward} pts</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {act.status === 'scheduled' && (
                  <Button size="sm" onClick={() => updateActivationStatus(act.id, 'active')} disabled={loadingId === act.id}>
                    {loadingId === act.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  </Button>
                )}
                {act.status === 'active' && (
                  <Button size="sm" variant="danger" onClick={() => updateActivationStatus(act.id, 'closed')} disabled={loadingId === act.id}>
                    {loadingId === act.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Create activation modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Nouvelle activation" size="lg">
        <form onSubmit={createActivation} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {ACTIVATION_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setField('type', t.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  form.type === t.value
                    ? 'border-emerald-500 bg-emerald-500/15'
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>

          <Input label="Titre *" value={form.title} onChange={e => setField('title', e.target.value)} required />
          <Input label="Description (optionnel)" value={form.description} onChange={e => setField('description', e.target.value)} />

          {(form.type === 'poll' || form.type === 'trivia') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Options de réponse</label>
              {form.options.map((opt, i) => (
                <input
                  key={i}
                  value={opt}
                  onChange={e => setOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400"
                />
              ))}
            </div>
          )}

          {form.type === 'trivia' && (
            <Input label="Bonne réponse" value={form.correct_answer} onChange={e => setField('correct_answer', e.target.value)} placeholder="Doit correspondre à une option" />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Points récompense</label>
            <input type="number" min={0} value={form.points_reward} onChange={e => setField('points_reward', +e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400" />
          </div>

          <Button type="submit" disabled={loadingId === 'create'} className="w-full">
            {loadingId === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer l\'activation'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
