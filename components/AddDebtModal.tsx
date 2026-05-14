import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { GroupMember } from '../hooks/useMembers';
import { space, radius, type as t } from '../constants/tokens';

type Cat = { id:string;name:string;icon:string|null };

type Props = { visible:boolean;onClose:()=>void;onCreated:()=>void;groupId:string;serataId?:string;members:GroupMember[] };

export function AddDebtModal({ visible, onClose, onCreated, groupId, serataId, members }: Props) {
  const { user } = useAuth();
  const { c } = useTheme();
  const [cats, setCats] = useState<Cat[]>([]);
  const [recipIds, setRecipIds] = useState<string[]>([]);
  const [catId, setCatId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    supabase.from('debt_categories').select('id,name,icon').eq('is_active',true).order('display_order')
      .then(({ data }) => setCats((data??[]) as Cat[]));
  }, [visible]);

  useEffect(() => {
    if (!visible) { setRecipIds([]); setCatId(''); }
  }, [visible]);

  const toggleRecip = (id:string) => setRecipIds(prev => prev.includes(id) ? prev.filter(i=>i!==id) : [...prev, id]);

  const submit = async () => {
    if (recipIds.length===0) { Alert.alert('Seleziona','Scegli almeno una persona.'); return; }
    if (!catId) { Alert.alert('Categoria','Scegli il tipo di favore.'); return; }
    setSaving(true);
    const { error } = await supabase.from('debts').insert(
      recipIds.map(rid => ({ group_id:groupId, serata_id:serataId??null, from_user_id:rid, to_user_id:user!.id, category_id:catId, created_by:user!.id }))
    );
    setSaving(false);
    if (error) { Alert.alert('Errore',error.message); return; }
    onClose(); onCreated();
  };

  const others = members.filter(m => m.user_id !== user?.id);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={[styles.overlay, { backgroundColor:c.overlay }]} /></TouchableWithoutFeedback>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ justifyContent:'flex-end' }}>
        <View style={[styles.sheet, { backgroundColor:c.surface, borderColor:c.border }]}>
          <View style={[styles.handle, { backgroundColor:c.borderStrong }]} />
          <Text style={[styles.title, { color:c.text }]}>Ho fatto un favore</Text>
          <Text style={[styles.sub, { color:c.textSub }]}>
            {serataId ? 'Il favore sarà collegato a questa serata.' : 'Registra ciò che hai fatto per gli altri.'}
          </Text>

          <Text style={[styles.label, { color:c.textSub }]}>
            A chi? <Text style={{ color:c.textHint, fontWeight:t.weight.normal }}>— seleziona uno o più</Text>
          </Text>
          <View style={styles.grid}>
            {others.map(m => {
              const active = recipIds.includes(m.user_id);
              return (
                <TouchableOpacity key={m.user_id}
                  style={[styles.chip, { borderColor:active?c.accent:c.border, backgroundColor:active?c.accentMuted:c.surface2 }]}
                  onPress={() => toggleRecip(m.user_id)}>
                  {active && <Ionicons name="checkmark" size={12} color={c.accent} />}
                  <Text style={[styles.chipText, { color:active?c.accent:c.textSub }]}>{m.display_name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {recipIds.length > 1 && (
            <Text style={[styles.multiHint, { color:c.textHint }]}>
              Verranno creati {recipIds.length} favori (uno per persona).
            </Text>
          )}

          <Text style={[styles.label, { color:c.textSub, marginTop:space.lg }]}>Cosa hai fatto?</Text>
          <View style={styles.grid}>
            {cats.map(cat => {
              const active = catId===cat.id;
              return (
                <TouchableOpacity key={cat.id}
                  style={[styles.catChip, { borderColor:active?c.accent:c.border, backgroundColor:active?c.accentMuted:c.surface2 }]}
                  onPress={() => setCatId(cat.id)}>
                  {cat.icon && <Text style={{ fontSize:14 }}>{cat.icon}</Text>}
                  <Text style={[styles.chipText, { color:active?c.accent:c.textSub }]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.actions, { marginTop:space.xl }]}>
            <Pressable style={[styles.btnSec, { backgroundColor:c.surface2, borderColor:c.border }]} onPress={onClose}>
              <Text style={[styles.btnSecText, { color:c.textSub }]}>Annulla</Text>
            </Pressable>
            <Pressable style={[styles.btnPri, { backgroundColor:c.accent }, saving&&{opacity:.6}]} onPress={submit} disabled={saving}>
              <Text style={styles.btnPriText}>{saving?'Salvataggio…':'Registra'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex:1 },
  sheet: { borderTopLeftRadius:radius['2xl'], borderTopRightRadius:radius['2xl'], padding:space['2xl'], paddingBottom:Platform.OS==='ios'?40:28, borderTopWidth:1, maxHeight:'90%' },
  handle: { width:36, height:4, borderRadius:radius.full, alignSelf:'center', marginBottom:space.xl },
  title: { fontSize:t.size.xl, fontWeight:t.weight.bold, marginBottom:4 },
  sub: { fontSize:t.size.sm, marginBottom:space.xl, lineHeight:19 },
  label: { fontSize:t.size.sm, fontWeight:t.weight.semibold, marginBottom:space.md },
  grid: { flexDirection:'row', flexWrap:'wrap', gap:space.sm },
  chip: { flexDirection:'row', alignItems:'center', gap:space.xs, paddingHorizontal:space.md, paddingVertical:space.sm, borderRadius:radius.full, borderWidth:1 },
  catChip: { flexDirection:'row', alignItems:'center', gap:space.sm, paddingHorizontal:space.md, paddingVertical:space.sm, borderRadius:radius.full, borderWidth:1 },
  chipText: { fontSize:t.size.sm, fontWeight:t.weight.semibold },
  multiHint: { fontSize:t.size.xs, marginTop:space.sm, fontStyle:'italic' },
  actions: { flexDirection:'row', gap:space.md },
  btnSec: { flex:1, paddingVertical:14, borderRadius:radius.lg, alignItems:'center', borderWidth:1 },
  btnSecText: { fontSize:t.size.base, fontWeight:t.weight.medium },
  btnPri: { flex:2, paddingVertical:14, borderRadius:radius.lg, alignItems:'center' },
  btnPriText: { color:'#fff', fontSize:t.size.base, fontWeight:t.weight.semibold },
});
