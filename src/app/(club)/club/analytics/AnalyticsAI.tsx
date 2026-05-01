'use client'
import { useState } from 'react'
import { Send, Loader2, Sparkles, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

interface AutoInsight {
  emoji: string
  title: string
  body: string
  color: string
}

interface Props {
  insights: AutoInsight[]
  clubId: string
}

const SUGGESTED = [
  'Quel est le taux de check-in moyen ?',
  'Quels fans sont les plus à risque de churn ?',
  'Quelle activation a eu le plus de succès ?',
  'Quels matchs ont généré le plus d\'engagement ?',
]

export function AnalyticsAI({ insights, clubId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [history, setHistory] = useState<{ q: string; a: string }[]>([])

  async function ask(q?: string) {
    const text = q ?? question
    if (!text.trim()) return
    setLoading(true)
    setAnswer(null)
    try {
      const res = await fetch('/api/club/analytics/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur IA', 'error'); return }
      setHistory(h => [...h, { q: text, a: data.answer }])
      setAnswer(data.answer)
      setQuestion('')
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function resetSeason() {
    if (!confirm('Remettre les points de classement saison à zéro pour tous les fans ? (leurs points disponibles ne changent pas)')) return
    setResetting(true)
    try {
      const res = await fetch('/api/club/reset-season', { method: 'POST' })
      if (!res.ok) { toast('Erreur lors de la réinitialisation', 'error'); return }
      toast('Saison réinitialisée ! Les classements sont remis à zéro.', 'success')
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Auto insights */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4" style={{ color: '#6a1b9a' }} />
          <h2 className="font-bold" style={{ color: '#1d1d1f' }}>Insights automatiques</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.map((ins, i) => (
            <div key={i} style={{
              background: ins.color + '08',
              border: `1px solid ${ins.color}20`,
              borderRadius: 16, padding: '14px 16px',
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', margin: '0 0 4px' }}>
                {ins.emoji} {ins.title}
              </p>
              <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.60)', margin: 0 }}>{ins.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Chat */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 20, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(106,27,154,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={14} color="#6a1b9a" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>Demande à l&apos;IA</p>
            <p style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', margin: 0 }}>Pose n&apos;importe quelle question sur tes données</p>
          </div>
        </div>

        {/* Suggested questions */}
        {history.length === 0 && !answer && (
          <div style={{ padding: '12px 16px 0' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.40)', textTransform: 'uppercase', letterSpacing: 0.3, margin: '0 0 8px' }}>Suggestions</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUGGESTED.map(s => (
                <button key={s} onClick={() => ask(s)}
                  style={{
                    fontSize: 12, padding: '6px 12px', borderRadius: 100,
                    background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)',
                    color: '#1d1d1f', cursor: 'pointer', transition: 'all 0.1s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat history */}
        {history.length > 0 && (
          <div style={{ padding: '12px 16px', maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map((item, i) => (
              <div key={i}>
                {/* Question */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                  <div style={{ background: '#1d1d1f', color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '8px 12px', maxWidth: '80%', fontSize: 13 }}>
                    {item.q}
                  </div>
                </div>
                {/* Answer */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(106,27,154,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                    <Sparkles size={11} color="#6a1b9a" />
                  </div>
                  <div style={{ background: '#f5f5f7', borderRadius: '4px 14px 14px 14px', padding: '8px 12px', maxWidth: '80%', fontSize: 13, color: '#1d1d1f', lineHeight: 1.5 }}>
                    {item.a}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(106,27,154,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={11} color="#6a1b9a" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
                <div style={{ background: '#f5f5f7', borderRadius: '4px 14px 14px 14px', padding: '8px 12px', fontSize: 13, color: 'rgba(29,29,31,0.45)' }}>
                  Analyse en cours…
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <div style={{ padding: '12px 16px 14px', display: 'flex', gap: 8 }}>
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !loading && ask()}
            placeholder="Ex : Quel est le taux d'engagement sur les derniers matchs ?"
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 12,
              border: '1px solid rgba(0,0,0,0.10)', background: '#f9f9f9',
              fontSize: 13, color: '#1d1d1f', outline: 'none',
            }}
          />
          <button
            onClick={() => ask()}
            disabled={loading || !question.trim()}
            style={{
              width: 40, height: 40, borderRadius: 12, border: 'none',
              background: question.trim() ? '#1d1d1f' : '#f0f0f0',
              color: question.trim() ? '#fff' : 'rgba(29,29,31,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: question.trim() ? 'pointer' : 'not-allowed', flexShrink: 0,
            }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
          </button>
        </div>
      </div>

      {/* Season reset */}
      <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>Réinitialiser le classement saison</p>
          <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.50)', margin: '2px 0 0' }}>
            Remet les points de classement à zéro. Les points disponibles des fans ne changent pas.
          </p>
        </div>
        <button
          onClick={resetSeason}
          disabled={resetting}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(225,0,26,0.25)',
            background: 'rgba(225,0,26,0.06)', color: '#E1001A',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
            opacity: resetting ? 0.6 : 1,
          }}
        >
          {resetting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw size={13} />}
          Réinitialiser
        </button>
      </div>
    </div>
  )
}
