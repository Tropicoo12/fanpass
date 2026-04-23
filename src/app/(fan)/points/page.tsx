import { TrendingUp, Star, Award } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const transactions = [
  { type: 'checkin', label: 'Check-in · FC Bruxelles vs Bruges', date: '12 avr.', pts: 50 },
  { type: 'pronostic', label: 'Pronostic exact · FC Bruxelles vs Bruges', date: '12 avr.', pts: 100 },
  { type: 'pronostic', label: 'Bon vainqueur · FC Bruxelles vs Gand', date: '29 mars', pts: 30 },
  { type: 'checkin', label: 'Check-in · FC Bruxelles vs Gand', date: '29 mars', pts: 50 },
  { type: 'redemption', label: 'Récompense: Maillot signé', date: '15 mars', pts: -500 },
]

const typeIcons: Record<string, string> = {
  checkin: '📲',
  pronostic: '⚽',
  bonus: '⭐',
  redemption: '🎁',
}

export default function PointsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Mes Points</h1>
        <p className="text-gray-400 text-sm mt-1">Suivi de ton solde et historique</p>
      </div>

      {/* Solde */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="relative">
          <p className="text-emerald-200 text-sm font-medium">Solde total</p>
          <p className="text-5xl font-black mt-1">1 250</p>
          <p className="text-emerald-200 text-sm mt-1">points</p>
          <div className="mt-4 flex gap-4">
            <div>
              <p className="text-xs text-emerald-200">Cette saison</p>
              <p className="font-bold">830 pts</p>
            </div>
            <div>
              <p className="text-xs text-emerald-200">Classement</p>
              <p className="font-bold">#47</p>
            </div>
          </div>
        </div>
      </div>

      {/* Comment gagner */}
      <div>
        <h2 className="font-bold mb-3">Comment gagner des points</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: '📲', label: 'Check-in', pts: '50 pts' },
            { icon: '🎯', label: 'Score exact', pts: '100 pts' },
            { icon: '✅', label: 'Bon vainqueur', pts: '30 pts' },
          ].map((item) => (
            <Card key={item.label} variant="dark">
              <div className="text-center">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="font-bold text-emerald-400 text-sm mt-0.5">{item.pts}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Leaderboard preview */}
      <Card variant="glass">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Classement
          </h2>
          <button className="text-xs text-emerald-400 hover:text-emerald-300">Voir tout</button>
        </div>
        <div className="space-y-2">
          {[
            { rank: 1, name: 'Marc V.', pts: 3200 },
            { rank: 2, name: 'Sophie K.', pts: 2850 },
            { rank: 3, name: 'Ahmed B.', pts: 2400 },
            { rank: 47, name: 'Toi', pts: 1250, isMe: true },
          ].map((item) => (
            <div
              key={item.rank}
              className={`flex items-center gap-3 p-2 rounded-xl ${item.isMe ? 'bg-emerald-500/20 border border-emerald-500/30' : ''}`}
            >
              <span className={`w-6 text-center font-bold text-sm ${item.rank <= 3 ? 'text-amber-400' : 'text-gray-500'}`}>
                {item.rank <= 3 ? ['🥇', '🥈', '🥉'][item.rank - 1] : `#${item.rank}`}
              </span>
              <span className={`flex-1 text-sm ${item.isMe ? 'font-bold text-emerald-300' : ''}`}>{item.name}</span>
              <span className="text-sm font-semibold">{item.pts.toLocaleString()} pts</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Historique transactions */}
      <div>
        <h2 className="font-bold mb-3">Historique</h2>
        <div className="space-y-2">
          {transactions.map((tx, i) => (
            <Card key={i} variant="dark">
              <div className="flex items-center gap-3">
                <span className="text-xl shrink-0">{typeIcons[tx.type]}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{tx.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{tx.date}</p>
                </div>
                <span className={`font-bold text-sm shrink-0 ${tx.pts > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.pts > 0 ? '+' : ''}{tx.pts} pts
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
