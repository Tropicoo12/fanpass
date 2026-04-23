import { ScanQrCode, CheckCircle, Clock } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function ScanPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Check-in Match</h1>
        <p className="text-gray-400 text-sm mt-1">Scanne le QR code affiché au stade pour valider ta présence</p>
      </div>

      {/* QR Scanner zone */}
      <div className="relative aspect-square max-w-xs mx-auto rounded-3xl overflow-hidden bg-black/40 border-2 border-dashed border-emerald-500/50 flex flex-col items-center justify-center gap-4">
        <div className="absolute inset-4 border-2 border-emerald-500/30 rounded-2xl" />
        {/* Corners */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-500 rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-500 rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-500 rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-500 rounded-br-lg" />

        <ScanQrCode className="w-16 h-16 text-emerald-500/60" />
        <p className="text-gray-400 text-sm text-center px-8">
          Place le QR code dans le cadre
        </p>
        {/* TODO: intégrer une lib de scan QR (ex: html5-qrcode) */}
        <button className="mt-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-semibold text-sm transition-all active:scale-95">
          Activer la caméra
        </button>
      </div>

      {/* Prochain match */}
      <Card variant="glass">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Prochain match</p>
            <h3 className="font-bold text-lg">FC Bruxelles vs Anderlecht</h3>
            <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm">
              <Clock className="w-3.5 h-3.5" />
              <span>Sam. 26 avril · 18h00</span>
            </div>
          </div>
          <Badge variant="info">À venir</Badge>
        </div>
        <div className="mt-4 p-3 bg-emerald-500/10 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300">
            Scanne le QR le jour du match pour gagner <strong>50 pts</strong>
          </p>
        </div>
      </Card>

      {/* Historique */}
      <div>
        <h2 className="font-bold mb-3">Derniers check-ins</h2>
        <div className="space-y-2">
          {[
            { match: 'FC Bruxelles vs Bruges', date: '12 avril', pts: 50 },
            { match: 'FC Bruxelles vs Gand', date: '29 mars', pts: 50 },
          ].map((item) => (
            <Card key={item.date} variant="dark">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{item.match}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.date}</p>
                </div>
                <Badge variant="success">+{item.pts} pts</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
