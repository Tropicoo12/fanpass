'use client'
import { useState } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

export function SyncOddsButton({ clubId }: { clubId: string }) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  async function sync() {
    setLoading(true)
    try {
      const res = await fetch('/api/club/sync-odds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ club_id: clubId }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur sync', 'error'); return }
      toast(`Sync OK — ${data.created} créés, ${data.updated} mis à jour`, 'success')
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={sync}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs font-medium transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
      Sync cotes
    </button>
  )
}
