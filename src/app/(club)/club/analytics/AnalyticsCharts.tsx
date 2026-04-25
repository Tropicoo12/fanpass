'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card } from '@/components/ui/Card'

const TYPE_LABELS: Record<string, string> = {
  checkin: 'Check-ins',
  pronostic: 'Pronostics',
  survey: 'Sondages',
  activation: 'Activations',
  bonus: 'Bonus',
  redemption: 'Échanges',
  manual: 'Manuel',
}

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6']

interface Props {
  loyaltyDist: { name: string; count: number; color: string }[]
  checkinsByMatch: { label: string; checkins: number; points: number }[]
  top10: { name: string; points: number }[]
  activationData: { name: string; responses: number; type: string }[]
  pointsTypeData: { type: string; value: number }[]
}

const tooltipStyle = {
  backgroundColor: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '12px',
}

export function AnalyticsCharts({ loyaltyDist, checkinsByMatch, top10, activationData, pointsTypeData }: Props) {
  return (
    <div className="space-y-6">
      {/* Check-ins per match */}
      {checkinsByMatch.length > 0 ? (
        <Card variant="dark">
          <h2 className="font-bold mb-4">Check-ins par match</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={checkinsByMatch} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="checkins" fill="#10b981" radius={[6, 6, 0, 0]} name="Check-ins" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      ) : (
        <Card variant="dark" className="text-center py-8">
          <p className="text-gray-500 text-sm">Aucun match avec check-ins pour le moment</p>
        </Card>
      )}

      {/* Top 10 fans */}
      {top10.length > 0 ? (
        <Card variant="dark">
          <h2 className="font-bold mb-4">Top 10 fans (saison)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" width={90} tick={{ fill: '#d1d5db', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="points" fill="#6366f1" radius={[0, 6, 6, 0]} name="Points saison" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      ) : (
        <Card variant="dark" className="text-center py-8">
          <p className="text-gray-500 text-sm">Aucun fan avec des points pour le moment</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Loyalty distribution */}
        <Card variant="dark">
          <h2 className="font-bold mb-4">Niveaux de fidélité</h2>
          {loyaltyDist.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={loyaltyDist} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                  {loyaltyDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Aucun fan enregistré</p>
          )}
        </Card>

        {/* Points by source */}
        <Card variant="dark">
          <h2 className="font-bold mb-4">Points par source</h2>
          {pointsTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pointsTypeData.map(d => ({ ...d, name: TYPE_LABELS[d.type] ?? d.type }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                  {pointsTypeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend formatter={(v) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Aucune transaction encore</p>
          )}
        </Card>
      </div>

      {/* Activation participation */}
      {activationData.length > 0 && (
        <Card variant="dark">
          <h2 className="font-bold mb-4">Participations aux activations</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={activationData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="responses" fill="#f59e0b" radius={[6, 6, 0, 0]} name="Réponses" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  )
}
