export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          role?: 'fan' | 'club_admin' | 'super_admin'
          club_id?: string | null
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
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          slug: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          stadium_name?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          slug?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          stadium_name?: string | null
        }
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
        }
        Insert: {
          id?: string
          created_at?: string
          club_id: string
          home_team: string
          away_team: string
          match_date: string
          venue?: string | null
          status?: 'upcoming' | 'live' | 'finished' | 'cancelled'
          home_score?: number | null
          away_score?: number | null
          qr_code_token?: string
        }
        Update: {
          id?: string
          created_at?: string
          club_id?: string
          home_team?: string
          away_team?: string
          match_date?: string
          venue?: string | null
          status?: 'upcoming' | 'live' | 'finished' | 'cancelled'
          home_score?: number | null
          away_score?: number | null
          qr_code_token?: string
        }
        Relationships: [
          {
            foreignKeyName: 'matches_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          }
        ]
      }
      checkins: {
        Row: {
          id: string
          created_at: string
          user_id: string
          match_id: string
          points_earned: number
          scanned_at: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          match_id: string
          points_earned?: number
          scanned_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          match_id?: string
          points_earned?: number
          scanned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'checkins_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'checkins_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          }
        ]
      }
      pronostics: {
        Row: {
          id: string
          created_at: string
          user_id: string
          match_id: string
          predicted_home_score: number
          predicted_away_score: number
          points_earned: number | null
          is_correct: boolean | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          match_id: string
          predicted_home_score: number
          predicted_away_score: number
          points_earned?: number | null
          is_correct?: boolean | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          match_id?: string
          predicted_home_score?: number
          predicted_away_score?: number
          points_earned?: number | null
          is_correct?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: 'pronostics_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'pronostics_match_id_fkey'
            columns: ['match_id']
            isOneToOne: false
            referencedRelation: 'matches'
            referencedColumns: ['id']
          }
        ]
      }
      fan_points: {
        Row: {
          id: string
          user_id: string
          club_id: string
          total_points: number
          season_points: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          club_id: string
          total_points?: number
          season_points?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          club_id?: string
          total_points?: number
          season_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'fan_points_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
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
          category: 'merchandise' | 'experience' | 'discount' | 'digital'
        }
        Insert: {
          id?: string
          created_at?: string
          club_id: string
          title: string
          description?: string | null
          points_cost: number
          stock?: number | null
          image_url?: string | null
          is_active?: boolean
          category?: 'merchandise' | 'experience' | 'discount' | 'digital'
        }
        Update: {
          id?: string
          created_at?: string
          club_id?: string
          title?: string
          description?: string | null
          points_cost?: number
          stock?: number | null
          image_url?: string | null
          is_active?: boolean
          category?: 'merchandise' | 'experience' | 'discount' | 'digital'
        }
        Relationships: [
          {
            foreignKeyName: 'rewards_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubs'
            referencedColumns: ['id']
          }
        ]
      }
      redemptions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          reward_id: string
          points_spent: number
          status: 'pending' | 'confirmed' | 'cancelled'
          redemption_code: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          reward_id: string
          points_spent: number
          status?: 'pending' | 'confirmed' | 'cancelled'
          redemption_code?: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          reward_id?: string
          points_spent?: number
          status?: 'pending' | 'confirmed' | 'cancelled'
          redemption_code?: string
        }
        Relationships: [
          {
            foreignKeyName: 'redemptions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'redemptions_reward_id_fkey'
            columns: ['reward_id']
            isOneToOne: false
            referencedRelation: 'rewards'
            referencedColumns: ['id']
          }
        ]
      }
      points_transactions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          club_id: string
          amount: number
          type: 'checkin' | 'pronostic' | 'bonus' | 'redemption'
          reference_id: string | null
          description: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          club_id: string
          amount: number
          type: 'checkin' | 'pronostic' | 'bonus' | 'redemption'
          reference_id?: string | null
          description: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          club_id?: string
          amount?: number
          type?: 'checkin' | 'pronostic' | 'bonus' | 'redemption'
          reference_id?: string | null
          description?: string
        }
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
          rank: number
        }
        Relationships: []
      }
    }
    Functions: {
      award_points: {
        Args: {
          p_user_id: string
          p_club_id: string
          p_amount: number
          p_type: string
          p_reference_id: string
          p_description: string
        }
        Returns: void
      }
    }
    Enums: {
      user_role: 'fan' | 'club_admin' | 'super_admin'
      match_status: 'upcoming' | 'live' | 'finished' | 'cancelled'
      reward_category: 'merchandise' | 'experience' | 'discount' | 'digital'
      transaction_type: 'checkin' | 'pronostic' | 'bonus' | 'redemption'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
