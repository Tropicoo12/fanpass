'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ArrowRight, Loader2, Search, ChevronLeft } from 'lucide-react'

interface Competition { code: string; name: string; flag: string }
interface Team { id: number; name: string; shortName: string; crest: string }

const COMPETITIONS: Competition[] = [
  { code: 'BSL', name: 'Belgian Pro League', flag: '🇧🇪' },
  { code: 'PL',  name: 'Premier League',     flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'BL1', name: 'Bundesliga',         flag: '🇩🇪' },
  { code: 'SA',  name: 'Serie A',            flag: '🇮🇹' },
  { code: 'PD',  name: 'La Liga',            flag: '🇪🇸' },
  { code: 'FL1', name: 'Ligue 1',            flag: '🇫🇷' },
  { code: 'DED', name: 'Eredivisie',         flag: '🇳🇱' },
  { code: 'PPL', name: 'Primeira Liga',      flag: '🇵🇹' },
  { code: 'CL',  name: 'Champions League',   flag: '🏆' },
]

const card: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 16,
  border: '1px solid rgba(0,0,0,0.08)',
  padding: 24,
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  border: '1px solid rgba(0,0,0,0.12)',
  background: '#f5f5f7',
  color: '#1d1d1f',
  fontSize: 15,
  outline: 'none',
  boxSizing: 'border-box',
}

const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'rgba(29,29,31,0.50)',
  marginBottom: 6,
  display: 'block',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
}

const STEPS = ['Compétition', 'Identité', 'Branding', 'Stade'] as const

export default function ClubOnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedComp, setSelectedComp] = useState<Competition | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [teamsError, setTeamsError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    name: '', logo_url: '',
    primary_color: '#E1001A', secondary_color: '#ffffff',
    stadium_name: '', city: '',
    football_data_team_id: null as number | null,
    competition_code: null as string | null,
  })

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function selectComp(comp: Competition) {
    setSelectedComp(comp); setTeams([]); setTeamsError(null); setSearch(''); setTeamsLoading(true)
    try {
      const res = await fetch(`/api/club/available-teams?competition=${comp.code}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      setTeams(data.teams ?? [])
    } catch (e) { setTeamsError(e instanceof Error ? e.message : 'Erreur réseau') }
    finally { setTeamsLoading(false) }
  }

  function selectTeam(team: Team) {
    setForm(f => ({ ...f, name: team.name, logo_url: team.crest, football_data_team_id: team.id, competition_code: selectedComp?.code ?? null }))
    setStep(1)
  }

  async function submit() {
    setSaving(true); setError(null)
    try {
      const res = await fetch('/api/club/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erreur'); setSaving(false); return }
      await fetch('/api/club/select', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ club_id: data.club.id }) })
      setDone(true)
      setTimeout(() => router.push('/club/dashboard'), 1800)
    } catch { setError('Erreur réseau'); setSaving(false) }
  }

  if (done) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e8f5e9', border: '2px solid #2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CheckCircle2 size={28} color="#2e7d32" />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: '#1d1d1f' }}>Club créé !</h2>
      <p style={{ color: 'rgba(29,29,31,0.5)', fontSize: 14, margin: 0 }}>Redirection vers le dashboard…</p>
    </div>
  )

  return (
    <div style={{ maxWidth: step === 0 ? 660 : 500, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 4px', color: '#1d1d1f' }}>Nouveau club</h1>
        <p style={{ color: 'rgba(29,29,31,0.45)', fontSize: 14, margin: 0 }}>Étape {step + 1} sur {STEPS.length} — {STEPS[step]}</p>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? '#1d1d1f' : 'rgba(0,0,0,0.10)', transition: 'background 0.2s' }} />
        ))}
      </div>

      {/* STEP 0 — Compétition */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <p style={{ margin: '0 0 16px', fontWeight: 700, fontSize: 15, color: '#1d1d1f' }}>Choisir une compétition</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {COMPETITIONS.map(comp => (
                <button key={comp.code} onClick={() => selectComp(comp)} style={{
                  padding: '12px 8px', borderRadius: 12,
                  border: selectedComp?.code === comp.code ? '2px solid #1d1d1f' : '1px solid rgba(0,0,0,0.10)',
                  background: selectedComp?.code === comp.code ? '#1d1d1f' : '#f5f5f7',
                  color: selectedComp?.code === comp.code ? '#ffffff' : '#1d1d1f',
                  cursor: 'pointer', fontSize: 11, fontWeight: 600,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: 22 }}>{comp.flag}</span>
                  <span style={{ lineHeight: 1.3, textAlign: 'center' }}>{comp.name}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedComp && (
            <div style={card}>
              <p style={{ margin: '0 0 14px', fontWeight: 700, fontSize: 15, color: '#1d1d1f' }}>
                {selectedComp.flag} {selectedComp.name}
              </p>
              {teamsLoading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10, color: 'rgba(29,29,31,0.4)' }}>
                  <Loader2 size={18} className="animate-spin" />
                  <span style={{ fontSize: 14 }}>Chargement des équipes…</span>
                </div>
              )}
              {teamsError && <p style={{ fontSize: 13, color: '#c62828', padding: '10px 14px', background: '#ffebee', borderRadius: 10, margin: 0 }}>{teamsError}</p>}
              {!teamsLoading && teams.length > 0 && (
                <>
                  <div style={{ position: 'relative', marginBottom: 14 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(29,29,31,0.35)', pointerEvents: 'none' }} />
                    <input style={{ ...input, paddingLeft: 34, fontSize: 13 }} placeholder="Rechercher une équipe…" value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                    {teams.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.shortName.toLowerCase().includes(search.toLowerCase())).map(team => (
                      <button key={team.id} onClick={() => selectTeam(team)} style={{
                        padding: '12px 8px', borderRadius: 12,
                        border: '1px solid rgba(0,0,0,0.08)', background: '#f5f5f7',
                        color: '#1d1d1f', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        transition: 'all 0.15s', textAlign: 'center',
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={team.crest} alt={team.name} style={{ width: 36, height: 36, objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                        <span style={{ lineHeight: 1.3 }}>{team.shortName || team.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div style={{ textAlign: 'center' }}>
            <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'rgba(29,29,31,0.40)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
              Créer manuellement sans équipe liée
            </button>
          </div>
        </div>
      )}

      {/* STEP 1 — Identité */}
      {step === 1 && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {form.logo_url && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.logo_url} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1d1d1f' }}>{form.name || '—'}</p>
                {form.competition_code && <p style={{ margin: 0, fontSize: 12, color: 'rgba(29,29,31,0.45)' }}>{COMPETITIONS.find(c => c.code === form.competition_code)?.name}</p>}
              </div>
            </div>
          )}
          <div><label style={label}>Nom du club *</label><input style={input} value={form.name} onChange={set('name')} placeholder="ex : Standard de Liège" autoFocus /></div>
          <div>
            <label style={label}>URL du logo</label>
            <input style={input} value={form.logo_url} onChange={set('logo_url')} placeholder="https://…/logo.png" />
            <p style={{ fontSize: 11, color: 'rgba(29,29,31,0.35)', margin: '4px 0 0' }}>PNG ou SVG avec fond transparent</p>
          </div>
        </div>
      )}

      {/* STEP 2 — Branding */}
      {step === 2 && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Preview */}
          <div style={{ padding: '16px 20px', borderRadius: 14, background: form.primary_color, display: 'flex', alignItems: 'center', gap: 14 }}>
            {form.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={form.logo_url} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: form.secondary_color }}>{form.name[0]?.toUpperCase() || 'C'}</div>
            }
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: form.secondary_color }}>{form.name || 'Nom du club'}</p>
              <p style={{ margin: 0, fontSize: 12, color: form.secondary_color, opacity: 0.7 }}>{form.city || 'Ville'}</p>
            </div>
          </div>
          <div>
            <label style={label}>Couleur principale</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={form.primary_color} onChange={set('primary_color')} style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer', padding: 2, background: '#f5f5f7' }} />
              <input style={{ ...input, flex: 1, fontFamily: 'monospace' }} value={form.primary_color} onChange={set('primary_color')} />
            </div>
          </div>
          <div>
            <label style={label}>Couleur du texte</label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="color" value={form.secondary_color} onChange={set('secondary_color')} style={{ width: 44, height: 44, borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', cursor: 'pointer', padding: 2, background: '#f5f5f7' }} />
              <input style={{ ...input, flex: 1, fontFamily: 'monospace' }} value={form.secondary_color} onChange={set('secondary_color')} />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 — Stade */}
      {step === 3 && (
        <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div><label style={label}>Nom du stade</label><input style={input} value={form.stadium_name} onChange={set('stadium_name')} placeholder="ex : Stade de Sclessin" autoFocus /></div>
          <div><label style={label}>Ville</label><input style={input} value={form.city} onChange={set('city')} placeholder="ex : Liège" /></div>

          {/* Summary */}
          <div style={{ padding: 16, borderRadius: 12, background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.06)', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontWeight: 600, color: 'rgba(29,29,31,0.45)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Récapitulatif</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {form.logo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={form.logo_url} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                : <div style={{ width: 28, height: 28, borderRadius: 6, background: form.primary_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: form.secondary_color }}>{form.name[0]?.toUpperCase() || 'C'}</div>
              }
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1d1d1f' }}>{form.name}</span>
            </div>
            {[
              { l: 'Compétition', v: form.competition_code ? (COMPETITIONS.find(c => c.code === form.competition_code)?.name ?? form.competition_code) : '—' },
              { l: 'Stade', v: form.stadium_name || '—' },
              { l: 'Ville', v: form.city || '—' },
            ].map(r => (
              <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(29,29,31,0.45)' }}>{r.l}</span>
                <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{r.v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'rgba(29,29,31,0.45)' }}>Couleurs</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, background: form.primary_color, border: '1px solid rgba(0,0,0,0.10)' }} />
                <div style={{ width: 16, height: 16, borderRadius: 4, background: form.secondary_color, border: '1px solid rgba(0,0,0,0.10)' }} />
              </div>
            </div>
          </div>

          {error && <p style={{ fontSize: 13, color: '#c62828', margin: 0, padding: '10px 14px', background: '#ffebee', borderRadius: 10 }}>{error}</p>}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px 20px', borderRadius: 14, background: '#f5f5f7', color: '#1d1d1f', fontSize: 15, fontWeight: 600, border: '1px solid rgba(0,0,0,0.10)', cursor: 'pointer' }}>
            <ChevronLeft size={16} />
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={step === 1 && form.name.trim().length < 2} style={{ flex: 1, padding: '13px 0', borderRadius: 14, background: (step === 1 && form.name.trim().length < 2) ? '#f5f5f7' : '#1d1d1f', color: (step === 1 && form.name.trim().length < 2) ? 'rgba(29,29,31,0.25)' : '#ffffff', fontSize: 15, fontWeight: 700, border: 'none', cursor: (step === 1 && form.name.trim().length < 2) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            Suivant <ArrowRight size={16} />
          </button>
        ) : (
          <button onClick={submit} disabled={saving || !form.name.trim()} style={{ flex: 1, padding: '13px 0', borderRadius: 14, background: '#1d1d1f', color: '#ffffff', fontSize: 15, fontWeight: 700, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Créer le club'}
          </button>
        )}
      </div>
    </div>
  )
}
