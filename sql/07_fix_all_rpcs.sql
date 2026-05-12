-- ============================================================
-- SODALIS — Fix completo: tutte le RPC mancanti + write RPCs
-- Esegui questo file su Supabase per risolvere tutti i problemi
-- ============================================================

-- ─── RE-INCLUDE da 05_rpc_group_data.sql ────────────────────
-- (in caso non sia stato eseguito)

create or replace function get_events_for_group(p_group_id uuid)
returns setof events
language sql security definer stable as $$
  select * from events
  where group_id = p_group_id
    and exists (
      select 1 from group_members
      where group_id = p_group_id and profile_id = auth.uid()
    )
  order by event_date desc;
$$;

create or replace function get_lore_entries_for_group(p_group_id uuid)
returns json
language sql security definer stable as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
  from (
    select
      le.id, le.group_id, le.event_id, le.author_id,
      le.type, le.title, le.content, le.created_at, le.updated_at,
      row_to_json(p) as author,
      case when e.id is not null then
        json_build_object('id', e.id, 'name', e.name, 'event_date', e.event_date)
      else null end as event,
      coalesce(
        (select json_agg(row_to_json(lr))
         from lore_reactions lr
         where lr.lore_entry_id = le.id),
        '[]'::json
      ) as reactions
    from lore_entries le
    join profiles p on p.id = le.author_id
    left join events e on e.id = le.event_id
    where le.group_id = p_group_id
      and exists (
        select 1 from group_members
        where group_id = p_group_id and profile_id = auth.uid()
      )
  ) t;
$$;

create or replace function get_social_actions_for_group(p_group_id uuid)
returns json
language sql security definer stable as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
  from (
    select
      sa.id, sa.group_id, sa.event_id, sa.action_type_id,
      sa.from_profile_id, sa.to_profile_ids, sa.note,
      sa.registered_by, sa.created_at,
      row_to_json(at2) as action_type,
      row_to_json(p)   as from_profile
    from social_actions sa
    join action_types at2 on at2.id = sa.action_type_id
    join profiles p        on p.id  = sa.from_profile_id
    where sa.group_id = p_group_id
      and exists (
        select 1 from group_members
        where group_id = p_group_id and profile_id = auth.uid()
      )
  ) t;
$$;

-- ─── get_event_by_id ────────────────────────────────────────
create or replace function get_event_by_id(p_event_id uuid)
returns json
language sql security definer stable as $$
  select row_to_json(e)
  from events e
  where e.id = p_event_id
    and exists (
      select 1 from group_members
      where group_id = e.group_id and profile_id = auth.uid()
    );
$$;

-- ─── get_lore_by_event ───────────────────────────────────────
create or replace function get_lore_by_event(p_event_id uuid)
returns json
language sql security definer stable as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
  from (
    select
      le.id, le.group_id, le.event_id, le.author_id,
      le.type, le.title, le.content, le.created_at, le.updated_at,
      row_to_json(p) as author,
      coalesce(
        (select json_agg(row_to_json(lr))
         from lore_reactions lr
         where lr.lore_entry_id = le.id),
        '[]'::json
      ) as reactions
    from lore_entries le
    join profiles p on p.id = le.author_id
    where le.event_id = p_event_id
      and exists (
        select 1 from group_members gm
        join events ev on ev.id = p_event_id
        where gm.group_id = ev.group_id and gm.profile_id = auth.uid()
      )
  ) t;
$$;

-- ─── get_social_actions_by_event ─────────────────────────────
create or replace function get_social_actions_by_event(p_event_id uuid)
returns json
language sql security definer stable as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
  from (
    select
      sa.id, sa.group_id, sa.event_id, sa.action_type_id,
      sa.from_profile_id, sa.to_profile_ids, sa.note,
      sa.registered_by, sa.created_at,
      row_to_json(at2) as action_type,
      row_to_json(p)   as from_profile
    from social_actions sa
    join action_types at2 on at2.id = sa.action_type_id
    join profiles p        on p.id  = sa.from_profile_id
    where sa.event_id = p_event_id
      and exists (
        select 1 from group_members gm
        join events ev on ev.id = p_event_id
        where gm.group_id = ev.group_id and gm.profile_id = auth.uid()
      )
  ) t;
$$;

-- ─── get_tribunal_votes_for_event ────────────────────────────
create or replace function get_tribunal_votes_for_event(p_event_id uuid)
returns json
language sql security definer stable as $$
  select coalesce(json_agg(
    json_build_object(
      'id',           tv.id,
      'event_id',     tv.event_id,
      'category_id',  tv.category_id,
      'voter_id',     tv.voter_id,
      'voted_for_id', tv.voted_for_id,
      'created_at',   tv.created_at,
      'voted_for',    row_to_json(p)
    )
  ), '[]'::json)
  from tribunal_votes tv
  join profiles p on p.id = tv.voted_for_id
  join events e   on e.id = tv.event_id
  where tv.event_id = p_event_id
    and (
      e.tribunal_closed = true
      or tv.voter_id = auth.uid()
    )
    and exists (
      select 1 from group_members
      where group_id = e.group_id and profile_id = auth.uid()
    );
$$;

-- ─── get_my_votes_for_event ──────────────────────────────────
create or replace function get_my_votes_for_event(p_event_id uuid)
returns json
language sql security definer stable as $$
  select coalesce(json_agg(row_to_json(tv)), '[]'::json)
  from tribunal_votes tv
  where tv.event_id = p_event_id
    and tv.voter_id = auth.uid();
$$;

-- ─── get_action_types_for_group ──────────────────────────────
create or replace function get_action_types_for_group(p_group_id uuid)
returns json
language sql security definer stable as $$
  select coalesce(json_agg(row_to_json(at2) order by at2.is_default desc, at2.created_at), '[]'::json)
  from action_types at2
  where at2.group_id = p_group_id
     or at2.group_id is null;
$$;

-- ════════════════════════════════════════════════════════════
-- WRITE RPCs (security definer — bypassano RLS in React Native)
-- ════════════════════════════════════════════════════════════

-- ─── create_event ────────────────────────────────────────────
create or replace function create_event(
  p_group_id   uuid,
  p_name       text,
  p_event_date text,
  p_location   text default null
)
returns json
language plpgsql security definer as $$
declare
  v_row events;
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id and profile_id = auth.uid()
  ) then
    raise exception 'Non sei membro di questo gruppo';
  end if;

  insert into events (group_id, name, event_date, location, created_by)
  values (
    p_group_id,
    trim(p_name),
    p_event_date::date,
    nullif(trim(coalesce(p_location, '')), ''),
    auth.uid()
  )
  returning * into v_row;

  return row_to_json(v_row);
end;
$$;

-- ─── create_lore_entry ───────────────────────────────────────
create or replace function create_lore_entry(
  p_group_id text,
  p_type     text,
  p_title    text,
  p_content  text,
  p_event_id text default null
)
returns json
language plpgsql security definer as $$
declare
  v_row lore_entries;
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id::uuid and profile_id = auth.uid()
  ) then
    raise exception 'Non sei membro di questo gruppo';
  end if;

  insert into lore_entries (group_id, author_id, type, title, content, event_id)
  values (
    p_group_id::uuid,
    auth.uid(),
    p_type::lore_type,
    trim(p_title),
    p_content,
    case when p_event_id is null or trim(p_event_id) = '' then null else p_event_id::uuid end
  )
  returning * into v_row;

  return row_to_json(v_row);
end;
$$;

-- ─── create_social_action ────────────────────────────────────
create or replace function create_social_action(
  p_group_id        uuid,
  p_action_type_id  uuid,
  p_from_profile_id uuid,
  p_to_profile_ids  uuid[],
  p_note            text    default null,
  p_event_id        uuid    default null
)
returns json
language plpgsql security definer as $$
declare
  v_row social_actions;
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id and profile_id = auth.uid()
  ) then
    raise exception 'Non sei membro di questo gruppo';
  end if;

  insert into social_actions (
    group_id, action_type_id, from_profile_id,
    to_profile_ids, note, event_id, registered_by
  ) values (
    p_group_id,
    p_action_type_id,
    p_from_profile_id,
    p_to_profile_ids,
    nullif(trim(coalesce(p_note, '')), ''),
    p_event_id,
    auth.uid()
  )
  returning * into v_row;

  return row_to_json(v_row);
end;
$$;

-- ─── set_tribunal_open ───────────────────────────────────────
create or replace function set_tribunal_open(p_event_id uuid)
returns void
language plpgsql security definer as $$
begin
  if not exists (
    select 1 from events e
    join group_members gm on gm.group_id = e.group_id
    where e.id = p_event_id and gm.profile_id = auth.uid()
  ) then
    raise exception 'Non autorizzato';
  end if;

  update events
  set tribunal_open = true
  where id = p_event_id;
end;
$$;

-- ─── set_tribunal_closed ─────────────────────────────────────
create or replace function set_tribunal_closed(p_event_id uuid)
returns void
language plpgsql security definer as $$
begin
  if not exists (
    select 1 from events e
    join group_members gm on gm.group_id = e.group_id
    where e.id = p_event_id
      and gm.profile_id = auth.uid()
      and gm.role = 'owner'
  ) then
    raise exception 'Solo l''owner può chiudere il tribunale';
  end if;

  update events
  set tribunal_open = false, tribunal_closed = true
  where id = p_event_id;
end;
$$;

-- ─── submit_votes ────────────────────────────────────────────
create or replace function submit_votes(p_votes jsonb)
returns void
language plpgsql security definer as $$
declare
  v_vote     jsonb;
  v_event_id uuid;
  v_group_id uuid;
begin
  v_event_id := (p_votes -> 0 ->> 'event_id')::uuid;

  select group_id into v_group_id from events where id = v_event_id;

  if not exists (
    select 1 from group_members
    where group_id = v_group_id and profile_id = auth.uid()
  ) then
    raise exception 'Non autorizzato';
  end if;

  if not exists (
    select 1 from events
    where id = v_event_id
      and tribunal_open = true
      and tribunal_closed = false
  ) then
    raise exception 'Il tribunale non è aperto';
  end if;

  for v_vote in select * from jsonb_array_elements(p_votes)
  loop
    insert into tribunal_votes (event_id, category_id, voter_id, voted_for_id)
    values (
      (v_vote ->> 'event_id')::uuid,
      (v_vote ->> 'category_id')::uuid,
      auth.uid(),
      (v_vote ->> 'voted_for_id')::uuid
    )
    on conflict (event_id, category_id, voter_id) do nothing;
  end loop;
end;
$$;

-- ─── toggle_reaction ─────────────────────────────────────────
create or replace function toggle_reaction(
  p_lore_entry_id uuid,
  p_emoji         text
)
returns void
language plpgsql security definer as $$
declare
  v_group_id uuid;
  v_exists   boolean;
begin
  select group_id into v_group_id
  from lore_entries
  where id = p_lore_entry_id;

  if not exists (
    select 1 from group_members
    where group_id = v_group_id and profile_id = auth.uid()
  ) then
    raise exception 'Non autorizzato';
  end if;

  select exists(
    select 1 from lore_reactions
    where lore_entry_id = p_lore_entry_id
      and profile_id = auth.uid()
      and emoji = p_emoji
  ) into v_exists;

  if v_exists then
    delete from lore_reactions
    where lore_entry_id = p_lore_entry_id
      and profile_id = auth.uid()
      and emoji = p_emoji;
  else
    insert into lore_reactions (lore_entry_id, profile_id, emoji)
    values (p_lore_entry_id, auth.uid(), p_emoji);
  end if;
end;
$$;

-- ─── update_my_profile ───────────────────────────────────────
-- Aggiorna display_name, username e/o avatar_url (null = non modifica)
create or replace function update_my_profile(
  p_display_name text default null,
  p_username     text default null,
  p_avatar_url   text default null
)
returns json
language plpgsql security definer as $$
declare
  v_row profiles;
begin
  update profiles
  set
    display_name = coalesce(p_display_name, display_name),
    username     = coalesce(p_username,     username),
    avatar_url   = coalesce(p_avatar_url,   avatar_url)
  where id = auth.uid()
  returning * into v_row;

  return row_to_json(v_row);
end;
$$;

-- ─── delete_lore_entry ───────────────────────────────────────
create or replace function delete_lore_entry(p_lore_id uuid)
returns void
language plpgsql security definer as $$
declare
  v_author_id uuid;
  v_group_id  uuid;
begin
  select author_id, group_id into v_author_id, v_group_id
  from lore_entries
  where id = p_lore_id;

  if v_author_id is null then
    raise exception 'Lore non trovata';
  end if;

  if v_author_id <> auth.uid() and not exists (
    select 1 from group_members
    where group_id = v_group_id
      and profile_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'Non autorizzato';
  end if;

  delete from lore_entries where id = p_lore_id;
end;
$$;

-- ─── update_group_name ───────────────────────────────────────
create or replace function update_group_name(p_group_id uuid, p_name text)
returns json
language plpgsql security definer as $$
declare
  v_row groups;
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id
      and profile_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'Solo l''owner può modificare il gruppo';
  end if;

  update groups set name = trim(p_name) where id = p_group_id
  returning * into v_row;

  return row_to_json(v_row);
end;
$$;
