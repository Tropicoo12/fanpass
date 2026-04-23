import { Users, TrendingUp, QrCode, Gift, ArrowUp, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const stats = [
  { label: 'Fans inscrits', value: '1 284', icon: Users, trend: '+12% ce mois', up: true },
  { label: 'Check-ins total', value: '3 641', icon: QrCode, trend: '+8% ce mois', up: true },
  { label: 'Points distribués', value: '182k', icon: TrendingUp, trend: 'cette saison', up: true },
  { label: 'Récompenses échangées', value: '94', icon: Gift, trend: '-3% ce mois', up: false },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">FC Bruxelles · Saison 2024-25</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} variant="dark">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-400" />
                </div>
                <span className={`text-xs font-medium flex items-center gap-0.5 ${stat.up ? 'text-emerald-400' : 'text-red-400'}`}>
                  <ArrowUp className={`w-3 h-3 ${!stat.up ? 'rotate-180' : ''}`} />
                </span>
              </div>
              <p className="text-2xl font-black">{stat.value}</p>
              <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
              <p className="text-gray-600 text-xs mt-0.5">{stat.trend}</p>
            </Card>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Prochain match */}
        <Card variant="dark">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              Prochain match
            </h2>
            <Badge variant="info">Dans 2j</Badge>
          </div>
          <div className="flex items-center justify-around py-4">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-2xl mx-auto mb-2">🦁</div>
              <p className="font-bold text-sm">FC Bruxelles</p>
              <p className="text-xs text-gray-500">Domicile</p>
            </div>
            <span className="text-gray-600 font-black text-xl">VS</span>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center text-2xl mx-auto mb-2">🦄</div>
              <p className="font-bold text-sm">Anderlecht</p>
              <p className="text-xs text-gray-500">Visiteur</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex justify-between">
              <span>Date</span><span className="text-white">Sam. 26 avril · 18h00</span>
            </div>
            <div className="flex justify-between">
              <span>Stade</span><span className="text-white">Stade Roi Baudouin</span>
            </div>
            <div className="flex justify-between">
              <span>Pronostics soumis</span><span className="text-emerald-400">342</span>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-medium transition-colors">
              Voir le QR code
            </button>
            <button className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold transition-all active:scale-95">
              Gérer
            </button>
          </div>
        </Card>

        {/* Top fans */}
        <Card variant="dark">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Top Fans</h2>
            <button className="text-xs text-emerald-400">Voir tout</button>
          </div>
          <div className="space-y-3">
            {[
              { rank: 1, name: 'Marc V.', pts: 3200, checkins: 12 },
              { rank: 2, name: 'Sophie K.', pts: 2850, checkins: 11 },
              { rank: 3, name: 'Ahmed B.', pts: 2400, checkins: 10 },
              { rank: 4, name: 'Julie D.', pts: 2100, checkins: 9 },
              { rank: 5, name: 'Thomas L.', pts: 1900, checkins: 8 },
            ].map((fan) => (
              <div key={fan.rank} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm">
                  {fan.rank <= 3 ? ['🥇', '🥈', '🥉'][fan.rank - 1] : `#${fan.rank}`}
                </span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {fan.name[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{fan.name}</p>
                  <p className="text-xs text-gray-500">{fan.checkins} matchs</p>
                </div>
                <span className="text-sm font-bold text-emerald-400">{fan.pts.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Engagement chart placeholder */}
      <Card variant="dark">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Engagement par match</h2>
          <Badge variant="neutral">Saison 2024-25</Badge>
        </div>
        <div className="h-32 flex items-end gap-2">
          {[40, 65, 55, 80, 70, 90, 75, 60, 85, 95].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-emerald-400"
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>Août</span><span>Sept</span><span>Oct</span><span>Nov</span><span>Déc</span>
          <span>Jan</span><span>Fév</span><span>Mars</span><span>Avr</span><span>Mai</span>
        </div>
      </Card>
    </div>
  )
}
