import { Trophy, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function PronosticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Pronostics</h1>
        <p className="text-gray-400 text-sm mt-1">Prédit le score et gagne jusqu'à 100 pts par match</p>
      </div>

      {/* Match ouvert */}
      <Card variant="glass">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Match à venir</p>
          <Badge variant="warning">Ouvert</Badge>
        </div>

        <div className="flex items-center justify-around gap-4 mb-6">
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-2xl mx-auto mb-2">🦁</div>
            <p className="font-bold text-sm">FC Bruxelles</p>
          </div>
          <span className="text-2xl font-black text-gray-500">VS</span>
          <div className="text-center">
            <div className="w-14 h-14 rounded-full bg-purple-700 flex items-center justify-center text-2xl mx-auto mb-2">🦄</div>
            <p className="font-bold text-sm">Anderlecht</p>
          </div>
        </div>

        {/* Score input */}
        <div className="flex items-center justify-center gap-4">
          <input
            type="number"
            min="0"
            max="20"
            defaultValue={2}
            className="w-16 h-16 text-center text-3xl font-black rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-2xl font-black text-gray-500">—</span>
          <input
            type="number"
            min="0"
            max="20"
            defaultValue={1}
            className="w-16 h-16 text-center text-3xl font-black rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="mt-4 flex gap-2">
          <div className="flex-1 p-2.5 bg-white/5 rounded-xl text-center">
            <p className="text-xs text-gray-400">Score exact</p>
            <p className="font-bold text-emerald-400">100 pts</p>
          </div>
          <div className="flex-1 p-2.5 bg-white/5 rounded-xl text-center">
            <p className="text-xs text-gray-400">Bon vainqueur</p>
            <p className="font-bold text-amber-400">30 pts</p>
          </div>
        </div>

        <button className="w-full mt-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold transition-all active:scale-95">
          Valider mon pronostic
        </button>

        <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          <span>Ferme dans 48h</span>
        </div>
      </Card>

      {/* Historique */}
      <div>
        <h2 className="font-bold mb-3">Historique</h2>
        <div className="space-y-2">
          {[
            { match: 'FC Bruxelles vs Bruges', pred: '2-1', result: '2-1', pts: 100, correct: true },
            { match: 'FC Bruxelles vs Gand', pred: '1-0', result: '2-1', pts: 30, correct: false },
          ].map((item) => (
            <Card key={item.match} variant="dark">
              <div className="flex items-center gap-3">
                {item.correct
                  ? <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  : <XCircle className="w-5 h-5 text-amber-400 shrink-0" />
                }
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.match}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Pronostic: {item.pred} · Résultat: {item.result}
                  </p>
                </div>
                <Badge variant={item.correct ? 'success' : 'warning'}>
                  +{item.pts} pts
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
