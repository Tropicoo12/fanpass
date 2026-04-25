import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Calendar, QrCode, Zap } from 'lucide-react'
import Link from 'next/link'
import { CreateMatchButton } from './CreateMatchButton'
import { MatchDeleteButton } from './MatchDeleteButton'
import { SyncOddsButton } from './SyncOddsButton'
import { redirect } from 'next/navigation'
import { getAdminClubId } from '@/lib/club'

const STATUS_BADGE = {
  upcoming: { label: 'À venir',  variant: 'info'    as const },
  live:     { label: 'En direct',variant: 'success'  as const },
  finished: { label: 'Terminé',  variant: 'neutral'  as const },
  cancelled:{ label: 'Annulé',   variant: 'error'    as const },
}

export default async function MatchesPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const CLUB_ID = await getAdminClubId()
  if (!CLUB_ID) redirect('/auth/login')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('club_id', CLUB_ID)
    .order('match_date', { ascending: false })

  // Fetch check-in and activation counts per match
  const matchIds = matches?.map(m => m.id) ?? []
  const [{ data: checkinCounts }, { data: activationCounts }] = await Promise.all([
    matchIds.length ? supabase.from('checkins').select('match_id').in('match_id', matchIds) : { data: [] },
    matchIds.length ? supabase.from('activations').select('match_id, status').in('match_id', matchIds) : { data: [] },
  ])

  const checkinsByMatch: Record<string, number> = {}
  checkinCounts?.forEach(c => { checkinsByMatch[c.match_id] = (checkinsByMatch[c.match_id] ?? 0) + 1 })

  const activationsByMatch: Record<string, number> = {}
  activationCounts?.forEach(a => { activationsByMatch[a.match_id] = (activationsByMatch[a.match_id] ?? 0) + 1 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Matchs</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez les matchs et leurs QR codes</p>
        </div>
        <div className="flex gap-2">
          <SyncOddsButton clubId={CLUB_ID} />
          <CreateMatchButton clubId={CLUB_ID} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total matchs', value: matches?.length ?? 0 },
          { label: 'Terminés', value: matches?.filter(m => m.status === 'finished').length ?? 0 },
          { label: 'À venir', value: matches?.filter(m => m.status === 'upcoming').length ?? 0 },
        ].map(s => (
          <Card key={s.label} variant="dark" className="text-center">
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Matches list */}
      <div className="space-y-3">
        {matches?.length === 0 && (
          <Card variant="dark" className="text-center py-10">
            <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Aucun match créé</p>
          </Card>
        )}
        {matches?.map(match => {
          const { label, variant } = STATUS_BADGE[match.status]
          const checkins = checkinsByMatch[match.id] ?? 0
          const activations = activationsByMatch[match.id] ?? 0
          return (
            <Card key={match.id} variant="dark" className="hover:border-white/10 transition-colors border border-white/5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={variant}>{label}</Badge>
                    {match.status === 'finished' && match.home_score !== null && (
                      <span className="text-sm font-black">{match.home_score} – {match.away_score}</span>
                    )}
                  </div>
                  <h3 className="font-bold">{match.home_team} vs {match.away_team}</h3>
                  <div className="flex items-center gap-1 mt-1 text-gray-400 text-xs">
                    <Calendar className="w-3 h-3" />
                    {new Intl.DateTimeFormat('fr-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(match.match_date))}
                    {match.venue && <> · {match.venue}</>}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                    <span>📲 {checkins} check-ins</span>
                    <span>⚡ {activations} activations</span>
                    <span>+{match.checkin_points} pts</span>
                    {match.odds_home != null && (
                      <span className="text-amber-400">
                        {match.odds_home?.toFixed(2)} · {match.odds_draw?.toFixed(2)} · {match.odds_away?.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Link href={`/club/live/${match.id}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium transition-colors">
                    <Zap className="w-3 h-3" />
                    {match.status === 'live' ? 'Gérer' : 'Préparer'}
                  </Link>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-medium transition-colors">
                    <QrCode className="w-3 h-3" />
                    QR code
                  </button>
                  <MatchDeleteButton matchId={match.id} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
