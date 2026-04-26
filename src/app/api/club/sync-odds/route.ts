import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import type { Database, MarketOption } from '@/types/database'

async function assertClubAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return p && ['club_admin', 'super_admin'].includes(p.role) ? user : null
}

interface OddsOutcome { name: string; price: number }
interface OddsMarket { key: string; outcomes: OddsOutcome[] }
interface OddsBookmaker { markets: OddsMarket[] }
interface OddsEvent {
  id: string
  home_team: string
  away_team: string
  commence_time: string
  bookmakers: OddsBookmaker[]
}

function extractH2h(event: OddsEvent): { oddsHome: number | null; oddsDraw: number | null; oddsAway: number | null } {
  for (const bk of event.bookmakers) {
    const h2h = bk.markets.find(m => m.key === 'h2h')
    if (!h2h) continue
    const home = h2h.outcomes.find(o => o.name === event.home_team)
    const away = h2h.outcomes.find(o => o.name === event.away_team)
    const draw = h2h.outcomes.find(o => o.name === 'Draw')
    if (home && away) {
      return {
        oddsHome: Math.round(home.price * 100) / 100,
        oddsAway: Math.round(away.price * 100) / 100,
        oddsDraw: draw ? Math.round(draw.price * 100) / 100 : null,
      }
    }
  }
  return { oddsHome: null, oddsDraw: null, oddsAway: null }
}

function teamMatchesClub(teamName: string, clubTokens: string[]): boolean {
  const t = teamName.toLowerCase()
  return clubTokens.some(token => t.includes(token))
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  if (!await assertClubAdmin(supabase)) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { club_id } = await request.json()
  if (!club_id) return NextResponse.json({ error: 'club_id manquant' }, { status: 400 })

  const oddsApiKey = process.env.ODDS_API_KEY
  if (!oddsApiKey) return NextResponse.json({ error: 'ODDS_API_KEY non configurée' }, { status: 500 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })

  // Fetch club name to filter events
  const { data: club } = await supabase.from('clubs').select('name').eq('id', club_id).single()
  const clubName = club?.name ?? ''
  // Tokenize: significant words only (>3 chars), lowercased
  const clubTokens = clubName.toLowerCase().split(/[\s\-]+/).filter(w => w.length > 3)
  // Fallback: always match everything if no tokens
  const hasFilter = clubTokens.length > 0

  const oddsUrl = `https://api.the-odds-api.com/v4/sports/soccer_belgium_first_div/odds?apiKey=${oddsApiKey}&regions=eu&markets=h2h,totals&oddsFormat=decimal`

  let allEvents: OddsEvent[]
  try {
    const res = await fetch(oddsUrl, { cache: 'no-store' })
    if (!res.ok) {
      const text = await res.text()
      console.error('[sync-odds] Odds API error:', res.status, text)
      return NextResponse.json({ error: `Odds API: ${res.status}` }, { status: 502 })
    }
    allEvents = await res.json()
  } catch (err) {
    console.error('[sync-odds] fetch error:', err)
    return NextResponse.json({ error: 'Erreur réseau Odds API' }, { status: 502 })
  }

  // Filter to club's matches
  const events = hasFilter
    ? allEvents.filter(e =>
        teamMatchesClub(e.home_team, clubTokens) || teamMatchesClub(e.away_team, clubTokens)
      )
    : allEvents

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  let created = 0
  let updated = 0

  for (const event of events) {
    const { oddsHome, oddsDraw, oddsAway } = extractH2h(event)

    // Check if match already exists by external_id
    const { data: existing } = await admin
      .from('matches')
      .select('id, home_team, away_team')
      .eq('external_id', event.id)
      .maybeSingle()

    let matchId: string

    if (existing) {
      await admin.from('matches').update({
        odds_home: oddsHome,
        odds_draw: oddsDraw,
        odds_away: oddsAway,
      }).eq('id', existing.id)
      matchId = existing.id
      updated++
    } else {
      const { data: inserted, error } = await admin.from('matches').insert({
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
      }).select('id').single()
      if (error) {
        console.error('[sync-odds] insert error:', error.code, error.message)
        continue
      }
      matchId = inserted!.id
      created++
    }

    // Auto-create/update h2h market if we have odds
    if (oddsHome !== null && oddsAway !== null) {
      const marketOptions: MarketOption[] = [
        { name: event.home_team, odds: oddsHome },
        { name: 'Match nul', odds: oddsDraw ?? 3.00 },
        { name: event.away_team, odds: oddsAway },
      ]
      const { data: existingMarket } = await admin
        .from('match_markets')
        .select('id')
        .eq('match_id', matchId)
        .eq('market_type', 'h2h')
        .maybeSingle()

      if (existingMarket) {
        await admin.from('match_markets').update({
          options: marketOptions,
          title: 'Vainqueur du match',
        }).eq('id', existingMarket.id)
      } else {
        await admin.from('match_markets').insert({
          match_id: matchId,
          club_id,
          market_type: 'h2h',
          title: 'Vainqueur du match',
          options: marketOptions,
          is_active: true,
          min_bet: 25,
          max_bet: 500,
          status: 'open',
        })
      }
    }
  }

  return NextResponse.json({
    success: true,
    created,
    updated,
    total: events.length,
    filtered: hasFilter,
    clubName,
  })
}
