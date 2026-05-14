import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { space, radius, type as t } from '../../../../constants/tokens';

type Serata = { id:string;title:string;description:string|null;event_date:string;status:'planned'|'active'|'voting'|'closed';created_by:string };

export default function SerateTab() {
  const { id:groupId } = useGlobalSearchParams<{ id:string }>();
  const { user } = useAuth();
  const { c } = useTheme();
  const router = useRouter();
  const [serate, setSerate] = useState<Serata[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(new Date());
  const [showAndroid, setShowAndroid] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetch = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase.from('serate').select('id,title,description,event_date,status,created_by')
      .eq('group_id',groupId).order('event_date',{ascending:false});
    setSerate((data??[]) as Serata[]);
    setRefreshing(false);
  }, [groupId]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async () => {
    if (!title.trim()) { Alert.alert('Titolo mancante'); return; }
    setSaving(true);
    const { error } = await supabase.from('serate').insert({
      group_id:groupId, title:title.trim(), description:desc.trim()||null,
      event_date:date.toISOString().split('T')[0], created_by:user!.id, status:'active',
    });
    setSaving(false);
    if (error) { Alert.alert('Errore',error.message); return; }
    setTitle(''); setDesc(''); setDate(new Date()); setShowModal(false); fetch();
  };

  const del = (s:Serata) => Alert.alert('Elimina serata', `Eliminare "${s.title}" e tutti i contenuti?`,[
    {text:'Annulla',style:'cancel'},
    {text:'Elimina',style:'destructive',onPress:async()=>{ await supabase.from('serate').delete().eq('id',s.id); fetch(); }},
  ]);

  const fmtList = (d:string) => new Date(d).toLocaleDateString('it-IT',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
  const fmtBtn  = (d:Date)  => d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});

  const STATUS = {
    planned: { label:'In programma', color:c.warn,    bg:c.warnMuted },
    active:  { label:'In corso',     color:c.teal,    bg:c.tealMuted },
    voting:  { label:'⚖️ Tribunale', color:c.danger,  bg:c.dangerMuted },
    closed:  { label:'Conclusa',     color:c.textHint, bg:c.surface2 },
  };

  return (
    <View style={{ flex:1, backgroundColor:c.bg }}>
      <FlatList
        data={serate}
        keyExtractor={i=>i.id}
        renderItem={({ item:s }) => {
          const st = STATUS[s.status];
          const canDel = s.created_by === user?.id;
          return (
            <TouchableOpacity style={[styles.card, { backgroundColor:c.surface, borderColor:c.border }]}
              onPress={() => router.push({ pathname:'/(app)/serata/[serataId]', params:{ serataId:s.id, groupId:groupId??'' }})}
              activeOpacity={0.75}>
              <View style={styles.cardTop}>
                <View style={{ flex:1 }}>
                  <Text style={[styles.cardDate, { color:c.textHint }]}>{fmtList(s.event_date)}</Text>
                  <Text style={[styles.cardTitle, { color:c.text }]}>{s.title}</Text>
                  {s.description && <Text style={[styles.cardDesc, { color:c.textSub }]} numberOfLines={1}>{s.description}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={16} color={c.textHint} />
              </View>
              <View style={styles.cardBot}>
                <View style={[styles.stBadge, { backgroundColor:st.bg }]}>
                  <Text style={[styles.stText, { color:st.color }]}>{st.label}</Text>
                </View>
                {canDel && (
                  <TouchableOpacity onPress={() => del(s)} hitSlop={10} style={{ padding:4 }}>
                    <Ionicons name="trash-outline" size={15} color={c.textHint} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={[styles.list, serate.length===0&&{flex:1}]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>{setRefreshing(true);fetch();}} tintColor={c.accent} colors={[c.accent]} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={{ fontSize:44 }}>🌙</Text><Text style={[styles.emptyTitle, { color:c.text }]}>Nessuna serata</Text><Text style={[styles.emptySub, { color:c.textSub }]}>Pianifica la prossima uscita!</Text></View>}
      />
      <TouchableOpacity style={[styles.fab, { backgroundColor:c.accent }]} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}><View style={[styles.overlay, { backgroundColor:c.overlay }]} /></TouchableWithoutFeedback>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ justifyContent:'flex-end' }}>
          <View style={[styles.sheet, { backgroundColor:c.surface, borderColor:c.border }]}>
            <View style={[styles.handle, { backgroundColor:c.borderStrong }]} />
            <Text style={[styles.sheetTitle, { color:c.text }]}>Nuova Serata</Text>
            <Text style={[styles.lbl, { color:c.textSub }]}>Titolo *</Text>
            <TextInput style={[styles.inp, { backgroundColor:c.surface2, borderColor:c.border, color:c.text }]}
              placeholder={`Es. "Cena da Marco"`} placeholderTextColor={c.textHint}
              value={title} onChangeText={setTitle} maxLength={50} autoFocus />
            <Text style={[styles.lbl, { color:c.textSub }]}>Data</Text>
            {Platform.OS==='ios' ? (
              <View style={{ marginBottom:space.md }}>
                <DateTimePicker value={date} mode="date" display="compact" onChange={(_,d)=>d&&setDate(d)}
                  locale="it-IT" themeVariant={c.bg==="#0b0b0d"?'dark':'light'} style={{ alignSelf:'flex-start' }} />
              </View>
            ) : (
              <>
                <TouchableOpacity style={[styles.datBtn, { backgroundColor:c.surface2, borderColor:c.border }]} onPress={()=>setShowAndroid(true)}>
                  <Ionicons name="calendar-outline" size={18} color={c.accent} />
                  <Text style={[styles.datText, { color:c.text }]}>{fmtBtn(date)}</Text>
                </TouchableOpacity>
                {showAndroid && <DateTimePicker value={date} mode="date" onChange={(e,d)=>{ setShowAndroid(false); if(e.type==='set'&&d) setDate(d); }} />}
              </>
            )}
            <Text style={[styles.lbl, { color:c.textSub }]}>Note (opzionale)</Text>
            <TextInput style={[styles.inp, { backgroundColor:c.surface2, borderColor:c.border, color:c.text, minHeight:64, textAlignVertical:'top' }]}
              placeholder="Dove, cosa, dettagli…" placeholderTextColor={c.textHint}
              value={desc} onChangeText={setDesc} multiline maxLength={300} />
            <View style={styles.actions}>
              <Pressable style={[styles.btnSec, { backgroundColor:c.surface2, borderColor:c.border }]} onPress={() => setShowModal(false)}>
                <Text style={[styles.btnSecText, { color:c.textSub }]}>Annulla</Text>
              </Pressable>
              <Pressable style={[styles.btnPri, { backgroundColor:c.accent }, saving&&{opacity:.6}]} onPress={create} disabled={saving}>
                <Text style={styles.btnPriText}>{saving?'Creazione…':'Crea Serata'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding:space.lg, paddingBottom:100 },
  card: { borderRadius:radius.xl, borderWidth:1, padding:space.lg, marginBottom:space.md },
  cardTop: { flexDirection:'row', alignItems:'flex-start', marginBottom:space.md },
  cardDate: { fontSize:t.size.xs, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 },
  cardTitle: { fontSize:t.size.lg, fontWeight:t.weight.semibold },
  cardDesc: { fontSize:t.size.sm, marginTop:2 },
  cardBot: { flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  stBadge: { alignSelf:'flex-start', borderRadius:radius.full, paddingHorizontal:space.md, paddingVertical:4 },
  stText: { fontSize:t.size.xs, fontWeight:t.weight.bold },
  empty: { flex:1, justifyContent:'center', alignItems:'center', gap:space.md },
  emptyTitle: { fontSize:t.size.lg, fontWeight:t.weight.semibold },
  emptySub: { fontSize:t.size.sm },
  fab: { position:'absolute', bottom:24, right:24, width:52, height:52, borderRadius:26, justifyContent:'center', alignItems:'center', elevation:8 },
  overlay: { flex:1 },
  sheet: { borderTopLeftRadius:radius['2xl'], borderTopRightRadius:radius['2xl'], padding:space['2xl'], paddingBottom:Platform.OS==='ios'?40:28, borderTopWidth:1 },
  handle: { width:36, height:4, borderRadius:radius.full, alignSelf:'center', marginBottom:space.xl },
  sheetTitle: { fontSize:t.size.xl, fontWeight:t.weight.bold, marginBottom:space.xl },
  lbl: { fontSize:t.size.sm, fontWeight:t.weight.medium, marginBottom:space.sm },
  inp: { borderRadius:radius.lg, paddingHorizontal:space.lg, paddingVertical:14, fontSize:t.size.base, borderWidth:1, marginBottom:space.md },
  datBtn: { flexDirection:'row', alignItems:'center', gap:space.md, borderRadius:radius.lg, paddingHorizontal:space.lg, paddingVertical:14, borderWidth:1, marginBottom:space.md },
  datText: { fontSize:t.size.base, fontWeight:t.weight.medium },
  actions: { flexDirection:'row', gap:space.md, marginTop:space.md },
  btnSec: { flex:1, paddingVertical:14, borderRadius:radius.lg, alignItems:'center', borderWidth:1 },
  btnSecText: { fontSize:t.size.base, fontWeight:t.weight.medium },
  btnPri: { flex:2, paddingVertical:14, borderRadius:radius.lg, alignItems:'center' },
  btnPriText: { color:'#fff', fontSize:t.size.base, fontWeight:t.weight.semibold },
});
