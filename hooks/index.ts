// ============================================================
// SODALIS — React Query Hooks
// Tutte le operazioni usano RPC security definer per bypassare
// i problemi JWT/RLS in React Native (auth.uid() = null in RLS)
// ============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { generateInviteCode } from '../utils';
import type {
  Profile, Group, GroupMember, Event, LoreEntry,
  ActionType, SocialAction, TribunalCategory, TribunalVote,
  TribunalResult, CreateGroupForm, CreateEventForm, CreateLoreForm,
  CreateSocialActionForm, UpdateProfileForm,
} from '../types';

export const QK = {
  profile:              (id: string) => ['profile', id],
  groups:               () => ['groups'],
  groupMembers:         (gid: string) => ['group_members', gid],
  events:               (gid: string) => ['events', gid],
  event:                (eid: string) => ['event', eid],
  loreEntries:          (gid: string) => ['lore_entries', gid],
  loreByEvent:          (eid: string) => ['lore_by_event', eid],
  actionTypes:          (gid: string) => ['action_types', gid],
  socialActions:        (gid: string) => ['social_actions', gid],
  socialActionsByEvent: (eid: string) => ['social_actions_event', eid],
  tribunalCategories:   (gid: string) => ['tribunal_categories', gid],
  tribunalVotes:        (eid: string) => ['tribunal_votes', eid],
  myVotes:              (eid: string, uid: string) => ['my_votes', eid, uid],
} as const;

// ════════════════════════════════════════════════════════════
// PROFILE
// ════════════════════════════════════════════════════════════

export function useProfile(userId: string) {
  return useQuery({
    queryKey: QK.profile(userId),
    queryFn:  async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ form }: { userId: string; form: UpdateProfileForm }) => {
      const { data, error } = await supabase.rpc('update_my_profile', {
        p_display_name: form.display_name ?? null,
        p_username:     form.username ?? null,
      });
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      qc.setQueryData(QK.profile(data.id), data);
    },
  });
}

// ════════════════════════════════════════════════════════════
// GROUPS — usa RPC per bypassare problemi JWT con RLS
// ════════════════════════════════════════════════════════════

export function useGroups() {
  return useQuery({
    queryKey: QK.groups(),
    queryFn:  async (): Promise<Group[]> => {
      const { data, error } = await supabase.rpc('get_my_groups');
      if (error) throw error;
      return (data as Group[]) ?? [];
    },
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ form }: { form: CreateGroupForm; userId: string }) => {
      const invite_code = generateInviteCode();
      const { data, error } = await supabase.rpc('create_group', {
        p_name:        form.name,
        p_emoji:       form.emoji,
        p_color_hex:   form.color_hex,
        p_invite_code: invite_code,
      });
      if (error) {
        console.error('create_group error:', error.message);
        throw error;
      }
      return data as Group;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.groups() });
    },
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('join_group_by_invite', { code });
      if (error) throw error;
      return data as { group_id: string; group_name: string; emoji: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.groups() });
    },
  });
}

export function useUpdateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, form }: { groupId: string; form: Partial<CreateGroupForm> }) => {
      const { data, error } = await supabase.rpc('update_group_name', {
        p_group_id: groupId,
        p_name:     form.name ?? '',
      });
      if (error) throw error;
      return data as Group;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.groups() });
    },
  });
}

// ════════════════════════════════════════════════════════════
// GROUP MEMBERS — usa RPC
// ════════════════════════════════════════════════════════════

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: QK.groupMembers(groupId),
    queryFn:  async (): Promise<GroupMember[]> => {
      const { data, error } = await supabase.rpc('get_group_members', {
        p_group_id: groupId,
      });
      if (error) throw error;
      return (data as GroupMember[]) ?? [];
    },
    enabled: !!groupId,
  });
}

export function useUpdateNickname() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, groupId, nickname }: { memberId: string; groupId: string; nickname: string | null }) => {
      const { error } = await supabase
        .from('group_members')
        .update({ nickname })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.groupMembers(vars.groupId) });
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId }: { groupId: string; profileId: string }) => {
      const { error } = await supabase.rpc('leave_group', { p_group_id: groupId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.groups() });
    },
  });
}

// ════════════════════════════════════════════════════════════
// EVENTS
// ════════════════════════════════════════════════════════════

export function useEvents(groupId: string) {
  return useQuery({
    queryKey: QK.events(groupId),
    queryFn:  async (): Promise<Event[]> => {
      const { data, error } = await supabase.rpc('get_events_for_group', {
        p_group_id: groupId,
      });
      if (error) throw error;
      return (data as Event[]) ?? [];
    },
    enabled: !!groupId,
  });
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: QK.event(eventId),
    queryFn:  async (): Promise<Event> => {
      const { data, error } = await supabase.rpc('get_event_by_id', {
        p_event_id: eventId,
      });
      if (error) throw error;
      if (!data) throw new Error('Event not found');
      return data as Event;
    },
    enabled: !!eventId,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, form }: { groupId: string; form: CreateEventForm; userId: string }) => {
      const { data, error } = await supabase.rpc('create_event', {
        p_group_id:   groupId,
        p_name:       form.name,
        p_event_date: form.event_date,
        p_location:   form.location ?? null,
      });
      if (error) throw error;
      return data as Event;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.events(vars.groupId) });
    },
  });
}

export function useOpenTribunal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.rpc('set_tribunal_open', { p_event_id: eventId });
      if (error) throw error;
    },
    onSuccess: (_data, eventId) => {
      qc.invalidateQueries({ queryKey: QK.event(eventId) });
    },
  });
}

export function useCloseTribunal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.rpc('set_tribunal_closed', { p_event_id: eventId });
      if (error) throw error;
    },
    onSuccess: (_data, eventId) => {
      qc.invalidateQueries({ queryKey: QK.event(eventId) });
      qc.invalidateQueries({ queryKey: QK.tribunalVotes(eventId) });
      qc.invalidateQueries({ queryKey: QK.groups() });
      qc.invalidateQueries({ queryKey: ['group_standings'] });
      qc.invalidateQueries({ queryKey: ['all_tribunal_results'] });
    },
  });
}

// ════════════════════════════════════════════════════════════
// LORE ENTRIES
// ════════════════════════════════════════════════════════════

export function useLoreEntries(groupId: string) {
  return useQuery({
    queryKey: QK.loreEntries(groupId),
    queryFn:  async (): Promise<LoreEntry[]> => {
      const { data, error } = await supabase.rpc('get_lore_entries_for_group', {
        p_group_id: groupId,
      });
      if (error) throw error;
      return (data as LoreEntry[]) ?? [];
    },
    enabled: !!groupId,
  });
}

export function useLoreByEvent(eventId: string) {
  return useQuery({
    queryKey: QK.loreByEvent(eventId),
    queryFn:  async (): Promise<LoreEntry[]> => {
      const { data, error } = await supabase.rpc('get_lore_by_event', {
        p_event_id: eventId,
      });
      if (error) throw error;
      return (data as LoreEntry[]) ?? [];
    },
    enabled: !!eventId,
  });
}

export function useCreateLore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, form }: { groupId: string; userId: string; form: CreateLoreForm }) => {
      const { data, error } = await supabase.rpc('create_lore_entry', {
        p_group_id: groupId,
        p_type:     form.type,
        p_title:    form.title,
        p_content:  form.content,
        p_event_id: form.event_id ?? null,
      });
      if (error) throw error;
      return data as LoreEntry;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.loreEntries(vars.groupId) });
      if (vars.form.event_id) {
        qc.invalidateQueries({ queryKey: QK.loreByEvent(vars.form.event_id) });
      }
    },
  });
}

export function useDeleteLore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ loreId }: { loreId: string; groupId: string }) => {
      const { error } = await supabase.rpc('delete_lore_entry', { p_lore_id: loreId });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.loreEntries(vars.groupId) });
    },
  });
}

export function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ loreEntryId, emoji }: {
      loreEntryId: string; profileId: string; emoji: string; groupId: string;
    }) => {
      const { error } = await supabase.rpc('toggle_reaction', {
        p_lore_entry_id: loreEntryId,
        p_emoji:         emoji,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.loreEntries(vars.groupId) });
    },
  });
}

// ════════════════════════════════════════════════════════════
// ACTION TYPES
// ════════════════════════════════════════════════════════════

export function useActionTypes(groupId: string) {
  return useQuery({
    queryKey: QK.actionTypes(groupId),
    queryFn:  async (): Promise<ActionType[]> => {
      const { data, error } = await supabase.rpc('get_action_types_for_group', {
        p_group_id: groupId,
      });
      if (error) throw error;
      return (data as ActionType[]) ?? [];
    },
    enabled: !!groupId,
  });
}

// ════════════════════════════════════════════════════════════
// SOCIAL ACTIONS
// ════════════════════════════════════════════════════════════

export function useSocialActions(groupId: string) {
  return useQuery({
    queryKey: QK.socialActions(groupId),
    queryFn:  async (): Promise<SocialAction[]> => {
      const { data, error } = await supabase.rpc('get_social_actions_for_group', {
        p_group_id: groupId,
      });
      if (error) throw error;
      return (data as SocialAction[]) ?? [];
    },
    enabled: !!groupId,
  });
}

export function useSocialActionsByEvent(eventId: string) {
  return useQuery({
    queryKey: QK.socialActionsByEvent(eventId),
    queryFn:  async (): Promise<SocialAction[]> => {
      const { data, error } = await supabase.rpc('get_social_actions_by_event', {
        p_event_id: eventId,
      });
      if (error) throw error;
      return (data as SocialAction[]) ?? [];
    },
    enabled: !!eventId,
  });
}

export function useCreateSocialAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, form }: { groupId: string; userId: string; form: CreateSocialActionForm }) => {
      const { data, error } = await supabase.rpc('create_social_action', {
        p_group_id:        groupId,
        p_action_type_id:  form.action_type_id,
        p_from_profile_id: form.from_profile_id,
        p_to_profile_ids:  form.to_profile_ids,
        p_note:            form.note ?? null,
        p_event_id:        form.event_id ?? null,
      });
      if (error) throw error;
      return data as SocialAction;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.socialActions(vars.groupId) });
      if (vars.form.event_id) {
        qc.invalidateQueries({ queryKey: QK.socialActionsByEvent(vars.form.event_id) });
      }
    },
  });
}

// ════════════════════════════════════════════════════════════
// TRIBUNAL CATEGORIES
// ════════════════════════════════════════════════════════════

export function useTribunalCategories(groupId: string) {
  return useQuery({
    queryKey: QK.tribunalCategories(groupId),
    queryFn:  async (): Promise<TribunalCategory[]> => {
      const { data, error } = await supabase.rpc('get_tribunal_categories', {
        p_group_id: groupId,
      });
      if (error) throw error;
      return (data as TribunalCategory[]) ?? [];
    },
    enabled: !!groupId,
  });
}

export function useCreateTribunalCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, name, emoji, orderIndex }: {
      groupId: string; name: string; emoji: string; orderIndex: number;
    }) => {
      const { data, error } = await supabase.rpc('add_tribunal_category', {
        p_group_id:    groupId,
        p_name:        name,
        p_emoji:       emoji,
        p_order_index: orderIndex,
      });
      if (error) throw error;
      return data as TribunalCategory;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.tribunalCategories(vars.groupId) });
    },
  });
}

export function useDeleteTribunalCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ categoryId, groupId }: { categoryId: string; groupId: string }) => {
      const { error } = await supabase.rpc('delete_tribunal_category', {
        p_category_id: categoryId,
        p_group_id:    groupId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.tribunalCategories(vars.groupId) });
    },
  });
}

// ════════════════════════════════════════════════════════════
// TRIBUNAL VOTES
// ════════════════════════════════════════════════════════════

export function useTribunalVotes(eventId: string) {
  return useQuery({
    queryKey: QK.tribunalVotes(eventId),
    queryFn:  async (): Promise<TribunalVote[]> => {
      const { data, error } = await supabase.rpc('get_tribunal_votes_for_event', {
        p_event_id: eventId,
      });
      if (error) throw error;
      return (data as TribunalVote[]) ?? [];
    },
    enabled: !!eventId,
  });
}

export function useMyVotes(eventId: string, userId: string) {
  return useQuery({
    queryKey: QK.myVotes(eventId, userId),
    queryFn:  async (): Promise<TribunalVote[]> => {
      const { data, error } = await supabase.rpc('get_my_votes_for_event', {
        p_event_id: eventId,
      });
      if (error) throw error;
      return (data as TribunalVote[]) ?? [];
    },
    enabled: !!eventId && !!userId,
  });
}

export function useCastVotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ votes }: {
      votes: Array<{ event_id: string; category_id: string; voter_id: string; voted_for_id: string; }>;
    }) => {
      const { error } = await supabase.rpc('submit_votes', { p_votes: votes });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      const eventId = vars.votes[0]?.event_id;
      if (eventId) {
        qc.invalidateQueries({ queryKey: QK.tribunalVotes(eventId) });
        qc.invalidateQueries({ queryKey: ['my_votes', eventId] });
      }
    },
  });
}

// ════════════════════════════════════════════════════════════
// GROUP STANDINGS (Mondiale)
// ════════════════════════════════════════════════════════════

export interface StandingEntry {
  profile_id:       string;
  display_name:     string;
  avatar_url:       string | null;
  nickname:         string | null;
  tribunal_wins:    number;
  tribunal_points:  number;
  social_actions:   number;
  social_points:    number;
  total_score:      number;
}

export interface TribunalResultRow {
  event_id:        string;
  category_id:     string;
  category_name:   string;
  category_emoji:  string;
  voted_for_id:    string;
  vote_count:      number;
}

export function useGroupStandings(groupId: string) {
  return useQuery({
    queryKey: ['group_standings', groupId],
    queryFn:  async (): Promise<StandingEntry[]> => {
      const { data, error } = await supabase.rpc('get_group_standings', {
        p_group_id: groupId,
      });
      if (error) throw error;
      return (data as StandingEntry[]) ?? [];
    },
    enabled: !!groupId,
  });
}

export function useAllTribunalResults(groupId: string) {
  return useQuery({
    queryKey: ['all_tribunal_results', groupId],
    queryFn:  async (): Promise<TribunalResultRow[]> => {
      const { data, error } = await supabase.rpc('get_all_tribunal_results', {
        p_group_id: groupId,
      });
      if (error) throw error;
      return (data as TribunalResultRow[]) ?? [];
    },
    enabled: !!groupId,
  });
}

// ════════════════════════════════════════════════════════════
// MEMBER MANAGEMENT
// ════════════════════════════════════════════════════════════

export function useKickMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, profileId }: { groupId: string; profileId: string }) => {
      const { error } = await supabase.rpc('kick_member', {
        p_group_id:   groupId,
        p_profile_id: profileId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.groupMembers(vars.groupId) });
    },
  });
}

export function useTransferOwnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, newOwnerId }: { groupId: string; newOwnerId: string }) => {
      const { error } = await supabase.rpc('transfer_ownership', {
        p_group_id:      groupId,
        p_new_owner_id:  newOwnerId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.groupMembers(vars.groupId) });
      qc.invalidateQueries({ queryKey: QK.groups() });
    },
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.rpc('delete_group', { p_group_id: groupId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.groups() });
    },
  });
}

// ════════════════════════════════════════════════════════════
// ACTION TYPES — CRUD
// ════════════════════════════════════════════════════════════

export function useCreateActionType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, label, emoji }: { groupId: string; label: string; emoji: string }) => {
      const { data, error } = await supabase.rpc('add_action_type', {
        p_group_id: groupId,
        p_label:    label,
        p_emoji:    emoji,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.actionTypes(vars.groupId) });
    },
  });
}

export function useDeleteActionType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ actionTypeId, groupId }: { actionTypeId: string; groupId: string }) => {
      const { error } = await supabase.rpc('delete_action_type', {
        p_action_type_id: actionTypeId,
        p_group_id:       groupId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: QK.actionTypes(vars.groupId) });
    },
  });
}

// ════════════════════════════════════════════════════════════
// AVATAR / PROFILE PHOTO
// ════════════════════════════════════════════════════════════

export function useUpdateAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ avatarUrl }: { userId: string; avatarUrl: string }) => {
      const { data, error } = await supabase.rpc('update_my_profile', {
        p_avatar_url: avatarUrl,
      });
      if (error) throw error;
      return data as Profile;
    },
    onSuccess: (data) => {
      qc.setQueryData(QK.profile(data.id), data);
    },
  });
}

export async function uploadImage(
  bucket: string,
  path: string,
  localUri: string,
  contentType = 'image/jpeg'
): Promise<string> {
  const response  = await fetch(localUri);
  const blob      = await response.blob();
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function computeTribunalResults(
  votes: TribunalVote[],
  categories: TribunalCategory[],
  members: GroupMember[]
): TribunalResult[] {
  return categories.map((category) => {
    const catVotes = votes.filter((v) => v.category_id === category.id);
    const total = catVotes.length;
    const counts = catVotes.reduce<Record<string, number>>((acc, v) => {
      acc[v.voted_for_id] = (acc[v.voted_for_id] ?? 0) + 1;
      return acc;
    }, {});
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);
    const allVotes = sorted.map(([profileId, count]) => {
      const member = members.find((m) => m.profile_id === profileId);
      return { profile: member!.profile!, count };
    });
    const [winnerId, winnerCount] = sorted[0] ?? ['', 0];
    const winnerMember = members.find((m) => m.profile_id === winnerId);
    return {
      category,
      winner:      winnerMember?.profile!,
      vote_count:  winnerCount ?? 0,
      total_votes: total,
      percentage:  total > 0 ? Math.round(((winnerCount ?? 0) / total) * 100) : 0,
      all_votes:   allVotes,
    };
  });
}
