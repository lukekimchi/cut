-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamptz default now() not null
);

-- Daily logs table
create table public.daily_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  calories integer,
  protein integer,
  weight float,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique(user_id, date)
);

-- Goals table
create table public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  target_weight float,
  target_date date,
  calorie_target integer,
  protein_target integer,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.daily_logs enable row level security;
alter table public.goals enable row level security;

-- Profiles RLS
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Daily logs RLS
create policy "Users can view own logs" on public.daily_logs
  for select using (auth.uid() = user_id);

create policy "Users can insert own logs" on public.daily_logs
  for insert with check (auth.uid() = user_id);

create policy "Users can update own logs" on public.daily_logs
  for update using (auth.uid() = user_id);

create policy "Users can delete own logs" on public.daily_logs
  for delete using (auth.uid() = user_id);

-- Goals RLS
create policy "Users can view own goals" on public.goals
  for select using (auth.uid() = user_id);

create policy "Users can insert own goals" on public.goals
  for insert with check (auth.uid() = user_id);

create policy "Users can update own goals" on public.goals
  for update using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger daily_logs_updated_at
  before update on public.daily_logs
  for each row execute procedure public.update_updated_at();

create trigger goals_updated_at
  before update on public.goals
  for each row execute procedure public.update_updated_at();
