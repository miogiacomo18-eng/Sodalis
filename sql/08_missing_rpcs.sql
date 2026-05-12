-- ============================================================
-- SODALIS — Funzioni mancanti dai file locali
-- Queste funzioni sono usate dall'app ma non erano nei file SQL.
-- Esegui questo file su Supabase se la classifica non funziona.
-- ============================================================

-- ─── get_all_tribunal_results ────────────────────────────────
-- Restituisce tutti i voti dei tribunali chiusi del gruppo,
-- raggruppati per (event, category, voted_for).
-- Usata in classifica (tab Tribunali) e in debts screen.
create or replace function get_all_tribunal_results(p_group_id uuid)
returns json
language sql security definer stable as $$
  select coalesce(json_agg(t), '[]'::json)
  from (
    select
      tv.event_id,
      tv.category_id,
      tc.name  as category_name,
      tc.emoji as category_emoji,
      tv.voted_for_id,
      count(*) as vote_count
    from tribunal_votes tv
    join tribunal_categories tc on tc.id = tv.category_id
    join events e               on e.id  = tv.event_id
    where e.group_id       = p_group_id
      and e.tribunal_closed = true
      and exists (
        select 1 from group_members
        where group_id = p_group_id and profile_id = auth.uid()
      )
    group by tv.event_id, tv.category_id, tc.name, tc.emoji, tv.voted_for_id
  ) t;
$$;

-- ─── get_group_standings ─────────────────────────────────────
-- Classifica globale del gruppo:
--   - tribunal_wins: categorie vinte in tribunali chiusi
--   - tribunal_points: wins × 3
--   - social_actions: gesti ricevuti (in to_profile_ids)
--   - social_points: = social_actions (1 pt ciascuno)
--   - total_score: tribunal_points + social_points
create or replace function get_group_standings(p_group_id uuid)
returns json
language sql security definer stable as $$
  select coalesce(json_agg(t order by t.total_score desc, t.display_name), '[]'::json)
  from (
    with closed_events as (
      select id from events
      where group_id = p_group_id and tribunal_closed = true
    ),
    vote_counts as (
      select
        tv.event_id,
        tv.category_id,
        tv.voted_for_id,
        count(*) as cnt
      from tribunal_votes tv
      where tv.event_id in (select id from closed_events)
      group by tv.event_id, tv.category_id, tv.voted_for_id
    ),
    category_winners as (
      select distinct on (event_id, category_id)
        voted_for_id as profile_id
      from vote_counts
      order by event_id, category_id, cnt desc
    ),
    tribunal_stats as (
      select profile_id, count(*)::int as tribunal_wins
      from category_winners
      group by profile_id
    ),
    social_stats as (
      select
        unnest(to_profile_ids) as profile_id,
        count(*)::int          as social_count
      from social_actions
      where group_id = p_group_id
      group by unnest(to_profile_ids)
    )
    select
      gm.profile_id,
      p.display_name,
      p.avatar_url,
      gm.nickname,
      coalesce(ts.tribunal_wins,  0) as tribunal_wins,
      coalesce(ts.tribunal_wins,  0) * 3 as tribunal_points,
      coalesce(ss.social_count,   0) as social_actions,
      coalesce(ss.social_count,   0) as social_points,
      coalesce(ts.tribunal_wins,  0) * 3
        + coalesce(ss.social_count, 0) as total_score
    from group_members gm
    join profiles p on p.id = gm.profile_id
    left join tribunal_stats ts on ts.profile_id = gm.profile_id
    left join social_stats   ss on ss.profile_id = gm.profile_id
    where gm.group_id = p_group_id
      and exists (
        select 1 from group_members
        where group_id = p_group_id and profile_id = auth.uid()
      )
  ) t;
$$;

-- ─── Grant espliciti (nel caso non siano già presenti) ───────
grant execute on function get_all_tribunal_results(uuid) to authenticated;
grant execute on function get_group_standings(uuid) to authenticated;

-- Grant anche per le funzioni di 07_fix_all_rpcs.sql
-- (Supabase dovrebbe aggiungerli automaticamente, ma per sicurezza)
grant execute on function get_events_for_group(uuid)          to authenticated;
grant execute on function get_lore_entries_for_group(uuid)    to authenticated;
grant execute on function get_social_actions_for_group(uuid)  to authenticated;
grant execute on function get_event_by_id(uuid)               to authenticated;
grant execute on function get_lore_by_event(uuid)             to authenticated;
grant execute on function get_social_actions_by_event(uuid)   to authenticated;
grant execute on function get_tribunal_votes_for_event(uuid)  to authenticated;
grant execute on function get_my_votes_for_event(uuid)        to authenticated;
grant execute on function get_action_types_for_group(uuid)    to authenticated;
grant execute on function create_event(uuid, text, text, text) to authenticated;
grant execute on function create_lore_entry(text, text, text, text, text) to authenticated;
grant execute on function create_social_action(uuid, uuid, uuid, uuid[], text, uuid) to authenticated;
grant execute on function set_tribunal_open(uuid)             to authenticated;
grant execute on function set_tribunal_closed(uuid)           to authenticated;
grant execute on function submit_votes(jsonb)                 to authenticated;
grant execute on function toggle_reaction(uuid, text)         to authenticated;
grant execute on function update_my_profile(text, text, text) to authenticated;
grant execute on function delete_lore_entry(uuid)             to authenticated;
grant execute on function update_group_name(uuid, text)       to authenticated;
