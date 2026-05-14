import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useGlobalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useMembers } from '../../../hooks/useMembers';
import { space, radius, type as t } from '../../../constants/tokens';

type Category = { id:string;name:string;description:string|null;points:number;is_mvp:boolean;group_id:string|null };
type VoteMap = Record<string,string>;

export default function TribunaleScreen() {
  const { serataId, groupId } = useGlobalSearchParams<{ serataId:string;groupId:string }>();
  const { user } = useAuth();
  const { c } = useTheme();
  const router = useRouter();
  const { members } = useMembers(groupId);
  const [categories, setCategories] = useState<Category[]>([]);
  const [votes, setVotes] = useState<VoteMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [votersCount, setVotersCount] = useState(0);

  const fetch = useCallback(async () => {
    if (!serataId || !groupId) return;
    const [catRes, voteRes, allVotersRes] = await Promise.all([
      // Categorie globali + specifiche del gruppo
      supabase.from('vote_categories').select('id,name,description,points,is_mvp,group_id')
        .or(`group_id.eq.${groupId},group_id.is.null`).eq('is_active',true).order('display_order'),
      supabase.from('votes').select('category_id,voted_user_id').eq('serata_id',serataId).eq('voter_id',user!.id),
      supabase.from('votes').select('voter_id').eq('serata_id',serataId),
    ]);
    setCategories((catRes.data??[]) as Category[]);
    const map:VoteMap = {};
    (voteRes.data??[]).forEach((v:any) => { map[v.category_id]=v.voted_user_id; });
    setVotes(map);
    setVotersCount(new Set((allVotersRes.data??[]).map((v:any)=>v.voter_id)).size);
    setLoading(false);
  }, [serataId, groupId, user]);

  useEffect(() => { fetch(); }, [fetch]);

  const votable = members.filter(m => m.user_id !== user?.id);

  const toggle = (catId:string, memberId:string) => setVotes(prev => {
    if (prev[catId]===memberId) { const n={...prev}; delete n[catId]; return n; }
    return { ...prev, [catId]:memberId };
  });

  const submit = async () => {
    const count = Object.keys(votes).length;
    if (count===0) { Alert.alert('Nessun voto'); return; }
    Alert.alert('Conferma voti',`${count} vot${count===1?'o':'i'}. Modificabili finché il Tribunale è aperto.`,[
      {text:'Annulla',style:'cancel'},{text:'Conferma',onPress:async()=>{
        setSaving(true);
        let err = false;
        for (const [catId,uid] of Object.entries(votes)) {
          const { error } = await supabase.from('votes').upsert({ serata_id:serataId, category_id:catId, voter_id:user!.id, voted_user_id:uid },{ onConflict:'serata_id,category_id,voter_id' });
          if (error) err = true;
        }
        setSaving(false);
        if (err) Alert.alert('Errore','Alcuni voti non salvati.');
        else Alert.alert('✅ Voti salvati!',' ',[{text:'OK',onPress:()=>router.back()}]);
      }},
    ]);
  };

  if (loading) return <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor:c.bg }}><ActivityIndicator color={c.accent} /></View>;

  const bonus = categories.filter(c2 => c2.points > 0);
  const malus = categories.filter(c2 => c2.points < 0);

  const renderCat = (cat: Category) => {
    const bad = cat.points < 0;
    const ptColor = bad ? c.danger : cat.is_mvp ? c.gold : c.accent;
    const ptBg = bad ? c.dangerMuted : cat.is_mvp ? c.goldMuted : c.accentMuted;
    return (
      <View key={cat.id} style={[styles.catBlock, { backgroundColor:c.surface, borderColor: bad ? c.danger+'25' : c.border }]}>
        <View style={styles.catHead}>
          <View style={{ flex:1 }}>
            <View style={{ flexDirection:'row', alignItems:'center', gap:6 }}>
              {cat.is_mvp && <Text>👑</Text>}
              {cat.group_id && <View style={[styles.custBadge, { backgroundColor:c.accentMuted }]}><Text style={[styles.custText, { color:c.accent }]}>Custom</Text></View>}
              <Text style={[styles.catName, { color:c.text }]}>{cat.name}</Text>
            </View>
            {cat.description && <Text style={[styles.catDesc, { color:c.textHint }]}>{cat.description}</Text>}
          </View>
          <View style={[styles.ptBadge, { backgroundColor:ptBg }]}>
            <Text style={[styles.ptText, { color:ptColor }]}>{cat.points>0?`+${cat.points}`:cat.points} pt</Text>
          </View>
        </View>
        <View style={{ gap:6 }}>
          {votable.map(m => {
            const sel = votes[cat.id]===m.user_id;
            return (
              <TouchableOpacity key={m.user_id}
                style={[styles.memRow, { backgroundColor:c.surface2, borderColor: sel?(bad?c.danger:c.accent):c.border },
                  sel && { backgroundColor: bad?c.dangerMuted:c.accentMuted }]}
                onPress={() => toggle(cat.id, m.user_id)} activeOpacity={0.75}>
                <View style={[styles.memAvi, { backgroundColor: sel?ptBg:c.surface3 }]}>
                  <Text style={[styles.memInit, { color: sel?ptColor:c.textSub }]}>{m.display_name[0]?.toUpperCase()}</Text>
                </View>
                <Text style={[styles.memName, { color: sel?c.text:c.textSub, fontWeight: sel?t.weight.semibold:t.weight.normal }]}>{m.display_name}</Text>
                {sel && <Ionicons name="checkmark-circle" size={20} color={ptColor} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex:1, backgroundColor:c.bg }}>
      <Stack.Screen options={{ title:'⚖️ Il Tribunale' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Contatore votanti */}
        <View style={[styles.votersCard, { backgroundColor:c.accentMuted, borderColor:c.accent+'30' }]}>
          <View style={[styles.votersIcon, { backgroundColor:c.accentMuted }]}>
            <Ionicons name="people" size={18} color={c.accent} />
          </View>
          <View style={{ flex:1 }}>
            <Text style={[styles.votersTitle, { color:c.text }]}>
              <Text style={{ color:c.accent, fontWeight:t.weight.bold }}>{votersCount}/{members.length}</Text>
              {' '}hanno già votato
            </Text>
            <Text style={[styles.votersSub, { color:c.textSub }]}>
              {votersCount===members.length ? 'Tutti hanno votato! Il creatore può chiudere.' : `Mancano ${members.length-votersCount}`}
            </Text>
          </View>
        </View>

        <Text style={[styles.intro, { color:c.textSub }]}>Vota per ogni categoria. Puoi cambiare finché il Tribunale è aperto.</Text>

        {bonus.length>0 && <><Text style={[styles.sLabel, { color:c.text }]}>🏆 Premi</Text>{bonus.map(renderCat)}</>}
        {malus.length>0 && <><Text style={[styles.sLabel, { color:c.danger, marginTop:space.xl }]}>💀 Punizioni</Text>{malus.map(renderCat)}</>}

        {Object.keys(votes).length > 0 && (
          <View style={[styles.summary, { backgroundColor:c.accentMuted, borderColor:c.accent+'30' }]}>
            <Text style={[styles.sumTitle, { color:c.accent }]}>I tuoi voti</Text>
            {Object.entries(votes).map(([catId,uid]) => {
              const cat = categories.find(c2=>c2.id===catId);
              const mem = members.find(m=>m.user_id===uid);
              const bad = (cat?.points??0)<0;
              return <Text key={catId} style={[styles.sumRow, { color:c.textSub }]}>• {cat?.name}: <Text style={{ color:bad?c.danger:c.accent, fontWeight:t.weight.semibold }}>{mem?.display_name}</Text></Text>;
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor:c.bg, borderTopColor:c.border }]}>
        <Pressable style={[styles.submitBtn, { backgroundColor:c.accent }, saving&&{opacity:.6}]} onPress={submit} disabled={saving}>
          <Text style={styles.submitText}>{saving?'Salvataggio…':`Conferma voti (${Object.keys(votes).length}/${categories.length})`}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding:space.lg, paddingBottom:120 },
  votersCard: { flexDirection:'row', alignItems:'center', gap:space.md, borderRadius:radius.xl, borderWidth:1, padding:space.lg, marginBottom:space.xl },
  votersIcon: { width:36, height:36, borderRadius:18, alignItems:'center', justifyContent:'center' },
  votersTitle: { fontSize:t.size.base, fontWeight:t.weight.medium },
  votersSub: { fontSize:t.size.xs, marginTop:2 },
  intro: { fontSize:t.size.sm, marginBottom:space.xl, lineHeight:20 },
  sLabel: { fontSize:t.size.lg, fontWeight:t.weight.bold, marginBottom:space.md },
  catBlock: { borderRadius:radius.xl, borderWidth:1, padding:space.lg, marginBottom:space.md },
  catHead: { flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', marginBottom:space.md },
  catName: { fontSize:t.size.base, fontWeight:t.weight.semibold },
  catDesc: { fontSize:t.size.xs, marginTop:2 },
  custBadge: { borderRadius:radius.full, paddingHorizontal:6, paddingVertical:2 },
  custText: { fontSize:9, fontWeight:t.weight.bold },
  ptBadge: { borderRadius:radius.full, paddingHorizontal:space.md, paddingVertical:4, marginLeft:space.sm },
  ptText: { fontSize:t.size.xs, fontWeight:t.weight.bold },
  memRow: { flexDirection:'row', alignItems:'center', gap:space.md, borderRadius:radius.lg, borderWidth:1, padding:space.md },
  memAvi: { width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center' },
  memInit: { fontSize:t.size.base, fontWeight:t.weight.bold },
  memName: { flex:1, fontSize:t.size.base },
  summary: { borderRadius:radius.xl, borderWidth:1, padding:space.lg, marginTop:space.md, gap:space.sm },
  sumTitle: { fontSize:t.size.sm, fontWeight:t.weight.bold, marginBottom:4 },
  sumRow: { fontSize:t.size.sm },
  footer: { position:'absolute', bottom:0, left:0, right:0, padding:space.xl, paddingBottom:Platform.OS==='ios'?36:20, borderTopWidth:1 },
  submitBtn: { borderRadius:radius.xl, paddingVertical:16, alignItems:'center' },
  submitText: { color:'#fff', fontSize:t.size.base, fontWeight:t.weight.semibold },
});
