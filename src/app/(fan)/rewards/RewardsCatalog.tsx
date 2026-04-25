'use client'
import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { Loader2, Lock, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import type { Reward } from '@/types/database'
import { LOYALTY_CONFIG } from '@/types/database'

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Tout',
  merchandise: 'Merch',
  experience: 'Expériences',
  discount: 'Réductions',
  digital: 'Digital',
  vip: 'VIP',
}

const CATEGORY_EMOJI: Record<string, string> = {
  merchandise: '👕',
  experience: '🏆',
  discount: '🏷️',
  digital: '🖼️',
  vip: '🎫',
}

interface Props {
  rewards: Reward[]
  userPoints: number
  loyaltyLevel: number
  redemptionCount: Record<string, number>
  userId: string
}

export function RewardsCatalog({ rewards, userPoints, loyaltyLevel, redemptionCount, userId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Reward | null>(null)
  const [loading, setLoading] = useState(false)
  const [successCode, setSuccessCode] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (!successCode) return
    setCountdown(15 * 60)
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [successCode])

  const categories = ['all', ...Array.from(new Set(rewards.map(r => r.category)))]
  const filtered = filter === 'all' ? rewards : rewards.filter(r => r.category === filter)

  function getStatus(reward: Reward): 'available' | 'insufficient' | 'locked' | 'no_stock' | 'limit_reached' | 'expired' {
    if (reward.expires_at && new Date(reward.expires_at) < new Date()) return 'expired'
    if (reward.stock !== null && reward.stock <= 0) return 'no_stock'
    if (reward.min_loyalty_level > loyaltyLevel) return 'locked'
    if (reward.max_per_user !== null && (redemptionCount[reward.id] ?? 0) >= reward.max_per_user) return 'limit_reached'
    if (userPoints < reward.points_cost) return 'insufficient'
    return 'available'
  }

  async function redeem() {
    if (!selected) return
    setLoading(true)
    try {
      const res = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: selected.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setSuccessCode(data.code)
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  function closeModal() {
    setSelected(null)
    setSuccessCode(null)
  }

  return (
    <>
      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === cat ? 'bg-emerald-500 text-white' : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-400 py-8">Aucune récompense dans cette catégorie</p>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3">
        {filtered.map(reward => {
          const status = getStatus(reward)
          const emoji = CATEGORY_EMOJI[reward.category] ?? '🎁'
          const canRedeem = status === 'available'

          return (
            <button
              key={reward.id}
              onClick={() => { if (status !== 'expired' && status !== 'no_stock') setSelected(reward) }}
              className={`flex flex-col gap-3 p-4 rounded-2xl bg-[#1a1a2e] border text-left transition-all active:scale-95 ${
                canRedeem ? 'border-white/10 hover:border-emerald-500/40' : 'border-white/5 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="text-4xl">{emoji}</span>
                {status === 'locked' && <Lock className="w-4 h-4 text-gray-500 shrink-0" />}
                {status === 'no_stock' && <Badge variant="error">Épuisé</Badge>}
                {status === 'expired' && <Badge variant="neutral">Expiré</Badge>}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm leading-tight">{reward.title}</h3>
                {reward.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{reward.description}</p>
                )}
                {reward.stock !== null && reward.stock > 0 && (
                  <p className="text-xs text-amber-400 mt-1">Stock : {reward.stock}</p>
                )}
                {reward.expires_at && status !== 'expired' && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    Expire {new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short' }).format(new Date(reward.expires_at))}
                  </div>
                )}
                {status === 'locked' && (
                  <p className="text-xs text-amber-400 mt-1">Niveau {LOYALTY_CONFIG[reward.min_loyalty_level as 0].name} requis</p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className={`font-black text-sm ${canRedeem ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {reward.points_cost.toLocaleString('fr-BE')} pts
                </span>
                {canRedeem && (
                  <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-medium">
                    Échanger
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Redemption modal */}
      <Modal open={!!selected} onClose={closeModal} title={successCode ? 'Récompense échangée !' : 'Confirmer l\'échange'}>
        {selected && !successCode && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
              <span className="text-4xl">{CATEGORY_EMOJI[selected.category] ?? '🎁'}</span>
              <div>
                <h3 className="font-bold">{selected.title}</h3>
                {selected.description && <p className="text-sm text-gray-400 mt-0.5">{selected.description}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-sm text-gray-300">Coût</span>
              <span className="font-black text-emerald-400">–{selected.points_cost.toLocaleString('fr-BE')} pts</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Solde après échange</span>
              <span className="font-bold text-white">{(userPoints - selected.points_cost).toLocaleString('fr-BE')} pts</span>
            </div>
            {selected.expires_at && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Le code sera valable 48h après échange
              </p>
            )}
            <Button onClick={redeem} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer l\'échange'}
            </Button>
            <Button variant="secondary" onClick={closeModal} className="w-full">Annuler</Button>
          </div>
        )}

        {successCode && selected && (
          <div className="text-center space-y-4">
            <p className="text-gray-400 text-sm">Montre ce QR au stand du club</p>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-2xl">
                <QRCode value={successCode} size={180} />
              </div>
            </div>

            {/* Text code */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs text-gray-500 mb-1">Code manuel</p>
              <p className="text-2xl font-black tracking-[0.2em] text-emerald-400 font-mono">{successCode}</p>
            </div>

            {/* Countdown */}
            <div className={`flex items-center justify-center gap-2 text-sm font-medium ${countdown === 0 ? 'text-red-400' : countdown < 60 ? 'text-amber-400' : 'text-gray-400'}`}>
              <Clock className="w-4 h-4" />
              {countdown > 0
                ? `Scanne dans ${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')} — usage unique`
                : 'Délai expiré — le code reste valable, scanne-le au plus vite'}
            </div>

            <p className="text-xs text-gray-500">
              <strong className="text-white">{selected.title}</strong> — invalide après le premier scan.
            </p>
            <Button onClick={closeModal} className="w-full">Fermer</Button>
          </div>
        )}
      </Modal>
    </>
  )
}
