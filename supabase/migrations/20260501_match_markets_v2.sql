-- ============================================================
-- MATCH MARKETS V2 — new columns + match_bets table
-- Run in Supabase SQL editor
-- ============================================================

-- Add new columns to match_markets
alter table match_markets
  add column if not exists market_key   text not null default 'custom',
  add column if not exists market_label text not null default '',
  add column if not exists market_emoji text not null default '⚽',
  add column if not exists is_published boolean not null default false,
  add column if not exists is_settled   boolean not null default false,
  add column if not exists correct_option text,
  add column if not exists closes_at   timestamptz,
  add column if not exists bet_count   int not null default 0;

-- Migrate existing data: fill new columns from old ones
update match_markets set
  market_key   = coalesce(market_type, 'custom'),
  market_label = coalesce(title, ''),
  is_published = coalesce(is_active, false),
  is_settled   = (status = 'settled'),
  correct_option = correct_answer
where market_label = '';

-- Create match_bets table (new, distinct from market_bets)
create table if not exists match_bets (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid references auth.users(id) on delete cascade not null,
  match_market_id   uuid references match_markets(id) on delete cascade not null,
  match_id          uuid references matches(id) not null,
  club_id           uuid references clubs(id) not null,
  selected_option   text not null,
  odds              numeric(6,2) not null,
  points_staked     int not null check (points_staked > 0),
  potential_win     int not null,
  is_settled        boolean not null default false,
  is_correct        boolean,
  points_won        int,
  created_at        timestamptz default now(),
  unique (user_id, match_market_id)
);

-- RLS for match_bets
alter table match_bets enable row level security;

drop policy if exists "match_bets_select" on match_bets;
drop policy if exists "match_bets_insert" on match_bets;
create policy "match_bets_select" on match_bets for select using (auth.uid() = user_id);
create policy "match_bets_insert" on match_bets for insert with check (auth.uid() = user_id);

-- Allow club admins to read all bets for their club (for settlement)
drop policy if exists "match_bets_admin_select" on match_bets;
create policy "match_bets_admin_select" on match_bets for select using (
  auth.uid() in (select id from profiles where role in ('club_admin', 'super_admin'))
);
