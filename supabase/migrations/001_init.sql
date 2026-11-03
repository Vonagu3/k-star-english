-- K-Star English Academy: progress sync + parent review queue.
-- Run once in Supabase → SQL Editor.

create table if not exists public.kid_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('draw', 'audio', 'text', 'photo')),
  lesson_id text not null,
  prompt text not null,
  text text,
  storage_path text,
  status text not null default 'new' check (status in ('new', 'approved', 'redo')),
  comment text,
  bonus_hearts int,
  created_at timestamptz not null default now()
);
create index if not exists submissions_user_created on public.submissions (user_id, created_at desc);

alter table public.kid_state enable row level security;
alter table public.submissions enable row level security;

drop policy if exists "own state" on public.kid_state;
create policy "own state" on public.kid_state for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own submissions" on public.submissions;
create policy "own submissions" on public.submissions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Private bucket for drawings and voice recordings: files live under <user_id>/...
insert into storage.buckets (id, name, public) values ('submissions', 'submissions', false)
  on conflict (id) do nothing;

drop policy if exists "own files read" on storage.objects;
create policy "own files read" on storage.objects for select
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own files write" on storage.objects;
create policy "own files write" on storage.objects for insert
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "own files delete" on storage.objects;
create policy "own files delete" on storage.objects for delete
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
