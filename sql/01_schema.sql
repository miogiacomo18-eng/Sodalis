-- ============================================================
-- SODALIS — Schema SQL Supabase
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── ENUM TYPES ─────────────────────────────────────────────
create type member_role as enum ('owner', 'member');
create type lore_type   as enum ('text', 'quote', 'photo');

-- ─── HELPER: updated_at trigger ─────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── TABLE: profiles ────────────────────────────────────────
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique
                  check (char_length(username) >= 2 and char_length(username) <= 30),
  display_name  text not null
                  check (char_length(display_name) >= 1 and char_length(display_name) <= 50),
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create index idx_profiles_username on profiles(username);

-- ─── TABLE: groups ──────────────────────────────────────────
create table groups (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null
                  check (char_length(name) >= 1 and char_length(name) <= 50),
  emoji         text not null default '🍕',
  color_hex     text not null default '#6C63FF'
                  check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  invite_code   text not null unique
                  check (char_length(invite_code) = 6),
  created_by    uuid not null references profiles(id) on delete restrict,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger trg_groups_updated_at
  before update on groups
  for each row execute function set_updated_at();

create index idx_groups_invite_code on groups(invite_code);
create index idx_groups_created_by  on groups(created_by);

-- ─── TABLE: group_members ────────────────────────────────────
create table group_members (
  id          uuid primary key default uuid_generate_v4(),
  group_id    uuid not null references groups(id) on delete cascade,
  profile_id  uuid not null references profiles(id) on delete cascade,
  role        member_role not null default 'member',
  nickname    text check (nickname is null or char_length(nickname) <= 30),
  joined_at   timestamptz not null default now(),
  unique (group_id, profile_id)
);

create index idx_group_members_group_id   on group_members(group_id);
create index idx_group_members_profile_id on group_members(profile_id);

-- ─── TABLE: events ──────────────────────────────────────────
create table events (
  id                uuid primary key default uuid_generate_v4(),
  group_id          uuid not null references groups(id) on delete cascade,
  name              text not null
                      check (char_length(name) >= 1 and char_length(name) <= 80),
  event_date        date not null,
  location          text check (location is null or char_length(location) <= 100),
  created_by        uuid not null references profiles(id) on delete restrict,
  tribunal_open     boolean not null default false,
  tribunal_closed   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint tribunal_state_check check (
    not (tribunal_open = true and tribunal_closed = true)
  )
);

create trigger trg_events_updated_at
  before update on events
  for each row execute function set_updated_at();

create index idx_events_group_id    on events(group_id);
create index idx_events_event_date  on events(event_date desc);

-- ─── TABLE: lore_entries ────────────────────────────────────
create table lore_entries (
  id          uuid primary key default uuid_generate_v4(),
  group_id    uuid not null references groups(id) on delete cascade,
  event_id    uuid references events(id) on delete set null,
  author_id   uuid not null references profiles(id) on delete restrict,
  type        lore_type not null,
  title       text not null
                check (char_length(title) >= 1 and char_length(title) <= 80),
  content     text not null
                check (char_length(content) >= 1),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_lore_entries_updated_at
  before update on lore_entries
  for each row execute function set_updated_at();

create index idx_lore_entries_group_id  on lore_entries(group_id);
create index idx_lore_entries_event_id  on lore_entries(event_id);
create index idx_lore_entries_author_id on lore_entries(author_id);
create index idx_lore_entries_created   on lore_entries(created_at desc);

-- ─── TABLE: lore_reactions ──────────────────────────────────
create table lore_reactions (
  id              uuid primary key default uuid_generate_v4(),
  lore_entry_id   uuid not null references lore_entries(id) on delete cascade,
  profile_id      uuid not null references profiles(id) on delete cascade,
  emoji           text not null
                    check (char_length(emoji) <= 10),
  created_at      timestamptz not null default now(),
  unique (lore_entry_id, profile_id, emoji)
);

create index idx_lore_reactions_entry_id on lore_reactions(lore_entry_id);

-- ─── TABLE: action_types ────────────────────────────────────
create table action_types (
  id          uuid primary key default uuid_generate_v4(),
  group_id    uuid references groups(id) on delete cascade,  -- null = globale
  label       text not null
                check (char_length(label) >= 1 and char_length(label) <= 60),
  emoji       text not null default '⭐'
                check (char_length(emoji) <= 10),
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

create index idx_action_types_group_id on action_types(group_id);

-- ─── TABLE: social_actions ──────────────────────────────────
create table social_actions (
  id                uuid primary key default uuid_generate_v4(),
  group_id          uuid not null references groups(id) on delete cascade,
  event_id          uuid references events(id) on delete set null,
  action_type_id    uuid not null references action_types(id) on delete restrict,
  from_profile_id   uuid not null references profiles(id) on delete restrict,
  to_profile_ids    uuid[] not null
                      check (array_length(to_profile_ids, 1) >= 1),
  note              text check (note is null or char_length(note) <= 200),
  registered_by     uuid not null references profiles(id) on delete restrict,
  created_at        timestamptz not null default now()
);

create index idx_social_actions_group_id         on social_actions(group_id);
create index idx_social_actions_event_id         on social_actions(event_id);
create index idx_social_actions_from_profile_id  on social_actions(from_profile_id);

-- ─── TABLE: tribunal_categories ─────────────────────────────
create table tribunal_categories (
  id            uuid primary key default uuid_generate_v4(),
  group_id      uuid references groups(id) on delete cascade,  -- null = globale
  name          text not null
                  check (char_length(name) >= 1 and char_length(name) <= 60),
  emoji         text not null default '🏆'
                  check (char_length(emoji) <= 10),
  is_default    boolean not null default false,
  order_index   integer not null default 0,
  created_at    timestamptz not null default now()
);

create index idx_tribunal_categories_group_id on tribunal_categories(group_id);

-- ─── TABLE: tribunal_votes ──────────────────────────────────
create table tribunal_votes (
  id              uuid primary key default uuid_generate_v4(),
  event_id        uuid not null references events(id) on delete cascade,
  category_id     uuid not null references tribunal_categories(id) on delete cascade,
  voter_id        uuid not null references profiles(id) on delete cascade,
  voted_for_id    uuid not null references profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (event_id, category_id, voter_id)
);

create index idx_tribunal_votes_event_id    on tribunal_votes(event_id);
create index idx_tribunal_votes_category_id on tribunal_votes(category_id);
create index idx_tribunal_votes_voter_id    on tribunal_votes(voter_id);
