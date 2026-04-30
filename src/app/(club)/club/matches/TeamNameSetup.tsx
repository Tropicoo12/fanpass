'use client'
import { useState } from 'react'
import { Search, ChevronRight, Loader2, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

interface Competition { code: string; name: string; flag: string }
interface Team { id: number; name: string; shortName: string; crest: string }

type Step = 'competition' | 'team'

export function TeamNameSetup() {
  const [step, setStep] = useState<Step>('competition')
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null)
  const [query, setQuery] = useState('')
  const [loadingComps, setLoadingComps] = useState(false)
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [saving, setSaving] = useState(false)
  const [opened, setOpened] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  async function open() {
    if (opened) return
    setOpened(true)
    setLoadingComps(true)
    try {
      const res = await fetch('/api/club/available-teams')
      const data = await res.json()
      setCompetitions(data.competitions ?? [])
    } finally {
      setLoadingComps(false)
    }
  }

  async function pickCompetition(comp: Competition) {
    setSelectedComp(comp)
    setStep('team')
    setQuery('')
    setLoadingTeams(true)
    try {
      const res = await fetch(`/api/club/available-teams?competition=${comp.code}`)
      const data = await res.json()
      setTeams(data.teams ?? [])
    } finally {
      setLoadingTeams(false)
    }
  }

  async function pickTeam(team: Team) {
    if (!selectedComp) return
    setSaving(true)
    try {
      const res = await fetch('/api/club/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: team.name,
          football_data_team_id: team.id,
          competition_code: selectedComp.code,
        }),
      })
      if (!res.ok) { toast('Erreur lors de la sauvegarde', 'error'); return }
      toast(`Équipe configurée : ${team.name}. Synchronisation en cours…`, 'success')
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const filteredTeams = query
    ? teams.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) || t.shortName?.toLowerCase().includes(query.toLowerCase()))
    : teams

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
      <div className="flex items-start gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-amber-300 text-sm">Équipe non configurée</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Sélectionne ton équipe pour importer automatiquement tout le calendrier de la saison.
          </p>
        </div>
      </div>

      {!opened && (
        <button
          onClick={open}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-sm font-medium transition-colors active:scale-95"
        >
          Configurer mon équipe
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {opened && (
        <div>
          {/* Step: pick competition */}
          {step === 'competition' && (
            <div>
              <p className="text-xs text-gray-400 mb-2 font-medium">1. Choisis ta compétition</p>
              {loadingComps && (
                <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Chargement…
                </div>
              )}
              <div className="space-y-1">
                {competitions.map(comp => (
                  <button
                    key={comp.code}
                    onClick={() => pickCompetition(comp)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors active:scale-95"
                  >
                    <span className="flex items-center gap-2">
                      <span>{comp.flag}</span>
                      <span>{comp.name}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: pick team */}
          {step === 'team' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => { setStep('competition'); setQuery('') }}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-gray-400" />
                </button>
                <p className="text-xs text-gray-400 font-medium">
                  2. Choisis ton équipe — <span className="text-amber-300">{selectedComp?.flag} {selectedComp?.name}</span>
                </p>
              </div>

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Rechercher…"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              {loadingTeams && (
                <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Chargement des équipes…
                </div>
              )}

              {!loadingTeams && teams.length === 0 && (
                <p className="text-xs text-gray-500 py-2">
                  Aucune équipe trouvée. Vérifie que FOOTBALL_DATA_API_KEY est bien configurée.
                </p>
              )}

              <div className="max-h-52 overflow-y-auto space-y-1">
                {filteredTeams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => pickTeam(team)}
                    disabled={saving}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors disabled:opacity-50 active:scale-95"
                  >
                    <span className="flex items-center gap-2.5">
                      {team.crest && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.crest} alt="" className="w-5 h-5 object-contain" />
                      )}
                      <span>{team.name}</span>
                    </span>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400/50" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
