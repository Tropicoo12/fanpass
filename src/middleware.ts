import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Club routes: require auth + club_admin role
  if (pathname.startsWith('/club')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?next=' + encodeURIComponent(pathname), request.url))
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'club_admin' && profile?.role !== 'super_admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Fan routes: require auth
  const fanRoutes = ['/home', '/scan', '/pronostics', '/rewards', '/sponsors', '/classement', '/activations', '/notifications']
  const isFanRoute = fanRoutes.some(r => pathname.startsWith(r))
  if (isFanRoute && !user) {
    return NextResponse.redirect(new URL('/auth/login?next=' + encodeURIComponent(pathname), request.url))
  }

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith('/auth/') && user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'club_admin' || profile?.role === 'super_admin') {
      return NextResponse.redirect(new URL('/club/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/home', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
