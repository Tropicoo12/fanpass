import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { assertClubAdmin } from '@/lib/club'
import type { Database } from '@/types/database'

export async function POST(req: NextRequest) {
  const auth = await assertClubAdmin()
  if (!auth || auth.role !== 'super_admin') {
    return NextResponse.json({ error: 'Réservé au super admin' }, { status: 403 })
  }

  const { email, full_name, club_id } = await req.json()
  if (!email || !club_id) {
    return NextResponse.json({ error: 'Email et club requis' }, { status: 400 })
  }

  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create user with a temporary password they'll reset
  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'

  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: full_name || email.split('@')[0] },
  })

  if (createError) {
    const msg = createError.message.includes('already') ? 'Cet email est déjà utilisé.' : createError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Set role and club in profiles
  await admin.from('profiles').upsert({
    id: newUser.user.id,
    full_name: full_name || email.split('@')[0],
    role: 'club_admin',
    club_id,
  })

  return NextResponse.json({ success: true, tempPassword })
}
