import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { assertClubAdmin } from '@/lib/club'
import type { Database } from '@/types/database'

export async function POST(req: NextRequest) {
  const auth = await assertClubAdmin()
  if (!auth || auth.role !== 'super_admin') {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 })
  }

  const body = await req.json()
  const { name, primary_color, secondary_color, stadium_name, city, logo_url } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Le nom du club est requis' }, { status: 400 })
  }

  const slug = name.trim()
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })

  const admin = createAdminClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)

  const { data: existing } = await admin.from('clubs').select('id').eq('slug', slug).maybeSingle()
  const finalSlug = existing ? `${slug}-${Date.now()}` : slug

  const { data: club, error } = await admin
    .from('clubs')
    .insert({
      name: name.trim(),
      slug: finalSlug,
      primary_color: primary_color ?? '#10b981',
      secondary_color: secondary_color ?? '#0f0f1a',
      stadium_name: stadium_name?.trim() || null,
      city: city?.trim() || null,
      logo_url: logo_url?.trim() || null,
    })
    .select('id, name, slug')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ club })
}
