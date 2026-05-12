-- ============================================================
-- SODALIS — Recovery: funzioni di lettura gruppo mancanti
-- Esegui questo file nel SQL Editor di Supabase.
-- Queste funzioni non sono state create correttamente dai file precedenti.
-- ============================================================

-- ─── get_events_for_group ────────────────────────────────────
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

-- ─── get_lore_entries_for_group ──────────────────────────────
create or replace function get_lore_entries_for_group(p_group_id uuid)
returns json
language plpgsql security definer stable as $$
declare
  result json;
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id and profile_id = auth.uid()
  ) then
    return '[]'::json;
  end if;

  select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
  into result
  from (
    select
      le.id,
      le.group_id,
      le.event_id,
      le.author_id,
      le.type,
      le.title,
      le.content,
      le.created_at,
      le.updated_at,
      row_to_json(prof) as author,
      case
        when ev.id is not null then
          json_build_object('id', ev.id, 'name', ev.name, 'event_date', ev.event_date)
        else null
      end as event,
      coalesce(
        (select json_agg(row_to_json(lr))
         from lore_reactions lr
         where lr.lore_entry_id = le.id),
        '[]'::json
      ) as reactions
    from lore_entries le
    join  profiles    prof on prof.id = le.author_id
    left join events  ev   on ev.id   = le.event_id
    where le.group_id = p_group_id
  ) t;

  return result;
end;
$$;

-- ─── get_social_actions_for_group ────────────────────────────
create or replace function get_social_actions_for_group(p_group_id uuid)
returns json
language plpgsql security definer stable as $$
declare
  result json;
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id and profile_id = auth.uid()
  ) then
    return '[]'::json;
  end if;

  select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
  into result
  from (
    select
      sa.id,
      sa.group_id,
      sa.event_id,
      sa.action_type_id,
      sa.from_profile_id,
      sa.to_profile_ids,
      sa.note,
      sa.registered_by,
      sa.created_at,
      row_to_json(atype) as action_type,
      row_to_json(prof)  as from_profile
    from social_actions sa
    join action_types atype on atype.id = sa.action_type_id
    join profiles     prof  on prof.id  = sa.from_profile_id
    where sa.group_id = p_group_id
  ) t;

  return result;
end;
$$;

-- ─── get_action_types_for_group ──────────────────────────────
create or replace function get_action_types_for_group(p_group_id uuid)
returns json
language sql security definer stable as $$
  select coalesce(
    json_agg(row_to_json(atype) order by atype.is_default desc, atype.created_at),
    '[]'::json
  )
  from action_types atype
  where atype.group_id = p_group_id
     or atype.group_id is null;
$$;

-- ─── Grant permessi ──────────────────────────────────────────
grant execute on function get_events_for_group(uuid)         to authenticated;
grant execute on function get_lore_entries_for_group(uuid)   to authenticated;
grant execute on function get_social_actions_for_group(uuid) to authenticated;
grant execute on function get_action_types_for_group(uuid)   to authenticated;

-- ─── Forza reload schema cache PostgREST ─────────────────────
notify pgrst, 'reload schema';
