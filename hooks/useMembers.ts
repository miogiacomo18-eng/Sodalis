import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Tipo membro: include nickname per-gruppo (se valorizzato) oltre allo username globale
export type GroupMember = {
  user_id: string;
  username: string;
  nickname: string | null;
  display_name: string;  // computed: nickname ?? username
};

// Hook condiviso per evitare di duplicare la query in lore/debiti/tribunale/serata-detail
export function useMembers(groupId: string | undefined) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from('group_members')
      .select('user_id, nickname, profiles!user_id(username)')
      .eq('group_id', groupId);

    const parsed: GroupMember[] = (data ?? [])
      .map((r: any) => {
        const username = r.profiles?.username ?? '?';
        return {
          user_id: r.user_id,
          username,
          nickname: r.nickname,
          display_name: r.nickname ?? username,
        };
      })
      .filter((m: GroupMember) => m.user_id);

    setMembers(parsed);
    setLoading(false);
  }, [groupId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { members, loading, refetch: fetch };
}
