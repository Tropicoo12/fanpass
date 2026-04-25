import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect, notFound } from 'next/navigation'
import type { Database } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Zap } from 'lucide-react'
import { ActivationPlay } from './ActivationPlay'

const TYPE_LABEL: Record<string, string> = {
  poll: 'Sondage',
  trivia: 'Trivia',
  moment: 'Moment fort',
  prediction: 'Prédiction live',
}

export default async function ActivationPage({ params }: { params: Promise<{ activationId: string }> }) {
  const { activationId } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: activation }, { data: myResponse }] = await Promise.all([
    supabase.from('activations').select('*').eq('id', activationId).single(),
    supabase.from('activation_responses').select('points_earned').eq('user_id', user.id).eq('activation_id', activationId).maybeSingle(),
  ])

  if (!activation) notFound()

  const alreadyAnswered = !!myResponse

  if (activation.status === 'closed') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black">{activation.title}</h1>
          <p className="text-gray-400 text-sm mt-1">Cette activation est terminée.</p>
        </div>
        <Card variant="dark" className="text-center py-8 text-gray-500">
          L'activation est fermée.
        </Card>
      </div>
    )
  }

  if (activation.status !== 'active') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black">{activation.title}</h1>
          <p className="text-gray-400 text-sm mt-1">Cette activation n'est pas encore ouverte.</p>
        </div>
        <Card variant="dark" className="text-center py-8 text-gray-500">
          L'activation n'est pas encore active. Attends le signal du club.
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wide">En direct</span>
          </div>
          <h1 className="text-2xl font-black">{activation.title}</h1>
          {activation.description && (
            <p className="text-gray-400 text-sm mt-1">{activation.description}</p>
          )}
        </div>
        <Badge variant="info">{TYPE_LABEL[activation.type] ?? activation.type}</Badge>
      </div>

      <Card variant="dark" className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium">Récompense</span>
        </div>
        <span className="font-black text-emerald-400">+{activation.points_reward} pts</span>
      </Card>

      <ActivationPlay
        activation={activation}
        alreadyAnswered={alreadyAnswered}
        initialPointsEarned={myResponse?.points_earned ?? undefined}
      />
    </div>
  )
}
