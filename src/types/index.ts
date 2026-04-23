export type { Database } from './database'

export type UserRole = 'fan' | 'club_admin' | 'super_admin'
export type MatchStatus = 'upcoming' | 'live' | 'finished' | 'cancelled'
export type RewardCategory = 'merchandise' | 'experience' | 'discount' | 'digital'
export type TransactionType = 'checkin' | 'pronostic' | 'bonus' | 'redemption'

export interface FanStats {
  totalPoints: number
  seasonPoints: number
  checkins: number
  pronosticsCorrect: number
  rank: number
}
