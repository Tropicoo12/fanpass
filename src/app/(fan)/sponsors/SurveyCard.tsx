'use client'
import { useState } from 'react'
import { Clock, ChevronRight, Loader2, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'

interface Question {
  id: string
  question: string
  type: string
  options: unknown
  is_required: boolean
  sort_order: number
}

interface Survey {
  id: string
  title: string
  description: string | null
  points_reward: number
  estimated_minutes: number
  sponsors: { name: string; logo_url: string | null; primary_color: string } | null
  survey_questions: Question[]
}

export function SurveyCard({ survey, userId }: { survey: Survey; userId: string }) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const questions = [...(survey.survey_questions ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const current = questions[step]
  const isLast = step === questions.length - 1

  function setAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  function next() {
    if (current?.is_required && !answers[current.id]) {
      toast('Réponds à cette question pour continuer', 'info')
      return
    }
    if (isLast) {
      submit()
    } else {
      setStep(s => s + 1)
    }
  }

  async function submit() {
    setLoading(true)
    try {
      const res = await fetch('/api/surveys/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyId: survey.id, answers }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Erreur', 'error'); return }
      setDone(true)
      router.refresh()
    } catch {
      toast('Erreur réseau', 'error')
    } finally {
      setLoading(false)
    }
  }

  function openSurvey() {
    setStep(0); setAnswers({}); setDone(false); setOpen(true)
  }

  return (
    <>
      <Card variant="dark" className="border border-white/8 hover:border-white/15 transition-colors">
        <button onClick={openSurvey} className="w-full text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              {survey.sponsors && (
                <div className="flex items-center gap-1.5 mb-2">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: survey.sponsors.primary_color + '30', color: survey.sponsors.primary_color }}
                  >
                    {survey.sponsors.name[0]}
                  </div>
                  <span className="text-xs text-gray-500">{survey.sponsors.name}</span>
                </div>
              )}
              <h3 className="font-bold text-sm leading-tight">{survey.title}</h3>
              {survey.description && <p className="text-xs text-gray-400 mt-1">{survey.description}</p>}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />{survey.estimated_minutes} min
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {questions.length} question{questions.length > 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <p className="text-sm font-black text-emerald-400">+{survey.points_reward}</p>
                <p className="text-[10px] text-gray-500">pts</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </button>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title={done ? '🎉 Merci !' : survey.title}>
        {done ? (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto">
              <Star className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-400">+{survey.points_reward} pts</p>
              <p className="text-gray-400 text-sm mt-1">ajoutés à ton solde</p>
            </div>
            <p className="text-sm text-gray-400">Merci d'avoir participé à ce sondage !</p>
            <Button onClick={() => setOpen(false)} className="w-full">Fermer</Button>
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-400">Ce sondage n'a pas encore de questions.</p>
            <Button onClick={() => setOpen(false)} variant="secondary" className="w-full mt-4">Fermer</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Question {step + 1} / {questions.length}</span>
                <span>+{survey.points_reward} pts à la fin</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${((step + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-4">{current?.question}</h3>
              {current?.type === 'single_choice' && !!current.options && (
                <div className="space-y-2">
                  {(current.options as string[]).map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setAnswer(current.id, opt)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        answers[current.id] === opt
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {current?.type === 'rating' && (
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setAnswer(current.id, String(n))}
                      className={`w-12 h-12 rounded-xl border text-lg font-black transition-all ${
                        answers[current.id] === String(n)
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
              {current?.type === 'nps' && (
                <div className="flex gap-1.5 flex-wrap justify-center">
                  {Array.from({ length: 11 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setAnswer(current.id, String(i))}
                      className={`w-10 h-10 rounded-xl border text-sm font-bold transition-all ${
                        answers[current.id] === String(i)
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              )}
              {current?.type === 'text' && (
                <textarea
                  value={(answers[current.id] as string) ?? ''}
                  onChange={e => setAnswer(current.id, e.target.value)}
                  placeholder="Ta réponse…"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-600 resize-none"
                />
              )}
            </div>

            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="secondary" onClick={() => setStep(s => s - 1)} className="flex-1">
                  Retour
                </Button>
              )}
              <Button onClick={next} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isLast ? 'Terminer' : 'Suivant'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
