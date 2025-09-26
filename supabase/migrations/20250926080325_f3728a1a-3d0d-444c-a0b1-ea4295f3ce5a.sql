-- View ricca per la UI delle conversazioni
create or replace view public.user_conversations_view as
select
  c.id                                   as conversation_id,
  -- contesto
  c.space_id,
  s.title                                as space_title,
  c.booking_id,
  -- stato conversazione
  c.last_message,
  c.last_message_at,
  c.created_at,
  c.updated_at,
  -- partecipanti
  c.host_id,
  c.coworker_id,
  auth.uid()                             as me_id,
  (auth.uid() = c.host_id)               as me_is_host,
  case when auth.uid() = c.host_id then c.coworker_id else c.host_id end as other_user_id,

  -- profilo controparte (nome, foto, ruolo)
  case when auth.uid() = c.host_id then pc.first_name else ph.first_name end as other_first_name,
  case when auth.uid() = c.host_id then pc.last_name  else ph.last_name  end as other_last_name,
  case when auth.uid() = c.host_id then pc.profile_photo_url else ph.profile_photo_url end as other_profile_photo_url,
  case when auth.uid() = c.host_id then pc.role else ph.role end as other_role,

  -- metriche messaggi
  coalesce(mcnt.message_count, 0)        as message_count,

  -- ultimo messaggio (mittente)
  ml.sender_id                           as last_sender_id,
  (ml.sender_id = auth.uid())            as last_sender_is_me,
  ps.first_name                          as last_sender_first_name,
  ps.last_name                           as last_sender_last_name

from public.conversations c
join public.profiles ph on ph.id = c.host_id
join public.profiles pc on pc.id = c.coworker_id
left join public.spaces   s  on s.id = c.space_id

-- conteggio messaggi per conversazione (rispetta RLS di messages)
left join lateral (
  select count(*) as message_count
  from public.messages m
  where m.conversation_id = c.id
) mcnt on true

-- ultimo messaggio della conversazione (rispetta RLS di messages)
left join lateral (
  select m.sender_id, m.created_at
  from public.messages m
  where m.conversation_id = c.id
  order by m.created_at desc
  limit 1
) ml on true
left join public.profiles ps on ps.id = ml.sender_id

-- filtro di appartenenza: mostra SOLO le conversazioni dell'utente corrente
where auth.uid() in (c.host_id, c.coworker_id);

-- Permessi di lettura sulla view (RLS è applicata sulle tabelle sottostanti)
grant select on public.user_conversations_view to anon, authenticated;