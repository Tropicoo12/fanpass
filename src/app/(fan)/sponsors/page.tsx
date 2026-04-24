import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Clock, CheckCircle2, Gift } from 'lucide-react'
import { SurveyCard } from './SurveyCard'
import { getDefaultClubId } from '@/lib/club'

export default async function SponsorsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const CLUB_ID = (await getDefaultClubId()) ?? ''

  const [{ data: surveys }, { data: myResponses }, { data: sponsors }] = await Promise.all([
    supabase.from('surveys')
      .select('*, sponsors(name, logo_url, primary_color), survey_questions(*)')
      .eq('club_id', CLUB_ID)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase.from('survey_responses').select('survey_id, points_earned').eq('user_id', user.id),
    supabase.from('sponsors').select('*').eq('club_id', CLUB_ID).eq('is_active', true).order('sort_order'),
  ])

  const completedSurveyIds = new Set(myResponses?.map(r => r.survey_id) ?? [])
  const totalEarned = myResponses?.reduce((acc, r) => acc + r.points_earned, 0) ?? 0

  const available = surveys?.filter(s => !completedSurveyIds.has(s.id)) ?? []
  const completed = surveys?.filter(s => completedSurveyIds.has(s.id)) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Sponsors</h1>
        <p className="text-gray-400 text-sm mt-1">Réponds aux sondages et gagne des points</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card variant="dark" className="text-center">
          <p className="text-xl font-black text-emerald-400">{totalEarned}</p>
          <p className="text-xs text-gray-500">pts gagnés via sponsors</p>
        </Card>
        <Card variant="dark" className="text-center">
          <p className="text-xl font-black">{completed.length}</p>
          <p className="text-xs text-gray-500">sondages complétés</p>
        </Card>
      </div>

      {/* Active sponsors strip */}
      {sponsors && sponsors.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Partenaires du club</p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {sponsors.map(s => (
              <div
                key={s.id}
                className="shrink-0 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-xs font-bold"
                  style={{ background: s.primary_color + '30', color: s.primary_color }}>
                  {s.name[0]}
                </div>
                <span className="text-sm font-medium whitespace-nowrap">{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available surveys */}
      {available.length > 0 ? (
        <div>
          <h2 className="font-bold mb-3">Sondages disponibles</h2>
          <div className="space-y-3">
            {available.map(survey => (
              <SurveyCard key={survey.id} survey={survey} userId={user.id} />
            ))}
          </div>
        </div>
      ) : (
        <Card variant="dark" className="text-center py-8">
          <Gift className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Aucun sondage disponible pour le moment</p>
          <p className="text-gray-600 text-sm mt-1">Reviens lors du prochain match !</p>
        </Card>
      )}

      {/* Completed surveys */}
      {completed.length > 0 && (
        <div>
          <h2 className="font-bold mb-3 text-gray-400">Déjà complétés</h2>
          <div className="space-y-2">
            {completed.map(s => {
              const earned = myResponses?.find(r => r.survey_id === s.id)?.points_earned ?? 0
              return (
                <Card key={s.id} variant="dark" className="opacity-60">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <p className="text-sm font-medium">{s.title}</p>
                    </div>
                    <Badge variant="success">+{earned} pts</Badge>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
