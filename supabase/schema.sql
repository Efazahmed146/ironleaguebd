-- IronLeague BD — Supabase schema for the online competition.
-- Apply in the Supabase SQL editor when you move off the local demo store.

create extension if not exists "pgcrypto";

-- ───────────────────────── Roles ─────────────────────────
create type app_role as enum ('lifter', 'judge', 'admin');

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          app_role not null default 'lifter',
  name          text not null check (char_length(name) between 2 and 60),
  email         text not null,
  sex           text not null check (sex in ('M','F')),
  birth_year    int  check (birth_year between 1930 and 2020),     -- age is derived from this
  bodyweight_kg numeric(5,1) not null check (bodyweight_kg between 30 and 250),
  home_gym      text not null,
  district      text not null,
  area          text,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

-- Helper used by RLS policies.
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('judge','admin'));
$$;

-- ───────────────────────── Meets ─────────────────────────
create table public.meets (
  id              text primary key,                 -- e.g. 'season-01-open'
  name            text not null,
  entry_fee_bdt   int  not null default 0,
  pay_bkash       text,
  pay_nagad       text,
  opens_at        timestamptz,
  closes_at       timestamptz,
  closed          boolean not null default false
);

create table public.entries (
  id               uuid primary key default gen_random_uuid(),
  meet_id          text not null references public.meets(id),
  lifter_id        uuid not null references public.profiles(id) on delete cascade,
  experience       text not null check (experience in ('novice','intermediate','pro')),
  weight_class     text not null check (weight_class in
                     ('-59','-66','-74','-83','-93','-105','-120','+120',
                      '-47','-52','-57','-63','-69','-76','-84','+84')),
  weigh_in_code    text not null,
  registered_at    timestamptz not null default now(),
  unique (meet_id, lifter_id)
);

-- ─────────────────── Weigh-in & payment ───────────────────
create type review_status as enum ('pending','approved','rejected');

create table public.weigh_ins (
  entry_id      uuid primary key references public.entries(id) on delete cascade,
  measured_kg   numeric(5,1) not null,
  photo_path    text not null,                      -- Supabase Storage: weighins/…
  photo_taken_at timestamptz,
  submitted_at  timestamptz not null default now(),
  status        review_status not null default 'pending',
  note          text,
  reviewed_by   uuid references public.profiles(id)
);

create table public.payments (
  entry_id      uuid primary key references public.entries(id) on delete cascade,
  method        text not null check (method in ('bkash','nagad')),
  sender_number text not null,
  trx_id        text not null,
  amount_bdt    int  not null,
  submitted_at  timestamptz not null default now(),
  status        review_status not null default 'pending',
  note          text,
  reviewed_by   uuid references public.profiles(id),
  unique (trx_id)                                   -- one TrxID can't be reused
);

-- ───────────────────────── Attempts ─────────────────────────
create type lift_type as enum ('squat','bench','deadlift');
create type attempt_status as enum ('declared','submitted','good','no_lift');

create table public.attempts (
  id            uuid primary key default gen_random_uuid(),
  entry_id      uuid not null references public.entries(id) on delete cascade,
  lift          lift_type not null,
  attempt_no    int  not null check (attempt_no between 1 and 3),
  weight_kg     numeric(5,1) not null check (weight_kg > 0 and weight_kg <= 500
                                             and (weight_kg * 2) = round(weight_kg * 2)),
  status        attempt_status not null default 'declared',
  video_path    text,                               -- Storage: lifts/<entry>/<lift>-<n>.webm (in-app recordings only)
  source        text check (source = 'in_app_camera'),   -- "Natively Recorded"; no other source exists
  duration_sec  numeric(5,1),
  mime_type     text,
  dots          numeric(6,2),                       -- DOTS of this lift: declared weight vs. bodyweight
  ai_result     jsonb,                              -- advisory AI pre-check: {status, checks[], summary, confidence}
  submitted_at  timestamptz,
  reasons       text[],
  note          text,
  judged_by     uuid references public.profiles(id),
  judged_at     timestamptz,
  unique (entry_id, lift, attempt_no),
  -- A submitted attempt must carry a natively recorded clip of at least 3 seconds.
  check (status = 'declared' or (video_path is not null and source = 'in_app_camera' and duration_sec >= 3))
);

-- Moderator queue: submitted attempts waiting for a human verdict, oldest first.
create view public.review_queue as
select a.id, a.entry_id, a.lift, a.attempt_no, a.weight_kg, a.dots, a.source,
       a.ai_result, a.video_path, a.submitted_at
from public.attempts a
where a.status = 'submitted'
order by a.submitted_at;

-- Rule enforcement in the database: weights only go up, previous attempt must be judged.
create or replace function public.enforce_attempt_rules() returns trigger
language plpgsql as $$
declare prev public.attempts;
begin
  if new.attempt_no > 1 then
    select * into prev from public.attempts
      where entry_id = new.entry_id and lift = new.lift and attempt_no = new.attempt_no - 1;
    if prev is null or prev.status in ('declared','submitted') then
      raise exception 'Previous attempt must be judged first';
    end if;
    if prev.status = 'good'    and new.weight_kg < prev.weight_kg + 2.5 then
      raise exception 'After a Good Lift go up at least 2.5 kg';
    end if;
    if prev.status = 'no_lift' and new.weight_kg < prev.weight_kg then
      raise exception 'Weights can only go up';
    end if;
  end if;
  return new;
end $$;

create trigger attempts_rules before insert on public.attempts
  for each row execute function public.enforce_attempt_rules();

-- Lifters may not edit a weight after the video is submitted, nor change the verdict.
create or replace function public.lock_attempt() returns trigger
language plpgsql as $$
begin
  if not public.is_staff() then
    if old.status <> 'declared' and new.weight_kg <> old.weight_kg then
      raise exception 'Weight is locked after the video is submitted';
    end if;
    if new.status in ('good','no_lift') and old.status is distinct from new.status then
      raise exception 'Only judges can set the verdict';
    end if;
  end if;
  return new;
end $$;

create trigger attempts_lock before update on public.attempts
  for each row execute function public.lock_attempt();

-- ───────────────────────── Leaderboard ─────────────────────────
-- Official results only: best GOOD lift per lift, weigh-in approved, fee approved (or free).
create view public.leaderboard as
select
  e.id            as entry_id,
  p.id            as lifter_id,
  p.name, p.sex, p.district, p.area, p.home_gym, p.avatar_url,
  extract(year from now())::int - p.birth_year as age,
  e.experience, e.weight_class, w.measured_kg as bodyweight_kg,
  coalesce(max(a.weight_kg) filter (where a.lift = 'squat'    and a.status = 'good'), 0) as squat_kg,
  coalesce(max(a.weight_kg) filter (where a.lift = 'bench'    and a.status = 'good'), 0) as bench_kg,
  coalesce(max(a.weight_kg) filter (where a.lift = 'deadlift' and a.status = 'good'), 0) as deadlift_kg,
  max(a.judged_at) as updated_at
from public.entries e
join public.profiles p on p.id = e.lifter_id
join public.weigh_ins w on w.entry_id = e.id and w.status = 'approved'
left join public.payments pay on pay.entry_id = e.id
join public.meets m on m.id = e.meet_id
left join public.attempts a on a.entry_id = e.id
where (m.entry_fee_bdt = 0 or pay.status = 'approved')
group by e.id, p.id, w.measured_kg;
-- DOTS is computed in the app (lib/scoring.ts) or in an RPC if you need server-side ranking.

-- ───────────────────────── Row-level security ─────────────────────────
alter table public.profiles  enable row level security;
alter table public.entries   enable row level security;
alter table public.weigh_ins enable row level security;
alter table public.payments  enable row level security;
alter table public.attempts  enable row level security;
alter table public.meets     enable row level security;

create policy "meets readable"       on public.meets for select using (true);
create policy "profiles readable"    on public.profiles for select using (true);
create policy "own profile write"    on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));
create policy "own profile insert"   on public.profiles for insert with check (auth.uid() = id and role = 'lifter');

create policy "entries readable"     on public.entries for select using (true);
create policy "own entry insert"     on public.entries for insert with check (lifter_id = auth.uid());
create policy "own entry update"     on public.entries for update using (lifter_id = auth.uid()
  and not exists (select 1 from public.weigh_ins w where w.entry_id = id));   -- category locks after weigh-in

-- Weigh-ins & payments: owner reads/writes while pending; staff review all.
create policy "weigh-in owner or staff read" on public.weigh_ins for select using (
  public.is_staff() or exists (select 1 from public.entries e where e.id = entry_id and e.lifter_id = auth.uid()));
create policy "weigh-in owner insert" on public.weigh_ins for insert with check (
  status = 'pending' and exists (select 1 from public.entries e where e.id = entry_id and e.lifter_id = auth.uid()));
create policy "weigh-in staff review" on public.weigh_ins for update using (public.is_staff());

create policy "payment owner or staff read" on public.payments for select using (
  public.is_staff() or exists (select 1 from public.entries e where e.id = entry_id and e.lifter_id = auth.uid()));
create policy "payment owner insert" on public.payments for insert with check (
  status = 'pending' and exists (select 1 from public.entries e where e.id = entry_id and e.lifter_id = auth.uid()));
create policy "payment staff review" on public.payments for update using (public.is_staff());

create policy "attempts readable" on public.attempts for select using (true);
create policy "own attempt insert" on public.attempts for insert with check (
  status = 'declared' and exists (select 1 from public.entries e where e.id = entry_id and e.lifter_id = auth.uid()));
create policy "own attempt update" on public.attempts for update using (
  exists (select 1 from public.entries e where e.id = entry_id and e.lifter_id = auth.uid()) or public.is_staff());

-- ───────────────────────── Storage buckets (create in dashboard) ─────────────────────────
-- weighins : private. Owner upload, staff read.
-- lifts    : private. Owner upload, staff + owner read; make public after judging if you want.
-- avatars  : public read.

-- ───────────────────────── Realtime ─────────────────────────
-- Enable Realtime on public.attempts so the leaderboard updates live:
--   alter publication supabase_realtime add table public.attempts;
