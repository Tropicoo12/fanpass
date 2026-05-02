'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  matchId: string
}

// Polls the live score every 60s and refreshes the page if score/status changed.
// Works on any Vercel plan — no cron needed.
export function LiveMatchSync({ matchId }: Props) {
  const router = useRouter()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const sync = async () => {
      try {
        const res = await fetch('/api/fan/live-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ match_id: matchId }),
        })
        if (!res.ok) return
        const data = await res.json()
        if (data.changed) {
          router.refresh()
        }
      } catch {
        // Ignore network errors — next tick will retry
      }
    }

    // First sync after 30s (page just loaded, give it a moment)
    const initial = setTimeout(sync, 30_000)

    // Then every 60s
    intervalRef.current = setInterval(sync, 60_000)

    return () => {
      clearTimeout(initial)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [matchId, router])

  return null
}
