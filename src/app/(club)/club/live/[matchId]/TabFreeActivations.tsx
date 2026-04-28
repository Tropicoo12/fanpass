'use client'

import { useState } from 'react'
import { Gift, Loader2, Plus, Play, Square, Users } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import type { Activation, Match } from '@/types/database'

interface Props {
  match: Match
  activations: Activation[]
}

type ActivationDraft = {
  title: string
  description: string
  type: Activation['type']
  options: string[]
  correct_answer: string
  points_reward: number
}

const STATUS_COLORS: Record<Activation['status'], string> = {
  scheduled: 'text-amber-400',
  active: 'text-emerald-400',
  closed: 'text-gray-400',
}

const STATUS_LABELS: Record<Activation['status'], string> = {
  scheduled: 'Programmée',
  active: 'Active',
  closed: 'Fermée',
}

const TEMPLATES: ActivationDraft[] = [
  {
    title: 'Vote MVP',
    description: 'Question rapide pour le public',
    type: 'poll',
    options: ['Joueur 1', 'Joueur 2', 'Joueur 3'],
    correct_answer: '',
    points_reward: 15,
  },
  {
    title: 'Trivia mi-temps',
    description: 'Question de culture club',
    type: 'trivia',
    options: ['Option A', 'Option B', 'Option C'],
    correct_answer: 'Option A',
    points_reward: 25,
  },
  {
    title: 'Moment fort',
    description: 'Reaction fan pendant le match',
    type: 'moment',
    options: [],
    correct_answer: '',
    points_reward: 10,
  },
  {
    title: 'Prediction live',
    description: 'Question sans mise de points',
    type: 'prediction',
    options: ['Oui', 'Non'],
    correct_answer: '',
    points_reward: 20,
  },
]

const EMPTY_FORM: ActivationDraft = {
  title: '',
  description: '',
  type: 'poll',
  options: ['', '', '', ''],
  correct_answer: '',
  points_reward: 25,
}

export function TabFreeActivations({ match, activations }: Props) {
  const { toast } = useToast()
  const [activationList, setActivationList] = useState(activations)
  const [creating, setCreating] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [form, setForm] = useState<ActivationDraft>(EMPTY_FORM)

  function setField<K extends keyof ActivationDraft>(key: K, value: ActivationDraft[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function setOption(index: number, value: string) {
    setForm(prev => ({
      ...prev,
      options: prev.options.map((option, i) => i === index ? value : option),
    }))
  }

  async function createActivation(draft: ActivationDraft) {
    const options = draft.options.map(option => option.trim()).filter(Boolean)
    setLoadingId('create')
    try {
      const res = await fetch('/api/club/activations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: match.id,
          club_id: match.club_id,
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          type: draft.type,
          options: options.length ? options : null,
          correct_answer: draft.type === 'trivia' ? draft.correct_answer.trim() || null : null,
          points_reward: draft.points_reward,
          status: 'scheduled',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast(data.error ?? 'Création impossible', 'error')
        return false
      }
      setActivationList(prev => [data.activation, ...prev])
      toast('Activation créée', 'success')
      return true
    } catch {
      toast('Erreur réseau', 'error')
      return false
    } finally {
      setLoadingId(null)
    }
  }

  async function submitCustom(event: React.FormEvent) {
    event.preventDefault()
    if (!form.title.trim()) {
      toast('Titre requis', 'error')
      return
    }
    const created = await createActivation(form)
    if (created) {
      setCreating(false)
      setForm(EMPTY_FORM)
    }
  }

  async function createFromTemplate(template: ActivationDraft) {
    await createActivation(template)
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
      if (!res.ok) {
        toast(data.error ?? 'Erreur activation', 'error')
        return
      }
      setActivationList(prev => prev.map(activation => activation.id === id ? { ...activation, status } : activation))
      toast(status === 'active' ? 'Activation lancée' : 'Activation fermée', 'success')
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card variant="dark" className="space-y-4 border border-white/5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <Gift className="h-4 w-4 text-purple-400" />
              Activations libres
            </h2>
            <p className="mt-1 text-xs text-gray-500">Trivia, sondages et moments sans mise</p>
          </div>
          <Button type="button" size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Custom
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map(template => (
            <button
              key={template.title}
              type="button"
              onClick={() => createFromTemplate(template)}
              disabled={loadingId === 'create'}
              className="rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              <p className="font-bold text-sm">{template.title}</p>
              <p className="mt-1 text-xs text-gray-500">{template.description}</p>
              <p className="mt-3 text-xs font-bold text-emerald-400">+{template.points_reward} pts</p>
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-300">Activations du match</h3>
        {activationList.length === 0 ? (
          <Card variant="dark" className="border border-white/5 py-8 text-center">
            <p className="text-sm text-gray-500">Aucune activation libre</p>
          </Card>
        ) : (
          activationList.map(activation => (
            <Card key={activation.id} variant="dark" className="border border-white/5 p-4">
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs font-bold uppercase ${STATUS_COLORS[activation.status]}`}>
                      {STATUS_LABELS[activation.status]}
                    </span>
                    <Badge variant="neutral">{activation.type}</Badge>
                  </div>
                  <p className="mt-1 text-sm font-bold">{activation.title}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {activation.response_count}
                    </span>
                    <span>+{activation.points_reward} pts</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {activation.status === 'scheduled' && (
                    <Button
                      type="button"
                      size="sm"
                      aria-label="Lancer activation"
                      onClick={() => updateActivationStatus(activation.id, 'active')}
                      disabled={loadingId === activation.id}
                    >
                      {loadingId === activation.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                  {activation.status === 'active' && (
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      aria-label="Fermer activation"
                      onClick={() => updateActivationStatus(activation.id, 'closed')}
                      disabled={loadingId === activation.id}
                    >
                      {loadingId === activation.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Nouvelle activation" size="lg">
        <form onSubmit={submitCustom} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['poll', 'trivia', 'moment', 'prediction'] as Activation['type'][]).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setField('type', type)}
                className={`rounded-xl border px-3 py-2 text-sm font-bold capitalize transition-colors ${
                  form.type === type
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                    : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <Input label="Titre" value={form.title} onChange={event => setField('title', event.target.value)} required />
          <Input label="Description" value={form.description} onChange={event => setField('description', event.target.value)} />

          {(form.type === 'poll' || form.type === 'trivia' || form.type === 'prediction') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Options</label>
              {form.options.map((option, index) => (
                <input
                  key={index}
                  value={option}
                  onChange={event => setOption(index, event.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ))}
            </div>
          )}

          {form.type === 'trivia' && (
            <Input
              label="Bonne réponse"
              value={form.correct_answer}
              onChange={event => setField('correct_answer', event.target.value)}
            />
          )}

          <Input
            label="Points"
            type="number"
            min={0}
            value={form.points_reward}
            onChange={event => setField('points_reward', Number(event.target.value))}
          />

          <Button type="submit" className="w-full" disabled={loadingId === 'create'}>
            {loadingId === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer activation'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
