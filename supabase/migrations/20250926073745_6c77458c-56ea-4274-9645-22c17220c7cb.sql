-- Prerequisito (una sola volta)
create extension if not exists pgcrypto;

-- 1) Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  coworker_id uuid not null references public.profiles(id) on delete cascade,
  space_id uuid null references public.spaces(id) on delete set null,
  booking_id uuid null references public.bookings(id) on delete set null,
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_conversation
on public.conversations(
  host_id, coworker_id,
  coalesce(booking_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(space_id,   '00000000-0000-0000-0000-000000000000'::uuid)
);

alter table public.conversations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='conversations' and policyname='conversations_select'
  ) then
    create policy conversations_select on public.conversations
      for select using (auth.uid() in (host_id, coworker_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='conversations' and policyname='conversations_insert'
  ) then
    create policy conversations_insert on public.conversations
      for insert with check (auth.uid() in (host_id, coworker_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='conversations' and policyname='conversations_update'
  ) then
    create policy conversations_update on public.conversations
      for update using (auth.uid() in (host_id, coworker_id));
  end if;
end $$;

-- 2) messages.conversation_id + indici
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='messages' and column_name='conversation_id'
  ) then
    alter table public.messages
      add column conversation_id uuid null references public.conversations(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_messages_conversation on public.messages(conversation_id);
create index if not exists idx_messages_created_at on public.messages(created_at);

alter table public.messages enable row level security;

-- RLS messages basata su conversations
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='messages' and policyname='messages_select'
  ) then
    create policy messages_select on public.messages
      for select using (
        exists (
          select 1 from public.conversations c
          where c.id = messages.conversation_id
            and auth.uid() in (c.host_id, c.coworker_id)
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='messages' and policyname='messages_insert'
  ) then
    create policy messages_insert on public.messages
      for insert with check (
        exists (
          select 1 from public.conversations c
          where c.id = messages.conversation_id
            and auth.uid() in (c.host_id, c.coworker_id)
        )
      );
  end if;
end $$;

-- 3) RPC get_or_create_conversation
create or replace function public.get_or_create_conversation(
  p_host_id uuid,
  p_coworker_id uuid,
  p_space_id uuid,
  p_booking_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.conversations
  where host_id = p_host_id
    and coworker_id = p_coworker_id
    and coalesce(booking_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(p_booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and coalesce(space_id,   '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(p_space_id,   '00000000-0000-0000-0000-000000000000'::uuid)
  limit 1;

  if v_id is null then
    insert into public.conversations(host_id, coworker_id, space_id, booking_id)
    values (p_host_id, p_coworker_id, p_space_id, p_booking_id)
    returning id into v_id;
  end if;

  return v_id;
end $$;

revoke all on function public.get_or_create_conversation(uuid,uuid,uuid,uuid) from public;
grant execute on function public.get_or_create_conversation(uuid,uuid,uuid,uuid) to anon, authenticated;

-- 4) Trigger: aggiorna last_message/last_message_at
create or replace function public.update_conversation_last_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set last_message    = coalesce(new.content, new.body)::text,
      last_message_at = coalesce(new.created_at, now()),
      updated_at      = now()
  where id = new.conversation_id;
  return new;
end $$;

drop trigger if exists trg_messages_conversation_last on public.messages;
create trigger trg_messages_conversation_last
after insert on public.messages
for each row
when (new.conversation_id is not null)
execute function public.update_conversation_last_message();

-- 5) Backfill: assegna conversation_id ai messaggi esistenti (via booking)
with base as (
  select m.id as msg_id, b.id as booking_id, b.space_id, s.host_id, b.user_id as coworker_id
  from public.messages m
  join public.bookings b on b.id = m.booking_id
  join public.spaces   s on s.id = b.space_id
  where m.conversation_id is null
)
update public.messages m
set conversation_id = g.conv_id
from (
  select msg_id,
         public.get_or_create_conversation(host_id, coworker_id, space_id, booking_id) as conv_id
  from base
) g
where m.id = g.msg_id
  and m.conversation_id is null;