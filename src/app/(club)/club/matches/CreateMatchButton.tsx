'use client'
import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

export function CreateMatchButton({ clubId }: { clubId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    home_team: 'FC Bruxelles',
    away_team: '',
    match_date: '',
    venue: 'Stade Roi Baudouin',
    checkin_points: 50,
    prediction_points_exact: 100,
    prediction_points_winner: 30,
  })

  function setField(k: string, v: string | number) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/club/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, club_id: clubId }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      toast('Match créé !', 'success')
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
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" /> Nouveau match
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Créer un match">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Équipe domicile" value={form.home_team} onChange={e => setField('home_team', e.target.value)} required />
            <Input label="Équipe visiteur" placeholder="Anderlecht" value={form.away_team} onChange={e => setField('away_team', e.target.value)} required />
          </div>
          <Input label="Date & heure" type="datetime-local" value={form.match_date} onChange={e => setField('match_date', e.target.value)} required />
          <Input label="Lieu (optionnel)" value={form.venue} onChange={e => setField('venue', e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Pts check-in</label>
              <input type="number" min={0} value={form.checkin_points} onChange={e => setField('checkin_points', +e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Pts score exact</label>
              <input type="number" min={0} value={form.prediction_points_exact} onChange={e => setField('prediction_points_exact', +e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Pts vainqueur</label>
              <input type="number" min={0} value={form.prediction_points_winner} onChange={e => setField('prediction_points_winner', +e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer le match'}
          </Button>
        </form>
      </Modal>
    </>
  )
}
