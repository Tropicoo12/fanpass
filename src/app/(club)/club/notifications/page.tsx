import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Megaphone } from 'lucide-react'
import { NotificationComposer } from './NotificationComposer'
import { redirect } from 'next/navigation'
import { getAdminClubId } from '@/lib/club'

export default async function NotificationsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const CLUB_ID = await getAdminClubId()
  if (!CLUB_ID) redirect('/auth/login')

  const [{ data: notifications }, { data: matches }] = await Promise.all([
    supabase.from('notifications').select('*').eq('club_id', CLUB_ID).order('created_at', { ascending: false }).limit(30),
    supabase.from('matches').select('id, home_team, away_team, match_date').eq('club_id', CLUB_ID).in('status', ['upcoming', 'live']).order('match_date').limit(5),
  ])

  const sentCount = notifications?.filter(n => n.sent_at).length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Notifications</h1>
        <p className="text-gray-400 text-sm mt-1">Envoyez des messages push à vos fans</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Envoyées', value: sentCount },
          { label: 'Planifiées', value: notifications?.filter(n => !n.sent_at && n.scheduled_for).length ?? 0 },
          { label: 'Total brouillons', value: notifications?.filter(n => !n.sent_at && !n.scheduled_for).length ?? 0 },
        ].map(s => (
          <Card key={s.label} variant="dark" className="text-center">
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <NotificationComposer clubId={CLUB_ID} matches={matches ?? []} />

      {/* Sent history */}
      <div>
        <h2 className="font-bold mb-3">Historique</h2>
        {!notifications?.length ? (
          <Card variant="dark" className="text-center py-8 text-gray-500">
            <Megaphone className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            Aucune notification envoyée
          </Card>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <Card key={n.id} variant="dark">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{n.title}</p>
                      <Badge variant={n.sent_at ? 'success' : n.scheduled_for ? 'info' : 'neutral'}>
                        {n.sent_at ? 'Envoyée' : n.scheduled_for ? 'Planifiée' : 'Brouillon'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400">{n.body}</p>
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
                      <span>Audience : {n.audience}</span>
                      {n.sent_at && <span>{n.sent_count} envois · {new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(n.sent_at))}</span>}
                      {n.scheduled_for && !n.sent_at && <span>Planif. {new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(n.scheduled_for))}</span>}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
