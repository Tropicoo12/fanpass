'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { getLoyaltyLevel, LOYALTY_CONFIG } from '@/types/database'

interface Props {
  userId: string
  clubId: string
  initialPoints: number
  initialLifetime: number
  primaryColor?: string
}

export function FanPointsBadge({ userId, clubId, initialPoints, initialLifetime, primaryColor }: Props) {
  const [totalPoints, setTotalPoints] = useState(initialPoints)
  const [lifetimePoints, setLifetimePoints] = useState(initialLifetime)

  useEffect(() => {
    const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    supabase
      .from('fan_points')
      .select('total_points')
      .eq('user_id', userId)
      .eq('club_id', clubId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setTotalPoints(data.total_points)
          setLifetimePoints(data.total_points)
        }
      })

    const channel = supabase
      .channel('fan-points')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fan_points',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as Database['public']['Tables']['fan_points']['Row']
            if (row.club_id === clubId) {
              setTotalPoints(row.total_points)
              setLifetimePoints(row.lifetime_points ?? row.total_points)
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, clubId])

  const loyaltyLevel = getLoyaltyLevel(lifetimePoints)
  const levelConfig = LOYALTY_CONFIG[loyaltyLevel]
  const clubColor = primaryColor ?? '#10b981'

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-xs font-bold px-2 py-0.5 rounded-full border"
        style={{ color: levelConfig.color, borderColor: levelConfig.color + '40', background: levelConfig.color + '15' }}
      >
        {levelConfig.name}
      </span>
      <div
        className="rounded-full px-3 py-1 text-sm font-bold"
        style={{ background: clubColor + '33', color: clubColor }}
      >
        {totalPoints.toLocaleString('fr-BE')} pts
      </div>
    </div>
  )
}
