'use client'
import { useState } from 'react'
import { Plus, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { useRouter } from 'next/navigation'
import type { Sponsor, Survey } from '@/types/database'

interface Props {
  sponsors: Sponsor[]
  surveys: (Survey & { sponsors: { name: string } | null; survey_questions: { id: string }[] })[]
  responsesBySurvey: Record<string, number>
  clubId: string
}

const inputCls = 'w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E1001A]'
const inputStyle = { background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)', color: '#1d1d1f' }
const labelStyle: React.CSSProperties = { color: 'rgba(29,29,31,0.65)', fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 6 }

export function SponsorsManager({ sponsors, surveys, responsesBySurvey, clubId }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [sponsorModal, setSponsorModal] = useState(false)
  const [surveyModal, setSurveyModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const [sponsorForm, setSponsorForm] = useState({ name: '', website_url: '', primary_color: '#E1001A' })
  const [surveyForm, setSurveyForm] = useState({
    title: '',
    description: '',
    points_reward: 50,
    sponsor_id: '',
    estimated_minutes: 2,
    expires_at: '',
  })

  async function createSponsor(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      const res = await fetch('/api/club/sponsors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sponsorForm, club_id: clubId }),
      })
      if (!res.ok) { toast('Erreur', 'error'); return }
      toast('Sponsor créé !', 'success'); setSponsorModal(false); router.refresh()
    } catch { toast('Erreur réseau', 'error') } finally { setLoading(false) }
  }

  async function createSurvey(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    try {
      const res = await fetch('/api/club/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...surveyForm,
          club_id: clubId,
          sponsor_id: surveyForm.sponsor_id || null,
          expires_at: surveyForm.expires_at || null,
        }),
      })
      if (!res.ok) { toast('Erreur', 'error'); return }
      toast('Sondage créé !', 'success'); setSurveyModal(false); router.refresh()
    } catch { toast('Erreur réseau', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      {/* Sponsors */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold" style={{ color: '#1d1d1f' }}>Sponsors</h2>
          <Button size="sm" onClick={() => setSponsorModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />Ajouter
          </Button>
        </div>
        {sponsors.length === 0 && (
          <Card variant="dark" className="text-center py-6">
            <p style={{ color: 'rgba(29,29,31,0.45)' }}>Aucun sponsor</p>
          </Card>
        )}
        <div className="space-y-2">
          {sponsors.map(s => (
            <Card key={s.id} variant="dark">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border"
                  style={{ background: s.primary_color + '25', color: s.primary_color, borderColor: s.primary_color + '40' }}>
                  {s.name[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: '#1d1d1f' }}>{s.name}</p>
                  {s.website_url && <p className="text-xs" style={{ color: 'rgba(29,29,31,0.45)' }}>{s.website_url}</p>}
                </div>
                <Badge variant={s.is_active ? 'success' : 'neutral'}>{s.is_active ? 'Actif' : 'Inactif'}</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Surveys */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold" style={{ color: '#1d1d1f' }}>Sondages</h2>
          <Button size="sm" onClick={() => setSurveyModal(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />Créer
          </Button>
        </div>
        {surveys.length === 0 && (
          <Card variant="dark" className="text-center py-6">
            <p style={{ color: 'rgba(29,29,31,0.45)' }}>Aucun sondage</p>
          </Card>
        )}
        <div className="space-y-2">
          {surveys.map(survey => {
            const responses = responsesBySurvey[survey.id] ?? 0
            const isOpen = expanded === survey.id
            return (
              <Card key={survey.id} variant="dark">
                <button
                  onClick={() => setExpanded(isOpen ? null : survey.id)}
                  className="w-full flex items-center gap-3"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm" style={{ color: '#1d1d1f' }}>{survey.title}</p>
                      <Badge variant={survey.is_active ? 'success' : 'neutral'}>
                        {survey.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <div className="flex gap-3 mt-1 text-xs" style={{ color: 'rgba(29,29,31,0.45)' }}>
                      {survey.sponsors && <span>{survey.sponsors.name}</span>}
                      <span>{survey.survey_questions?.length ?? 0} questions</span>
                      <span style={{ color: '#E1001A' }}>{responses} réponses</span>
                      <span>+{survey.points_reward} pts</span>
                    </div>
                  </div>
                  {isOpen
                    ? <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'rgba(29,29,31,0.40)' }} />
                    : <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'rgba(29,29,31,0.40)' }} />
                  }
                </button>
                {isOpen && (
                  <div className="mt-3 pt-3 text-xs space-y-1" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', color: 'rgba(29,29,31,0.50)' }}>
                    {survey.description && <p>{survey.description}</p>}
                    <p>Durée estimée : {survey.estimated_minutes} min</p>
                    {survey.expires_at && <p>Expire : {new Intl.DateTimeFormat('fr-BE').format(new Date(survey.expires_at))}</p>}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Sponsor modal */}
      <Modal open={sponsorModal} onClose={() => setSponsorModal(false)} title="Ajouter un sponsor">
        <form onSubmit={createSponsor} className="space-y-4">
          <Input label="Nom *" value={sponsorForm.name} onChange={e => setSponsorForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Site web" placeholder="https://..." value={sponsorForm.website_url} onChange={e => setSponsorForm(f => ({ ...f, website_url: e.target.value }))} />
          <div>
            <label style={labelStyle}>Couleur principale</label>
            <input type="color" value={sponsorForm.primary_color} onChange={e => setSponsorForm(f => ({ ...f, primary_color: e.target.value }))}
              className="w-full h-10 rounded-xl cursor-pointer"
              style={{ background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)' }} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer le sponsor'}
          </Button>
        </form>
      </Modal>

      {/* Survey modal */}
      <Modal open={surveyModal} onClose={() => setSurveyModal(false)} title="Nouveau sondage">
        <form onSubmit={createSurvey} className="space-y-4">
          <Input label="Titre *" value={surveyForm.title} onChange={e => setSurveyForm(f => ({ ...f, title: e.target.value }))} required />
          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={surveyForm.description} onChange={e => setSurveyForm(f => ({ ...f, description: e.target.value }))} rows={2}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#E1001A] resize-none"
              style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Points récompense</label>
              <input type="number" min={0} value={surveyForm.points_reward} onChange={e => setSurveyForm(f => ({ ...f, points_reward: +e.target.value }))}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Durée (min)</label>
              <input type="number" min={1} value={surveyForm.estimated_minutes} onChange={e => setSurveyForm(f => ({ ...f, estimated_minutes: +e.target.value }))}
                className={inputCls} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Sponsor (optionnel)</label>
            <select value={surveyForm.sponsor_id} onChange={e => setSurveyForm(f => ({ ...f, sponsor_id: e.target.value }))}
              className={inputCls} style={inputStyle}>
              <option value="">Aucun</option>
              {sponsors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <Input label="Expire le (optionnel)" type="datetime-local" value={surveyForm.expires_at} onChange={e => setSurveyForm(f => ({ ...f, expires_at: e.target.value }))} />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer le sondage'}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
