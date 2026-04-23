import { Plus, Edit2, ToggleLeft, ToggleRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const rewards = [
  { id: '1', title: 'Maillot signé', pts: 1500, category: 'merchandise', stock: 5, redeemed: 3, active: true, emoji: '👕' },
  { id: '2', title: 'Visite vestiaire', pts: 2000, category: 'experience', stock: 2, redeemed: 1, active: true, emoji: '🏆' },
  { id: '3', title: '-20% boutique', pts: 300, category: 'discount', stock: null, redeemed: 28, active: true, emoji: '🏷️' },
  { id: '4', title: 'Fond écran officiel', pts: 50, category: 'digital', stock: null, redeemed: 45, active: false, emoji: '🖼️' },
]

export default function ClubRewardsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Récompenses</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez le catalogue de récompenses</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold text-sm transition-all active:scale-95">
          <Plus className="w-4 h-4" />
          Nouvelle récompense
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Actives', value: '3' },
          { label: 'Total échanges', value: '77' },
          { label: 'Points distribués', value: '48k' },
        ].map((s) => (
          <Card key={s.label} variant="dark">
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {rewards.map((reward) => (
          <Card key={reward.id} variant="dark">
            <div className="flex items-center gap-4">
              <span className="text-3xl shrink-0">{reward.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold truncate">{reward.title}</h3>
                  <Badge variant={reward.active ? 'success' : 'neutral'}>
                    {reward.active ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  <span className="font-semibold text-emerald-400">{reward.pts} pts</span>
                  <span>Stock: {reward.stock ?? '∞'}</span>
                  <span>{reward.redeemed} échanges</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>
                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  {reward.active
                    ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                    : <ToggleLeft className="w-4 h-4 text-gray-500" />
                  }
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
