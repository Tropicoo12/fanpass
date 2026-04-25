'use client'
import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2, ScanQrCode } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type ValidateState = 'idle' | 'loading' | 'success' | 'error'

interface RewardResult {
  reward: { title: string; points_cost: number; category: string }
  pointsSpent: number
}

export default function ValidateRewardPage() {
  const [code, setCode] = useState('')
  const [state, setState] = useState<ValidateState>('idle')
  const [result, setResult] = useState<RewardResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function validate(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setState('loading')
    setResult(null)
    setErrorMsg('')
    try {
      const res = await fetch('/api/club/rewards/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setState('error')
        setErrorMsg(data.error ?? 'Erreur de validation')
        return
      }
      setState('success')
      setResult(data)
    } catch {
      setState('error')
      setErrorMsg('Erreur réseau')
    }
  }

  function reset() {
    setCode('')
    setState('idle')
    setResult(null)
    setErrorMsg('')
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black">Valider une récompense</h1>
        <p className="text-gray-400 text-sm mt-1">Entre ou scanne le code du fan pour valider l&apos;échange</p>
      </div>

      <Card variant="dark">
        <form onSubmit={validate} className="space-y-4">
          <Input
            label="Code de rédemption"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="ex : A3F9"
            className="font-mono tracking-widest text-lg"
          />
          <Button type="submit" disabled={state === 'loading' || !code.trim()} className="w-full">
            {state === 'loading'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <><ScanQrCode className="w-4 h-4 mr-2" />Valider le code</>
            }
          </Button>
        </form>
      </Card>

      {state === 'success' && result && (
        <Card variant="dark" className="border border-emerald-500/40">
          <div className="text-center space-y-3 py-2">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-emerald-400">Récompense validée !</h2>
              <p className="text-gray-300 font-semibold mt-1">{result.reward.title}</p>
              <p className="text-sm text-gray-400 mt-0.5">{result.pointsSpent.toLocaleString('fr-BE')} pts échangés</p>
            </div>
            <p className="text-xs text-gray-500">Code invalidé définitivement — une capture d&apos;écran ne fonctionnera plus.</p>
            <Button onClick={reset} variant="secondary" className="w-full">Valider un autre code</Button>
          </div>
        </Card>
      )}

      {state === 'error' && (
        <Card variant="dark" className="border border-red-500/40">
          <div className="text-center space-y-3 py-2">
            <div className="w-14 h-14 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center mx-auto">
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-red-400">Validation échouée</h2>
              <p className="text-gray-400 text-sm mt-1">{errorMsg}</p>
            </div>
            <Button onClick={reset} variant="secondary" className="w-full">Réessayer</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
