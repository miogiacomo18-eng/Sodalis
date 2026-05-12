-- ============================================================
-- SODALIS — RLS Policies
-- ============================================================
-- Principio base: un utente può vedere/modificare solo i dati
-- dei gruppi di cui è membro. L'appartenenza al gruppo è
-- verificata tramite la tabella group_members.
-- ============================================================

-- ─── Abilita RLS su tutte le tabelle ────────────────────────
alter table profiles           enable row level security;
alter table groups             enable row level security;
alter table group_members      enable row level security;
alter table events             enable row level security;
alter table lore_entries       enable row level security;
alter table lore_reactions     enable row level security;
alter table action_types       enable row level security;
alter table social_actions     enable row level security;
alter table tribunal_categories enable row level security;
alter table tribunal_votes     enable row level security;

-- ─── Helper function: controlla appartenenza al gruppo ──────
-- Usata in quasi tutte le policy per evitare subquery ripetute.
create or replace function is_group_member(gid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from group_members
    where group_id = gid
      and profile_id = auth.uid()
  );
$$;

-- Controlla se l'utente è owner del gruppo
create or replace function is_group_owner(gid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from group_members
    where group_id = gid
      and profile_id = auth.uid()
      and role = 'owner'
  );
$$;

-- ============================================================
-- PROFILES
-- ============================================================

-- SELECT: ogni utente autenticato può leggere i profili
-- (necessario per mostrare avatar e nomi dei membri del gruppo)
create policy "profiles_select"
  on profiles for select
  to authenticated
  using (true);

-- INSERT: un utente può creare solo il proprio profilo
create policy "profiles_insert"
  on profiles for insert
  to authenticated
  with check (id = auth.uid());

-- UPDATE: un utente può aggiornare solo il proprio profilo
create policy "profiles_update"
  on profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- DELETE: nessuno può cancellare profili (si gestisce via cascade da auth)
-- (nessuna policy DELETE → comportamento blocco di default)

-- ============================================================
-- GROUPS
-- ============================================================

-- SELECT: un utente vede solo i gruppi di cui è membro
create policy "groups_select"
  on groups for select
  to authenticated
  using (is_group_member(id));

-- INSERT: qualsiasi utente autenticato può creare un gruppo
-- (diventerà owner tramite trigger o funzione applicativa)
create policy "groups_insert"
  on groups for insert
  to authenticated
  with check (created_by = auth.uid());

-- UPDATE: solo l'owner può modificare il gruppo
create policy "groups_update"
  on groups for update
  to authenticated
  using (is_group_owner(id))
  with check (is_group_owner(id));

-- DELETE: solo l'owner può eliminare il gruppo
create policy "groups_delete"
  on groups for delete
  to authenticated
  using (is_group_owner(id));

-- ============================================================
-- GROUP_MEMBERS
-- ============================================================

-- SELECT: un membro può vedere gli altri membri dei suoi gruppi
create policy "group_members_select"
  on group_members for select
  to authenticated
  using (is_group_member(group_id));

-- INSERT: un utente può aggiungersi a un gruppo (via codice invito)
-- oppure l'owner può aggiungere membri
create policy "group_members_insert"
  on group_members for insert
  to authenticated
  with check (
    profile_id = auth.uid()  -- si aggiunge da solo (join via invite code)
    or is_group_owner(group_id)  -- oppure l'owner aggiunge
  );

-- UPDATE: l'owner può cambiare ruoli e nickname; il membro può cambiare solo il proprio nickname
create policy "group_members_update"
  on group_members for update
  to authenticated
  using (
    is_group_owner(group_id)
    or profile_id = auth.uid()
  )
  with check (
    is_group_owner(group_id)
    or profile_id = auth.uid()
  );

-- DELETE: l'owner può rimuovere membri; un membro può lasciare il gruppo (rimuovere se stesso)
create policy "group_members_delete"
  on group_members for delete
  to authenticated
  using (
    is_group_owner(group_id)
    or profile_id = auth.uid()
  );

-- ============================================================
-- EVENTS
-- ============================================================

-- SELECT: solo i membri del gruppo vedono le serate
create policy "events_select"
  on events for select
  to authenticated
  using (is_group_member(group_id));

-- INSERT: qualsiasi membro del gruppo può creare una serata
create policy "events_insert"
  on events for insert
  to authenticated
  with check (
    is_group_member(group_id)
    and created_by = auth.uid()
  );

-- UPDATE: chi ha creato la serata o l'owner del gruppo può modificarla
create policy "events_update"
  on events for update
  to authenticated
  using (
    created_by = auth.uid()
    or is_group_owner(group_id)
  )
  with check (
    created_by = auth.uid()
    or is_group_owner(group_id)
  );

-- DELETE: chi ha creato la serata o l'owner può eliminarla
create policy "events_delete"
  on events for delete
  to authenticated
  using (
    created_by = auth.uid()
    or is_group_owner(group_id)
  );

-- ============================================================
-- LORE_ENTRIES
-- ============================================================

-- SELECT: i membri del gruppo vedono tutta la lore del gruppo
create policy "lore_entries_select"
  on lore_entries for select
  to authenticated
  using (is_group_member(group_id));

-- INSERT: qualsiasi membro può aggiungere lore
create policy "lore_entries_insert"
  on lore_entries for insert
  to authenticated
  with check (
    is_group_member(group_id)
    and author_id = auth.uid()
  );

-- UPDATE: la lore non è modificabile (decisione di prodotto)
-- Nessuna policy UPDATE → bloccato per tutti

-- DELETE: solo l'autore o l'owner del gruppo può cancellare
create policy "lore_entries_delete"
  on lore_entries for delete
  to authenticated
  using (
    author_id = auth.uid()
    or is_group_owner(group_id)
  );

-- ============================================================
-- LORE_REACTIONS
-- ============================================================

-- SELECT: i membri del gruppo vedono le reazioni alla lore del gruppo
create policy "lore_reactions_select"
  on lore_reactions for select
  to authenticated
  using (
    exists (
      select 1 from lore_entries le
      where le.id = lore_entry_id
        and is_group_member(le.group_id)
    )
  );

-- INSERT: un membro può reagire alla lore del proprio gruppo
create policy "lore_reactions_insert"
  on lore_reactions for insert
  to authenticated
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from lore_entries le
      where le.id = lore_entry_id
        and is_group_member(le.group_id)
    )
  );

-- DELETE: un utente può rimuovere solo le proprie reazioni
create policy "lore_reactions_delete"
  on lore_reactions for delete
  to authenticated
  using (profile_id = auth.uid());

-- ============================================================
-- ACTION_TYPES
-- ============================================================

-- SELECT: i tipi globali (group_id null) sono visibili a tutti;
--         i tipi personalizzati sono visibili ai soli membri del gruppo
create policy "action_types_select"
  on action_types for select
  to authenticated
  using (
    group_id is null
    or is_group_member(group_id)
  );

-- INSERT: un membro può creare tipi personalizzati per il proprio gruppo
create policy "action_types_insert"
  on action_types for insert
  to authenticated
  with check (
    group_id is not null
    and is_group_member(group_id)
  );

-- UPDATE: solo l'owner del gruppo può modificare i tipi personalizzati
create policy "action_types_update"
  on action_types for update
  to authenticated
  using (
    group_id is not null
    and is_group_owner(group_id)
  )
  with check (
    group_id is not null
    and is_group_owner(group_id)
  );

-- DELETE: solo l'owner del gruppo può eliminare i tipi personalizzati
create policy "action_types_delete"
  on action_types for delete
  to authenticated
  using (
    group_id is not null
    and is_group_owner(group_id)
  );

-- ============================================================
-- SOCIAL_ACTIONS
-- ============================================================

-- SELECT: i membri del gruppo vedono tutte le azioni del gruppo
create policy "social_actions_select"
  on social_actions for select
  to authenticated
  using (is_group_member(group_id));

-- INSERT: qualsiasi membro può registrare un'azione sociale
create policy "social_actions_insert"
  on social_actions for insert
  to authenticated
  with check (
    is_group_member(group_id)
    and registered_by = auth.uid()
  );

-- UPDATE: nessuno può modificare le azioni registrate (storico immutabile)
-- Nessuna policy UPDATE → bloccato per tutti

-- DELETE: solo chi ha registrato l'azione o l'owner del gruppo può cancellarla
create policy "social_actions_delete"
  on social_actions for delete
  to authenticated
  using (
    registered_by = auth.uid()
    or is_group_owner(group_id)
  );

-- ============================================================
-- TRIBUNAL_CATEGORIES
-- ============================================================

-- SELECT: le categorie globali (group_id null) sono visibili a tutti;
--         le categorie di gruppo sono visibili ai soli membri
create policy "tribunal_categories_select"
  on tribunal_categories for select
  to authenticated
  using (
    group_id is null
    or is_group_member(group_id)
  );

-- INSERT: solo i membri possono creare categorie personalizzate per il gruppo
create policy "tribunal_categories_insert"
  on tribunal_categories for insert
  to authenticated
  with check (
    group_id is not null
    and is_group_member(group_id)
  );

-- UPDATE: solo l'owner del gruppo può modificare le categorie
create policy "tribunal_categories_update"
  on tribunal_categories for update
  to authenticated
  using (
    group_id is not null
    and is_group_owner(group_id)
  )
  with check (
    group_id is not null
    and is_group_owner(group_id)
  );

-- DELETE: solo l'owner del gruppo può eliminare categorie personalizzate
create policy "tribunal_categories_delete"
  on tribunal_categories for delete
  to authenticated
  using (
    group_id is not null
    and is_group_owner(group_id)
  );

-- ============================================================
-- TRIBUNAL_VOTES
-- ============================================================

-- SELECT: i voti sono visibili ai membri del gruppo SOLO dopo chiusura del tribunale.
--         Durante la votazione aperta, un membro vede solo i propri voti.
--         Questo garantisce l'anonimato durante la votazione.
create policy "tribunal_votes_select"
  on tribunal_votes for select
  to authenticated
  using (
    exists (
      select 1 from events e
      where e.id = event_id
        and is_group_member(e.group_id)
        and (
          e.tribunal_closed = true  -- tribunale chiuso: voti visibili a tutti
          or voter_id = auth.uid()  -- tribunale aperto: vedi solo i tuoi voti
        )
    )
  );

-- INSERT: un membro può votare solo se il tribunale è aperto e non ha già votato per quella categoria
create policy "tribunal_votes_insert"
  on tribunal_votes for insert
  to authenticated
  with check (
    voter_id = auth.uid()
    and exists (
      select 1 from events e
      where e.id = event_id
        and is_group_member(e.group_id)
        and e.tribunal_open = true
        and e.tribunal_closed = false
    )
  );

-- UPDATE: i voti non sono modificabili
-- Nessuna policy UPDATE → bloccato per tutti

-- DELETE: nessuno può cancellare i voti (integrità dello storico)
-- Nessuna policy DELETE → bloccato per tutti
