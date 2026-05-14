import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useGlobalSearchParams } from 'expo-router';
import { useTheme } from '../../../../context/ThemeContext';
import { useMembers } from '../../../../hooks/useMembers';
import { supabase } from '../../../../lib/supabase';
import { space, radius, type as t } from '../../../../constants/tokens';

type Entry = { user_id:string;display_name:string;serate_played:number;mvp_count:number;categories_won:number;total_points:number;rank:number };
const MEDALS = ['🥇','🥈','🥉'];

export default function ClassificaTab() {
  const { id:groupId } = useGlobalSearchParams<{ id:string }>();
  const { c } = useTheme();
  const { members } = useMembers(groupId);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    if (!groupId || members.length===0) { setLoading(false); return; }
    const [lbRes, votesRes] = await Promise.all([
      supabase.from('leaderboard').select('user_id,total_points,categories_won,mvp_count').eq('group_id',groupId),
      supabase.from('votes').select('serata_id,voter_id,voted_user_id,serate!inner(group_id,status)')
        .eq('serate.group_id',groupId).eq('serate.status','closed'),
    ]);
    const lbMap = new Map((lbRes.data??[]).map((r:any) => [r.user_id, r]));
    const serateMap = new Map<string,Set<string>>();
    (votesRes.data??[]).forEach((v:any) => {
      [v.voter_id,v.voted_user_id].forEach((uid:string) => {
        if (!serateMap.has(uid)) serateMap.set(uid, new Set());
        serateMap.get(uid)!.add(v.serata_id);
      });
    });
    const all:Entry[] = members.map(m => {
      const lb = lbMap.get(m.user_id);
      return { user_id:m.user_id, display_name:m.display_name,
        total_points:lb?.total_points??0, categories_won:lb?.categories_won??0,
        mvp_count:lb?.mvp_count??0, serate_played:serateMap.get(m.user_id)?.size??0, rank:0 };
    });
    all.sort((a,b) => b.total_points!==a.total_points ? b.total_points-a.total_points : b.mvp_count-a.mvp_count);
    all.forEach((e,i) => {
      e.rank = i>0 && e.total_points===all[i-1].total_points && e.mvp_count===all[i-1].mvp_count ? all[i-1].rank : i+1;
    });
    setEntries(all); setLoading(false); setRefreshing(false);
  }, [groupId, members]);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:c.bg }}><ActivityIndicator color={c.accent} /></View>;

  return (
    <FlatList
      style={{ backgroundColor:c.bg }}
      data={entries}
      keyExtractor={i=>i.user_id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);fetch();}} tintColor={c.accent} colors={[c.accent]} />}
      contentContainerStyle={[styles.list, entries.length===0&&{flex:1}]}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.title, { color:c.text }]}>🏆 Classifica</Text>
          <Text style={[styles.sub, { color:c.textHint }]}>Solo serate concluse · S=Serate · MVP=Premi · PT=Punti</Text>
          {/* Header colonne */}
          {entries.length > 0 && (
            <View style={[styles.colHead, { borderColor:c.border }]}>
              <View style={{ width:28 }} />
              <View style={{ width:38 }} />
              <Text style={[styles.col, { flex:1, textAlign:'left', color:c.textHint }]}>GIOCATORE</Text>
              <Text style={[styles.col, { color:c.textHint }]}>S</Text>
              <Text style={[styles.col, { color:c.textHint }]}>MVP</Text>
              <Text style={[styles.col, { color:c.textHint, textAlign:'right' }]}>PT</Text>
            </View>
          )}
        </View>
      }
      renderItem={({ item:e }) => {
        const top = e.rank<=3 && e.total_points>0;
        const medal = e.total_points>0 ? MEDALS[e.rank-1] : null;
        const ptColor = top ? c.accent : e.total_points<0 ? c.danger : c.text;
        return (
          <View style={[styles.row, { backgroundColor:c.surface, borderColor: top ? c.accent+'44' : c.border }]}>
            <View style={{ width:28, alignItems:'center' }}>
              {medal ? <Text style={{ fontSize:20 }}>{medal}</Text>
                     : <Text style={[styles.rankNum, { color:c.textHint }]}>{e.rank}</Text>}
            </View>
            <View style={[styles.avi, { width:38, height:38, backgroundColor: top ? c.accentMuted : c.surface2 }]}>
              <Text style={[styles.aviText, { color: top ? c.accent : c.textSub }]}>{e.display_name[0]?.toUpperCase()}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={[styles.pName, { color:c.text }]} numberOfLines={1}>{e.display_name}</Text>
              {e.categories_won > 0 && <Text style={[styles.pSub, { color:c.textHint }]}>{e.categories_won} cat.</Text>}
            </View>
            <Text style={[styles.stat, { color:c.textSub }]}>{e.serate_played}</Text>
            <Text style={[styles.stat, { color:c.textSub }]}>{e.mvp_count}</Text>
            <View style={{ width:42, alignItems:'flex-end' }}>
              <Text style={[styles.pts, { color:ptColor }]}>{e.total_points>0?'+':''}{e.total_points}</Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={{ flex:1, justifyContent:'center', alignItems:'center', gap:space.md }}>
          <Text style={{ fontSize:48 }}>🏆</Text>
          <Text style={[styles.pName, { color:c.text }]}>Nessun membro</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { padding:space.lg, paddingBottom:40 },
  header: { marginBottom:space.lg },
  title: { fontSize:t.size['2xl'], fontWeight:t.weight.bold, letterSpacing:-0.4 },
  sub: { fontSize:t.size.xs, marginTop:4, marginBottom:space.lg },
  colHead: { flexDirection:'row', alignItems:'center', paddingBottom:space.sm, borderBottomWidth:1, gap:space.md },
  col: { fontSize:t.size.xs, fontWeight:t.weight.bold, letterSpacing:0.5, width:32, textAlign:'center' },
  row: { flexDirection:'row', alignItems:'center', gap:space.md, borderRadius:radius.xl, borderWidth:1, padding:space.lg, marginBottom:space.sm },
  rankNum: { fontSize:t.size.base, fontWeight:t.weight.bold },
  avi: { borderRadius:radius.full, alignItems:'center', justifyContent:'center' },
  aviText: { fontSize:t.size.md, fontWeight:t.weight.bold },
  pName: { fontSize:t.size.sm, fontWeight:t.weight.semibold },
  pSub: { fontSize:t.size.xs, marginTop:1 },
  stat: { width:32, textAlign:'center', fontSize:t.size.base, fontWeight:t.weight.medium },
  pts: { fontSize:t.size.lg, fontWeight:t.weight.bold },
});
