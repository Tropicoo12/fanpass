import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Database } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { LiveMatchControl } from './LiveMatchControl'

export default async function LiveMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()

  if (!match) notFound()

  const [{ data: activations }, { data: checkinCount }, { data: pronoCount }] = await Promise.all([
    supabase.from('activations').select('*').eq('match_id', match.id).order('created_at', { ascending: false }),
    supabase.from('checkins').select('*', { count: 'exact', head: true }).eq('match_id', match.id),
    supabase.from('pronostics').select('*', { count: 'exact', head: true }).eq('match_id', match.id),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">Match Live</h1>
          <p className="text-gray-400 text-sm mt-1">{match.home_team} vs {match.away_team}</p>
        </div>
        <Badge variant={match.status === 'live' ? 'success' : match.status === 'upcoming' ? 'info' : 'neutral'}>
          {match.status === 'live' ? '🔴 En direct' : match.status === 'upcoming' ? 'À venir' : 'Terminé'}
        </Badge>
      </div>

      {/* Match stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Check-ins', value: checkinCount?.toString() ?? '0' },
          { label: 'Pronostics', value: pronoCount?.toString() ?? '0' },
          { label: 'Activations', value: activations?.length.toString() ?? '0' },
        ].map(s => (
          <Card key={s.label} variant="dark" className="text-center">
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <LiveMatchControl match={match} activations={activations ?? []} />
    </div>
  )
}
