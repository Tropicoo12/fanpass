import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function SponsorReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find sponsor by token
  const { data: sponsor } = await admin
    .from('sponsors')
    .select('*, clubs(name, primary_color, logo_url)')
    .eq('report_token' as any, token)
    .single()

  if (!sponsor) return notFound()

  // Get surveys for this sponsor
  const { data: surveys } = await admin
    .from('surveys')
    .select('*, survey_questions(*)')
    .eq('sponsor_id', sponsor.id)

  const surveyIds = surveys?.map(s => s.id) ?? []

  // Get all responses
  const { data: responses } = surveyIds.length > 0
    ? await admin
        .from('survey_responses')
        .select('survey_id, points_earned, created_at')
        .in('survey_id', surveyIds)
    : { data: [] }

  // Stats
  const totalResponses = responses?.length ?? 0
  const totalPointsDistributed = responses?.reduce((a, r) => a + r.points_earned, 0) ?? 0

  // Response counts by survey
  const responsesBySurvey: Record<string, number> = {}
  responses?.forEach(r => {
    responsesBySurvey[r.survey_id] = (responsesBySurvey[r.survey_id] ?? 0) + 1
  })

  const club = (sponsor as any).clubs
  const primaryColor = club?.primary_color ?? '#E1001A'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      color: '#1d1d1f',
    }}>
      {/* Header */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {club?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={club.logo_url} alt={club.name} style={{ width: 40, height: 40, objectFit: 'contain' }} />
          )}
          <div>
            <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.45)', margin: 0 }}>
              Rapport partenaire — {club?.name}
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#1d1d1f' }}>
              {sponsor.name}
            </h1>
          </div>
        </div>
        {(sponsor as any).logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={(sponsor as any).logo_url}
            alt={sponsor.name}
            style={{ height: 40, objectFit: 'contain', opacity: 0.8 }}
          />
        )}
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { label: 'Réponses totales', value: totalResponses.toLocaleString('fr-BE'), icon: '📊' },
            { label: 'Pts distribués', value: totalPointsDistributed.toLocaleString('fr-BE'), icon: '⭐' },
            { label: 'Sondages actifs', value: (surveys?.filter(s => s.is_active).length ?? 0).toString(), icon: '✅' },
          ].map(k => (
            <div key={k.label} style={{
              background: '#fff',
              borderRadius: 16,
              padding: '24px 20px',
              border: '1px solid rgba(0,0,0,0.08)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{k.icon}</div>
              <p style={{ fontSize: 28, fontWeight: 800, color: primaryColor, margin: 0 }}>{k.value}</p>
              <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.50)', margin: '4px 0 0' }}>{k.label}</p>
            </div>
          ))}
        </div>

        {/* Surveys breakdown */}
        {surveys && surveys.length > 0 ? (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px' }}>Détail par sondage</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {surveys.map(survey => {
                const count = responsesBySurvey[survey.id] ?? 0
                const questions = (survey as any).survey_questions ?? []
                return (
                  <div key={survey.id} style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: 24,
                    border: '1px solid rgba(0,0,0,0.08)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{survey.title}</h3>
                        {survey.description && (
                          <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.50)', margin: '4px 0 0' }}>
                            {survey.description}
                          </p>
                        )}
                      </div>
                      <div style={{
                        background: primaryColor + '12',
                        color: primaryColor,
                        padding: '6px 14px',
                        borderRadius: 100,
                        fontSize: 13,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}>
                        {count} réponse{count !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Questions list */}
                    {questions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {questions.map((q: any, i: number) => (
                          <div key={q.id} style={{
                            padding: '10px 14px',
                            background: 'rgba(0,0,0,0.03)',
                            borderRadius: 10,
                            fontSize: 13,
                            color: '#1d1d1f',
                          }}>
                            <span style={{ fontWeight: 600, color: 'rgba(29,29,31,0.45)', marginRight: 8 }}>
                              Q{i + 1}.
                            </span>
                            {q.question}
                            {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {q.options.map((opt: string) => (
                                  <span key={opt} style={{
                                    padding: '2px 10px',
                                    borderRadius: 100,
                                    background: primaryColor + '15',
                                    color: primaryColor,
                                    fontSize: 12,
                                    fontWeight: 500,
                                  }}>
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.40)', fontStyle: 'italic', margin: 0 }}>
                        Aucune question configurée
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '48px 24px',
            border: '1px solid rgba(0,0,0,0.08)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', margin: '0 0 6px' }}>
              Aucun sondage associé
            </p>
            <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.45)', margin: 0 }}>
              Ce partenaire n&apos;a pas encore de sondages actifs.
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '16px 0', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.35)', margin: 0 }}>
            Rapport généré par FanPass · Données en temps réel
          </p>
        </div>
      </div>
    </div>
  )
}
