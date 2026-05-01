import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { assertClubAdmin } from '@/lib/club'
import type { Database } from '@/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getAdmin() {
  return createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const auth = await assertClubAdmin()
  if (!auth || !auth.clubId) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const question: string = body?.question ?? ''
  if (!question.trim()) return NextResponse.json({ error: 'Question manquante' }, { status: 400 })

  const supabase = getAdmin()
  const clubId = auth.clubId

  const [
    { data: fans },
    { data: matches },
    { data: checkins },
    { data: transactions },
    { data: activations },
    { data: bets },
  ] = await Promise.all([
    supabase.from('leaderboard').select('total_points, season_points, loyalty_level, full_name').eq('club_id', clubId).limit(50),
    supabase.from('matches').select('id, home_team, away_team, match_date, status, home_score, away_score').eq('club_id', clubId).order('match_date', { ascending: false }).limit(20),
    supabase.from('checkins').select('match_id, created_at').limit(500),
    supabase.from('points_transactions').select('amount, type, created_at').eq('club_id', clubId).order('created_at', { ascending: false }).limit(500),
    supabase.from('activations').select('title, type, response_count, status, match_id').eq('club_id', clubId).limit(50),
    supabase.from('match_bets').select('points_staked, points_won, is_settled, odds, created_at').eq('club_id', clubId).limit(200),
  ])

  const checkinsByMatch: Record<string, number> = {}
  checkins?.forEach((c: { match_id: string }) => {
    checkinsByMatch[c.match_id] = (checkinsByMatch[c.match_id] ?? 0) + 1
  })

  const pointsByType: Record<string, number> = {}
  transactions?.forEach((t: { amount: number; type: string }) => {
    if (t.amount > 0) pointsByType[t.type] = (pointsByType[t.type] ?? 0) + t.amount
  })

  const loyaltyBreakdown = [0,1,2,3,4].map(l => ({
    level: ['Bronze','Silver','Gold','Platinum','Diamond'][l],
    count: fans?.filter((f: { loyalty_level: number | null }) => f.loyalty_level === l).length ?? 0,
  }))

  const totalFans = fans?.length ?? 0
  const avgPoints = totalFans > 0
    ? Math.round(fans!.reduce((a: number, f: { total_points: number | null }) => a + (f.total_points ?? 0), 0) / totalFans)
    : 0

  const context = `
# Données FanPass — Club ID: ${clubId}

## Fans (${totalFans} total)
- Niveaux: ${loyaltyBreakdown.map(l => `${l.level}: ${l.count}`).join(', ')}
- Points moyens: ${avgPoints}
- Top 5: ${fans?.slice(0,5).map((f: { full_name: string | null; total_points: number | null }) => `${f.full_name ?? 'Anonyme'} (${f.total_points} pts)`).join(', ') ?? 'aucun'}

## Matchs récents (${matches?.length ?? 0})
${matches?.slice(0,10).map((m: { home_team: string; away_team: string; status: string; match_date: string; home_score: number | null; away_score: number | null; id: string }) =>
  `- ${m.home_team} vs ${m.away_team} | ${m.status} | ${new Date(m.match_date).toLocaleDateString('fr-BE')}${m.status==='finished' ? ` | Score: ${m.home_score}-${m.away_score}` : ''} | Check-ins: ${checkinsByMatch[m.id]??0}`
).join('\n') ?? 'aucun'}

## Points par source
${Object.entries(pointsByType).map(([t,v]) => `- ${t}: ${v} pts`).join('\n') || '- Aucune transaction'}

## Activations (${activations?.length ?? 0})
${activations?.slice(0,8).map((a: { title: string; type: string; status: string; response_count: number }) => `- ${a.title} (${a.type}, ${a.status}): ${a.response_count} réponses`).join('\n') ?? 'aucune'}

## Paris (${bets?.length ?? 0} total)
- Total misé: ${bets?.reduce((a: number, b: { points_staked: number }) => a + b.points_staked, 0) ?? 0} pts
- Total gagné: ${bets?.filter((b: { is_settled: boolean }) => b.is_settled).reduce((a: number, b: { points_won: number | null }) => a + (b.points_won ?? 0), 0) ?? 0} pts
- Cote moy.: ${bets?.length ? (bets.reduce((a: number, b: { odds: number }) => a + b.odds, 0) / bets.length).toFixed(2) : 'N/A'}
`.trim()

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: `Tu es un assistant analytique pour un club sportif sur FanPass.
Tu analyses les données d'engagement des supporters.
Réponds en français, de manière concise (max 3-4 phrases).
Si une donnée demandée n'est pas disponible, dis-le clairement.`,
      messages: [
        { role: 'user', content: `Données:\n${context}\n\nQuestion: ${question}` }
      ],
    })

    const answer = message.content[0].type === 'text' ? message.content[0].text : 'Erreur de réponse.'
    return NextResponse.json({ answer })
  } catch (err) {
    console.error('Anthropic error:', err)
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
  }
}
