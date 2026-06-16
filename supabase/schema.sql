create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  access_code text unique,
  balance numeric(12,2) not null default 100.00,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists access_code text unique;

create table if not exists public.fixtures (
  id text primary key,
  provider text not null default 'api-football',
  competition text not null default 'FIFA World Cup 2026',
  group_code text,
  home_team text not null,
  away_team text not null,
  kickoff timestamptz not null,
  venue text,
  status text not null default 'scheduled',
  home_goals integer,
  away_goals integer,
  outcome text check (outcome in ('home', 'draw', 'away')),
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.markets (
  id text primary key,
  fixture_id text references public.fixtures(id) on delete set null,
  home_team text not null,
  away_team text not null,
  kickoff timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed', 'settled')),
  best_home_odds numeric(8,2),
  best_draw_odds numeric(8,2),
  best_away_odds numeric(8,2),
  bookmaker_count integer not null default 0,
  source text not null default 'the-odds-api',
  stale_after timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.odds_snapshots (
  id uuid primary key default gen_random_uuid(),
  market_id text references public.markets(id) on delete cascade,
  provider_event_id text,
  bookmaker text,
  home_odds numeric(8,2),
  draw_odds numeric(8,2),
  away_odds numeric(8,2),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  market_id text references public.markets(id) on delete restrict,
  pick text not null check (pick in ('home', 'draw', 'away')),
  stake numeric(12,2) not null check (stake > 0),
  locked_odds numeric(8,2) not null,
  status text not null default 'locked' check (status in ('locked', 'won', 'lost', 'void')),
  return_value numeric(12,2) not null default 0,
  locked_at timestamptz not null default now(),
  settled_at timestamptz
);

create table if not exists public.provider_checks (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  endpoint text not null,
  ok boolean not null,
  status_code integer,
  message text,
  quota_remaining text,
  quota_used text,
  checked_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.fixtures enable row level security;
alter table public.markets enable row level security;
alter table public.odds_snapshots enable row level security;
alter table public.predictions enable row level security;
alter table public.provider_checks enable row level security;

do $$ begin create policy "profiles are readable" on public.profiles for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "profiles can be created" on public.profiles for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "fixtures are readable" on public.fixtures for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "markets are readable" on public.markets for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "provider checks are readable" on public.provider_checks for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "predictions are readable" on public.predictions for select using (true); exception when duplicate_object then null; end $$;

create index if not exists fixtures_kickoff_idx on public.fixtures(kickoff);
create index if not exists markets_kickoff_idx on public.markets(kickoff);
create index if not exists predictions_profile_idx on public.predictions(profile_id);
create index if not exists profiles_access_code_idx on public.profiles(access_code);
create index if not exists odds_snapshots_market_idx on public.odds_snapshots(market_id, created_at desc);
