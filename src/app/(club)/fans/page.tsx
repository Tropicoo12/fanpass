import { Search, Download } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const fans = [
  { id: '1', name: 'Marc V.', email: 'marc@example.com', pts: 3200, checkins: 12, joined: 'Août 2024' },
  { id: '2', name: 'Sophie K.', email: 'sophie@example.com', pts: 2850, checkins: 11, joined: 'Août 2024' },
  { id: '3', name: 'Ahmed B.', email: 'ahmed@example.com', pts: 2400, checkins: 10, joined: 'Sept 2024' },
  { id: '4', name: 'Julie D.', email: 'julie@example.com', pts: 2100, checkins: 9, joined: 'Oct 2024' },
  { id: '5', name: 'Thomas L.', email: 'thomas@example.com', pts: 1900, checkins: 8, joined: 'Nov 2024' },
]

export default function FansPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Fans</h1>
          <p className="text-gray-400 text-sm mt-1">1 284 supporters inscrits</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 font-semibold text-sm transition-all active:scale-95">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="search"
          placeholder="Rechercher un fan..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-emerald-500 placeholder:text-gray-600"
        />
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Actifs ce mois', value: '423' },
          { label: 'Nouveaux', value: '+38' },
          { label: 'Points moy.', value: '640' },
        ].map((s) => (
          <Card key={s.label} variant="dark">
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Table fans */}
      <Card variant="dark">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-white/5">
                <th className="pb-3 text-gray-400 font-medium">Fan</th>
                <th className="pb-3 text-gray-400 font-medium hidden sm:table-cell">Inscription</th>
                <th className="pb-3 text-gray-400 font-medium">Check-ins</th>
                <th className="pb-3 text-gray-400 font-medium">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {fans.map((fan) => (
                <tr key={fan.id} className="hover:bg-white/2">
                  <td className="py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {fan.name[0]}
                      </div>
                      <div>
                        <p className="font-medium">{fan.name}</p>
                        <p className="text-xs text-gray-500">{fan.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 text-gray-400 hidden sm:table-cell">{fan.joined}</td>
                  <td className="py-3">
                    <Badge variant="info">{fan.checkins}</Badge>
                  </td>
                  <td className="py-3 font-bold text-emerald-400">{fan.pts.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
