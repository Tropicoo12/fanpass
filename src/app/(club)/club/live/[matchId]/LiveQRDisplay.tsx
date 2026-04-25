'use client'
import { useEffect, useState, useCallback } from 'react'
import QRCode from 'react-qr-code'
import { RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface Props {
  matchId: string
}

interface TokenData {
  token: string
  qrValue: string
  expiresIn: number
}

export function LiveQRDisplay({ matchId }: Props) {
  const [data, setData] = useState<TokenData | null>(null)
  const [countdown, setCountdown] = useState(30)
  const [loading, setLoading] = useState(true)

  const fetchToken = useCallback(async () => {
    try {
      const res = await fetch(`/api/club/matches/${matchId}/live-token`, { cache: 'no-store' })
      if (!res.ok) return
      const json = await res.json()
      setData(json)
      setCountdown(json.expiresIn)
    } finally {
      setLoading(false)
    }
  }, [matchId])

  // Fetch on mount and auto-refresh when countdown reaches 0
  useEffect(() => { fetchToken() }, [fetchToken])

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchToken()
          return 30
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [fetchToken])

  const pct = (countdown / 30) * 100
  const circumference = 2 * Math.PI * 20
  const urgent = countdown <= 8

  if (loading) {
    return (
      <Card variant="dark" className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
      </Card>
    )
  }

  return (
    <Card variant="dark" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">QR Code check-in</h3>
        <div className="flex items-center gap-2">
          <svg className="-rotate-90 w-10 h-10" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <circle
              cx="22" cy="22" r="20" fill="none"
              stroke={urgent ? '#f87171' : '#10b981'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s' }}
            />
          </svg>
          <span className={`text-sm font-black tabular-nums ${urgent ? 'text-red-400' : 'text-emerald-400'}`}>
            {countdown}s
          </span>
        </div>
      </div>

      {data && (
        <div className="flex flex-col items-center gap-4">
          {/* QR Code */}
          <div className="p-4 bg-white rounded-2xl">
            <QRCode value={data.qrValue} size={200} />
          </div>

          {/* Text code for manual entry */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Code manuel</p>
            <p className={`text-2xl font-black tracking-[0.25em] font-mono transition-colors ${urgent ? 'text-red-400' : 'text-emerald-400'}`}>
              {data.token}
            </p>
            <p className="text-xs text-gray-600 mt-1">Se régénère automatiquement toutes les 30s</p>
          </div>
        </div>
      )}
    </Card>
  )
}
