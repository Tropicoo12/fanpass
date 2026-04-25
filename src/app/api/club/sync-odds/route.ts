import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import type { Database } from '@/types/database'

async function assertClubAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return p && ['club_admin', 'super_admin'].includes(p.role) ? user : null
}

interface OddsEvent {
  id: string
  home_team: string
  away_team: string
  commence_time: string
  bookmakers: Array<{
    markets: Array<{
      key: string
      outcomes: Array<{ name: string; price: number }>
    }>
  }>
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  if (!await assertClubAdmin(supabase)) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { club_id } = await request.json()
  if (!club_id) return NextResponse.json({ error: 'club_id manquant' }, { status: 400 })

  const oddsApiKey = process.env.ODDS_API_KEY
  if (!oddsApiKey) {
    console.error('[sync-odds] ODDS_API_KEY is not set')
    return NextResponse.json({ error: 'ODDS_API_KEY non configurée' }, { status: 500 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[sync-odds] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const oddsUrl = `https://api.the-odds-api.com/v4/sports/soccer_belgium_first_div/odds?apiKey=${oddsApiKey}&regions=eu&markets=h2h&oddsFormat=decimal`

  let events: OddsEvent[]
  try {
    const res = await fetch(oddsUrl, { cache: 'no-store' })
    if (!res.ok) {
      const text = await res.text()
      console.error('[sync-odds] Odds API error:', res.status, text)
      return NextResponse.json({ error: `Odds API: ${res.status}` }, { status: 502 })
    }
    events = await res.json()
  } catch (err) {
    console.error('[sync-odds] fetch error:', err)
    return NextResponse.json({ error: 'Erreur réseau Odds API' }, { status: 502 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  let created = 0
  let updated = 0

  for (const event of events) {
    // Extract h2h odds from first bookmaker
    let oddsHome: number | null = null
    let oddsDraw: number | null = null
    let oddsAway: number | null = null

    for (const bookmaker of event.bookmakers) {
      const h2h = bookmaker.markets.find(m => m.key === 'h2h')
      if (!h2h) continue
      const home = h2h.outcomes.find(o => o.name === event.home_team)
      const away = h2h.outcomes.find(o => o.name === event.away_team)
      const draw = h2h.outcomes.find(o => o.name === 'Draw')
      if (home) oddsHome = Math.round(home.price * 100) / 100
      if (away) oddsAway = Math.round(away.price * 100) / 100
      if (draw) oddsDraw = Math.round(draw.price * 100) / 100
      break
    }

    // Check if match already exists by external_id
    const { data: existing } = await admin
      .from('matches')
      .select('id')
      .eq('external_id', event.id)
      .maybeSingle()

    if (existing) {
      await admin.from('matches').update({
        odds_home: oddsHome,
        odds_draw: oddsDraw,
        odds_away: oddsAway,
      }).eq('id', existing.id)
      updated++
    } else {
      await admin.from('matches').insert({
        club_id,
        home_team: event.home_team,
        away_team: event.away_team,
        match_date: event.commence_time,
        status: 'upcoming',
        qr_code_token: randomBytes(32).toString('hex'),
        checkin_points: 50,
        prediction_points_exact: 100,
        prediction_points_winner: 30,
        external_id: event.id,
        odds_home: oddsHome,
        odds_draw: oddsDraw,
        odds_away: oddsAway,
      })
      created++
    }
  }

  return NextResponse.json({ success: true, created, updated, total: events.length })
}
