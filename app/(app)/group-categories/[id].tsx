// Schermata per gestire le categorie personalizzate del tribunale per un gruppo
import { useEffect, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useGlobalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';
import { space, radius, type as t } from '../../../constants/tokens';

type Category = { id: string; name: string; description: string|null; points: number; is_mvp: boolean; group_id: string|null };

const POINTS_OPTIONS = [
  { label: '+3 (Grande premio)', value: 3 },
  { label: '+1 (Premio)',        value: 1 },
  { label: '-1 (Punizione)',     value: -1 },
];

const EMOJI_OPTIONS = ['🎭','🍻','💤','👑','🤡','🦆','🎯','🔥','💩','⚡'];

export default function GroupCategoriesScreen() {
  const { id: groupId } = useGlobalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [points, setPoints] = useState(1);
  const [emoji, setEmoji] = useState('🎭');
  const [saving, setSaving] = useState(false);

  const fetch = async () => {
    const { data } = await supabase.from('vote_categories')
      .select('id,name,description,points,is_mvp,group_id')
      .or(`group_id.eq.${groupId},group_id.is.null`)
      .eq('is_active', true)
      .order('display_order');
    setCategories((data ?? []) as Category[]);
  };

  useEffect(() => { fetch(); }, [groupId]);

  const handleAdd = async () => {
    if (!name.trim()) { Alert.alert('Nome mancante'); return; }
    setSaving(true);
    const { error } = await supabase.from('vote_categories').insert({
      name: name.trim(),
      description: desc.trim() || null,
      points,
      group_id: groupId,
      is_active: true,
      display_order: 99,
      is_mvp: false,
    });
    setSaving(false);
    if (error) { Alert.alert('Errore', error.message); return; }
    setName(''); setDesc(''); setPoints(1); setEmoji('🎭');
    setShowModal(false); fetch();
  };

  const handleDelete = (cat: Category) => {
    Alert.alert('Elimina categoria', `Eliminare "${cat.name}"?`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: async () => {
        await supabase.from('vote_categories').delete().eq('id', cat.id);
        fetch();
      }},
    ]);
  };

  const renderItem = ({ item }: { item: Category }) => {
    const isCustom = item.group_id !== null;
    const isBonus = item.points > 0;
    const ptColor = item.points > 0 ? c.success : (item.points < 0 ? c.danger : c.textSub);
    return (
      <View style={[styles.catRow, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={[styles.ptBadge, { backgroundColor: ptColor+'18' }]}>
          <Text style={[styles.ptText, { color: ptColor }]}>
            {item.points > 0 ? `+${item.points}` : item.points}
          </Text>
        </View>
        <View style={{ flex:1 }}>
          <Text style={[styles.catName, { color: c.text }]}>
            {item.is_mvp ? '👑 ' : ''}{item.name}
          </Text>
          {item.description && <Text style={[styles.catDesc, { color: c.textSub }]}>{item.description}</Text>}
        </View>
        {isCustom ? (
          <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={10} style={styles.delBtn}>
            <Ionicons name="trash-outline" size={16} color={c.textHint} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.globalBadge, { backgroundColor: c.surface2 }]}>
            <Text style={[styles.globalText, { color: c.textHint }]}>Globale</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex:1, backgroundColor: c.bg }}>
      <FlatList
        data={categories}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={[styles.intro, { color: c.textSub }]}>
              Le categorie globali sono disponibili in tutti i gruppi. Qui puoi aggiungere categorie personalizzate solo per questo gruppo.
            </Text>
            <Text style={[styles.sectionLabel, { color: c.textHint }]}>CATEGORIE</Text>
          </View>
        }
        ListEmptyComponent={<Text style={[styles.empty, { color: c.textHint }]}>Nessuna categoria.</Text>}
      />

      <TouchableOpacity style={[styles.fab, { backgroundColor: c.accent }]} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
          <View style={[styles.overlay, { backgroundColor: c.overlay }]} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{ justifyContent:'flex-end' }}>
          <View style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
            <Text style={[styles.sheetTitle, { color: c.text }]}>Nuova categoria</Text>

            <Text style={[styles.label, { color: c.textSub }]}>Nome *</Text>
            <TextInput style={[styles.input, { backgroundColor: c.surface2, borderColor: c.border, color: c.text }]}
              placeholder="Es. Peggior barzelletta" placeholderTextColor={c.textHint}
              value={name} onChangeText={setName} maxLength={40} autoFocus />

            <Text style={[styles.label, { color: c.textSub }]}>Descrizione (opzionale)</Text>
            <TextInput style={[styles.input, { backgroundColor: c.surface2, borderColor: c.border, color: c.text }]}
              placeholder="Breve spiegazione" placeholderTextColor={c.textHint}
              value={desc} onChangeText={setDesc} maxLength={100} />

            <Text style={[styles.label, { color: c.textSub }]}>Punteggio</Text>
            <View style={styles.ptRow}>
              {POINTS_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value}
                  style={[styles.ptOption, { borderColor: points===opt.value ? c.accent : c.border,
                    backgroundColor: points===opt.value ? c.accentMuted : c.surface2 }]}
                  onPress={() => setPoints(opt.value)}>
                  <Text style={[styles.ptOptionText, { color: points===opt.value ? c.accent : c.textSub }]}>
                    {opt.value > 0 ? `+${opt.value}` : opt.value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actions}>
              <Pressable style={[styles.btnSec, { backgroundColor: c.surface2, borderColor: c.border }]}
                onPress={() => setShowModal(false)}>
                <Text style={[styles.btnSecText, { color: c.textSub }]}>Annulla</Text>
              </Pressable>
              <Pressable style={[styles.btnPri, { backgroundColor: c.accent }, saving && { opacity:0.6 }]}
                onPress={handleAdd} disabled={saving}>
                <Text style={styles.btnPriText}>{saving ? '…' : 'Aggiungi'}</Text>
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
  intro: { fontSize:t.size.sm, lineHeight:20, marginBottom:space.xl },
  sectionLabel: { fontSize:t.size.xs, fontWeight:t.weight.bold, letterSpacing:0.8, marginBottom:space.md },
  catRow: { flexDirection:'row', alignItems:'center', gap:space.md, borderRadius:radius.xl, borderWidth:1, padding:space.lg, marginBottom:space.sm },
  ptBadge: { width:36, height:36, borderRadius:radius.lg, alignItems:'center', justifyContent:'center' },
  ptText: { fontSize:t.size.sm, fontWeight:t.weight.bold },
  catName: { fontSize:t.size.base, fontWeight:t.weight.medium },
  catDesc: { fontSize:t.size.xs, marginTop:2 },
  delBtn: { padding:space.xs },
  globalBadge: { paddingHorizontal:space.sm, paddingVertical:3, borderRadius:radius.full },
  globalText: { fontSize:t.size.xs, fontWeight:t.weight.medium },
  empty: { textAlign:'center', marginTop:space['3xl'], fontSize:t.size.base },
  fab: { position:'absolute', bottom:24, right:24, width:52, height:52, borderRadius:26, justifyContent:'center', alignItems:'center', elevation:8 },
  overlay: { flex:1 },
  sheet: { borderTopLeftRadius:radius['2xl'], borderTopRightRadius:radius['2xl'], padding:space['2xl'], paddingBottom:Platform.OS==='ios'?40:28, borderTopWidth:1 },
  handle: { width:36, height:4, borderRadius:radius.full, alignSelf:'center', marginBottom:space.xl },
  sheetTitle: { fontSize:t.size.xl, fontWeight:t.weight.bold, marginBottom:space.xl },
  label: { fontSize:t.size.sm, fontWeight:t.weight.medium, marginBottom:space.sm },
  input: { borderRadius:radius.lg, paddingHorizontal:space.lg, paddingVertical:14, fontSize:t.size.base, borderWidth:1, marginBottom:space.md },
  ptRow: { flexDirection:'row', gap:space.sm, marginBottom:space.xl },
  ptOption: { flex:1, paddingVertical:10, borderRadius:radius.lg, borderWidth:1, alignItems:'center' },
  ptOptionText: { fontSize:t.size.base, fontWeight:t.weight.bold },
  actions: { flexDirection:'row', gap:space.md },
  btnSec: { flex:1, paddingVertical:14, borderRadius:radius.lg, alignItems:'center', borderWidth:1 },
  btnSecText: { fontSize:t.size.base, fontWeight:t.weight.medium },
  btnPri: { flex:2, paddingVertical:14, borderRadius:radius.lg, alignItems:'center' },
  btnPriText: { color:'#fff', fontSize:t.size.base, fontWeight:t.weight.semibold },
});
