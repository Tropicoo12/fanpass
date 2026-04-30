import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { after } from 'next/server'
import type { Database } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Calendar, Zap } from 'lucide-react'
import Link from 'next/link'
import { CreateMatchButton } from './CreateMatchButton'
import { MatchDeleteButton } from './MatchDeleteButton'
import { SyncOddsButton } from './SyncOddsButton'
import { TeamNameSetup } from './TeamNameSetup'
import { redirect } from 'next/navigation'
import { getAdminClubId } from '@/lib/club'
import { syncCalendarForClub } from '@/lib/sync-calendar'

const STATUS_BADGE = {
  upcoming: { label: 'À venir',  variant: 'info'     as const },
  live:     { label: 'En direct', variant: 'success'  as const },
  finished: { label: 'Terminé',  variant: 'neutral'   as const },
  cancelled:{ label: 'Annulé',   variant: 'error'     as const },
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

  const { data: club } = await supabase
    .from('clubs')
    .select('team_name, football_data_team_id, competition_code, matches_synced_at')
    .eq('id', CLUB_ID)
    .single()

  // Auto-sync in background after page is sent — respects 1-hour cooldown
  after(async () => {
    await syncCalendarForClub(CLUB_ID)
  })

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('club_id', CLUB_ID)
    .order('match_date', { ascending: true })

  const matchIds = matches?.map(m => m.id) ?? []
  const [{ data: checkinCounts }, { data: activationCounts }] = await Promise.all([
    matchIds.length ? supabase.from('checkins').select('match_id').in('match_id', matchIds) : { data: [] },
    matchIds.length ? supabase.from('activations').select('match_id').in('match_id', matchIds) : { data: [] },
  ])

  const checkinsByMatch: Record<string, number> = {}
  checkinCounts?.forEach(c => { checkinsByMatch[c.match_id] = (checkinsByMatch[c.match_id] ?? 0) + 1 })

  const activationsByMatch: Record<string, number> = {}
  activationCounts?.forEach(a => { activationsByMatch[a.match_id] = (activationsByMatch[a.match_id] ?? 0) + 1 })

  const isConfigured = !!club?.football_data_team_id
  const lastSync = club?.matches_synced_at
    ? new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(club.matches_synced_at))
    : null

  // Split matches: upcoming first then past
  const upcoming = matches?.filter(m => m.status === 'upcoming' || m.status === 'live') ?? []
  const past = matches?.filter(m => m.status === 'finished' || m.status === 'cancelled') ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#1d1d1f' }}>Matchs</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(29,29,31,0.55)' }}>
            {isConfigured
              ? <><span className="font-medium" style={{ color: '#1d1d1f' }}>{club.team_name}</span>{lastSync && <span style={{ color: 'rgba(29,29,31,0.45)' }}> · synchro {lastSync}</span>}</>
              : 'Configure ton équipe pour importer le calendrier automatiquement'
            }
          </p>
        </div>
        <div className="flex gap-2">
          <SyncOddsButton clubId={CLUB_ID} />
          <CreateMatchButton clubId={CLUB_ID} />
        </div>
      </div>

      {/* Team setup banner (only if not configured) */}
      {!isConfigured && <TeamNameSetup />}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total matchs', value: matches?.length ?? 0 },
          { label: 'À venir',      value: upcoming.length },
          { label: 'Terminés',     value: past.length },
        ].map(s => (
          <Card key={s.label} variant="dark" className="text-center">
            <p className="text-xl font-black" style={{ color: '#1d1d1f' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(29,29,31,0.45)' }}>{s.label}</p>
          </Card>
        ))}
      </div>

      {matches?.length === 0 && (
        <Card variant="dark" className="text-center py-12">
          <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucun match pour le moment</p>
          <p className="text-gray-600 text-xs mt-1">
            {isConfigured
              ? 'Les matchs de la saison apparaîtront dans quelques instants.'
              : 'Configure ton équipe ci-dessus pour importer le calendrier.'}
          </p>
        </Card>
      )}

      {/* Upcoming matches */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">À venir</h2>
          {upcoming.map(match => <MatchCard key={match.id} match={match} checkins={checkinsByMatch[match.id] ?? 0} activations={activationsByMatch[match.id] ?? 0} />)}
        </div>
      )}

      {/* Past matches */}
      {past.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Résultats</h2>
          {past.map(match => <MatchCard key={match.id} match={match} checkins={checkinsByMatch[match.id] ?? 0} activations={activationsByMatch[match.id] ?? 0} />)}
        </div>
      )}
    </div>
  )
}

function MatchCard({ match, checkins, activations }: {
  match: Database['public']['Tables']['matches']['Row']
  checkins: number
  activations: number
}) {
  const { label, variant } = STATUS_BADGE[match.status]
  const isActive = match.status !== 'finished' && match.status !== 'cancelled'
  return (
    <Card variant="dark" style={{ transition: 'box-shadow 0.15s' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant={variant}>{label}</Badge>
            {match.status === 'finished' && match.home_score !== null && (
              <span className="text-sm font-black tabular-nums" style={{ color: '#1d1d1f' }}>
                {match.home_score} – {match.away_score}
              </span>
            )}
          </div>
          <h3 className="font-bold text-sm" style={{ color: '#1d1d1f' }}>
            {match.home_team}{' '}
            <span className="font-normal" style={{ color: 'rgba(29,29,31,0.40)' }}>vs</span>{' '}
            {match.away_team}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'rgba(29,29,31,0.50)' }}>
            <Calendar className="w-3 h-3 shrink-0" />
            {new Intl.DateTimeFormat('fr-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(match.match_date))}
            {match.venue && <><span style={{ color: 'rgba(29,29,31,0.25)' }}>·</span> {match.venue}</>}
          </div>
          {(checkins > 0 || activations > 0 || match.odds_home) && (
            <div className="flex gap-4 mt-1.5 text-xs flex-wrap" style={{ color: 'rgba(29,29,31,0.45)' }}>
              {checkins > 0 && <span>📲 {checkins} check-ins</span>}
              {activations > 0 && <span>⚡ {activations} activations</span>}
              {match.odds_home != null && (
                <span style={{ color: '#c8860a' }}>
                  {match.odds_home.toFixed(2)} · {match.odds_draw?.toFixed(2)} · {match.odds_away?.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {isActive && (
            <Link
              href={`/club/live/${match.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                background: match.status === 'live' ? '#E1001A' : 'rgba(225,0,26,0.08)',
                color: match.status === 'live' ? '#fff' : '#E1001A',
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
            >
              <Zap className="w-3 h-3" />
              {match.status === 'live' ? 'Gérer le live' : 'Préparer'}
            </Link>
          )}
          <MatchDeleteButton matchId={match.id} />
        </div>
      </div>
    </Card>
  )
}
