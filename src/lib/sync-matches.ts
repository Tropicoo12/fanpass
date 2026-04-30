import { createClient as createAdminClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import type { Database } from '@/types/database'

const SPORT = 'soccer_belgium_first_div'
const COOLDOWN_MS = 60 * 60 * 1000 // 1 hour

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

export interface SyncResult {
  created: number
  updated: number
  skipped: boolean
  reason?: string
}

export async function syncMatchesForClub(clubId: string, force = false): Promise<SyncResult> {
  const oddsApiKey = process.env.ODDS_API_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!oddsApiKey || !serviceKey) return { created: 0, updated: 0, skipped: true, reason: 'missing_env' }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { data: club } = await admin
    .from('clubs')
    .select('team_name, matches_synced_at')
    .eq('id', clubId)
    .single()

  if (!force && club?.matches_synced_at) {
    const elapsed = Date.now() - new Date(club.matches_synced_at).getTime()
    if (elapsed < COOLDOWN_MS) return { created: 0, updated: 0, skipped: true, reason: 'cooldown' }
  }

  const url = `https://api.the-odds-api.com/v4/sports/${SPORT}/odds?apiKey=${oddsApiKey}&regions=eu&markets=h2h&oddsFormat=decimal`

  let events: OddsEvent[]
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return { created: 0, updated: 0, skipped: true, reason: `odds_api_${res.status}` }
    events = await res.json()
  } catch {
    return { created: 0, updated: 0, skipped: true, reason: 'network_error' }
  }

  const teamName = club?.team_name?.trim()
  const filtered = teamName
    ? events.filter(e => e.home_team === teamName || e.away_team === teamName)
    : events

  let created = 0
  let updated = 0

  for (const event of filtered) {
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

    const { data: existing } = await admin
      .from('matches')
      .select('id')
      .eq('external_id', event.id)
      .maybeSingle()

    if (existing) {
      await admin.from('matches').update({ odds_home: oddsHome, odds_draw: oddsDraw, odds_away: oddsAway }).eq('id', existing.id)
      updated++
    } else {
      await admin.from('matches').insert({
        club_id: clubId,
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

  await admin.from('clubs').update({ matches_synced_at: new Date().toISOString() }).eq('id', clubId)

  return { created, updated, skipped: false }
}

export async function fetchAvailableTeams(): Promise<string[]> {
  const oddsApiKey = process.env.ODDS_API_KEY
  if (!oddsApiKey) return []

  try {
    const url = `https://api.the-odds-api.com/v4/sports/${SPORT}/odds?apiKey=${oddsApiKey}&regions=eu&markets=h2h&oddsFormat=decimal`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return []
    const events: OddsEvent[] = await res.json()
    const teams = new Set<string>()
    for (const e of events) {
      teams.add(e.home_team)
      teams.add(e.away_team)
    }
    return Array.from(teams).sort()
  } catch {
    return []
  }
}
