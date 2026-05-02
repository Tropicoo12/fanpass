'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function LiveRefresher() {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15_000)
    return () => clearInterval(t)
  }, [router])
  return null
}
