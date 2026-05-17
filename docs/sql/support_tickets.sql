-- Run this in Supabase SQL Editor

create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  user_email  text not null,
  subject     text not null,
  message     text not null,
  category    text not null default 'question' check (category in ('bug', 'question', 'suggestion')),
  status      text not null default 'open' check (status in ('open', 'in_progress', 'closed')),
  admin_reply text,
  replied_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Users can only read/insert their own tickets
alter table public.support_tickets enable row level security;

create policy "Users read own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

create policy "Users insert own tickets"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

-- Service role (used by admin routes) bypasses RLS automatically
-- Index for fast user lookups
create index if not exists support_tickets_user_id_idx on public.support_tickets(user_id);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
