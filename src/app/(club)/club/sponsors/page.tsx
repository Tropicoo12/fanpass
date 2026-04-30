import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { SponsorsManager } from './SponsorsManager'
import { Card } from '@/components/ui/Card'
import { redirect } from 'next/navigation'
import { getAdminClubId } from '@/lib/club'

export default async function SponsorsAdminPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const CLUB_ID = await getAdminClubId()
  if (!CLUB_ID) redirect('/auth/login')

  const [{ data: sponsors }, { data: surveys }, { data: responses }] = await Promise.all([
    supabase.from('sponsors').select('*').eq('club_id', CLUB_ID).order('sort_order'),
    supabase.from('surveys').select('*, sponsors(name), survey_questions(id)').eq('club_id', CLUB_ID).order('created_at', { ascending: false }),
    supabase.from('survey_responses').select('survey_id, points_earned'),
  ])

  const responsesBySurvey: Record<string, number> = {}
  responses?.forEach(r => { responsesBySurvey[r.survey_id] = (responsesBySurvey[r.survey_id] ?? 0) + 1 })

  const totalPointsDistributed = responses?.reduce((a, r) => a + r.points_earned, 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: '#1d1d1f' }}>Sponsors & Sondages</h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(29,29,31,0.55)' }}>Gérez les partenaires et leurs sondages fans</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Sponsors actifs', value: sponsors?.filter(s => s.is_active).length ?? 0 },
          { label: 'Sondages actifs', value: surveys?.filter(s => s.is_active).length ?? 0 },
          { label: 'Pts distribués', value: totalPointsDistributed.toLocaleString('fr-BE') },
        ].map(s => (
          <Card key={s.label} variant="dark" className="text-center">
            <p className="text-xl font-black" style={{ color: '#1d1d1f' }}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(29,29,31,0.45)' }}>{s.label}</p>
          </Card>
        ))}
      </div>

      <SponsorsManager
        sponsors={sponsors ?? []}
        surveys={surveys ?? []}
        responsesBySurvey={responsesBySurvey}
        clubId={CLUB_ID}
      />
    </div>
  )
}
