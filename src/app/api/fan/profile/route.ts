import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/types/database'

export async function PATCH(req: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { full_name, username, phone, birth_year } = body

  if (username !== null && username !== undefined) {
    const trimmed = String(username).trim()
    if (trimmed.length > 0 && !/^[a-z0-9_.-]{2,30}$/.test(trimmed)) {
      return NextResponse.json({ error: 'Nom d\'utilisateur invalide (2-30 caractères, lettres minuscules, chiffres, _ . -)' }, { status: 400 })
    }
    if (trimmed.length > 0) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', trimmed)
        .neq('id', user.id)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({ error: 'Ce nom d\'utilisateur est déjà pris' }, { status: 409 })
      }
    }
  }

  type ProfileUpdate = {
    full_name?: string | null
    username?: string | null
    phone?: string | null
    birth_year?: number | null
  }
  const updates: ProfileUpdate = {}
  if (full_name !== undefined) updates.full_name = full_name || null
  if (username !== undefined) updates.username = username?.trim() || null
  if (phone !== undefined) updates.phone = phone || null
  if (birth_year !== undefined) updates.birth_year = birth_year ?? null

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
