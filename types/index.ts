// ============================================================
// SODALIS — Types
// ============================================================

export type MemberRole = 'owner' | 'member';
export type LoreType = 'text' | 'quote' | 'photo';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  emoji: string;
  color_hex: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  profile_id: string;
  role: MemberRole;
  nickname: string | null;
  joined_at: string;
  profile?: Profile;
}

export interface Event {
  id: string;
  group_id: string;
  name: string;
  event_date: string;
  location: string | null;
  created_by: string;
  tribunal_open: boolean;
  tribunal_closed: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoreEntry {
  id: string;
  group_id: string;
  event_id: string | null;
  author_id: string;
  type: LoreType;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: Profile;
  event?: Event | null;
  reactions?: LoreReaction[];
}

export interface LoreReaction {
  id: string;
  lore_entry_id: string;
  profile_id: string;
  emoji: string;
  created_at: string;
}

export interface ActionType {
  id: string;
  group_id: string | null;
  label: string;
  emoji: string;
  is_default: boolean;
  created_at: string;
}

export interface SocialAction {
  id: string;
  group_id: string;
  event_id: string | null;
  action_type_id: string;
  from_profile_id: string;
  to_profile_ids: string[];
  note: string | null;
  registered_by: string;
  created_at: string;
  action_type?: ActionType;
  from_profile?: Profile;
  registered_by_profile?: Profile;
}

export interface TribunalCategory {
  id: string;
  group_id: string | null;
  name: string;
  emoji: string;
  is_default: boolean;
  order_index: number;
  created_at: string;
}

export interface TribunalVote {
  id: string;
  event_id: string;
  category_id: string;
  voter_id: string;
  voted_for_id: string;
  created_at: string;
  voted_for?: Profile;
}

export interface TribunalResult {
  category: TribunalCategory;
  winner: Profile;
  vote_count: number;
  total_votes: number;
  percentage: number;
  all_votes: Array<{ profile: Profile; count: number }>;
}

// ─── Form types ──────────────────────────────────────────────
export interface CreateGroupForm {
  name: string;
  emoji: string;
  color_hex: string;
}

export interface CreateEventForm {
  name: string;
  event_date: string;
  location?: string;
}

export interface CreateLoreForm {
  type: LoreType;
  title: string;
  content: string;
  event_id?: string;
}

export interface CreateSocialActionForm {
  action_type_id: string;
  from_profile_id: string;
  to_profile_ids: string[];
  note?: string;
  event_id?: string;
}

export interface UpdateProfileForm {
  display_name: string;
  username: string;
}

// ─── Auth types ──────────────────────────────────────────────
export interface SignUpForm {
  email: string;
  password: string;
  display_name: string;
}

export interface SignInForm {
  email: string;
  password: string;
}
