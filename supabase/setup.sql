-- ============================================================================
-- IronLeague BD: auth, profiles, subscriptions, access control
-- Run this ONCE in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE where possible).
-- Passwords are handled by Supabase Auth (auth.users, hashed): never store them here.
-- ============================================================================

-- ───────────── Users (one row per auth user) ─────────────
-- If you ran an earlier version of this file, the table was called "profiles": rename it
-- (keeps your data), then drop the old objects that still point at the old name.
do $$
begin
  if to_regclass('public.users') is null and to_regclass('public.profiles') is not null then
    alter table public.profiles rename to users;
  end if;
end $$;
create table if not exists public.users (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text,
  phone          text,
  name           text not null default '',
  sex            text check (sex in ('M','F')),
  age            int  check (age between 14 and 100),
  bodyweight_kg  numeric(5,1) check (bodyweight_kg between 30 and 250),
  district       text,
  area           text,
  home_gym       text,
  experience     text check (experience in ('novice','intermediate','pro')),
  weight_class   text,
  -- Subscription / role. Users can NOT change these (see trigger below).
  role           text not null default 'lifter' check (role in ('lifter','moderator','admin')),
  is_subscribed  boolean not null default false,
  subscribed_until timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_login_at  timestamptz
);

-- Works even if a users table already existed with fewer columns.
alter table public.users
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists name text not null default '',
  add column if not exists sex text,
  add column if not exists age int,
  add column if not exists bodyweight_kg numeric(5,1),
  add column if not exists district text,
  add column if not exists area text,
  add column if not exists home_gym text,
  add column if not exists experience text,
  add column if not exists weight_class text,
  add column if not exists role text not null default 'lifter',
  add column if not exists is_subscribed boolean not null default false,
  add column if not exists subscribed_until timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_login_at timestamptz;

-- Old objects from the first version (named after "profiles").
drop trigger if exists profiles_protect on public.users;
drop policy if exists "profiles readable" on public.users;

-- Helpers (security definer so RLS policies can use them without recursion)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role in ('admin','moderator'));
$$;

-- Paid, unexpired subscription.
create or replace function public.is_pro(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users
    where id = uid and is_subscribed and (subscribed_until is null or subscribed_until > now())
  );
$$;

-- Create the users row automatically the moment someone registers (email/password OR Google),
-- and keep email + last login in sync afterwards. Runs inside the database, so it works even
-- when email confirmation is on and the browser has no session yet.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  -- 1) the row itself: this part cannot fail on bad form data
  insert into public.users (id, email, name, last_login_at)
  values (
    new.id,
    nullif(new.email, ''),
    coalesce(nullif(m->>'name', ''), nullif(m->>'full_name', ''), nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Lifter'),
    new.last_sign_in_at
  )
  on conflict (id) do update set email = excluded.email;

  -- 1b) mobile number: the login number (phone sign-up) or the one typed on the form.
  --     Always saved as +8801XXXXXXXXX. Its own step so it can never block anything else.
  begin
    update public.users set phone = coalesce(
      case when coalesce(new.phone, '') <> '' then '+' || ltrim(new.phone, '+') end,
      case when (m->>'phone') ~ '^\+?8801[3-9][0-9]{8}$' then '+' || ltrim(m->>'phone', '+') end
    ) where id = new.id;
  exception when others then
    raise warning 'handle_new_user phone skipped for %: %', new.id, sqlerrm;
  end;

  -- 2) details typed on the sign-up form (district, gender, age, bodyweight).
  --    Separate step so a bad value can never block the signup or lose the row above.
  begin
    update public.users set
      district      = nullif(m->>'district', ''),
      home_gym      = nullif(left(m->>'home_gym', 80), ''),
      sex           = case when m->>'sex' in ('M','F') then m->>'sex' end,
      age           = case when (m->>'age') ~ '^[0-9]{2,3}$' then (m->>'age')::int end,
      bodyweight_kg = case when (m->>'bodyweight_kg') ~ '^[0-9]{2,3}(\.[0-9])?$' then (m->>'bodyweight_kg')::numeric end
    where id = new.id;
  exception when others then
    raise warning 'handle_new_user details skipped for %: %', new.id, sqlerrm;
  end;
  return new;
exception when others then
  raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_updated() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.users
     set email = nullif(new.email, ''),
         phone = coalesce(case when coalesce(new.phone, '') <> '' then '+' || ltrim(new.phone, '+') end, phone),
         last_login_at = coalesce(new.last_sign_in_at, last_login_at)
   where id = new.id
     and (email is distinct from nullif(new.email, '')
          or last_login_at is distinct from new.last_sign_in_at
          or (coalesce(new.phone, '') <> '' and phone is distinct from '+' || ltrim(new.phone, '+')));
  return new;
end $$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated after update of email, phone, last_sign_in_at on auth.users
  for each row execute function public.handle_user_updated();

-- Backfill: anyone who signed up BEFORE this trigger existed.
insert into public.users (id, email, name, last_login_at)
select u.id, u.email,
       coalesce(nullif(u.raw_user_meta_data->>'name', ''), nullif(u.raw_user_meta_data->>'full_name', ''), split_part(coalesce(u.email, ''), '@', 1)),
       u.last_sign_in_at
from auth.users u
on conflict (id) do update set email = excluded.email;

-- Backfill mobile numbers for people who already signed up.
update public.users u
   set phone = '+' || ltrim(a.phone, '+')
  from auth.users a
 where a.id = u.id and coalesce(a.phone, '') <> '' and u.phone is null;
update public.users u
   set phone = '+' || ltrim(a.raw_user_meta_data->>'phone', '+')
  from auth.users a
 where a.id = u.id and u.phone is null
   and (a.raw_user_meta_data->>'phone') ~ '^\+?8801[3-9][0-9]{8}$';
create index if not exists users_phone_idx on public.users (phone);

-- Users may edit their own details, but never their role or subscription.
-- (auth.uid() is null when you run SQL from the dashboard, so that path stays allowed.)
create or replace function public.protect_profile_columns() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is not null and not public.is_admin() then
    if coalesce(current_setting('app.allow_sub_change', true), '') <> '1' and (new.role is distinct from old.role
       or new.is_subscribed is distinct from old.is_subscribed
       or new.subscribed_until is distinct from old.subscribed_until) then
      raise exception 'role and subscription can only be changed by an admin';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists users_protect on public.users;
create trigger users_protect before update on public.users
  for each row execute function public.protect_profile_columns();

alter table public.users enable row level security;

-- Email is private: you can read your own row; staff can read all. Passwords are never stored here.
drop policy if exists "users readable" on public.users;
drop policy if exists "own user read" on public.users;
create policy "own user read" on public.users for select
  using (id = auth.uid() or public.is_staff());

-- What guests may see about other lifters: no email, no role, no payment info.
create or replace view public.public_profiles as
select id, name, sex, age, district, area, home_gym, experience, weight_class,
       (is_subscribed and (subscribed_until is null or subscribed_until > now())) as is_pro,
       created_at
from public.users;
grant select on public.public_profiles to anon, authenticated;

drop policy if exists "own profile insert" on public.users;
drop policy if exists "own user insert" on public.users;
create policy "own user insert" on public.users for insert
  with check (id = auth.uid() and role = 'lifter' and is_subscribed = false);

drop policy if exists "own profile update" on public.users;
drop policy if exists "own user update" on public.users;
create policy "own user update" on public.users for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "admin profile update" on public.users;
drop policy if exists "admin user update" on public.users;
create policy "admin user update" on public.users for update
  using (public.is_admin()) with check (public.is_admin());

-- ───────────── Lifter history (competition entry, attempts, PRs, DOTS, video refs) ─────────────
-- One private JSON document per user: category, weigh-in, payment, every attempt
-- with weight / status / DOTS / AI pre-check / video path. Only subscribers can write.
create table if not exists public.lifter_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  entry      jsonb,
  avatar     text,
  updated_at timestamptz not null default now()
);
alter table public.lifter_state enable row level security;

drop policy if exists "own state read" on public.lifter_state;
create policy "own state read" on public.lifter_state for select
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists "own state write" on public.lifter_state;
create policy "own state write" on public.lifter_state for insert
  with check (user_id = auth.uid() and public.is_pro());

drop policy if exists "own state update" on public.lifter_state;
create policy "own state update" on public.lifter_state for update
  using (user_id = auth.uid() and public.is_pro()) with check (user_id = auth.uid() and public.is_pro());

-- ───────────── Subscriptions (manual bKash / Nagad, approved by an admin) ─────────────
create table if not exists public.subscription_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  plan          text not null check (plan in ('season','year')),
  method        text not null check (method in ('bkash','nagad')),
  sender_number text not null check (sender_number ~ '^(\+?88)?01[3-9][0-9]{8}$'),
  trx_id        text not null check (length(trx_id) between 6 and 40),
  amount_bdt    int  not null check (amount_bdt > 0),
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  note          text,
  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid references auth.users(id),
  unique (trx_id)                                 -- one payment can't be used twice
);
alter table public.subscription_requests enable row level security;

drop policy if exists "own requests read" on public.subscription_requests;
create policy "own requests read" on public.subscription_requests for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "own request insert" on public.subscription_requests;
create policy "own request insert" on public.subscription_requests for insert
  with check (user_id = auth.uid() and status = 'pending');
-- No update/delete policy: only approve_subscription() / reject_subscription() change a request.

-- Plan prices and lengths live in the database so the client can't pick its own price.
create table if not exists public.plans (
  id        text primary key,
  label     text not null,
  price_bdt int  not null,
  days      int  not null
);
insert into public.plans (id, label, price_bdt, days) values
  ('season', 'Season pass (90 days)', 500, 90),
  ('year',   'Annual pass (365 days)', 1500, 365)
on conflict (id) do nothing;   -- edit prices here (PLACEHOLDERS: set your real prices)
alter table public.plans enable row level security;
drop policy if exists "plans readable" on public.plans;
create policy "plans readable" on public.plans for select using (true);

-- Force the amount to match the plan price on insert.
create or replace function public.check_request_amount() returns trigger
language plpgsql security definer set search_path = public as $$
declare p public.plans;
begin
  select * into p from public.plans where id = new.plan;
  if p is null or new.amount_bdt <> p.price_bdt then
    raise exception 'Amount does not match the plan price';
  end if;
  return new;
end $$;
drop trigger if exists subscription_amount on public.subscription_requests;
create trigger subscription_amount before insert on public.subscription_requests
  for each row execute function public.check_request_amount();

-- Admin approves a request: marks the user subscribed (extends if already active).
create or replace function public.approve_subscription(request_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.subscription_requests; p public.plans; base timestamptz;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select * into r from public.subscription_requests where id = request_id for update;
  if r is null then raise exception 'request not found'; end if;
  if r.status = 'approved' then return; end if;
  select * into p from public.plans where id = r.plan;

  select greatest(now(), coalesce(subscribed_until, now())) into base
    from public.users where id = r.user_id;

  update public.subscription_requests
     set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid() where id = request_id;
  update public.users
     set is_subscribed = true, subscribed_until = base + make_interval(days => p.days)
   where id = r.user_id;
end $$;

create or replace function public.reject_subscription(request_id uuid, reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  update public.subscription_requests
     set status = 'rejected', note = reason, reviewed_at = now(), reviewed_by = auth.uid()
   where id = request_id and status = 'pending';
end $$;

grant execute on function public.approve_subscription(uuid) to authenticated;
grant execute on function public.reject_subscription(uuid, text) to authenticated;

-- ───────────── Storage: recorded lift videos (private, subscribers only) ─────────────
insert into storage.buckets (id, name, public) values ('lifts', 'lifts', false)
on conflict (id) do nothing;

drop policy if exists "lifts upload own" on storage.objects;
create policy "lifts upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'lifts' and (storage.foldername(name))[1] = auth.uid()::text and public.is_pro());

drop policy if exists "lifts read own or staff" on storage.objects;
create policy "lifts read own or staff" on storage.objects for select to authenticated
  using (bucket_id = 'lifts' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff()));

-- ───────────── DEMO MODE (remove before launch) ─────────────
-- Lets testers skip the payment: the "Skip payment (demo)" button calls activate_demo_subscription().
-- It only works while app_settings.demo_mode = 'on'. At launch run:
--   update public.app_settings set value = 'off' where key = 'demo_mode';
create table if not exists public.app_settings (key text primary key, value text not null);
insert into public.app_settings (key, value) values ('demo_mode', 'on') on conflict (key) do nothing;
alter table public.app_settings enable row level security;
drop policy if exists "settings readable" on public.app_settings;
create policy "settings readable" on public.app_settings for select using (true);

create or replace function public.activate_demo_subscription() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if coalesce((select value from public.app_settings where key = 'demo_mode'), 'off') <> 'on' then
    raise exception 'Demo mode is off';
  end if;
  perform set_config('app.allow_sub_change', '1', true);   -- lets the protect trigger through, this transaction only
  update public.users
     set is_subscribed = true,
         subscribed_until = greatest(now(), coalesce(subscribed_until, now())) + interval '30 days'
   where id = auth.uid();
end $$;
grant execute on function public.activate_demo_subscription() to authenticated;

-- ───────────── Social: follow, like a lift video, private messages ─────────────
-- Only signed-in users can use these. Everyone signed in can see who follows whom and the
-- like counts; messages are visible to the two people in the conversation only.
create table if not exists public.follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  followee_id uuid not null references public.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
alter table public.follows enable row level security;
drop policy if exists "follows readable" on public.follows;
create policy "follows readable" on public.follows for select to authenticated using (true);
drop policy if exists "follow as me" on public.follows;
create policy "follow as me" on public.follows for insert to authenticated with check (follower_id = auth.uid());
drop policy if exists "unfollow as me" on public.follows;
create policy "unfollow as me" on public.follows for delete to authenticated using (follower_id = auth.uid());

create table if not exists public.video_likes (
  user_id    uuid not null references public.users(id) on delete cascade,
  owner_id   uuid not null references public.users(id) on delete cascade,
  lift       text not null check (lift in ('squat','bench','deadlift')),
  created_at timestamptz not null default now(),
  primary key (user_id, owner_id, lift)
);
alter table public.video_likes enable row level security;
drop policy if exists "likes readable" on public.video_likes;
create policy "likes readable" on public.video_likes for select to authenticated using (true);
drop policy if exists "like as me" on public.video_likes;
create policy "like as me" on public.video_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "unlike as me" on public.video_likes;
create policy "unlike as me" on public.video_likes for delete to authenticated using (user_id = auth.uid());

create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.users(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  body         text not null check (char_length(btrim(body)) between 1 and 500),
  created_at   timestamptz not null default now(),
  read_at      timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists messages_pair_idx on public.messages (sender_id, recipient_id, created_at);
create index if not exists messages_inbox_idx on public.messages (recipient_id, created_at);
alter table public.messages enable row level security;
drop policy if exists "read my messages" on public.messages;
create policy "read my messages" on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());
drop policy if exists "send as me" on public.messages;
create policy "send as me" on public.messages for insert to authenticated with check (sender_id = auth.uid());
drop policy if exists "mark mine read" on public.messages;
create policy "mark mine read" on public.messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
-- The only thing a recipient may change is read_at (never the text).
revoke update on public.messages from authenticated;
grant update (read_at) on public.messages to authenticated;

-- ───────────── Shared leaderboard: every lifter's best lifts, visible to everyone ─────────────
-- Your device uploads your best Good Lifts here; the leaderboard on EVERY device reads them.
-- "verified" can only be set by an admin/moderator (the app can't write that column).
create table if not exists public.results (
  user_id      uuid primary key references public.users(id) on delete cascade,
  squat_kg     numeric(5,1) not null default 0 check (squat_kg between 0 and 600),
  bench_kg     numeric(5,1) not null default 0 check (bench_kg between 0 and 600),
  deadlift_kg  numeric(5,1) not null default 0 check (deadlift_kg between 0 and 600),
  bodyweight_kg numeric(5,1) check (bodyweight_kg is null or bodyweight_kg between 25 and 300),
  has_proof    boolean not null default false,
  verified     boolean not null default false,
  updated_at   timestamptz not null default now()
);
alter table public.results enable row level security;
drop policy if exists "results readable" on public.results;
create policy "results readable" on public.results for select to anon, authenticated using (true);
drop policy if exists "results insert own" on public.results;
create policy "results insert own" on public.results for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "results update own" on public.results;
create policy "results update own" on public.results for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Column-level: the app may write the numbers, never "verified".
revoke insert, update on public.results from anon, authenticated;
grant insert (user_id, squat_kg, bench_kg, deadlift_kg, bodyweight_kg, has_proof, updated_at) on public.results to authenticated;
-- (user_id is included because an upsert re-sets it; the policy above still forces it to be yours.)
grant update (user_id, squat_kg, bench_kg, deadlift_kg, bodyweight_kg, has_proof, updated_at) on public.results to authenticated;

create or replace view public.public_leaderboard as
select u.id, u.name, u.sex, u.age, u.district, u.area, u.home_gym, u.experience, u.weight_class,
       (u.is_subscribed and (u.subscribed_until is null or u.subscribed_until > now())) as is_pro,
       r.squat_kg, r.bench_kg, r.deadlift_kg, r.bodyweight_kg, r.has_proof, r.verified, r.updated_at
from public.results r
join public.users u on u.id = r.user_id
where r.squat_kg + r.bench_kg + r.deadlift_kg > 0;
grant select on public.public_leaderboard to anon, authenticated;

-- ───────────── Follows and likes on the DEMO lifters (ids "1".."24") ─────────────
-- Demo lifters aren't accounts, so they get their own tables. This lets counts add up across
-- every account and device (two accounts following the same demo lifter = 2 followers).
create table if not exists public.demo_follows (
  user_id    uuid not null references public.users(id) on delete cascade,
  lifter_id  text not null check (length(lifter_id) between 1 and 12),
  created_at timestamptz not null default now(),
  primary key (user_id, lifter_id)
);
alter table public.demo_follows enable row level security;
drop policy if exists "demo follows readable" on public.demo_follows;
create policy "demo follows readable" on public.demo_follows for select to authenticated using (true);
drop policy if exists "demo follow as me" on public.demo_follows;
create policy "demo follow as me" on public.demo_follows for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "demo unfollow as me" on public.demo_follows;
create policy "demo unfollow as me" on public.demo_follows for delete to authenticated using (user_id = auth.uid());

create table if not exists public.demo_likes (
  user_id    uuid not null references public.users(id) on delete cascade,
  lifter_id  text not null check (length(lifter_id) between 1 and 12),
  lift       text not null check (lift in ('squat','bench','deadlift')),
  created_at timestamptz not null default now(),
  primary key (user_id, lifter_id, lift)
);
alter table public.demo_likes enable row level security;
drop policy if exists "demo likes readable" on public.demo_likes;
create policy "demo likes readable" on public.demo_likes for select to authenticated using (true);
drop policy if exists "demo like as me" on public.demo_likes;
create policy "demo like as me" on public.demo_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "demo unlike as me" on public.demo_likes;
create policy "demo unlike as me" on public.demo_likes for delete to authenticated using (user_id = auth.uid());

-- ───────────── Entry-fee payments (SSLCommerz online payment gateway) ─────────────
-- One row per payment attempt. ONLY the server (service-role key) can write here: the
-- browser can read its own rows but can never mark anything "paid". A row turns "paid"
-- only after our server re-checks the payment with SSLCommerz (see lib/payments/settle.ts).
create table if not exists public.entry_payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  meet_id       text not null,
  tran_id       text not null unique,
  amount_bdt    numeric(10,2) not null,
  status        text not null default 'pending'
                check (status in ('pending','paid','failed','cancelled','held')),
  val_id        text unique,                -- gateway validation id: a payment can't be reused
  bank_tran_id  text,
  channel       text,                       -- e.g. BKASH-BKash, NAGAD-Nagad, VISA-Dutch Bangla
  risk_level    text,
  note          text,
  raw           jsonb,
  created_at    timestamptz not null default now(),
  paid_at       timestamptz,
  updated_at    timestamptz not null default now()
);
-- A lifter can only ever have ONE paid entry fee per meet (stops double charging being recorded).
create unique index if not exists entry_payments_one_paid
  on public.entry_payments (user_id, meet_id) where status = 'paid';
create index if not exists entry_payments_user_idx on public.entry_payments (user_id, meet_id);

alter table public.entry_payments enable row level security;
drop policy if exists "own entry payments read" on public.entry_payments;
create policy "own entry payments read" on public.entry_payments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
-- No insert/update/delete policies on purpose: the service role (server) bypasses RLS.
revoke insert, update, delete on public.entry_payments from anon, authenticated;

-- ============================================================================
-- AFTER running: make yourself admin (replace the email), so you can approve payments:
--   update public.users set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
-- To test Pro features without a payment:
--   update public.users set is_subscribed = true, subscribed_until = now() + interval '90 days'
--   where id = (select id from auth.users where email = 'you@example.com');
-- ============================================================================
