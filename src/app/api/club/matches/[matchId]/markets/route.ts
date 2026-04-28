import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

type Profile = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'role' | 'club_id'>
type MarketInsert = Database['public']['Tables']['match_markets']['Insert']
type MarketOption = { key: string; label: string; odds: number }

async function getAdminProfile(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, club_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['club_admin', 'super_admin'].includes(profile.role)) return null
  return profile
}

function canManageClub(profile: Profile, clubId: string) {
  return profile.role === 'super_admin' || profile.club_id === clubId
}

function optionKey(label: string, index: number) {
  const base = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return base || `option_${index + 1}`
}

function normalizeOptions(value: unknown): MarketOption[] | null {
  if (!Array.isArray(value)) return null

  const used = new Set<string>()
  const options = value
    .map((raw, index) => {
      if (!raw || typeof raw !== 'object') return null
      const item = raw as Record<string, unknown>
      const label = String(item.label ?? '').trim()
      const odds = Number(item.odds)
      if (!label || !Number.isFinite(odds) || odds <= 1 || odds > 99) return null

      let key = String(item.key ?? optionKey(label, index)).trim()
      key = key || optionKey(label, index)
      if (used.has(key)) key = `${key}_${index + 1}`
      used.add(key)

      return { key, label, odds: Number(odds.toFixed(2)) }
    })
    .filter((option): option is MarketOption => option !== null)

  return options.length >= 2 ? options : null
}

function normalizeDate(value: unknown): string | null {
  if (!value) return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const supabase = await createClient()
  const profile = await getAdminProfile(supabase)
  if (!profile) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { matchId } = await params
  const { data: match } = await supabase
    .from('matches')
    .select('id, club_id')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
  if (!canManageClub(profile, match.club_id)) {
    return NextResponse.json({ error: 'Club non autorisé' }, { status: 403 })
  }

  const { data: markets, error } = await supabase
    .from('match_markets')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ markets: markets ?? [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const supabase = await createClient()
  const profile = await getAdminProfile(supabase)
  if (!profile) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { matchId } = await params
  const body = await request.json()

  const { data: match } = await supabase
    .from('matches')
    .select('id, club_id')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
  if (!canManageClub(profile, match.club_id)) {
    return NextResponse.json({ error: 'Club non autorisé' }, { status: 403 })
  }

  const marketKey = String(body.market_key ?? '').trim()
  const marketLabel = String(body.market_label ?? '').trim()
  const marketEmoji = String(body.market_emoji ?? '🎯').trim() || '🎯'
  const options = normalizeOptions(body.options)

  if (!marketKey || !marketLabel || !options) {
    return NextResponse.json({ error: 'Question, type de marché et options valides requis' }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('[markets POST] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
  }

  const admin = createAdminClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const insertPayload: MarketInsert = {
    match_id: match.id,
    club_id: match.club_id,
    market_key: marketKey,
    market_label: marketLabel,
    market_emoji: marketEmoji,
    options: options as unknown as Json,
    is_published: Boolean(body.is_published),
    closes_at: normalizeDate(body.closes_at),
  }

  const { data: market, error } = await admin
    .from('match_markets')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    console.error('[markets POST] Supabase error:', error.code, error.message)
    return NextResponse.json({ error: `Erreur DB: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true, market })
}
