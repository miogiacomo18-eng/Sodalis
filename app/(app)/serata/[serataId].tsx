import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useGlobalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { useMembers } from '../../../hooks/useMembers';
import { AddDebtModal } from '../../../components/AddDebtModal';
import { space, radius, type as t } from '../../../constants/tokens';

type Serata = { id:string;title:string;description:string|null;event_date:string;status:'planned'|'active'|'voting'|'closed';created_by:string;group_id:string };
type Post = { id:string;content:string;created_at:string;author_id:string;author_username:string };
type Debt = { id:string;from_user_id:string;to_user_id:string;created_by:string;cat_name:string|null;cat_icon:string|null };

const NEXT:Record<string,string> = { planned:'active', active:'voting', voting:'closed' };
const NEXT_LABEL:Record<string,string> = { planned:'Avvia serata', active:'Apri il Tribunale ⚖️', voting:'Chiudi e assegna punti' };

export default function SerataDetailScreen() {
  const { serataId, groupId } = useGlobalSearchParams<{ serataId:string;groupId:string }>();
  const { user } = useAuth();
  const { c } = useTheme();
  const router = useRouter();
  const { members } = useMembers(groupId);
  const [serata, setSerata] = useState<Serata|null>(null);
  const [lore, setLore] = useState<Post[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showLore, setShowLore] = useState(false);
  const [showDebt, setShowDebt] = useState(false);
  const [loreText, setLoreText] = useState('');
  const [savingLore, setSavingLore] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const getName = (uid:string) => members.find(m=>m.user_id===uid)?.display_name ?? '?';

  const fetch = useCallback(async () => {
    if (!serataId) return;
    const [sRes,lRes,dRes] = await Promise.all([
      supabase.from('serate').select('*').eq('id',serataId).single(),
      supabase.from('lore').select('id,content,created_at,author_id,profiles!author_id(username)').eq('serata_id',serataId).order('created_at',{ascending:false}),
      supabase.from('debts').select('id,from_user_id,to_user_id,created_by,debt_categories(name,icon)').eq('serata_id',serataId),
    ]);
    if (sRes.data) setSerata(sRes.data as Serata);
    setLore((lRes.data??[]).map((r:any) => ({ id:r.id, content:r.content, created_at:r.created_at, author_id:r.author_id, author_username:r.profiles?.username??'?' })));
    setDebts((dRes.data??[]).map((r:any) => ({ id:r.id, from_user_id:r.from_user_id, to_user_id:r.to_user_id, created_by:r.created_by, cat_name:r.debt_categories?.name??null, cat_icon:r.debt_categories?.icon??null })));
    setRefreshing(false);
  }, [serataId]);

  useEffect(() => { fetch(); }, [fetch]);

  const changeStatus = async (status:string) => {
    setUpdatingStatus(true);
    await supabase.from('serate').update({ status }).eq('id',serataId);
    setUpdatingStatus(false);
    fetch();
    // Quando chiudo, naviga subito al recap (UX migliore)
    if (status === 'closed') {
      setTimeout(() => router.push({ pathname:'/(app)/recap/[serataId]', params:{ serataId, groupId: serata?.group_id ?? '' }}), 300);
    }
  };

  const handleStatus = () => {
    if (!serata) return;
    const next = NEXT[serata.status]; if (!next) return;
    if (serata.status==='active') Alert.alert('Apri il Tribunale?','Gli utenti potranno votare.',[{text:'Annulla',style:'cancel'},{text:'Apri ⚖️',onPress:()=>changeStatus(next)}]);
    else if (serata.status==='voting') Alert.alert('Chiudere le votazioni?','I punti verranno assegnati e vedrai il recap finale.',[{text:'Annulla',style:'cancel'},{text:'Chiudi',style:'destructive',onPress:()=>changeStatus(next)}]);
    else changeStatus(next);
  };

  const addLore = async () => {
    if (!loreText.trim()) return;
    setSavingLore(true);
    await supabase.from('lore').insert({ group_id:groupId??serata?.group_id, serata_id:serataId, author_id:user!.id, content:loreText.trim() });
    setSavingLore(false); setLoreText(''); setShowLore(false); fetch();
  };

  const delLore = (id:string) => Alert.alert('Elimina','',[{text:'Annulla',style:'cancel'},{text:'Elimina',style:'destructive',onPress:async()=>{ await supabase.from('lore').delete().eq('id',id); fetch(); }}]);
  const delDebt = (id:string) => Alert.alert('Elimina','',[{text:'Annulla',style:'cancel'},{text:'Elimina',style:'destructive',onPress:async()=>{ await supabase.from('debts').delete().eq('id',id); fetch(); }}]);

  const fmtDate = (d:string) => new Date(d).toLocaleDateString('it-IT',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const isCreator = serata?.created_by===user?.id;
  const isLocked = serata?.status==='closed';

  const STATUS_COLOR:any = { planned: c.warn, active: c.teal, voting: c.danger, closed: c.textHint };
  const STATUS_LABEL:any = { planned: 'In programma', active: 'In corso', voting: '⚖️ Tribunale aperto', closed: 'Conclusa' };

  return (
    <ScrollView style={{ flex:1, backgroundColor:c.bg }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);fetch();}} tintColor={c.accent} colors={[c.accent]} />}>
      <Stack.Screen options={{ title: serata?.title ?? 'Serata' }} />

      {serata && (
        <View style={[styles.header, { borderBottomColor:c.border }]}>
          <Text style={[styles.dateStr, { color:c.textHint }]}>{fmtDate(serata.event_date)}</Text>
          <Text style={[styles.title, { color:c.text }]}>{serata.title}</Text>
          {serata.description && <Text style={[styles.desc, { color:c.textSub }]}>{serata.description}</Text>}
          {serata.status && (
            <View style={[styles.stBadge, { backgroundColor: STATUS_COLOR[serata.status]+'20' }]}>
              <View style={[styles.stDot, { backgroundColor: STATUS_COLOR[serata.status] }]} />
              <Text style={[styles.stText, { color: STATUS_COLOR[serata.status] }]}>{STATUS_LABEL[serata.status]}</Text>
            </View>
          )}
        </View>
      )}

      {isCreator && !isLocked && (
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor:c.accent }, updatingStatus&&{opacity:.6}]}
          onPress={handleStatus} disabled={updatingStatus}>
          <Text style={styles.actionBtnText}>{updatingStatus?'Aggiornamento…':NEXT_LABEL[serata?.status??'']}</Text>
        </TouchableOpacity>
      )}

      {serata?.status==='voting' && (
        <TouchableOpacity style={[styles.tribunaleBtn, { backgroundColor:c.dangerMuted, borderColor:c.danger+'44' }]}
          onPress={() => router.push({ pathname:'/(app)/tribunale/[serataId]', params:{ serataId, groupId:serata.group_id }})}>
          <Text style={[styles.tribunaleBtnText, { color:c.danger }]}>⚖️ Entra nel Tribunale</Text>
          <Ionicons name="chevron-forward" size={16} color={c.danger} />
        </TouchableOpacity>
      )}

      {/* Bottone Recap quando la serata è chiusa */}
      {serata?.status === 'closed' && (
        <TouchableOpacity
          style={[styles.recapBtn, { backgroundColor: c.goldMuted, borderColor: c.gold + '44' }]}
          onPress={() => router.push({ pathname:'/(app)/recap/[serataId]', params:{ serataId, groupId: serata.group_id }})}
        >
          <Ionicons name="trophy" size={18} color={c.gold} />
          <Text style={[styles.recapBtnText, { color: c.gold }]}>Vedi il Recap della serata</Text>
          <Ionicons name="chevron-forward" size={16} color={c.gold} />
        </TouchableOpacity>
      )}

      {/* Sezione Lore */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color:c.text }]}>📖 Lore della serata</Text>
          {!isLocked && <TouchableOpacity onPress={() => setShowLore(true)} hitSlop={8}><Ionicons name="add-circle" size={24} color={c.accent} /></TouchableOpacity>}
        </View>
        {lore.length===0 ? <Text style={[styles.empty, { color:c.textHint }]}>Nessuna lore per questa serata.</Text>
          : lore.map(p => (
            <View key={p.id} style={[styles.card, { backgroundColor:c.surface, borderColor:c.border }]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardAuthor, { color:c.textSub }]}>{getName(p.author_id)||p.author_username}</Text>
                {p.author_id===user?.id && <TouchableOpacity onPress={()=>delLore(p.id)} hitSlop={12}><Ionicons name="trash-outline" size={14} color={c.textHint} /></TouchableOpacity>}
              </View>
              <Text style={[styles.cardContent, { color:c.text }]}>{p.content}</Text>
            </View>
          ))}
      </View>

      {/* Sezione Debiti */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color:c.text }]}>⚖️ Debiti della serata</Text>
          {!isLocked && <TouchableOpacity onPress={() => setShowDebt(true)} hitSlop={8}><Ionicons name="add-circle" size={24} color={c.accent} /></TouchableOpacity>}
        </View>
        {debts.length===0 ? <Text style={[styles.empty, { color:c.textHint }]}>Nessun debito registrato.</Text>
          : debts.map(d => (
            <View key={d.id} style={[styles.card, { backgroundColor:c.surface, borderColor:c.border }]}>
              <View style={styles.cardHead}>
                <Text style={[styles.cardContent, { color:c.text, flex:1 }]}>
                  <Text style={{ fontWeight:t.weight.semibold }}>{getName(d.from_user_id)}</Text>
                  <Text style={{ color:c.textSub }}> deve a </Text>
                  <Text style={{ fontWeight:t.weight.semibold }}>{getName(d.to_user_id)}</Text>
                </Text>
                {d.created_by===user?.id && <TouchableOpacity onPress={()=>delDebt(d.id)} hitSlop={12}><Ionicons name="trash-outline" size={14} color={c.textHint} /></TouchableOpacity>}
              </View>
              {d.cat_name && (
                <View style={[styles.catBadge, { backgroundColor:c.surface2, borderColor:c.border }]}>
                  {d.cat_icon && <Text style={{ fontSize:11 }}>{d.cat_icon}</Text>}
                  <Text style={[styles.catText, { color:c.textSub }]}>{d.cat_name}</Text>
                </View>
              )}
            </View>
          ))}
      </View>

      <Modal visible={showLore} transparent animationType="slide" onRequestClose={() => setShowLore(false)}>
        <TouchableWithoutFeedback onPress={() => setShowLore(false)}><View style={[styles.overlay, { backgroundColor:c.overlay }]} /></TouchableWithoutFeedback>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ justifyContent:'flex-end' }}>
          <View style={[styles.sheet, { backgroundColor:c.surface, borderColor:c.border }]}>
            <View style={[styles.handle, { backgroundColor:c.borderStrong }]} />
            <Text style={[styles.sheetTitle, { color:c.text }]}>Aggiungi Lore</Text>
            <TextInput style={[styles.textarea, { backgroundColor:c.surface2, borderColor:c.border, color:c.text }]}
              placeholder="Cosa è successo di epico?" placeholderTextColor={c.textHint}
              value={loreText} onChangeText={setLoreText} multiline numberOfLines={4} maxLength={1000} autoFocus />
            <View style={styles.actions}>
              <Pressable style={[styles.btnSec, { backgroundColor:c.surface2, borderColor:c.border }]} onPress={() => setShowLore(false)}>
                <Text style={[styles.btnSecText, { color:c.textSub }]}>Annulla</Text>
              </Pressable>
              <Pressable style={[styles.btnPri, { backgroundColor:c.accent }, savingLore&&{opacity:.6}]} onPress={addLore} disabled={savingLore}>
                <Text style={styles.btnPriText}>{savingLore?'…':'Pubblica'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {(groupId||serata?.group_id) && (
        <AddDebtModal visible={showDebt} onClose={() => setShowDebt(false)} onCreated={fetch}
          groupId={groupId||serata!.group_id} serataId={serataId} members={members} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding:space.lg, paddingBottom:60 },
  header: { marginBottom:space.xl, paddingBottom:space.xl, borderBottomWidth:1, gap:space.sm },
  dateStr: { fontSize:t.size.xs, textTransform:'uppercase', letterSpacing:0.6 },
  title: { fontSize:t.size['2xl'], fontWeight:t.weight.bold, letterSpacing:-0.3 },
  desc: { fontSize:t.size.base },
  stBadge: { flexDirection:'row', alignSelf:'flex-start', alignItems:'center', gap:6, borderRadius:radius.full, paddingHorizontal:space.md, paddingVertical:space.xs },
  stDot: { width:7, height:7, borderRadius:4 },
  stText: { fontSize:t.size.sm, fontWeight:t.weight.semibold },
  actionBtn: { borderRadius:radius.xl, paddingVertical:14, alignItems:'center', marginBottom:space.md },
  actionBtnText: { color:'#fff', fontSize:t.size.base, fontWeight:t.weight.semibold },
  tribunaleBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', borderRadius:radius.xl, borderWidth:1, paddingVertical:14, gap:space.sm, marginBottom:space.xl },
  tribunaleBtnText: { fontSize:t.size.base, fontWeight:t.weight.semibold },
  recapBtn: { flexDirection:'row', alignItems:'center', justifyContent:'center', borderRadius:radius.xl, borderWidth:1, paddingVertical:14, gap:space.sm, marginBottom:space.xl },
  recapBtnText: { fontSize:t.size.base, fontWeight:t.weight.semibold, flex:0 },
  section: { marginBottom:space['3xl'] },
  sectionHead: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:space.md },
  sectionTitle: { fontSize:t.size.md, fontWeight:t.weight.semibold },
  empty: { fontSize:t.size.sm, fontStyle:'italic' },
  card: { borderRadius:radius.xl, borderWidth:1, padding:space.lg, marginBottom:space.sm, gap:space.sm },
  cardHead: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  cardAuthor: { fontSize:t.size.xs, fontWeight:t.weight.semibold },
  cardContent: { fontSize:t.size.base, lineHeight:21 },
  catBadge: { flexDirection:'row', alignSelf:'flex-start', alignItems:'center', gap:4, borderRadius:radius.lg, borderWidth:1, paddingHorizontal:space.sm, paddingVertical:3 },
  catText: { fontSize:t.size.xs, fontWeight:t.weight.medium },
  overlay: { flex:1 },
  sheet: { borderTopLeftRadius:radius['2xl'], borderTopRightRadius:radius['2xl'], padding:space['2xl'], paddingBottom:Platform.OS==='ios'?40:28, borderTopWidth:1 },
  handle: { width:36, height:4, borderRadius:radius.full, alignSelf:'center', marginBottom:space.xl },
  sheetTitle: { fontSize:t.size.xl, fontWeight:t.weight.bold, marginBottom:space.lg },
  textarea: { borderRadius:radius.lg, padding:space.lg, fontSize:t.size.base, borderWidth:1, minHeight:120, textAlignVertical:'top', marginBottom:space.lg },
  actions: { flexDirection:'row', gap:space.md },
  btnSec: { flex:1, paddingVertical:14, borderRadius:radius.lg, alignItems:'center', borderWidth:1 },
  btnSecText: { fontSize:t.size.base, fontWeight:t.weight.medium },
  btnPri: { flex:2, paddingVertical:14, borderRadius:radius.lg, alignItems:'center' },
  btnPriText: { color:'#fff', fontSize:t.size.base, fontWeight:t.weight.semibold },
});
