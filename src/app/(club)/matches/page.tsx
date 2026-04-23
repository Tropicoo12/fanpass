import { Plus, QrCode, Eye, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const matches = [
  { id: '1', home: 'FC Bruxelles', away: 'Anderlecht', date: '26 avr. 18h00', status: 'upcoming', checkins: 0, pronostics: 342 },
  { id: '2', home: 'FC Bruxelles', away: 'Bruges', date: '12 avr. 15h00', status: 'finished', checkins: 312, pronostics: 298, score: '2-1' },
  { id: '3', home: 'FC Bruxelles', away: 'Gand', date: '29 mars 20h45', status: 'finished', checkins: 287, pronostics: 265, score: '1-2' },
]

const statusBadge: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'neutral' | 'error' }> = {
  upcoming: { label: 'À venir', variant: 'info' },
  live: { label: 'Live', variant: 'success' },
  finished: { label: 'Terminé', variant: 'neutral' },
  cancelled: { label: 'Annulé', variant: 'error' },
}

export default function MatchesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Matchs</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez les matchs et leurs QR codes</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold text-sm transition-all active:scale-95">
          <Plus className="w-4 h-4" />
          Nouveau match
        </button>
      </div>

      <div className="space-y-3">
        {matches.map((match) => {
          const { label, variant } = statusBadge[match.status]
          return (
            <Card key={match.id} variant="dark">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={variant}>{label}</Badge>
                    {match.score && (
                      <span className="text-sm font-black text-white">{match.score}</span>
                    )}
                  </div>
                  <h3 className="font-bold">{match.home} vs {match.away}</h3>
                  <div className="flex items-center gap-1 mt-1 text-gray-400 text-xs">
                    <Calendar className="w-3 h-3" />
                    <span>{match.date}</span>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-gray-400">
                    <span>📲 {match.checkins} check-ins</span>
                    <span>⚽ {match.pronostics} pronostics</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <QrCode className="w-4 h-4 text-gray-400" />
                  </button>
                  <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    <Eye className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
