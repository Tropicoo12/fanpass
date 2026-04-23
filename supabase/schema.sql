-- ============================================================
-- FanPass — Schéma Supabase
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('fan', 'club_admin', 'super_admin');
create type match_status as enum ('upcoming', 'live', 'finished', 'cancelled');
create type reward_category as enum ('merchandise', 'experience', 'discount', 'digital');
create type transaction_type as enum ('checkin', 'pronostic', 'bonus', 'redemption');
create type redemption_status as enum ('pending', 'confirmed', 'cancelled');

-- ============================================================
-- CLUBS
-- ============================================================
create table clubs (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text not null default '#10b981',
  secondary_color text not null default '#0f0f1a',
  stadium_name text
);

-- ============================================================
-- PROFILES (étend auth.users)
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  username text unique,
  full_name text,
  avatar_url text,
  role user_role not null default 'fan',
  club_id uuid references clubs(id) on delete set null
);

-- Trigger pour créer le profil à l'inscription
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- MATCHES
-- ============================================================
create table matches (
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
  qr_code_token text not null default encode(gen_random_bytes(32), 'hex') unique
);

-- ============================================================
-- CHECK-INS (scan QR au stade)
-- ============================================================
create table checkins (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid not null references profiles(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  points_earned int not null default 50,
  scanned_at timestamptz default now(),
  unique(user_id, match_id)
);

-- ============================================================
-- PRONOSTICS
-- ============================================================
create table pronostics (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid not null references profiles(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  predicted_home_score int not null,
  predicted_away_score int not null,
  points_earned int,
  is_correct boolean,
  unique(user_id, match_id)
);

-- ============================================================
-- FAN POINTS (solde par fan × club)
-- ============================================================
create table fan_points (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  club_id uuid not null references clubs(id) on delete cascade,
  total_points int not null default 0,
  season_points int not null default 0,
  updated_at timestamptz default now(),
  unique(user_id, club_id)
);

-- ============================================================
-- REWARDS (catalogue)
-- ============================================================
create table rewards (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  club_id uuid not null references clubs(id) on delete cascade,
  title text not null,
  description text,
  points_cost int not null,
  stock int,
  image_url text,
  is_active boolean not null default true,
  category reward_category not null default 'merchandise'
);

-- ============================================================
-- REDEMPTIONS (échanges de récompenses)
-- ============================================================
create table redemptions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz default now(),
  user_id uuid not null references profiles(id) on delete cascade,
  reward_id uuid not null references rewards(id) on delete cascade,
  points_spent int not null,
  status redemption_status not null default 'pending',
  redemption_code text not null default encode(gen_random_bytes(4), 'hex')
);

-- ============================================================
-- POINTS TRANSACTIONS (audit trail)
-- ============================================================
create table points_transactions (
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
-- FONCTION: award_points
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
  -- Upsert fan_points
  insert into fan_points (user_id, club_id, total_points, season_points)
  values (p_user_id, p_club_id, p_amount, p_amount)
  on conflict (user_id, club_id)
  do update set
    total_points = fan_points.total_points + p_amount,
    season_points = fan_points.season_points + p_amount,
    updated_at = now();

  -- Log transaction
  insert into points_transactions (user_id, club_id, amount, type, reference_id, description)
  values (p_user_id, p_club_id, p_amount, p_type, p_reference_id, p_description);
end;
$$;

-- ============================================================
-- VUE: leaderboard
-- ============================================================
create or replace view leaderboard as
select
  fp.user_id,
  p.username,
  p.full_name,
  p.avatar_url,
  fp.club_id,
  fp.total_points,
  rank() over (partition by fp.club_id order by fp.total_points desc) as rank
from fan_points fp
join profiles p on p.id = fp.user_id;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table checkins enable row level security;
alter table pronostics enable row level security;
alter table fan_points enable row level security;
alter table redemptions enable row level security;
alter table points_transactions enable row level security;

-- Profils: lecture publique, écriture propre
create policy "Profiles visibles" on profiles for select using (true);
create policy "Profil modifiable par owner" on profiles for update using (auth.uid() = id);

-- Check-ins: lecture propre, insertion propre
create policy "Checkins lisibles" on checkins for select using (auth.uid() = user_id);
create policy "Checkin créable" on checkins for insert with check (auth.uid() = user_id);

-- Pronostics: lecture propre, écriture propre
create policy "Pronostics lisibles" on pronostics for select using (auth.uid() = user_id);
create policy "Pronostic créable" on pronostics for insert with check (auth.uid() = user_id);
create policy "Pronostic modifiable" on pronostics for update using (auth.uid() = user_id);

-- Fan points: lecture propre
create policy "Points lisibles" on fan_points for select using (auth.uid() = user_id);

-- Rédemptions: lecture propre
create policy "Rédemptions lisibles" on redemptions for select using (auth.uid() = user_id);

-- Transactions: lecture propre
create policy "Transactions lisibles" on points_transactions for select using (auth.uid() = user_id);

-- Clubs & Rewards: lecture publique
alter table clubs enable row level security;
alter table matches enable row level security;
alter table rewards enable row level security;
create policy "Clubs lisibles" on clubs for select using (true);
create policy "Matchs lisibles" on matches for select using (true);
create policy "Rewards lisibles" on rewards for select using (true);
