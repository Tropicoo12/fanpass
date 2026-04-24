'use client'
import { useState } from 'react'
import { Plus, Edit2, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import type { Reward } from '@/types/database'
import { LOYALTY_CONFIG } from '@/types/database'

const CATEGORIES = ['merchandise', 'experience', 'discount', 'digital', 'vip']
const CATEGORY_EMOJI: Record<string, string> = {
  merchandise: '👕', experience: '🏆', discount: '🏷️', digital: '🖼️', vip: '🎫',
}

interface Props {
  rewards: Reward[]
  redemptionsByReward: Record<string, number>
  clubId: string
}

const EMPTY_FORM = {
  title: '',
  description: '',
  points_cost: 500,
  stock: '',
  category: 'merchandise',
  min_loyalty_level: 0,
  max_per_user: '',
  expires_at: '',
}

export function RewardsManager({ rewards, redemptionsByReward, clubId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [editReward, setEditReward] = useState<Reward | null>(null)
  const [loading, setLoading] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  function setField(k: string, v: any) { setForm(f => ({ ...f, [k]: v })) }

  function openCreate() { setForm(EMPTY_FORM); setEditReward(null); setOpen(true) }
  function openEdit(r: Reward) {
    setForm({
      title: r.title,
      description: r.description ?? '',
      points_cost: r.points_cost,
      stock: r.stock !== null ? String(r.stock) : '',
      category: r.category,
      min_loyalty_level: r.min_loyalty_level,
      max_per_user: r.max_per_user !== null ? String(r.max_per_user) : '',
      expires_at: r.expires_at ? r.expires_at.slice(0, 16) : '',
    })
    setEditReward(r)
    setOpen(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const body = {
        ...form,
        club_id: clubId,
        stock: form.stock !== '' ? +form.stock : null,
        max_per_user: form.max_per_user !== '' ? +form.max_per_user : null,
        expires_at: form.expires_at || null,
      }
      const url = editReward ? `/api/club/rewards/${editReward.id}` : '/api/club/rewards'
      const method = editReward ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      toast(editReward ? 'Récompense mise à jour !' : 'Récompense créée !', 'success')
      setOpen(false)
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function toggle(reward: Reward) {
    setTogglingId(reward.id)
    try {
      await fetch(`/api/club/rewards/${reward.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !reward.is_active }),
      })
      router.refresh()
    } catch {
      toast('Erreur', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Nouvelle récompense</Button>
      </div>

      {rewards.length === 0 && (
        <Card variant="dark" className="text-center py-10">
          <p className="text-gray-400">Aucune récompense créée</p>
        </Card>
      )}

      <div className="space-y-3">
        {rewards.map(reward => (
          <Card key={reward.id} variant="dark">
            <div className="flex items-center gap-4">
              <span className="text-3xl shrink-0">{CATEGORY_EMOJI[reward.category] ?? '🎁'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold truncate">{reward.title}</h3>
                  <Badge variant={reward.is_active ? 'success' : 'neutral'}>
                    {reward.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                  {reward.min_loyalty_level > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ color: LOYALTY_CONFIG[reward.min_loyalty_level as 0].color, borderColor: LOYALTY_CONFIG[reward.min_loyalty_level as 0].color + '40' }}>
                      {LOYALTY_CONFIG[reward.min_loyalty_level as 0].name}+
                    </span>
                  )}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  <span className="font-semibold text-emerald-400">{reward.points_cost.toLocaleString('fr-BE')} pts</span>
                  <span>Stock : {reward.stock ?? '∞'}</span>
                  <span>{redemptionsByReward[reward.id] ?? 0} échanges</span>
                  {reward.expires_at && <span>Exp. {new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short' }).format(new Date(reward.expires_at))}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openEdit(reward)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>
                <button onClick={() => toggle(reward)} disabled={togglingId === reward.id} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  {togglingId === reward.id
                    ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    : reward.is_active
                      ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                      : <ToggleLeft className="w-4 h-4 text-gray-500" />
                  }
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editReward ? 'Modifier la récompense' : 'Nouvelle récompense'} size="lg">
        <form onSubmit={save} className="space-y-4">
          <Input label="Titre *" value={form.title} onChange={e => setField('title', e.target.value)} required />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setField('description', e.target.value)} rows={2}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Coût en points *</label>
              <input type="number" min={1} value={form.points_cost} onChange={e => setField('points_cost', +e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <Input label="Stock (vide = illimité)" type="number" placeholder="∞" value={form.stock} onChange={e => setField('stock', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Catégorie</label>
              <select value={form.category} onChange={e => setField('category', e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Niveau minimum</label>
              <select value={form.min_loyalty_level} onChange={e => setField('min_loyalty_level', +e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                {[0, 1, 2, 3, 4].map(l => <option key={l} value={l}>{LOYALTY_CONFIG[l as 0].name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Max par fan (vide = ∞)" type="number" placeholder="1" value={form.max_per_user} onChange={e => setField('max_per_user', e.target.value)} />
            <Input label="Expire le (optionnel)" type="datetime-local" value={form.expires_at} onChange={e => setField('expires_at', e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editReward ? 'Enregistrer' : 'Créer la récompense'}
          </Button>
        </form>
      </Modal>
    </>
  )
}
