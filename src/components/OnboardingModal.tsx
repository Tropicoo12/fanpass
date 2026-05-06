'use client'
import { useState, useEffect } from 'react'

interface Props {
  primaryColor: string
  clubName: string
}

const STEPS = [
  {
    emoji: '📲',
    title: 'Scanne ton billet',
    desc: 'À chaque match, scanne le QR code affiché au stade pour valider ta présence et gagner des points.',
  },
  {
    emoji: '⭐',
    title: 'Accumule des points',
    desc: 'Réponds aux sondages, participe aux pronostics et aux activations live pour gagner encore plus.',
  },
  {
    emoji: '🎁',
    title: 'Échange tes récompenses',
    desc: 'Utilise tes points pour obtenir des maillots, des expériences VIP et des réductions exclusives.',
  },
]

export function OnboardingModal({ primaryColor, clubName }: Props) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const done = localStorage.getItem('fp_onboarded_v1')
      if (!done) setVisible(true)
    }
  }, [])

  async function finish() {
    setLoading(true)
    try {
      await fetch('/api/fan/onboarding-bonus', { method: 'POST' })
    } catch {}
    localStorage.setItem('fp_onboarded_v1', '1')
    setLoading(false)
    setVisible(false)
    window.location.reload()
  }

  if (!visible) return null

  const current = STEPS[step]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: '#fff', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 480,
        padding: '32px 24px 40px',
        textAlign: 'center',
      }}>
        {/* Club name */}
        <p style={{ fontSize: 12, fontWeight: 600, color: primaryColor, marginBottom: 24, letterSpacing: 1, textTransform: 'uppercase' }}>
          {clubName}
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 32 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 24 : 8, height: 8,
              borderRadius: 100,
              background: i === step ? primaryColor : 'rgba(0,0,0,0.12)',
              transition: 'all 0.3s ease',
            }} />
          ))}
        </div>

        {/* Content */}
        <div style={{ fontSize: 64, marginBottom: 20 }}>{current.emoji}</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1d1d1f', margin: '0 0 12px' }}>{current.title}</h2>
        <p style={{ fontSize: 15, color: 'rgba(29,29,31,0.55)', lineHeight: 1.6, margin: '0 0 32px' }}>{current.desc}</p>

        {/* CTA */}
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 14,
              background: primaryColor, color: '#fff',
              fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer',
            }}
          >
            Suivant →
          </button>
        ) : (
          <div>
            <div style={{
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(46,125,50,0.08)',
              border: '1px solid rgba(46,125,50,0.20)',
              marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 20 }}>🎁</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#2e7d32' }}>+50 pts de bienvenue offerts !</span>
            </div>
            <button
              onClick={finish}
              disabled={loading}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14,
                background: primaryColor, color: '#fff',
                fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Chargement…' : 'Commencer 🚀'}
            </button>
          </div>
        )}

        <button
          onClick={() => { localStorage.setItem('fp_onboarded_v1', '1'); setVisible(false) }}
          style={{ marginTop: 12, fontSize: 13, color: 'rgba(29,29,31,0.40)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Passer
        </button>
      </div>
    </div>
  )
}
