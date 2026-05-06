'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { ScanQrCode, CheckCircle2, XCircle, Loader2, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'error'

interface ScanResult {
  match: { home_team: string; away_team: string; venue: string | null }
  pointsEarned: number
  message?: string
}

export default function ScanPage() {
  const { toast } = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)

  const [state, setState] = useState<ScanState>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [manualToken, setManualToken] = useState('')
  const [nativeScan, setNativeScan] = useState(false)

  useEffect(() => {
    setNativeScan('BarcodeDetector' in window)
    // Auto-start if permission previously granted
    const savedPerm = localStorage.getItem('fp_camera_perm')
    if (savedPerm === 'granted') {
      startCamera()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  function getOrCreateDeviceId(): string {
    const key = 'fp_device_id'
    let id = localStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(key, id)
    }
    return id
  }

  async function validateToken(token: string) {
    setState('processing')
    try {
      const geoPos = await new Promise<GeolocationPosition | null>(resolve => {
        if (!navigator.geolocation) return resolve(null)
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 5000, enableHighAccuracy: true })
      })
      const deviceId = getOrCreateDeviceId()
      const res = await fetch('/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          lat: geoPos?.coords.latitude ?? null,
          lng: geoPos?.coords.longitude ?? null,
          deviceId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setState('error')
        setErrorMsg(data.error ?? 'Erreur de validation.')
        return
      }
      stopCamera()
      setState('success')
      setResult(data)
    } catch {
      setState('error')
      setErrorMsg('Erreur réseau. Réessaie.')
    }
  }

  async function startCamera() {
    setState('scanning')
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } },
      })
      streamRef.current = stream
      localStorage.setItem('fp_camera_perm', 'granted')
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      if ('BarcodeDetector' in window) {
        // @ts-ignore
        const detector = new BarcodeDetector({ formats: ['qr_code'] })
        const loop = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(loop); return
          }
          try {
            // @ts-ignore
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) {
              stopCamera()
              await validateToken(codes[0].rawValue as string)
              return
            }
          } catch {}
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      } else {
        stopCamera()
        setState('idle')
        toast('Scanner non disponible. Entre le code manuellement.', 'info')
      }
    } catch {
      localStorage.removeItem('fp_camera_perm') // permission was revoked
      setState('idle')
      setErrorMsg('Accès caméra refusé. Entre le token manuellement.')
    }
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault()
    if (manualToken.trim()) await validateToken(manualToken.trim())
  }

  function reset() {
    setState('idle'); setResult(null); setErrorMsg(''); setManualToken('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black">Scanner QR</h1>
        <p className="text-gray-400 text-sm mt-1">Scanne le code affiché au stade</p>
      </div>

      {state === 'idle' && (
        <div className="space-y-4">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border border-white/10 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
              <ScanQrCode className="w-9 h-9 text-emerald-400" />
            </div>
            <p className="text-gray-400 text-sm text-center max-w-[180px]">
              Appuie sur le bouton pour scanner
            </p>
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-emerald-500/60 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-emerald-500/60 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-emerald-500/60 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-emerald-500/60 rounded-br-lg" />
          </div>
          <Button onClick={startCamera} className="w-full py-3">
            <ScanQrCode className="w-4 h-4 mr-2" /> Activer la caméra
          </Button>
        </div>
      )}

      {state === 'scanning' && (
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-black border border-emerald-500/40">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2/3 h-0.5 bg-emerald-400/50 animate-pulse" />
          </div>
          <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />
          <div className="absolute bottom-0 inset-x-0 p-4">
            <Button variant="secondary" onClick={() => { stopCamera(); setState('idle') }} className="w-full">
              Annuler
            </Button>
          </div>
        </div>
      )}

      {state === 'processing' && (
        <div className="aspect-square rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
          <p className="text-gray-400">Validation en cours…</p>
        </div>
      )}

      {state === 'success' && result && (
        <Card variant="dark" className="border border-emerald-500/40">
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-emerald-400">Check-in validé !</h2>
              <p className="text-gray-400 text-sm mt-1">{result.match.home_team} vs {result.match.away_team}</p>
              {result.match.venue && (
                <div className="flex items-center justify-center gap-1 mt-1 text-xs text-gray-500">
                  <MapPin className="w-3 h-3" />{result.match.venue}
                </div>
              )}
            </div>
            <div className="py-3 px-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 inline-block">
              <p className="text-3xl font-black text-emerald-400">+{result.pointsEarned} pts</p>
              <p className="text-xs text-gray-400 mt-1">ajoutés à ton solde</p>
            </div>
            {result.message && <p className="text-xs text-gray-400">{result.message}</p>}
            <Button onClick={reset} variant="secondary" className="w-full">Fermer</Button>
          </div>
        </Card>
      )}

      {state === 'error' && (
        <Card variant="dark" className="border border-red-500/40">
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-red-400">Validation échouée</h2>
              <p className="text-gray-400 text-sm mt-2">{errorMsg}</p>
            </div>
            <Button onClick={reset} variant="secondary" className="w-full">Réessayer</Button>
          </div>
        </Card>
      )}

      {(state === 'idle' || state === 'error') && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500">code manuel</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <form onSubmit={handleManual} className="flex gap-2">
            <input
              value={manualToken}
              onChange={e => setManualToken(e.target.value)}
              placeholder="Colle le token QR ici…"
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600"
            />
            <Button type="submit" disabled={!manualToken.trim()} size="sm" className="shrink-0 px-4">OK</Button>
          </form>
        </div>
      )}

      {state === 'idle' && (
        <div className="space-y-2">
          {[
            { icon: '📍', title: 'Au stade uniquement', desc: 'Valide uniquement en présence physique au stade.' },
            { icon: '🔒', title: 'Un check-in par match', desc: 'Tu ne peux scanner qu\'une seule fois par rencontre.' },
          ].map(item => (
            <Card key={item.title} variant="dark">
              <div className="flex items-start gap-3">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
