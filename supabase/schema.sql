-- ============================================================
-- JumpIn QR Check-In: Supabase Database Schema
-- Run once in Supabase Dashboard -> SQL Editor
-- ============================================================

-- 1. Profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text not null,
  last_name text not null,
  email text not null,
  school text not null,
  dob text not null,
  last_checkin timestamptz
);

-- 2. Events table
create table if not exists public.events (
  id text primary key,
  name text not null,
  event_date date,
  location text,
  created_at timestamptz default now()
);

-- 3. Attendances table
create table if not exists public.attendances (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_id text references public.events(id) on delete cascade not null,
  type text check (type in ('ingresso', 'uscita')) not null,
  scanned_at timestamptz default now()
);

-- 4. Row Level Security
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.attendances enable row level security;

-- 5. RLS Policies — profiles (drop first to make idempotent)
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
  on profiles for select
  using ( (select auth.uid()) = id );

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- 6. RLS Policies — events
drop policy if exists "Events readable by authenticated" on events;
create policy "Events readable by authenticated"
  on events for select
  to authenticated
  using (true);

-- 7. RLS Policies — attendances
drop policy if exists "Users can insert own attendance" on attendances;
create policy "Users can insert own attendance"
  on attendances for insert
  to authenticated
  with check ( (select auth.uid()) = user_id );

drop policy if exists "Users can view own attendance" on attendances;
create policy "Users can view own attendance"
  on attendances for select
  to authenticated
  using ( (select auth.uid()) = user_id );

-- 8. Trigger function: auto-create profile row on signup
-- security definer with empty search_path is required so the trigger can INSERT
-- into public.profiles even when RLS is enabled
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name, last_name, email, school, dob)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.email,
    new.raw_user_meta_data ->> 'school',
    new.raw_user_meta_data ->> 'dob'
  );
  return new;
end;
$$;

-- 5. Trigger: fires after every new auth.users row
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
