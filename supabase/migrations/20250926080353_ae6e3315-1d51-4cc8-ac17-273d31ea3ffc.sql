-- Fix the trigger function to use correct field name
create or replace function public.update_conversation_last_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set last_message    = new.content,
      last_message_at = coalesce(new.created_at, now()),
      updated_at      = now()
  where id = new.conversation_id;
  return new;
end $$;

-- Fix the search path for the get_or_create_conversation function
create or replace function public.get_or_create_conversation(
  p_host_id uuid,
  p_coworker_id uuid,
  p_space_id uuid,
  p_booking_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
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