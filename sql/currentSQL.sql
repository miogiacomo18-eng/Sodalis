-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.action_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid,
  label text NOT NULL CHECK (char_length(label) >= 1 AND char_length(label) <= 60),
  emoji text NOT NULL DEFAULT '⭐'::text CHECK (char_length(emoji) <= 10),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT action_types_pkey PRIMARY KEY (id),
  CONSTRAINT action_types_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 80),
  event_date date NOT NULL,
  location text CHECK (location IS NULL OR char_length(location) <= 100),
  created_by uuid NOT NULL,
  tribunal_open boolean NOT NULL DEFAULT false,
  tribunal_closed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.group_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'member'::member_role,
  nickname text CHECK (nickname IS NULL OR char_length(nickname) <= 30),
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT group_members_pkey PRIMARY KEY (id),
  CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT group_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 50),
  emoji text NOT NULL DEFAULT '🍕'::text,
  color_hex text NOT NULL DEFAULT '#6C63FF'::text CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'::text),
  invite_code text NOT NULL UNIQUE CHECK (char_length(invite_code) = 6),
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  description text CHECK (description IS NULL OR char_length(description) <= 200),
  CONSTRAINT groups_pkey PRIMARY KEY (id),
  CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.lore_entries (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  event_id uuid,
  author_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  title text NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 80),
  content text NOT NULL CHECK (char_length(content) >= 1),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lore_entries_pkey PRIMARY KEY (id),
  CONSTRAINT lore_entries_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT lore_entries_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT lore_entries_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.lore_reactions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lore_entry_id uuid NOT NULL,
  profile_id uuid NOT NULL,
  emoji text NOT NULL CHECK (char_length(emoji) <= 10),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lore_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT lore_reactions_lore_entry_id_fkey FOREIGN KEY (lore_entry_id) REFERENCES public.lore_entries(id),
  CONSTRAINT lore_reactions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text NOT NULL UNIQUE CHECK (char_length(username) >= 2 AND char_length(username) <= 30),
  display_name text NOT NULL CHECK (char_length(display_name) >= 1 AND char_length(display_name) <= 50),
  avatar_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.social_actions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid NOT NULL,
  event_id uuid,
  action_type_id uuid NOT NULL,
  from_profile_id uuid NOT NULL,
  to_profile_ids ARRAY NOT NULL CHECK (array_length(to_profile_ids, 1) >= 1),
  note text CHECK (note IS NULL OR char_length(note) <= 200),
  registered_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT social_actions_pkey PRIMARY KEY (id),
  CONSTRAINT social_actions_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT social_actions_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT social_actions_action_type_id_fkey FOREIGN KEY (action_type_id) REFERENCES public.action_types(id),
  CONSTRAINT social_actions_from_profile_id_fkey FOREIGN KEY (from_profile_id) REFERENCES public.profiles(id),
  CONSTRAINT social_actions_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.tribunal_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  group_id uuid,
  name text NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 60),
  emoji text NOT NULL DEFAULT '🏆'::text CHECK (char_length(emoji) <= 10),
  is_default boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tribunal_categories_pkey PRIMARY KEY (id),
  CONSTRAINT tribunal_categories_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);
CREATE TABLE public.tribunal_votes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL,
  category_id uuid NOT NULL,
  voter_id uuid NOT NULL,
  voted_for_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tribunal_votes_pkey PRIMARY KEY (id),
  CONSTRAINT tribunal_votes_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id),
  CONSTRAINT tribunal_votes_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.tribunal_categories(id),
  CONSTRAINT tribunal_votes_voter_id_fkey FOREIGN KEY (voter_id) REFERENCES public.profiles(id),
  CONSTRAINT tribunal_votes_voted_for_id_fkey FOREIGN KEY (voted_for_id) REFERENCES public.profiles(id)
);