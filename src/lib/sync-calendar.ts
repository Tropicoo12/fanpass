import { createClient as createAdminClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'
import type { Database } from '@/types/database'

const BASE_URL = 'https://api.football-data.org/v4'
const COOLDOWN_MS = 60 * 60 * 1000 // 1 hour

// Competitions available on the free tier + common paid competitions
export const COMPETITIONS = [
  { code: 'BSL', name: 'Belgian Pro League', flag: '🇧🇪' },
  { code: 'PL',  name: 'Premier League',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'BL1', name: 'Bundesliga',         flag: '🇩🇪' },
  { code: 'SA',  name: 'Serie A',            flag: '🇮🇹' },
  { code: 'PD',  name: 'La Liga',            flag: '🇪🇸' },
  { code: 'FL1', name: 'Ligue 1',            flag: '🇫🇷' },
  { code: 'DED', name: 'Eredivisie',         flag: '🇳🇱' },
  { code: 'PPL', name: 'Primeira Liga',      flag: '🇵🇹' },
  { code: 'CL',  name: 'Champions League',   flag: '🏆' },
]

interface FDTeam {
  id: number
  name: string
  shortName: string
  crest: string
}

interface FDMatch {
  id: number
  utcDate: string
  status: 'TIMED' | 'SCHEDULED' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'CANCELLED' | 'POSTPONED' | 'SUSPENDED'
  homeTeam: { id: number; name: string }
  awayTeam: { id: number; name: string }
  score: {
    fullTime: { home: number | null; away: number | null }
  }
  venue: string | null
}

function fdStatusToLocal(status: FDMatch['status']): 'upcoming' | 'live' | 'finished' | 'cancelled' {
  if (status === 'FINISHED') return 'finished'
  if (status === 'IN_PLAY' || status === 'PAUSED') return 'live'
  if (status === 'CANCELLED' || status === 'POSTPONED' || status === 'SUSPENDED') return 'cancelled'
  return 'upcoming'
}

function getCurrentSeason(): number {
  const now = new Date()
  // Football season typically starts in July/August
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
}

async function fdFetch<T>(path: string): Promise<T | null> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY
  const headers: HeadersInit = apiKey ? { 'X-Auth-Token': apiKey } : {}
  try {
    const res = await fetch(`${BASE_URL}${path}`, { headers, cache: 'no-store' })
    if (!res.ok) {
      console.error(`[football-data] ${path} → ${res.status}`)
      return null
    }
    return res.json()
  } catch (err) {
    console.error(`[football-data] fetch error:`, err)
    return null
  }
}

export async function fetchCompetitionTeams(code: string): Promise<FDTeam[]> {
  const data = await fdFetch<{ teams: FDTeam[] }>(`/competitions/${code}/teams`)
  return data?.teams ?? []
}

export interface CalendarSyncResult {
  created: number
  updated: number
  skipped: boolean
  reason?: string
}

export async function syncCalendarForClub(clubId: string, force = false): Promise<CalendarSyncResult> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return { created: 0, updated: 0, skipped: true, reason: 'missing_service_key' }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  const { data: club } = await admin
    .from('clubs')
    .select('football_data_team_id, competition_code, matches_synced_at')
    .eq('id', clubId)
    .single()

  if (!club?.football_data_team_id) {
    return { created: 0, updated: 0, skipped: true, reason: 'no_team_configured' }
  }

  if (!force && club.matches_synced_at) {
    const elapsed = Date.now() - new Date(club.matches_synced_at).getTime()
    if (elapsed < COOLDOWN_MS) return { created: 0, updated: 0, skipped: true, reason: 'cooldown' }
  }

  const season = getCurrentSeason()
  const data = await fdFetch<{ matches: FDMatch[] }>(
    `/teams/${club.football_data_team_id}/matches?season=${season}`
  )

  if (!data?.matches) return { created: 0, updated: 0, skipped: true, reason: 'api_error' }

  let created = 0
  let updated = 0

  for (const match of data.matches) {
    const externalId = `fd_${match.id}`
    const status = fdStatusToLocal(match.status)
    const homeScore = match.score.fullTime.home
    const awayScore = match.score.fullTime.away

    const { data: existing } = await admin
      .from('matches')
      .select('id')
      .eq('external_id', externalId)
      .maybeSingle()

    if (existing) {
      await admin.from('matches').update({
        status,
        home_score: homeScore,
        away_score: awayScore,
        venue: match.venue ?? null,
      }).eq('id', existing.id)
      updated++
    } else {
      await admin.from('matches').insert({
        club_id: clubId,
        home_team: match.homeTeam.name,
        away_team: match.awayTeam.name,
        match_date: match.utcDate,
        venue: match.venue ?? null,
        status,
        home_score: homeScore,
        away_score: awayScore,
        qr_code_token: randomBytes(32).toString('hex'),
        checkin_points: 50,
        prediction_points_exact: 100,
        prediction_points_winner: 30,
        external_id: externalId,
      })
      created++
    }
  }

  await admin.from('clubs').update({ matches_synced_at: new Date().toISOString() }).eq('id', clubId)

  return { created, updated, skipped: false }
}
