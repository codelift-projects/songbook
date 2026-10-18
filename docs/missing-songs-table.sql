-- ==============================================================
-- Supabase SQL Table for Missing Songs
-- Run this in your Supabase SQL Editor if using Supabase Cloud Sync
-- ==============================================================

create table if not exists public.missing_songs (
  id uuid default gen_random_uuid() primary key,
  keyword text not null,
  notes text,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.missing_songs enable row level security;

-- Allow public read access
create policy "Allow public read access on missing_songs"
  on public.missing_songs for select
  using (true);

-- Allow public insert access
create policy "Allow public insert on missing_songs"
  on public.missing_songs for insert
  with check (true);

-- Allow public delete access
create policy "Allow public delete on missing_songs"
  on public.missing_songs for delete
  using (true);
