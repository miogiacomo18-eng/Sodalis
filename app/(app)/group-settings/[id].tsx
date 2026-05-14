import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { supabase } from '../../../lib/supabase';
import { space, radius, type as t } from '../../../constants/tokens';

export default function GroupSettingsScreen() {
  const { id: groupId } = useGlobalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { c } = useTheme();
  const router = useRouter();

  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [nickname, setNickname] = useState('');
  const [origNick, setOrigNick] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!groupId || !user) return;
    Promise.all([
      supabase.from('groups').select('name,invite_code,created_by').eq('id',groupId).single(),
      supabase.from('group_members').select('nickname').eq('group_id',groupId).eq('user_id',user.id).single(),
    ]).then(([g, m]) => {
      if (g.data) { setGroupName(g.data.name); setInviteCode(g.data.invite_code); setCreatedBy(g.data.created_by); }
      const nick = m.data?.nickname ?? '';
      setNickname(nick); setOrigNick(nick);
    });
  }, [groupId, user?.id]);

  const isCreator = createdBy === user?.id;

  const saveNick = async () => {
    setSaving(true);
    const { error } = await supabase.from('group_members')
      .update({ nickname: nickname.trim() || null })
      .eq('group_id', groupId).eq('user_id', user!.id);
    setSaving(false);
    if (error) { Alert.alert('Errore', error.message); return; }
    setOrigNick(nickname.trim());
    Alert.alert('✓ Salvato');
  };

  const leaveGroup = () => Alert.alert('Esci dal gruppo', `Uscire da "${groupName}"?`,[
    {text:'Annulla',style:'cancel'},
    {text:'Esci',style:'destructive',onPress:async()=>{
      await supabase.from('group_members').delete().eq('group_id',groupId).eq('user_id',user!.id);
      router.replace('/(app)');
    }},
  ]);

  const deleteGroup = () => Alert.alert('⚠️ Elimina gruppo',
    `Stai per eliminare "${groupName}" e tutti i contenuti. Irreversibile.`,
    [{text:'Annulla',style:'cancel'},{text:'Elimina tutto',style:'destructive',onPress:async()=>{
      await supabase.from('groups').delete().eq('id',groupId);
      router.replace('/(app)');
    }}]);

  const nickChanged = nickname.trim() !== origNick;

  return (
    <KeyboardAvoidingView style={{ flex:1, backgroundColor: c.bg }} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Info gruppo */}
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Text style={[styles.groupName, { color: c.text }]}>{groupName}</Text>
          <View style={[styles.codePill, { backgroundColor: c.surface2, borderColor: c.border }]}>
            <Text style={[styles.codeLabel, { color: c.textSub }]}>Codice invito</Text>
            <Text style={[styles.codeValue, { color: c.text }]}>{inviteCode}</Text>
          </View>
        </View>

        {/* Categorie personalizzate */}
        <TouchableOpacity style={[styles.navRow, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => router.push({ pathname:'/(app)/group-categories/[id]', params:{ id: groupId } })}>
          <Ionicons name="trophy-outline" size={18} color={c.accent} />
          <Text style={[styles.navLabel, { color: c.text }]}>Categorie personalizzate Tribunale</Text>
          <Ionicons name="chevron-forward" size={16} color={c.textHint} />
        </TouchableOpacity>

        {/* Nickname */}
        <Text style={[styles.sectionLabel, { color: c.textHint }]}>IL TUO NICKNAME</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface2, borderColor: c.border, color: c.text }]}
            placeholder="Lascia vuoto per usare lo username"
            placeholderTextColor={c.textHint}
            value={nickname} onChangeText={setNickname} maxLength={30} autoCapitalize="none"
          />
          <Text style={[styles.hint, { color: c.textHint }]}>Visibile solo in questo gruppo.</Text>
          <Pressable style={[styles.btn, { backgroundColor: c.accent }, (!nickChanged || saving) && { opacity:0.4 }]}
            onPress={saveNick} disabled={!nickChanged || saving}>
            <Text style={styles.btnText}>{saving ? 'Salvataggio…' : 'Salva nickname'}</Text>
          </Pressable>
        </View>

        {/* Danger zone */}
        <Text style={[styles.sectionLabel, { color: c.danger+'88' }]}>ZONA PERICOLO</Text>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TouchableOpacity style={styles.dangerRow} onPress={leaveGroup}>
            <Ionicons name="exit-outline" size={18} color={c.warn} />
            <Text style={[styles.dangerLabel, { color: c.warn }]}>Esci dal gruppo</Text>
          </TouchableOpacity>
          {isCreator && (
            <>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <TouchableOpacity style={styles.dangerRow} onPress={deleteGroup}>
                <Ionicons name="trash-outline" size={18} color={c.danger} />
                <Text style={[styles.dangerLabel, { color: c.danger }]}>Elimina gruppo</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding:space.lg, paddingBottom:space['4xl'] },
  header: { alignItems:'center', paddingBottom:space.xl, marginBottom:space.xl, borderBottomWidth:1, gap:space.md },
  groupName: { fontSize:t.size['2xl'], fontWeight:t.weight.bold, letterSpacing:-0.3 },
  codePill: { flexDirection:'row', alignItems:'center', gap:space.sm, paddingHorizontal:space.md, paddingVertical:space.sm, borderRadius:radius.full, borderWidth:1 },
  codeLabel: { fontSize:t.size.sm },
  codeValue: { fontSize:t.size.sm, fontWeight:t.weight.bold, fontFamily:Platform.OS==='ios'?'Menlo':'monospace', letterSpacing:1 },
  navRow: { flexDirection:'row', alignItems:'center', gap:space.md, padding:space.lg, borderRadius:radius.xl, borderWidth:1, marginBottom:space.xl },
  navLabel: { flex:1, fontSize:t.size.base, fontWeight:t.weight.medium },
  sectionLabel: { fontSize:t.size.xs, fontWeight:t.weight.bold, letterSpacing:0.8, marginBottom:space.sm, marginLeft:4 },
  card: { borderRadius:radius.xl, borderWidth:1, padding:space.lg, marginBottom:space.xl },
  input: { borderRadius:radius.lg, paddingHorizontal:space.lg, paddingVertical:14, fontSize:t.size.base, borderWidth:1 },
  hint: { fontSize:t.size.xs, marginTop:space.sm, lineHeight:16 },
  btn: { borderRadius:radius.lg, paddingVertical:12, alignItems:'center', marginTop:space.md },
  btnText: { color:'#fff', fontWeight:t.weight.semibold, fontSize:t.size.sm },
  dangerRow: { flexDirection:'row', alignItems:'center', gap:space.md, paddingVertical:space.md },
  dangerLabel: { fontSize:t.size.base, fontWeight:t.weight.medium },
  divider: { height:1, marginVertical:space.xs },
});
