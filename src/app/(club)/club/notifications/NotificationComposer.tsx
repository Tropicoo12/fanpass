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

const inputCls = 'w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E1001A]'
const inputStyle = { background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)', color: '#1d1d1f' }
const labelStyle: React.CSSProperties = { color: 'rgba(29,29,31,0.65)', fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 6 }

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
      <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#1d1d1f' }}>
        <Send className="w-4 h-4" style={{ color: '#E1001A' }} /> Composer une notification
      </h2>
      <div className="space-y-4">
        <Input label="Titre *" placeholder="Match ce soir ! 🔥" value={form.title} onChange={e => setField('title', e.target.value)} />
        <div>
          <label style={labelStyle}>
            Message *{' '}
            <span style={{ fontSize: 12, color: remaining < 10 ? '#E1001A' : 'rgba(29,29,31,0.40)' }}>{remaining} car. restants</span>
          </label>
          <textarea
            value={form.body}
            onChange={e => { if (e.target.value.length <= 120) setField('body', e.target.value) }}
            placeholder="Sois là ! Scanne le QR code à l'entrée pour tes points..."
            rows={3}
            maxLength={120}
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E1001A] resize-none"
            style={inputStyle}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label style={labelStyle}>Type</label>
            <select value={form.type} onChange={e => setField('type', e.target.value)} className={inputCls} style={inputStyle}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Audience</label>
            <select value={form.audience} onChange={e => setField('audience', e.target.value)} className={inputCls} style={inputStyle}>
              {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {matches.length > 0 && (
          <div>
            <label style={labelStyle}>Match associé (optionnel)</label>
            <select value={form.match_id} onChange={e => setField('match_id', e.target.value)} className={inputCls} style={inputStyle}>
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
