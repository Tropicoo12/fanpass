import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { Database } from '@/types/database'
import { getDefaultClubId } from '@/lib/club'

const TYPE_ICONS: Record<string, string> = {
  general: '📢',
  match_start: '⚽',
  activation: '⚡',
  reward: '🎁',
  result: '🏆',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `Il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `Il y a ${days}j`
}

export default async function NotificationsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const CLUB_ID = (await getDefaultClubId()) ?? ''

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('club_id', CLUB_ID)
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(30)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Notifications</h1>
        <p className="text-gray-400 text-sm mt-1">Messages de ton club</p>
      </div>

      {notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map(n => (
            <Card key={n.id} variant="dark" className="border border-white/5">
              <div className="flex gap-3">
                <div className="text-2xl shrink-0">{TYPE_ICONS[n.type] ?? '📢'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sm">{n.title}</p>
                    <span className="text-[10px] text-gray-500 shrink-0">{timeAgo(n.sent_at!)}</span>
                  </div>
                  <p className="text-sm text-gray-300 mt-0.5">{n.body}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card variant="dark" className="text-center py-12">
          <Bell className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Aucune notification pour le moment</p>
        </Card>
      )}
    </div>
  )
}
