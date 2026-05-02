import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ScanQrCode, Trophy, Gift, ChevronRight, Bell } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StadiumGatedSection } from '@/components/StadiumGatedSection'
import type { Database } from '@/types/database'
import { getLoyaltyLevel, getLoyaltyProgress, LOYALTY_CONFIG } from '@/types/database'
import { getDefaultClub } from '@/lib/club'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('fr-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

function getLevelBadgeVariant(level: number): 'level-gold' | 'level-silver' | 'level-platinum' | 'neutral' {
  if (level === 4) return 'level-platinum'
  if (level >= 2) return 'level-gold'
  if (level === 1) return 'level-silver'
  return 'neutral'
}

export default async function HomePage() {
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const club = await getDefaultClub()
  const CLUB_ID = club?.id ?? ''
  const primaryColor = club?.primary_color ?? '#E1001A'
  const clubLogoUrl = club?.logo_url ?? null

  const [
    { data: profile },
    { data: pointsData },
    { data: nextMatch },
    { data: recentPronostics },
    { data: featuredRewards },
    { data: myCheckins },
    { data: topFans },
    { data: myRedemptions },
    { data: activeActivations },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('fan_points').select('total_points, season_points, lifetime_points').eq('user_id', user.id).eq('club_id', CLUB_ID).maybeSingle(),
    supabase.from('matches').select('*').eq('club_id', CLUB_ID).in('status', ['upcoming', 'live']).order('match_date').limit(1).maybeSingle(),
    supabase.from('pronostics').select('*, matches(home_team, away_team, match_date, status, home_score, away_score)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
    supabase.from('rewards').select('*').eq('club_id', CLUB_ID).eq('is_active', true).order('sort_order').limit(6),
    supabase.from('checkins').select('match_id').eq('user_id', user.id),
    supabase.from('leaderboard').select('*').eq('club_id', CLUB_ID).order('season_points', { ascending: false }).limit(5),
    supabase.from('redemptions').select('*, rewards(title, category)').eq('user_id', user.id).in('status', ['pending', 'confirmed']).order('created_at', { ascending: false }).limit(5),
    supabase.from('activations').select('id, title, description, type, options, points_reward, response_count').eq('club_id', CLUB_ID).eq('status', 'active').order('created_at', { ascending: false }).limit(5),
  ])

  const totalPoints = pointsData?.total_points ?? 0
  const seasonPoints = pointsData?.season_points ?? 0
  const lifetimePoints = pointsData?.lifetime_points ?? 0
  const loyaltyLevel = getLoyaltyLevel(lifetimePoints)
  const levelConfig = LOYALTY_CONFIG[loyaltyLevel]
  const progress = getLoyaltyProgress(lifetimePoints)
  const ptsToNext = loyaltyLevel < 4
    ? LOYALTY_CONFIG[Math.min(loyaltyLevel + 1, 4) as keyof typeof LOYALTY_CONFIG].min - lifetimePoints
    : 0

  const checkedInMatchIds = new Set(myCheckins?.map(c => c.match_id) ?? [])
  const alreadyCheckedIn = nextMatch ? checkedInMatchIds.has(nextMatch.id) : false

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Fan'
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'FA'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <main
      style={{
        background: '#ffffff',
        minHeight: '100vh',
        paddingBottom: 90,
        fontFamily: 'var(--font-system, -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif)',
        color: '#1d1d1f',
      }}
    >
      {/* HEADER */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {clubLogoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clubLogoUrl}
              alt={club?.name ?? 'Club'}
              style={{ width: 32, height: 32, objectFit: 'contain' }}
            />
          )}
          <div>
            <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.45)', margin: 0 }}>{greeting},</p>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#1d1d1f' }}>{firstName}</h1>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link
            href="/notifications"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#f5f5f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              color: '#1d1d1f',
            }}
          >
            <Bell size={16} />
          </Link>
          <Link
            href="/profile"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: primaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {initials}
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 430, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* POINTS CARD */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 20,
            border: '1px solid rgba(0,0,0,0.08)',
            padding: 20,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* SVG Progress Circle */}
            <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
              <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="rgba(0,0,0,0.07)"
                  strokeWidth="8"
                />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke={primaryColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.7s ease' }}
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 20, fontWeight: 800, color: '#1d1d1f', lineHeight: 1 }}>
                  {totalPoints >= 1000 ? (totalPoints / 1000).toFixed(1) + 'k' : totalPoints}
                </span>
                <span style={{ fontSize: 9, color: 'rgba(29,29,31,0.45)', marginTop: 2 }}>pts</span>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ marginBottom: 10 }}>
                <Badge variant={getLevelBadgeVariant(loyaltyLevel)}>{levelConfig.name}</Badge>
              </div>
              <ProgressBar value={progress} color={primaryColor} height={6} />
              {ptsToNext > 0 && (
                <p style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', marginTop: 5, marginBottom: 0 }}>
                  {ptsToNext.toLocaleString('fr-BE')} pts pour le niveau suivant
                </p>
              )}
              <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(29,29,31,0.45)', margin: 0 }}>Ce mois</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>+{seasonPoints.toLocaleString('fr-BE')}</p>
                </div>
                <div style={{ width: 1, background: 'rgba(0,0,0,0.08)' }} />
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(29,29,31,0.45)', margin: 0 }}>Total vie</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>{lifetimePoints.toLocaleString('fr-BE')}</p>
                </div>
              </div>
            </div>
          </div>
          <Link
            href="/classement"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              marginTop: 16,
              paddingTop: 14,
              borderTop: '1px solid rgba(0,0,0,0.06)',
              fontSize: 13,
              fontWeight: 600,
              color: primaryColor,
              textDecoration: 'none',
            }}
          >
            Voir ma progression <ChevronRight size={14} />
          </Link>
        </div>

        {/* MATCH CARD */}
        {nextMatch && (
          <div
            style={{
              background: primaryColor,
              borderRadius: 20,
              padding: 20,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* background glow */}
            <div
              style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
              }}
            />
            <div style={{ position: 'relative' }}>
              {/* Status badge */}
              <div style={{ marginBottom: 16 }}>
                {nextMatch.status === 'live' ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(255,255,255,0.20)',
                      borderRadius: 100,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#fff',
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
                    LIVE
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-block',
                      background: 'rgba(255,255,255,0.20)',
                      borderRadius: 100,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#fff',
                    }}
                  >
                    {formatDate(nextMatch.match_date)}
                  </span>
                )}
              </div>

              {/* Teams + score */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.20)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#fff',
                      margin: '0 auto 8px',
                    }}
                  >
                    {nextMatch.home_team.slice(0, 2).toUpperCase()}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0 }}>{nextMatch.home_team}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  {nextMatch.status === 'finished' || nextMatch.status === 'live' ? (
                    <span style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>
                      {nextMatch.home_score ?? 0} - {nextMatch.away_score ?? 0}
                    </span>
                  ) : (
                    <span style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>VS</span>
                  )}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.12)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 15,
                      fontWeight: 800,
                      color: 'rgba(255,255,255,0.80)',
                      margin: '0 auto 8px',
                    }}
                  >
                    {nextMatch.away_team.slice(0, 2).toUpperCase()}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.80)', margin: 0 }}>{nextMatch.away_team}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 14 }}>
                {!alreadyCheckedIn && nextMatch.status === 'live' && (
                  <Link
                    href="/scan"
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 12,
                      background: '#ffffff',
                      color: primaryColor,
                      fontSize: 13,
                      fontWeight: 700,
                      textAlign: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    Scan QR (+{nextMatch.checkin_points} pts)
                  </Link>
                )}
                {alreadyCheckedIn && (
                  <div
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    Check-in validé ✓
                  </div>
                )}
                <Link
                  href="/pronostics"
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  Pronostic
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ACTIVE ACTIVATIONS */}
        {activeActivations && activeActivations.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-flex', width: 8, height: 8, borderRadius: '50%', background: '#34c759', animation: 'pulse 1.5s infinite' }} />
                Activations en cours
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeActivations.map(act => {
                const typeEmoji = act.type === 'trivia' ? '🧠' : act.type === 'poll' ? '📊' : act.type === 'moment' ? '📸' : '⚽'
                return (
                  <Link
                    key={act.id}
                    href={`/activations/${act.id}`}
                    style={{
                      display: 'block',
                      background: '#ffffff',
                      borderRadius: 16,
                      border: `2px solid ${primaryColor}25`,
                      padding: '14px 16px',
                      textDecoration: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: primaryColor + '12',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22,
                      }}>
                        {typeEmoji}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>{act.title}</p>
                        {act.description && (
                          <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.50)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {act.description}
                          </p>
                        )}
                        <p style={{ fontSize: 11, fontWeight: 700, color: primaryColor, margin: '4px 0 0' }}>
                          +{act.points_reward} pts · {act.response_count} réponse{act.response_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <ChevronRight size={16} color="rgba(29,29,31,0.25)" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* PARIS EN DIRECT — stadium gated (client component) */}
        <StadiumGatedSection
          matchId={nextMatch?.status === 'live' ? nextMatch.id : null}
          isCheckedIn={alreadyCheckedIn}
          userPoints={totalPoints}
          primaryColor={primaryColor}
        />

        {/* QUICK ACTIONS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { href: '/scan',       icon: <ScanQrCode size={20} />, label: 'Scanner',    bg: '#e8f5e9', color: '#2e7d32' },
            { href: '/pronostics', icon: <Trophy size={20} />,      label: 'Pronos',     bg: '#fff8e1', color: '#c8860a' },
            { href: '/rewards',    icon: <Gift size={20} />,        label: 'Récompenses', bg: '#e3f2fd', color: '#1565c0' },
          ].map(({ href, icon, label, bg, color }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: '14px 8px',
                borderRadius: 16,
                background: '#f5f5f7',
                border: '1px solid rgba(0,0,0,0.06)',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color,
                }}
              >
                {icon}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1d1d1f' }}>{label}</span>
            </Link>
          ))}
        </div>

        {/* RECOMPENSES — horizontal scroll */}
        {featuredRewards && featuredRewards.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1d1d1f' }}>Récompenses</h2>
              <Link href="/rewards" style={{ fontSize: 12, color: primaryColor, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                Catalogue <ChevronRight size={12} />
              </Link>
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }} className="scrollbar-none">
              {featuredRewards.map(r => {
                const canAfford = totalPoints >= r.points_cost
                const emoji = r.category === 'merchandise' ? '👕' : r.category === 'experience' ? '🏆' : r.category === 'discount' ? '🏷️' : r.category === 'vip' ? '🎫' : '🖼️'
                return (
                  <Link
                    key={r.id}
                    href="/rewards"
                    style={{
                      flexShrink: 0,
                      width: 140,
                      background: '#f5f5f7',
                      borderRadius: 16,
                      padding: 14,
                      border: '1px solid rgba(0,0,0,0.06)',
                      textDecoration: 'none',
                      display: 'block',
                    }}
                  >
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{emoji}</div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#1d1d1f', margin: '0 0 6px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {r.title}
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 800, margin: 0, color: canAfford ? '#2e7d32' : 'rgba(29,29,31,0.35)' }}>
                      {r.points_cost.toLocaleString('fr-BE')} pts
                    </p>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* MES RECOMPENSES */}
        {myRedemptions && myRedemptions.length > 0 && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              border: '1px solid rgba(0,0,0,0.08)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1d1d1f' }}>Mes récompenses</h2>
              <Link href="/rewards" style={{ fontSize: 12, color: primaryColor, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                Tout voir <ChevronRight size={12} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {myRedemptions.map((r: any, idx: number) => {
                const reward = r.rewards
                const emoji = reward?.category === 'merchandise' ? '👕' : reward?.category === 'experience' ? '🏆' : reward?.category === 'discount' ? '🏷️' : reward?.category === 'vip' ? '🎫' : '🎁'
                const statusColor = r.status === 'confirmed' ? '#34c759' : r.status === 'pending' ? '#c8860a' : 'rgba(29,29,31,0.40)'
                const statusLabel = r.status === 'confirmed' ? 'Confirmé' : r.status === 'pending' ? 'En attente' : r.status
                return (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      paddingTop: idx === 0 ? 0 : 12, paddingBottom: 12,
                      borderBottom: idx < myRedemptions.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, flexShrink: 0,
                    }}>
                      {emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {reward?.title ?? 'Récompense'}
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', margin: '2px 0 0' }}>
                        Code : <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>{r.redemption_code}</span>
                      </p>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: statusColor,
                      background: statusColor + '15',
                      padding: '3px 8px', borderRadius: 100,
                    }}>
                      {statusLabel}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* LEADERBOARD SAISON */}
        {topFans && topFans.length > 0 && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              border: '1px solid rgba(0,0,0,0.08)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1d1d1f' }}>Classement saison</h2>
              <Link href="/classement" style={{ fontSize: 12, color: primaryColor, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                Voir tout <ChevronRight size={12} />
              </Link>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(29,29,31,0.40)', margin: '0 0 14px' }}>
              🔄 Réinitialisé tous les 2 mois · tes points disponibles ne changent jamais
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topFans.map((fan, i) => {
                const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                const level = getLoyaltyLevel(fan.total_points ?? 0)
                const levelConf = LOYALTY_CONFIG[level]
                const isMe = fan.user_id === user.id
                return (
                  <div key={fan.user_id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: isMe ? '6px 8px' : '0',
                    borderRadius: isMe ? 10 : 0,
                    background: isMe ? primaryColor + '08' : 'transparent',
                  }}>
                    <span style={{ width: 24, textAlign: 'center', fontSize: 14 }}>
                      {rankEmoji ?? <span style={{ fontSize: 12, color: 'rgba(29,29,31,0.40)', fontWeight: 600 }}>#{i + 1}</span>}
                    </span>
                    <div
                      style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: isMe ? primaryColor + '20' : '#f5f5f7',
                        border: isMe ? `1px solid ${primaryColor}30` : '1px solid rgba(0,0,0,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                        color: isMe ? primaryColor : 'rgba(29,29,31,0.50)',
                        flexShrink: 0,
                      }}
                    >
                      {fan.full_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: isMe ? 700 : 600, color: '#1d1d1f', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {fan.full_name ?? fan.username ?? 'Anonyme'}{isMe ? ' (toi)' : ''}
                      </p>
                      <p style={{ fontSize: 11, color: levelConf.color, margin: 0, fontWeight: 500 }}>{levelConf.name}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#1d1d1f', margin: 0 }}>
                        {(fan.season_points ?? 0).toLocaleString('fr-BE')}
                      </p>
                      <p style={{ fontSize: 10, color: 'rgba(29,29,31,0.40)', margin: 0 }}>pts saison</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* RECENT PRONOSTICS */}
        {recentPronostics && recentPronostics.length > 0 && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              border: '1px solid rgba(0,0,0,0.08)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1d1d1f' }}>Mes pronostics</h2>
              <Link href="/pronostics" style={{ fontSize: 12, color: primaryColor, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                Voir tout <ChevronRight size={12} />
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentPronostics.map((p, idx) => {
                const match = (p as any).matches
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      paddingTop: idx === 0 ? 0 : 10,
                      paddingBottom: 10,
                      borderBottom: idx < recentPronostics.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {match?.home_team} – {match?.away_team}
                      </p>
                      <p style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', margin: '2px 0 0' }}>
                        Pronostic : {p.predicted_home_score} – {p.predicted_away_score}
                      </p>
                    </div>
                    <div>
                      {p.result === 'exact' && <Badge variant="success">Exact +{p.points_earned}</Badge>}
                      {p.result === 'winner' && <Badge variant="warning">Vainqueur +{p.points_earned}</Badge>}
                      {p.result === 'wrong' && <Badge variant="error">Raté</Badge>}
                      {!p.result && <Badge variant="neutral">En attente</Badge>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
