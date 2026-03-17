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

-- 2. Row Level Security
alter table public.profiles enable row level security;

-- 3. RLS Policies (drop first to make idempotent)
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

-- 4. Trigger function: auto-create profile row on signup
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
