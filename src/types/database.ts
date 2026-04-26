export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type LoyaltyLevel = 0 | 1 | 2 | 3 | 4

export const LOYALTY_CONFIG = {
  0: { name: 'Bronze',   color: '#cd7f32', min: 0,     max: 999   },
  1: { name: 'Silver',   color: '#c0c0c0', min: 1000,  max: 2499  },
  2: { name: 'Gold',     color: '#ffd700', min: 2500,  max: 4999  },
  3: { name: 'Platinum', color: '#e5e4e2', min: 5000,  max: 9999  },
  4: { name: 'Diamond',  color: '#b9f2ff', min: 10000, max: Infinity },
} as const

export function getLoyaltyLevel(points: number): LoyaltyLevel {
  if (points >= 10000) return 4
  if (points >= 5000)  return 3
  if (points >= 2500)  return 2
  if (points >= 1000)  return 1
  return 0
}

export function getLoyaltyProgress(points: number): number {
  const level = getLoyaltyLevel(points)
  const config = LOYALTY_CONFIG[level]
  if (level === 4) return 100
  const range = config.max - config.min + 1
  const progress = points - config.min
  return Math.round((progress / range) * 100)
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          role: 'fan' | 'club_admin' | 'super_admin'
          club_id: string | null
          phone: string | null
          birth_year: number | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'fan' | 'club_admin' | 'super_admin'
          club_id?: string | null
          phone?: string | null
          birth_year?: number | null
        }
        Update: {
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'fan' | 'club_admin' | 'super_admin'
          club_id?: string | null
          phone?: string | null
          birth_year?: number | null
        }
        Relationships: []
      }
      clubs: {
        Row: {
          id: string
          created_at: string
          name: string
          slug: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          stadium_name: string | null
          city: string | null
          country: string
        }
        Insert: { name: string; slug: string; logo_url?: string | null; primary_color?: string; secondary_color?: string; stadium_name?: string | null; city?: string | null }
        Update: { name?: string; slug?: string; logo_url?: string | null; primary_color?: string; secondary_color?: string; stadium_name?: string | null; city?: string | null }
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          created_at: string
          club_id: string
          home_team: string
          away_team: string
          match_date: string
          venue: string | null
          status: 'upcoming' | 'live' | 'finished' | 'cancelled'
          home_score: number | null
          away_score: number | null
          qr_code_token: string
          checkin_opens_at: string | null
          checkin_closes_at: string | null
          geofence_lat: number | null
          geofence_lng: number | null
          geofence_radius_m: number | null
          checkin_points: number
          prediction_points_exact: number
          prediction_points_winner: number
          external_id: string | null
          odds_home: number | null
          odds_draw: number | null
          odds_away: number | null
        }
        Insert: {
          club_id: string
          home_team: string
          away_team: string
          match_date: string
          venue?: string | null
          status?: 'upcoming' | 'live' | 'finished' | 'cancelled'
          qr_code_token?: string
          checkin_opens_at?: string | null
          checkin_closes_at?: string | null
          checkin_points?: number
          prediction_points_exact?: number
          prediction_points_winner?: number
          external_id?: string | null
          odds_home?: number | null
          odds_draw?: number | null
          odds_away?: number | null
        }
        Update: {
          home_team?: string
          away_team?: string
          match_date?: string
          venue?: string | null
          status?: 'upcoming' | 'live' | 'finished' | 'cancelled'
          home_score?: number | null
          away_score?: number | null
          checkin_opens_at?: string | null
          checkin_closes_at?: string | null
          odds_home?: number | null
          odds_draw?: number | null
          odds_away?: number | null
        }
        Relationships: []
      }
      checkins: {
        Row: {
          id: string
          created_at: string
          user_id: string
          match_id: string
          points_earned: number
          scanned_at: string
          lat: number | null
          lng: number | null
          device_id: string | null
        }
        Insert: { user_id: string; match_id: string; points_earned?: number; lat?: number | null; lng?: number | null; device_id?: string | null }
        Update: never
        Relationships: []
      }
      pronostics: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          match_id: string
          predicted_home_score: number
          predicted_away_score: number
          points_earned: number | null
          is_correct: boolean | null
          result: 'exact' | 'winner' | 'wrong' | null
          points_bet: number | null
          odds_multiplier: number | null
        }
        Insert: { user_id: string; match_id: string; predicted_home_score: number; predicted_away_score: number; points_bet?: number | null; odds_multiplier?: number | null }
        Update: { predicted_home_score?: number; predicted_away_score?: number; updated_at?: string; points_earned?: number | null; is_correct?: boolean | null; result?: string | null; points_bet?: number | null; odds_multiplier?: number | null }
        Relationships: []
      }
      fan_points: {
        Row: {
          id: string
          user_id: string
          club_id: string
          total_points: number
          season_points: number
          lifetime_points: number
          updated_at: string
        }
        Insert: { user_id: string; club_id: string; total_points?: number; season_points?: number; lifetime_points?: number }
        Update: { total_points?: number; season_points?: number; lifetime_points?: number }
        Relationships: []
      }
      rewards: {
        Row: {
          id: string
          created_at: string
          club_id: string
          title: string
          description: string | null
          points_cost: number
          stock: number | null
          image_url: string | null
          is_active: boolean
          category: 'merchandise' | 'experience' | 'discount' | 'digital' | 'vip'
          min_loyalty_level: number
          expires_at: string | null
          max_per_user: number | null
          sort_order: number
        }
        Insert: {
          club_id: string
          title: string
          description?: string | null
          points_cost: number
          stock?: number | null
          image_url?: string | null
          is_active?: boolean
          category?: 'merchandise' | 'experience' | 'discount' | 'digital' | 'vip'
          min_loyalty_level?: number
          expires_at?: string | null
          max_per_user?: number | null
          sort_order?: number
        }
        Update: {
          title?: string
          description?: string | null
          points_cost?: number
          stock?: number | null
          image_url?: string | null
          is_active?: boolean
          category?: 'merchandise' | 'experience' | 'discount' | 'digital' | 'vip'
          min_loyalty_level?: number
          expires_at?: string | null
          max_per_user?: number | null
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          reward_id: string
          points_spent: number
          status: 'pending' | 'confirmed' | 'used' | 'expired' | 'cancelled'
          redemption_code: string
          used_at: string | null
          expires_at: string | null
        }
        Insert: { user_id: string; reward_id: string; points_spent: number; status?: string; redemption_code?: string; expires_at?: string | null }
        Update: { status?: string; used_at?: string | null }
        Relationships: []
      }
      points_transactions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          club_id: string
          amount: number
          type: 'checkin' | 'pronostic' | 'survey' | 'activation' | 'bonus' | 'redemption' | 'manual'
          reference_id: string | null
          description: string
        }
        Insert: { user_id: string; club_id: string; amount: number; type: string; reference_id?: string | null; description: string }
        Update: never
        Relationships: []
      }
      sponsors: {
        Row: {
          id: string
          created_at: string
          club_id: string
          name: string
          logo_url: string | null
          website_url: string | null
          primary_color: string
          is_active: boolean
          sort_order: number
        }
        Insert: { club_id: string; name: string; logo_url?: string | null; website_url?: string | null; primary_color?: string; is_active?: boolean }
        Update: { name?: string; logo_url?: string | null; website_url?: string | null; primary_color?: string; is_active?: boolean }
        Relationships: []
      }
      surveys: {
        Row: {
          id: string
          created_at: string
          club_id: string
          sponsor_id: string | null
          match_id: string | null
          title: string
          description: string | null
          points_reward: number
          is_active: boolean
          expires_at: string | null
          estimated_minutes: number
          response_count: number
        }
        Insert: { club_id: string; sponsor_id?: string | null; match_id?: string | null; title: string; description?: string | null; points_reward?: number; is_active?: boolean; expires_at?: string | null; estimated_minutes?: number }
        Update: { title?: string; description?: string | null; points_reward?: number; is_active?: boolean; expires_at?: string | null; response_count?: number }
        Relationships: [
          {
            foreignKeyName: 'surveys_sponsor_id_fkey'
            columns: ['sponsor_id']
            isOneToOne: false
            referencedRelation: 'sponsors'
            referencedColumns: ['id']
          }
        ]
      }
      survey_questions: {
        Row: {
          id: string
          survey_id: string
          question: string
          type: 'single_choice' | 'multiple_choice' | 'text' | 'rating' | 'nps'
          options: Json | null
          is_required: boolean
          sort_order: number
        }
        Insert: { survey_id: string; question: string; type?: string; options?: Json | null; is_required?: boolean; sort_order?: number }
        Update: { question?: string; type?: string; options?: Json | null; sort_order?: number }
        Relationships: [
          {
            foreignKeyName: 'survey_questions_survey_id_fkey'
            columns: ['survey_id']
            isOneToOne: false
            referencedRelation: 'surveys'
            referencedColumns: ['id']
          }
        ]
      }
      survey_responses: {
        Row: {
          id: string
          created_at: string
          user_id: string
          survey_id: string
          answers: Json
          points_earned: number
        }
        Insert: { user_id: string; survey_id: string; answers: Json; points_earned: number }
        Update: never
        Relationships: []
      }
      activations: {
        Row: {
          id: string
          created_at: string
          match_id: string
          club_id: string
          title: string
          description: string | null
          type: 'trivia' | 'poll' | 'moment' | 'prediction'
          options: Json | null
          correct_answer: string | null
          points_reward: number
          status: 'scheduled' | 'active' | 'closed'
          starts_at: string | null
          closes_at: string | null
          response_count: number
        }
        Insert: { match_id: string; club_id: string; title: string; description?: string | null; type?: string; options?: Json | null; correct_answer?: string | null; points_reward?: number; status?: string; starts_at?: string | null; closes_at?: string | null }
        Update: { title?: string; status?: string; correct_answer?: string | null; starts_at?: string | null; closes_at?: string | null; response_count?: number }
        Relationships: []
      }
      activation_responses: {
        Row: {
          id: string
          created_at: string
          activation_id: string
          user_id: string
          answer: string
          points_earned: number
          is_correct: boolean | null
        }
        Insert: { activation_id: string; user_id: string; answer: string; points_earned?: number; is_correct?: boolean | null }
        Update: { is_correct?: boolean | null; points_earned?: number }
        Relationships: []
      }
      match_markets: {
        Row: {
          id: string
          match_id: string
          club_id: string
          market_type: string
          title: string
          options: Json
          is_active: boolean
          min_bet: number
          max_bet: number
          correct_answer: string | null
          status: 'open' | 'closed' | 'settled'
          created_at: string
        }
        Insert: {
          match_id: string
          club_id: string
          market_type?: string
          title: string
          options?: Json
          is_active?: boolean
          min_bet?: number
          max_bet?: number
          correct_answer?: string | null
          status?: string
        }
        Update: {
          title?: string
          options?: Json
          is_active?: boolean
          min_bet?: number
          max_bet?: number
          correct_answer?: string | null
          status?: string
        }
        Relationships: []
      }
      market_bets: {
        Row: {
          id: string
          user_id: string
          market_id: string
          match_id: string
          club_id: string
          selection: string
          odds_at_bet: number
          points_bet: number
          status: 'pending' | 'won' | 'lost'
          points_earned: number | null
          created_at: string
        }
        Insert: {
          user_id: string
          market_id: string
          match_id: string
          club_id: string
          selection: string
          odds_at_bet: number
          points_bet: number
          status?: string
          points_earned?: number | null
        }
        Update: {
          status?: string
          points_earned?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          created_at: string
          club_id: string
          match_id: string | null
          title: string
          body: string
          type: string
          audience: 'all' | 'checked_in' | 'not_checked_in' | 'gold_plus' | 'segment'
          sent_at: string | null
          sent_count: number
          scheduled_for: string | null
          deep_link: string | null
        }
        Insert: { club_id: string; match_id?: string | null; title: string; body: string; type?: string; audience?: string; scheduled_for?: string | null; deep_link?: string | null; sent_at?: string | null; sent_count?: number }
        Update: { sent_at?: string | null; sent_count?: number }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          user_id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          club_id: string
          total_points: number
          season_points: number
          loyalty_level: number
          rank: number
        }
        Relationships: []
      }
    }
    Functions: {
      award_points: {
        Args: { p_user_id: string; p_club_id: string; p_amount: number; p_type: string; p_reference_id: string; p_description: string }
        Returns: void
      }
      get_loyalty_level: {
        Args: { p_points: number }
        Returns: number
      }
    }
    Enums: {
      user_role: 'fan' | 'club_admin' | 'super_admin'
      match_status: 'upcoming' | 'live' | 'finished' | 'cancelled'
      reward_category: 'merchandise' | 'experience' | 'discount' | 'digital' | 'vip'
      transaction_type: 'checkin' | 'pronostic' | 'survey' | 'activation' | 'bonus' | 'redemption' | 'manual'
      redemption_status: 'pending' | 'confirmed' | 'used' | 'expired' | 'cancelled'
    }
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Club = Database['public']['Tables']['clubs']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type Checkin = Database['public']['Tables']['checkins']['Row']
export type Pronostic = Database['public']['Tables']['pronostics']['Row']
export type FanPoints = Database['public']['Tables']['fan_points']['Row']
export type Reward = Database['public']['Tables']['rewards']['Row']
export type Redemption = Database['public']['Tables']['redemptions']['Row']
export type PointsTransaction = Database['public']['Tables']['points_transactions']['Row']
export type Sponsor = Database['public']['Tables']['sponsors']['Row']
export type Survey = Database['public']['Tables']['surveys']['Row']
export type SurveyQuestion = Database['public']['Tables']['survey_questions']['Row']
export type SurveyResponse = Database['public']['Tables']['survey_responses']['Row']
export type Activation = Database['public']['Tables']['activations']['Row']
export type ActivationResponse = Database['public']['Tables']['activation_responses']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type LeaderboardEntry = Database['public']['Views']['leaderboard']['Row']
export type MatchMarket = Database['public']['Tables']['match_markets']['Row']
export type MarketBet = Database['public']['Tables']['market_bets']['Row']
export type MarketOption = { name: string; odds: number }
