'use client'
import { useState } from 'react'
import { Send, Clock, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

interface Match { id: string; home_team: string; away_team: string; match_date: string }

const AUDIENCE_OPTIONS = [
  { value: 'all',            label: 'Tous les fans' },
  { value: 'checked_in',    label: 'Fans présents au dernier match' },
  { value: 'not_checked_in',label: 'Fans absents au dernier match' },
  { value: 'gold_plus',     label: 'Niveau Gold et plus' },
]

const TYPE_OPTIONS = [
  { value: 'general',     label: 'Général'         },
  { value: 'match_start', label: 'Début de match'  },
  { value: 'activation',  label: 'Activation live' },
  { value: 'reward',      label: 'Récompense'      },
  { value: 'result',      label: 'Résultat match'  },
]

export function NotificationComposer({ clubId, matches }: { clubId: string; matches: Match[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'general',
    audience: 'all',
    match_id: '',
    scheduled_for: '',
  })
  const remaining = 120 - form.body.length

  function setField(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function send(scheduled: boolean) {
    if (!form.title || !form.body) { toast('Titre et message requis', 'error'); return }
    if (scheduled && !form.scheduled_for) { toast('Précise la date de planification', 'error'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/club/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          club_id: clubId,
          match_id: form.match_id || null,
          scheduled_for: scheduled ? form.scheduled_for : null,
          send_now: !scheduled,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      toast(scheduled ? 'Notification planifiée !' : 'Notification envoyée !', 'success')
      setForm({ title: '', body: '', type: 'general', audience: 'all', match_id: '', scheduled_for: '' })
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card variant="dark">
      <h2 className="font-bold mb-4 flex items-center gap-2">
        <Send className="w-4 h-4 text-emerald-400" /> Composer une notification
      </h2>
      <div className="space-y-4">
        <Input label="Titre *" placeholder="Match ce soir ! 🔥" value={form.title} onChange={e => setField('title', e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Message * <span className={`text-xs ml-2 ${remaining < 10 ? 'text-red-400' : 'text-gray-500'}`}>{remaining} car. restants</span></label>
          <textarea
            value={form.body}
            onChange={e => { if (e.target.value.length <= 120) setField('body', e.target.value) }}
            placeholder="Sois là ! Scanne le QR code à l'entrée pour tes points..."
            rows={3}
            maxLength={120}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Type</label>
            <select value={form.type} onChange={e => setField('type', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Audience</label>
            <select value={form.audience} onChange={e => setField('audience', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {matches.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Match associé (optionnel)</label>
            <select value={form.match_id} onChange={e => setField('match_id', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Aucun</option>
              {matches.map(m => <option key={m.id} value={m.id}>{m.home_team} vs {m.away_team}</option>)}
            </select>
          </div>
        )}
        <Input label="Planifier pour (optionnel)" type="datetime-local" value={form.scheduled_for} onChange={e => setField('scheduled_for', e.target.value)} />
        <div className="flex gap-2">
          <Button onClick={() => send(false)} disabled={loading} className="flex-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" />Envoyer maintenant</>}
          </Button>
          {form.scheduled_for && (
            <Button onClick={() => send(true)} disabled={loading} variant="secondary" className="flex-1">
              <Clock className="w-4 h-4 mr-2" />Planifier
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
