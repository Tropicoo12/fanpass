import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createClient } from '@/lib/supabase/server'

// Window size in ms — token rotates every 30 seconds
const WINDOW_MS = 30_000

export function generateRotatingToken(matchId: string, window: number): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createHmac('sha256', secret)
    .update(`${matchId}:${window}`)
    .digest('hex')
    .slice(0, 8)
    .toUpperCase()
}

export function currentWindow(): number {
  return Math.floor(Date.now() / WINDOW_MS)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { matchId } = await params

  const { data: match } = await supabase
    .from('matches')
    .select('id, status, home_team, away_team')
    .eq('id', matchId)
    .single()

  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })

  const win = currentWindow()
  const token = generateRotatingToken(matchId, win)
  const msIntoWindow = Date.now() % WINDOW_MS
  const expiresIn = Math.ceil((WINDOW_MS - msIntoWindow) / 1000) // seconds remaining

  // QR value encodes matchId + token so fan scan can identify the match
  const qrValue = `${matchId}:${token}`

  return NextResponse.json({ token, qrValue, expiresIn, windowMs: WINDOW_MS })
}
