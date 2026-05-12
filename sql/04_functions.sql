-- ============================================================
-- SODALIS — Trigger: auto-create profile on signup
-- ============================================================
-- Quando un utente si registra in auth.users, viene creato
-- automaticamente un profilo corrispondente in profiles.
-- display_name viene letto dai metadata passati durante la signup.
-- ============================================================

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  _username text;
  _display_name text;
begin
  -- Legge display_name dai metadata della signup (raw_user_meta_data)
  _display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1)
  );

  -- Genera uno username univoco basato sull'email
  _username := regexp_replace(
    lower(split_part(new.email, '@', 1)),
    '[^a-z0-9_]', '_', 'g'
  );

  -- Se lo username esiste già, aggiunge un suffisso numerico casuale
  if exists (select 1 from profiles where username = _username) then
    _username := _username || '_' || floor(random() * 9000 + 1000)::text;
  end if;

  insert into profiles (id, username, display_name)
  values (new.id, _username, _display_name);

  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- SODALIS — Funzione: join gruppo via invite code
-- ============================================================
-- Funzione RPC chiamata dal client per entrare in un gruppo
-- tramite codice invito. Restituisce i dati del gruppo trovato
-- oppure un errore se il codice non esiste o l'utente è già membro.
-- ============================================================

create or replace function join_group_by_invite(code text)
returns json language plpgsql security definer as $$
declare
  _group groups%rowtype;
  _already_member boolean;
begin
  -- Normalizza il codice (uppercase)
  code := upper(trim(code));

  -- Trova il gruppo
  select * into _group from groups where invite_code = code;

  if not found then
    raise exception 'INVITE_CODE_NOT_FOUND'
      using hint = 'Il codice invito non esiste.';
  end if;

  -- Controlla se è già membro
  select exists(
    select 1 from group_members
    where group_id = _group.id and profile_id = auth.uid()
  ) into _already_member;

  if _already_member then
    raise exception 'ALREADY_MEMBER'
      using hint = 'Sei già membro di questo gruppo.';
  end if;

  -- Aggiunge il membro
  insert into group_members (group_id, profile_id, role)
  values (_group.id, auth.uid(), 'member');

  return json_build_object(
    'group_id',   _group.id,
    'group_name', _group.name,
    'emoji',      _group.emoji
  );
end;
$$;

-- ============================================================
-- SODALIS — Funzione: genera invite code univoco
-- ============================================================

create or replace function generate_invite_code()
returns text language plpgsql as $$
declare
  _chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  _code  text := '';
  _i     integer;
begin
  loop
    _code := '';
    for _i in 1..6 loop
      _code := _code || substr(_chars, floor(random() * length(_chars) + 1)::integer, 1);
    end loop;
    exit when not exists (select 1 from groups where invite_code = _code);
  end loop;
  return _code;
end;
$$;
