import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Database } from '@/types/database'
import { ClubSidebarNav, ClubMobileNav } from '@/components/ClubNav'

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()

  return (
    <div className="min-h-screen bg-[#0a0a14] flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-white/5 shrink-0 h-screen sticky top-0">
        <div className="px-4 py-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-base">🏟️</div>
            <div>
              <p className="font-black text-sm leading-tight">FanPass</p>
              <p className="text-[10px] text-gray-500">Club Admin</p>
            </div>
          </div>
        </div>

        <ClubSidebarNav />

        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
              {profile?.full_name?.[0] ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name ?? 'Admin'}</p>
              <p className="text-[10px] text-gray-500 capitalize">{profile?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-40 bg-[#0a0a14]/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏟️</span>
            <span className="font-black text-sm">FanPass Club</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>

        <ClubMobileNav />
      </div>
    </div>
  )
}
