'use client'
import { useState } from 'react'
import { Trash2, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

export function MatchDeleteButton({ matchId }: { matchId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/club/matches/${matchId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      toast('Match supprimé', 'success')
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      onBlur={() => setConfirming(false)}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        confirming
          ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
          : 'bg-white/5 hover:bg-white/10 text-gray-400'
      }`}
    >
      {loading
        ? <Loader2 className="w-3 h-3 animate-spin" />
        : <Trash2 className="w-3 h-3" />
      }
      {confirming ? 'Confirmer ?' : 'Supprimer'}
    </button>
  )
}
