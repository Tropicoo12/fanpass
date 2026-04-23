import { Gift, ShoppingBag, Zap, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const categories = [
  { id: 'all', label: 'Tout' },
  { id: 'merchandise', label: 'Merch' },
  { id: 'experience', label: 'Expériences' },
  { id: 'discount', label: 'Réductions' },
  { id: 'digital', label: 'Digital' },
]

const rewards = [
  {
    id: '1',
    title: 'Maillot signé',
    description: "Maillot de la saison signé par l'équipe",
    pts: 1500,
    category: 'merchandise',
    emoji: '👕',
    stock: 5,
  },
  {
    id: '2',
    title: 'Visite vestiaire',
    description: "Visite exclusive des vestiaires avant un match",
    pts: 2000,
    category: 'experience',
    emoji: '🏆',
    stock: 2,
  },
  {
    id: '3',
    title: '-20% boutique',
    description: 'Code réduction sur tout le merchandising officiel',
    pts: 300,
    category: 'discount',
    emoji: '🏷️',
    stock: null,
  },
  {
    id: '4',
    title: 'Fond écran officiel',
    description: 'Pack wallpapers HD exclusifs saison 2024-25',
    pts: 50,
    category: 'digital',
    emoji: '🖼️',
    stock: null,
  },
  {
    id: '5',
    title: 'Place VIP',
    description: "Place en tribune VIP pour un match au choix",
    pts: 3000,
    category: 'experience',
    emoji: '🎫',
    stock: 10,
  },
  {
    id: '6',
    title: 'Écharpe du club',
    description: "Écharpe officielle de la saison en cours",
    pts: 400,
    category: 'merchandise',
    emoji: '🧣',
    stock: 20,
  },
]

const myPoints = 1250

export default function RewardsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Récompenses</h1>
        <p className="text-gray-400 text-sm mt-1">Échange tes points contre des goodies exclusifs</p>
      </div>

      {/* Solde */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
          <Star className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <p className="text-xs text-gray-400">Ton solde</p>
          <p className="font-black text-xl text-emerald-400">{myPoints.toLocaleString()} pts</p>
        </div>
      </div>

      {/* Catégories */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat.id}
            className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors"
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grille récompenses */}
      <div className="grid grid-cols-2 gap-3">
        {rewards.map((reward) => {
          const canAfford = myPoints >= reward.pts
          return (
            <Card
              key={reward.id}
              variant="dark"
              className={`flex flex-col gap-3 ${!canAfford ? 'opacity-60' : ''}`}
            >
              <div className="text-4xl">{reward.emoji}</div>
              <div className="flex-1">
                <h3 className="font-bold text-sm leading-tight">{reward.title}</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">{reward.description}</p>
                {reward.stock !== null && (
                  <p className="text-xs text-amber-400 mt-1">Stock : {reward.stock}</p>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className={`font-black text-sm ${canAfford ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {reward.pts} pts
                </span>
                <button
                  disabled={!canAfford}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 transition-colors active:scale-95"
                >
                  {canAfford ? 'Échanger' : 'Insuffisant'}
                </button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
