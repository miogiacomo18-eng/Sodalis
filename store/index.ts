// ============================================================
// SODALIS — Zustand Store
// ============================================================
import { create } from 'zustand';
import type { Profile, Group } from '../types';

interface AuthState {
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
}

interface GroupState {
  activeGroup: Group | null;
  setActiveGroup: (group: Group | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  profile:    null,
  setProfile: (profile) => set({ profile }),
}));

export const useGroupStore = create<GroupState>((set) => ({
  activeGroup:    null,
  setActiveGroup: (group) => set({ activeGroup: group }),
}));
