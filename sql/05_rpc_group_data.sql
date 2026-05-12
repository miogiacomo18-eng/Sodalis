-- ============================================================
-- SODALIS — RPC per dati di gruppo (security definer)
-- Stesso pattern di get_my_groups / get_group_members:
-- security definer bypassa i problemi JWT con le policy RLS.
-- ============================================================

-- ─── get_events_for_group ────────────────────────────────────
create or replace function get_events_for_group(p_group_id uuid)
returns setof events
language sql security definer stable as $$
  select * from events
  where group_id = p_group_id
    and exists (
      select 1 from group_members
      where group_id = p_group_id
        and profile_id = auth.uid()
    )
  order by event_date desc;
$$;

-- ─── get_lore_entries_for_group ──────────────────────────────
-- Ritorna lore_entries con author (Profile), event (parziale) e reactions.
create or replace function get_lore_entries_for_group(p_group_id uuid)
returns json
language sql security definer stable as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
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
      row_to_json(p)  as author,
      case
        when e.id is not null then
          json_build_object('id', e.id, 'name', e.name, 'event_date', e.event_date)
        else null
      end as event,
      coalesce(
        (select json_agg(row_to_json(lr))
         from lore_reactions lr
         where lr.lore_entry_id = le.id),
        '[]'::json
      ) as reactions
    from lore_entries le
    join  profiles p on p.id = le.author_id
    left join events e on e.id = le.event_id
    where le.group_id = p_group_id
      and exists (
        select 1 from group_members
        where group_id = p_group_id
          and profile_id = auth.uid()
      )
  ) t
$$;

-- ─── get_social_actions_for_group ────────────────────────────
-- Ritorna social_actions con action_type e from_profile.
create or replace function get_social_actions_for_group(p_group_id uuid)
returns json
language sql security definer stable as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]'::json)
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
      row_to_json(at) as action_type,
      row_to_json(p)  as from_profile
    from social_actions sa
    join action_types at on at.id = sa.action_type_id
    join profiles p      on p.id  = sa.from_profile_id
    where sa.group_id = p_group_id
      and exists (
        select 1 from group_members
        where group_id = p_group_id
          and profile_id = auth.uid()
      )
  ) t
$$;
