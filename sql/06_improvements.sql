-- ============================================================
-- SODALIS — Improvements SQL
-- Esegui dopo 04_functions.sql e rls/03_rls.sql
-- ============================================================

-- ─── Aggiungi colonna description ai gruppi (opzionale) ─────
alter table groups
  add column if not exists description text
    check (description is null or char_length(description) <= 200);

-- ─── RPC: kick_member ────────────────────────────────────────
-- L'owner espelle un membro dal gruppo
create or replace function kick_member(p_group_id uuid, p_profile_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id
      and profile_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'Not authorized';
  end if;

  if p_profile_id = auth.uid() then
    raise exception 'Cannot kick yourself';
  end if;

  delete from group_members
  where group_id = p_group_id
    and profile_id = p_profile_id;
end;
$$;

-- ─── RPC: transfer_ownership ─────────────────────────────────
-- L'owner trasferisce la proprietà a un altro membro
create or replace function transfer_ownership(p_group_id uuid, p_new_owner_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id
      and profile_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'Not authorized';
  end if;

  update group_members
    set role = 'member'
  where group_id = p_group_id and profile_id = auth.uid();

  update group_members
    set role = 'owner'
  where group_id = p_group_id and profile_id = p_new_owner_id;
end;
$$;

-- ─── RPC: delete_group ────────────────────────────────────────
-- L'owner elimina il gruppo (cascade su tutti i dati)
create or replace function delete_group(p_group_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id
      and profile_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'Not authorized';
  end if;

  delete from groups where id = p_group_id;
end;
$$;

-- ─── RPC: add_action_type ────────────────────────────────────
-- Aggiunge un tipo di azione personalizzato per un gruppo
create or replace function add_action_type(
  p_group_id uuid,
  p_label    text,
  p_emoji    text
)
returns uuid
language plpgsql security definer
as $$
declare
  v_id uuid;
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id and profile_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  insert into action_types (group_id, label, emoji, is_default)
  values (p_group_id, p_label, p_emoji, false)
  returning id into v_id;

  return v_id;
end;
$$;

-- ─── RPC: delete_action_type ─────────────────────────────────
-- Elimina un tipo di azione personalizzato (solo owner, solo non-default)
create or replace function delete_action_type(p_action_type_id uuid, p_group_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id
      and profile_id = auth.uid()
      and role = 'owner'
  ) then
    raise exception 'Not authorized';
  end if;

  delete from action_types
  where id    = p_action_type_id
    and group_id = p_group_id
    and is_default = false;
end;
$$;

-- ─── Storage: istruzioni per la Dashboard Supabase ──────────
--
-- Vai in Supabase Dashboard > Storage > New bucket e crea:
--
--  1. Bucket "avatars"     — Public: true
--  2. Bucket "lore-photos" — Public: true
--
-- Poi in Storage > Policies aggiungi per ciascun bucket:
--
--  avatars:
--    INSERT: (auth.uid())::text = (storage.foldername(name))[1]
--    UPDATE: (auth.uid())::text = (storage.foldername(name))[1]
--    DELETE: (auth.uid())::text = (storage.foldername(name))[1]
--    SELECT: true  (pubblico)
--
--  lore-photos:
--    INSERT: auth.role() = 'authenticated'
--    SELECT: true  (pubblico)
--    DELETE: (auth.uid())::text = (string_to_array(name, '/'))[1]
