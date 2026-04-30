-- ============================================================
-- FanPass — Complete Supabase Schema v2
-- Run this in the Supabase SQL editor (drop and recreate)
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type user_role as enum ('fan', 'club_admin', 'super_admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_status as enum ('upcoming', 'live', 'finished', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type reward_category as enum ('merchandise', 'experience', 'discount', 'digital', 'vip');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_type as enum ('checkin', 'pronostic', 'survey', 'activation', 'bonus', 'redemption', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type redemption_status as enum ('pending', 'confirmed', 'used', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activation_type as enum ('trivia', 'poll', 'moment', 'prediction');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activation_status as enum ('scheduled', 'active', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_audience as enum ('all', 'checked_in', 'not_checked_in', 'gold_plus', 'segment');
exception when duplicate_object then null; end $$;

-- ============================================================
-- CLUBS
-- ============================================================
create table if not exists clubs (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text not null default '#10b981',
  secondary_color text not null default '#0f0f1a',
  stadium_name text,
  city text,
  country text not null default 'BE'
);

-- ============================================================
-- PROFILES
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  username text unique,
  full_name text,
  avatar_url text,
  role user_role not null default 'fan',
  club_id uuid references clubs(id) on delete set null,
  phone text,
  birth_year int
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- MATCHES
-- ============================================================
create table if not exists matches (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  club_id uuid not null references clubs(id) on delete cascade,
  home_team text not null,
  away_team text not null,
  match_date timestamptz not null,
  venue text,
  status match_status not null default 'upcoming',
  home_score int,
  away_score int,
  qr_code_token text not null default encode(gen_random_bytes(32), 'hex') unique,
  checkin_opens_at timestamptz,
  checkin_closes_at timestamptz,
  geofence_lat numeric(10,7),
  geofence_lng numeric(10,7),
  geofence_radius_m int default 500,
  checkin_points int not null default 50,
  prediction_points_exact int not null default 100,
  prediction_points_winner int not null default 30
);

-- ============================================================
-- CHECK-INS
-- ============================================================
create table if not exists checkins (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid not null references profiles(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  points_earned int not null default 50,
  scanned_at timestamptz default now(),
  lat numeric(10,7),
  lng numeric(10,7),
  unique(user_id, match_id)
);

-- ============================================================
-- PRONOSTICS
-- ============================================================
create table if not exists pronostics (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  user_id uuid not null references profiles(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  predicted_home_score int not null,
  predicted_away_score int not null,
  points_earned int,
  is_correct boolean,
  result text, -- 'exact', 'winner', 'wrong', null
  unique(user_id, match_id)
);

-- ============================================================
-- FAN POINTS
-- ============================================================
create table if not exists fan_points (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  total_points int not null default 0 check (total_points >= 0),
  season_points int not null default 0 check (season_points >= 0),
  lifetime_points int not null default 0,
  updated_at timestamptz default now(),
  unique(user_id, club_id)
);

-- ============================================================
-- REWARDS
-- ============================================================
create table if not exists rewards (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  club_id uuid not null references clubs(id) on delete cascade,
  title text not null,
  description text,
  points_cost int not null check (points_cost > 0),
  stock int,
  image_url text,
  is_active boolean not null default true,
  category reward_category not null default 'merchandise',
  min_loyalty_level int not null default 0 check (min_loyalty_level between 0 and 4),
  expires_at timestamptz,
  max_per_user int,
  sort_order int not null default 0
);

-- ============================================================
-- REDEMPTIONS
-- ============================================================
create table if not exists redemptions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid not null references profiles(id) on delete cascade,
  reward_id uuid not null references rewards(id) on delete cascade,
  points_spent int not null,
  status redemption_status not null default 'pending',
  redemption_code text not null unique default upper(encode(gen_random_bytes(4), 'hex')),
  used_at timestamptz,
  expires_at timestamptz default (now() + interval '48 hours')
);

-- ============================================================
-- POINTS TRANSACTIONS
-- ============================================================
create table if not exists points_transactions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid not null references profiles(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  amount int not null,
  type transaction_type not null,
  reference_id uuid,
  description text not null
);

-- ============================================================
-- SPONSORS
-- ============================================================
create table if not exists sponsors (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  club_id uuid not null references clubs(id) on delete cascade,
  name text not null,
  logo_url text,
  website_url text,
  primary_color text default '#ffffff',
  is_active boolean not null default true,
  sort_order int not null default 0
);

-- ============================================================
-- SURVEYS
-- ============================================================
create table if not exists surveys (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  club_id uuid not null references clubs(id) on delete cascade,
  sponsor_id uuid references sponsors(id) on delete set null,
  match_id uuid references matches(id) on delete set null,
  title text not null,
  description text,
  points_reward int not null default 50,
  is_active boolean not null default true,
  expires_at timestamptz,
  estimated_minutes int not null default 2,
  response_count int not null default 0
);

-- ============================================================
-- SURVEY QUESTIONS
-- ============================================================
create table if not exists survey_questions (
  id uuid primary key default uuid_generate_v4(),
  survey_id uuid not null references surveys(id) on delete cascade,
  question text not null,
  type text not null default 'single_choice' check (type in ('single_choice', 'multiple_choice', 'text', 'rating', 'nps')),
  options jsonb,
  is_required boolean not null default true,
  sort_order int not null default 0
);

-- ============================================================
-- SURVEY RESPONSES
-- ============================================================
create table if not exists survey_responses (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid not null references profiles(id) on delete cascade,
  survey_id uuid not null references surveys(id) on delete cascade,
  answers jsonb not null default '{}',
  points_earned int not null,
  unique(user_id, survey_id)
);

-- ============================================================
-- ACTIVATIONS (live in-match)
-- ============================================================
create table if not exists activations (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  match_id uuid not null references matches(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  title text not null,
  description text,
  type activation_type not null default 'poll',
  options jsonb,
  correct_answer text,
  points_reward int not null default 25,
  status activation_status not null default 'scheduled',
  starts_at timestamptz,
  closes_at timestamptz,
  response_count int not null default 0
);

-- ============================================================
-- ACTIVATION RESPONSES
-- ============================================================
create table if not exists activation_responses (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  activation_id uuid not null references activations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  answer text not null,
  points_earned int default 0,
  is_correct boolean,
  unique(activation_id, user_id)
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  club_id uuid not null references clubs(id) on delete cascade,
  match_id uuid references matches(id) on delete set null,
  title text not null,
  body text not null,
  type text not null default 'general' check (type in ('general', 'match_start', 'activation', 'reward', 'result')),
  audience notification_audience not null default 'all',
  sent_at timestamptz,
  sent_count int not null default 0,
  scheduled_for timestamptz,
  deep_link text
);

-- ============================================================
-- FUNCTION: award_points (debit or credit)
-- ============================================================
create or replace function award_points(
  p_user_id uuid,
  p_club_id uuid,
  p_amount int,
  p_type transaction_type,
  p_reference_id uuid,
  p_description text
)
returns void language plpgsql security definer as $$
begin
  insert into fan_points (user_id, club_id, total_points, season_points, lifetime_points)
  values (p_user_id, p_club_id,
    greatest(0, p_amount),
    greatest(0, p_amount),
    greatest(0, p_amount)
  )
  on conflict (user_id, club_id) do update set
    total_points = greatest(0, fan_points.total_points + p_amount),
    season_points = greatest(0, fan_points.season_points + p_amount),
    lifetime_points = fan_points.lifetime_points + greatest(0, p_amount),
    updated_at = now();

  insert into points_transactions (user_id, club_id, amount, type, reference_id, description)
  values (p_user_id, p_club_id, p_amount, p_type, p_reference_id, p_description);
end;
$$;

-- ============================================================
-- FUNCTION: get_loyalty_level (from total_points)
-- ============================================================
create or replace function get_loyalty_level(p_points int)
returns int language sql immutable as $$
  select case
    when p_points >= 10000 then 4
    when p_points >= 5000  then 3
    when p_points >= 2500  then 2
    when p_points >= 1000  then 1
    else 0
  end;
$$;

-- ============================================================
-- FUNCTION: increment_survey_response_count
-- ============================================================
create or replace function increment_survey_responses()
returns trigger language plpgsql as $$
begin
  update surveys set response_count = response_count + 1 where id = new.survey_id;
  update activations set response_count = response_count + 1 where id = new.activation_id;
  return new;
exception when others then return new;
end;
$$;

-- ============================================================
-- VIEWS
-- ============================================================
create or replace view leaderboard as
select
  fp.user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  fp.club_id,
  fp.total_points,
  fp.season_points,
  get_loyalty_level(fp.lifetime_points) as loyalty_level,
  rank() over (partition by fp.club_id order by fp.total_points desc) as rank
from fan_points fp
join profiles p on p.id = fp.user_id;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table clubs enable row level security;
alter table matches enable row level security;
alter table checkins enable row level security;
alter table pronostics enable row level security;
alter table fan_points enable row level security;
alter table rewards enable row level security;
alter table redemptions enable row level security;
alter table points_transactions enable row level security;
alter table sponsors enable row level security;
alter table surveys enable row level security;
alter table survey_questions enable row level security;
alter table survey_responses enable row level security;
alter table activations enable row level security;
alter table activation_responses enable row level security;
alter table notifications enable row level security;

-- Profiles
drop policy if exists "Profiles visibles" on profiles;
drop policy if exists "Profil modifiable par owner" on profiles;
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Clubs (public read)
drop policy if exists "Clubs lisibles" on clubs;
create policy "clubs_select" on clubs for select using (true);

-- Matches (public read, club_admin write)
drop policy if exists "Matchs lisibles" on matches;
create policy "matches_select" on matches for select using (true);
create policy "matches_insert" on matches for insert with check (
  auth.uid() in (select id from profiles where role in ('club_admin', 'super_admin'))
);
create policy "matches_update" on matches for update using (
  auth.uid() in (select id from profiles where role in ('club_admin', 'super_admin'))
);

-- Checkins
drop policy if exists "Checkins lisibles" on checkins;
drop policy if exists "Checkin créable" on checkins;
create policy "checkins_select" on checkins for select using (auth.uid() = user_id);
create policy "checkins_insert" on checkins for insert with check (auth.uid() = user_id);

-- Pronostics
drop policy if exists "Pronostics lisibles" on pronostics;
drop policy if exists "Pronostic créable" on pronostics;
drop policy if exists "Pronostic modifiable" on pronostics;
create policy "pronostics_select" on pronostics for select using (auth.uid() = user_id);
create policy "pronostics_insert" on pronostics for insert with check (auth.uid() = user_id);
create policy "pronostics_update" on pronostics for update using (auth.uid() = user_id);

-- Fan points
drop policy if exists "Points lisibles" on fan_points;
create policy "fan_points_select" on fan_points for select using (auth.uid() = user_id);

-- Rewards (public read, club_admin write)
drop policy if exists "Rewards lisibles" on rewards;
create policy "rewards_select" on rewards for select using (true);
create policy "rewards_insert" on rewards for insert with check (
  auth.uid() in (select id from profiles where role in ('club_admin', 'super_admin'))
);
create policy "rewards_update" on rewards for update using (
  auth.uid() in (select id from profiles where role in ('club_admin', 'super_admin'))
);

-- Redemptions
drop policy if exists "Rédemptions lisibles" on redemptions;
create policy "redemptions_select" on redemptions for select using (auth.uid() = user_id);

-- Transactions
drop policy if exists "Transactions lisibles" on points_transactions;
create policy "transactions_select" on points_transactions for select using (auth.uid() = user_id);

-- Sponsors (public read)
create policy "sponsors_select" on sponsors for select using (true);

-- Surveys (public read for active)
create policy "surveys_select" on surveys for select using (is_active = true or auth.uid() in (
  select id from profiles where role in ('club_admin', 'super_admin')
));
create policy "surveys_insert" on surveys for insert with check (auth.uid() in (
  select id from profiles where role in ('club_admin', 'super_admin')
));
create policy "surveys_update" on surveys for update using (auth.uid() in (
  select id from profiles where role in ('club_admin', 'super_admin')
));

-- Survey questions (public read)
create policy "survey_questions_select" on survey_questions for select using (true);

-- Survey responses (own)
create policy "survey_responses_select" on survey_responses for select using (auth.uid() = user_id);
create policy "survey_responses_insert" on survey_responses for insert with check (auth.uid() = user_id);

-- Activations (public read)
create policy "activations_select" on activations for select using (true);
create policy "activations_insert" on activations for insert with check (auth.uid() in (
  select id from profiles where role in ('club_admin', 'super_admin')
));
create policy "activations_update" on activations for update using (auth.uid() in (
  select id from profiles where role in ('club_admin', 'super_admin')
));

-- Activation responses
drop policy if exists "Réponses activation lisibles" on activation_responses;
drop policy if exists "Réponses activation créables" on activation_responses;
create policy "activation_responses_select" on activation_responses for select using (auth.uid() = user_id);
create policy "activation_responses_insert" on activation_responses for insert with check (auth.uid() = user_id);

-- Notifications (club admin + fans can read sent ones)
create policy "notifications_select" on notifications for select using (
  sent_at is not null
  or auth.uid() in (select id from profiles where role in ('club_admin', 'super_admin'))
);
create policy "notifications_insert" on notifications for insert with check (
  auth.uid() in (select id from profiles where role in ('club_admin', 'super_admin'))
);

-- ============================================================
-- SEED DATA
-- ============================================================
insert into clubs (id, name, slug, primary_color, secondary_color, stadium_name, city)
values (
  'a0000000-0000-0000-0000-000000000001',
  'FC Bruxelles',
  'fc-bruxelles',
  '#10b981',
  '#0f0f1a',
  'Stade Roi Baudouin',
  'Bruxelles'
) on conflict (slug) do nothing;

-- ============================================================
-- MIGRATIONS — Odds API + Betting
-- Run after initial schema if tables already exist
-- ============================================================

alter table checkins
  add column if not exists device_id text;

alter table matches
  add column if not exists external_id text unique,
  add column if not exists odds_home numeric(4,2),
  add column if not exists odds_draw numeric(4,2),
  add column if not exists odds_away numeric(4,2);

alter table pronostics
  add column if not exists points_bet int,
  add column if not exists odds_multiplier numeric(5,2);

-- Club: team identity for external APIs + last sync timestamp
alter table clubs
  add column if not exists team_name text,
  add column if not exists matches_synced_at timestamptz,
  add column if not exists football_data_team_id int,
  add column if not exists competition_code text default 'BSL';

-- Enable realtime for live points badge
alter publication supabase_realtime add table fan_points;

-- ============================================================
-- MIGRATIONS — Match Markets & Betting
-- ============================================================

create table if not exists match_markets (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  match_id uuid not null references matches(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  market_key text not null,
  market_label text not null,
  market_emoji text not null default '🎯',
  options jsonb not null default '[]',
  is_published boolean not null default false,
  is_settled boolean not null default false,
  closes_at timestamptz,
  correct_option text,
  bet_count int not null default 0
);

create table if not exists match_bets (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid not null references profiles(id) on delete cascade,
  match_market_id uuid not null references match_markets(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  selected_option text not null,
  points_staked int not null check (points_staked > 0),
  odds numeric(5,2) not null,
  potential_win int not null,
  points_won int,
  is_settled boolean not null default false,
  is_correct boolean,
  unique(user_id, match_market_id)
);

alter table match_markets enable row level security;
alter table match_bets enable row level security;

create policy "match_markets_select" on match_markets for select using (true);
create policy "match_markets_insert" on match_markets for insert with check (
  auth.uid() in (select id from profiles where role in ('club_admin', 'super_admin'))
);
create policy "match_markets_update" on match_markets for update using (
  auth.uid() in (select id from profiles where role in ('club_admin', 'super_admin'))
);
create policy "match_markets_delete" on match_markets for delete using (
  auth.uid() in (select id from profiles where role in ('club_admin', 'super_admin'))
);

create policy "match_bets_select" on match_bets for select using (auth.uid() = user_id);
create policy "match_bets_insert" on match_bets for insert with check (auth.uid() = user_id);
