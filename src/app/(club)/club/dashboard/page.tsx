import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { LOYALTY_CONFIG, getLoyaltyLevel } from '@/types/database'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminClubId } from '@/lib/club'
import { Users, Star, TrendingUp, Repeat2, ArrowUp, ArrowDown, Calendar, Zap } from 'lucide-react'

function KpiCard({
  label,
  value,
  change,
  changeType,
  icon,
  iconColor,
}: {
  label: string
  value: string
  change: string
  changeType: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
  iconColor: string
}) {
  const changeColor =
    changeType === 'up' ? '#2e7d32' : changeType === 'down' ? '#E1001A' : 'rgba(29,29,31,0.40)'
  const changeBg =
    changeType === 'up' ? '#e8f5e9' : changeType === 'down' ? 'rgba(225,0,26,0.08)' : '#ebebed'
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid rgba(0,0,0,0.08)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: iconColor + '18',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: iconColor,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: changeColor,
            background: changeBg,
            borderRadius: 100,
            padding: '2px 8px',
          }}
        >
          {change}
        </span>
      </div>
      <div>
        <p style={{ fontSize: 28, fontWeight: 700, color: '#1d1d1f', lineHeight: 1.1, margin: 0 }}>
          {value}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.55)', marginTop: 4, margin: '4px 0 0' }}>
          {label}
        </p>
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const CLUB_ID = await getAdminClubId()
  if (!CLUB_ID) redirect('/admin')

  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, primary_color, logo_url')
    .eq('id', CLUB_ID)
    .single()

  const primaryColor = club?.primary_color ?? '#E1001A'

  const [
    { count: totalFans },
    { count: totalCheckins },
    { count: totalRedemptions },
    { data: pointsAgg },
    { data: nextMatch },
    { data: topFans },
    { data: recentTransactions },
    { data: activeActivations },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('club_id', CLUB_ID).not('role', 'in', '("club_admin","super_admin")'),
    supabase.from('checkins').select('*', { count: 'exact', head: true }),
    supabase.from('redemptions').select('*', { count: 'exact', head: true }).eq('club_id', CLUB_ID).neq('status', 'cancelled'),
    supabase.from('fan_points').select('total_points').eq('club_id', CLUB_ID),
    supabase.from('matches').select('*').eq('club_id', CLUB_ID).in('status', ['upcoming', 'live']).order('match_date').limit(1).maybeSingle(),
    supabase.from('leaderboard').select('*').eq('club_id', CLUB_ID).order('rank').limit(5),
    supabase.from('points_transactions').select('amount, type, description, created_at, profiles(full_name)').eq('club_id', CLUB_ID).order('created_at', { ascending: false }).limit(8),
    supabase.from('activations').select('*').eq('club_id', CLUB_ID).eq('status', 'active'),
  ])

  const totalPoints = pointsAgg?.reduce((acc, r) => acc + (r.total_points ?? 0), 0) ?? 0

  const typeEmoji: Record<string, string> = {
    checkin: '📲', pronostic: '⚽', survey: '📊', redemption: '🎁', bonus: '⭐', manual: '✏️', activation: '⚡',
  }

  return (
    <div
      style={{
        fontFamily: 'var(--font-system, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif)',
        color: '#1d1d1f',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      {/* TOPBAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          paddingBottom: 20,
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: '#1d1d1f' }}>Dashboard général</h1>
          <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.55)', margin: '4px 0 0' }}>
            Saison 2025–26 · {club?.name ?? 'FanPass'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {nextMatch?.status === 'live' && (
            <Link
              href={`/club/live/${nextMatch.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 8,
                background: primaryColor,
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#fff',
                  display: 'inline-block',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              Match en direct
            </Link>
          )}
          <button
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.12)',
              background: '#ffffff',
              color: '#1d1d1f',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* ACTIVE ACTIVATIONS ALERT */}
      {activeActivations && activeActivations.length > 0 && (
        <div
          style={{
            padding: '14px 18px',
            borderRadius: 12,
            background: '#fff8e1',
            border: '1px solid rgba(200,134,10,0.20)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <Zap size={18} color="#c8860a" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#c8860a', margin: 0 }}>
              {activeActivations.length} activation{activeActivations.length > 1 ? 's' : ''} en cours
            </p>
            <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.55)', margin: '2px 0 0' }}>Des fans participent maintenant</p>
          </div>
          {nextMatch && (
            <Link
              href={`/club/live/${nextMatch.id}`}
              style={{ fontSize: 12, fontWeight: 600, color: '#c8860a', textDecoration: 'none' }}
            >
              Contrôler →
            </Link>
          )}
        </div>
      )}

      {/* KPI GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <KpiCard
          label="Fans actifs"
          value={(totalFans ?? 0).toLocaleString('fr-BE')}
          change="+12%"
          changeType="up"
          icon={<Users size={20} />}
          iconColor="#1565c0"
        />
        <KpiCard
          label="Points distribués"
          value={totalPoints >= 1000 ? `${(totalPoints / 1000).toFixed(1)}k` : String(totalPoints)}
          change="+8%"
          changeType="up"
          icon={<Star size={20} />}
          iconColor="#c8860a"
        />
        <KpiCard
          label="Revenus sponsors"
          value="€0"
          change="—"
          changeType="neutral"
          icon={<TrendingUp size={20} />}
          iconColor="#2e7d32"
        />
        <KpiCard
          label="Taux rétention"
          value="—"
          change="—"
          changeType="neutral"
          icon={<Repeat2 size={20} />}
          iconColor="#6a1b9a"
        />
      </div>

      {/* ROW 2: MATCH + TOP FANS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* NEXT / LIVE MATCH CARD */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.08)',
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={15} color="rgba(29,29,31,0.40)" />
              {nextMatch?.status === 'live' ? 'Match en cours' : 'Prochain match'}
            </h2>
            {nextMatch ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 100,
                  background: nextMatch.status === 'live' ? '#e8f5e9' : '#ebebed',
                  color: nextMatch.status === 'live' ? '#2e7d32' : 'rgba(29,29,31,0.55)',
                }}
              >
                {nextMatch.status === 'live' ? '🔴 Live' : new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(nextMatch.match_date))}
              </span>
            ) : (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 100,
                  background: '#ebebed',
                  color: 'rgba(29,29,31,0.55)',
                }}
              >
                Aucun match
              </span>
            )}
          </div>

          {nextMatch ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '16px 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: primaryColor + '18',
                      border: `1px solid ${primaryColor}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 800,
                      color: primaryColor,
                      margin: '0 auto 8px',
                    }}
                  >
                    {nextMatch.home_team.slice(0, 2).toUpperCase()}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', margin: 0 }}>{nextMatch.home_team}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  {nextMatch.status === 'finished' ? (
                    <span style={{ fontSize: 22, fontWeight: 800, color: '#1d1d1f' }}>
                      {nextMatch.home_score} – {nextMatch.away_score}
                    </span>
                  ) : (
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'rgba(29,29,31,0.25)' }}>VS</span>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: '#f5f5f7',
                      border: '1px solid rgba(0,0,0,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 800,
                      color: 'rgba(29,29,31,0.55)',
                      margin: '0 auto 8px',
                    }}
                  >
                    {nextMatch.away_team.slice(0, 2).toUpperCase()}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', margin: 0 }}>{nextMatch.away_team}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Link
                  href={`/club/live/${nextMatch.id}`}
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    borderRadius: 8,
                    background: primaryColor,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  {nextMatch.status === 'live' ? 'Gérer le live' : 'Préparer'}
                </Link>
                <Link
                  href="/club/matches"
                  style={{
                    flex: 1,
                    padding: '9px 0',
                    borderRadius: 8,
                    background: '#f5f5f7',
                    color: '#1d1d1f',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  Tous les matchs
                </Link>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(29,29,31,0.40)' }}>
              <Calendar size={32} style={{ margin: '0 auto 8px' }} />
              <Link href="/club/matches" style={{ fontSize: 13, color: primaryColor, textDecoration: 'none', fontWeight: 600 }}>
                Créer un match
              </Link>
            </div>
          )}
        </div>

        {/* TOP FANS */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.08)',
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#1d1d1f' }}>Top fans</h2>
            <Link
              href="/club/fans"
              style={{ fontSize: 12, color: primaryColor, textDecoration: 'none', fontWeight: 600 }}
            >
              Voir tout →
            </Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topFans?.length ? topFans.map((fan, i) => {
              const level = getLoyaltyLevel(fan.total_points ?? 0)
              const levelConf = LOYALTY_CONFIG[level]
              const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
              return (
                <div key={fan.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 22, textAlign: 'center', fontSize: 14, flexShrink: 0 }}>
                    {rankEmoji ?? <span style={{ fontSize: 11, color: 'rgba(29,29,31,0.40)', fontWeight: 600 }}>#{i + 1}</span>}
                  </span>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: primaryColor + '18',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      color: primaryColor,
                      flexShrink: 0,
                    }}
                  >
                    {fan.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {fan.full_name ?? fan.username ?? 'Anonyme'}
                    </p>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: levelConf.color,
                        background: levelConf.color + '18',
                        borderRadius: 100,
                        padding: '1px 6px',
                      }}
                    >
                      {levelConf.name}
                    </span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', flexShrink: 0 }}>
                    {(fan.total_points ?? 0).toLocaleString('fr-BE')}
                  </span>
                </div>
              )
            }) : (
              <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.40)', textAlign: 'center', padding: '16px 0' }}>
                Aucun fan enregistré
              </p>
            )}
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.08)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#1d1d1f' }}>Activité récente</h2>
          <span style={{ fontSize: 12, color: 'rgba(29,29,31,0.40)' }}>
            {totalRedemptions ?? 0} échanges total
          </span>
        </div>
        {recentTransactions?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recentTransactions.map((tx, idx) => {
              const profile = (tx as any).profiles
              return (
                <div
                  key={`${tx.created_at}-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    paddingTop: idx === 0 ? 0 : 10,
                    paddingBottom: 10,
                    borderBottom: idx < (recentTransactions.length - 1) ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{typeEmoji[tx.type] ?? '•'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: '#1d1d1f', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.description}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', margin: '2px 0 0' }}>
                      {profile?.full_name ?? 'Fan'} · {new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(tx.created_at))}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                      color: tx.amount > 0 ? '#2e7d32' : '#E1001A',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    {tx.amount > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.40)', textAlign: 'center', padding: '20px 0' }}>
            Aucune activité récente
          </p>
        )}
      </div>

      {/* ANALYSE IA (static for now) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid rgba(147,51,234,0.25)',
          padding: 20,
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 14px', color: '#6a1b9a', display: 'flex', alignItems: 'center', gap: 6 }}>
          ✨ Analyse IA
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ background: '#f5f5f7', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', margin: '0 0 4px' }}>Engagement en hausse</p>
            <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.55)', margin: 0 }}>
              Les fans sont 18% plus actifs lors des matchs à domicile le soir.
            </p>
          </div>
          <div style={{ background: '#f5f5f7', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', margin: '0 0 4px' }}>Opportunité récompenses</p>
            <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.55)', margin: 0 }}>
              {Math.round((totalFans ?? 0) * 0.3)} fans ont suffisamment de points pour échanger une récompense.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
