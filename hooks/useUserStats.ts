import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type UserStats = {
  serate_played:   number;
  total_points:    number;
  mvp_count:       number;
  categories_won:  number;
  lore_written:    number;
  favors_done:     number;  // crediti (to_user_id = me)
  favors_received: number;  // debiti  (from_user_id = me)
  groups_count:    number;
};

const EMPTY: UserStats = {
  serate_played: 0, total_points: 0, mvp_count: 0, categories_won: 0,
  lore_written: 0, favors_done: 0, favors_received: 0, groups_count: 0,
};

export function useUserStats(userId: string | undefined) {
  const [stats, setStats] = useState<UserStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    // Eseguo le query in parallelo per minimizzare il roundtrip
    const [lbRes, votesRes, loreRes, favorsDoneRes, favorsRecRes, groupsRes] = await Promise.all([
      // Punti aggregati cross-gruppo dalla view leaderboard
      supabase.from('leaderboard')
        .select('total_points, mvp_count, categories_won')
        .eq('user_id', userId),

      // Serate giocate distinte (closed): partecipo se ho votato o sono stato votato
      supabase.from('votes')
        .select('serata_id, serate!inner(status)')
        .eq('serate.status', 'closed')
        .or(`voter_id.eq.${userId},voted_user_id.eq.${userId}`),

      // Conteggio lore scritte (count exact)
      supabase.from('lore').select('id', { count: 'exact', head: true }).eq('author_id', userId),

      // Favori fatti = to_user_id = me
      supabase.from('debts').select('id', { count: 'exact', head: true }).eq('to_user_id', userId),

      // Favori ricevuti = from_user_id = me
      supabase.from('debts').select('id', { count: 'exact', head: true }).eq('from_user_id', userId),

      // Numero gruppi
      supabase.from('group_members').select('group_id', { count: 'exact', head: true }).eq('user_id', userId),
    ]);

    // Aggrego leaderboard cross-gruppo
    const lbAgg = (lbRes.data ?? []).reduce((acc, r: any) => ({
      total_points:   acc.total_points   + (r.total_points   ?? 0),
      mvp_count:      acc.mvp_count      + (r.mvp_count      ?? 0),
      categories_won: acc.categories_won + (r.categories_won ?? 0),
    }), { total_points: 0, mvp_count: 0, categories_won: 0 });

    // Serate uniche (distinct su serata_id)
    const seratePlayed = new Set((votesRes.data ?? []).map((v: any) => v.serata_id)).size;

    setStats({
      ...lbAgg,
      serate_played:   seratePlayed,
      lore_written:    loreRes.count    ?? 0,
      favors_done:     favorsDoneRes.count ?? 0,
      favors_received: favorsRecRes.count  ?? 0,
      groups_count:    groupsRes.count  ?? 0,
    });
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { stats, loading, refetch: fetch };
}
