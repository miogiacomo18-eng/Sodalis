import {
  Animated, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  RefreshControl, Share, StyleSheet, Text, TextInput, TouchableOpacity,
  TouchableWithoutFeedback, View, Alert,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { space, radius, type as t } from '../../constants/tokens';

type Group = { id: string; name: string; description: string | null; member_count: number; invite_code: string; created_by: string };

function useGroups(userId?: string) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('group_members')
      .select('groups(id,name,description,invite_code,created_by,member_count:group_members(count))')
      .eq('user_id', userId);
    if (!error) {
      setGroups((data ?? []).map((r: any) => {
        const g = r.groups; if (!g) return null;
        return { id:g.id, name:g.name, description:g.description, invite_code:g.invite_code,
                 created_by:g.created_by, member_count:g.member_count?.[0]?.count ?? 0 };
      }).filter(Boolean) as Group[]);
    }
    setLoading(false); setRefreshing(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { groups, loading, refreshing, refresh: () => { setRefreshing(true); fetch(); }, refetch: fetch };
}

const ACCENT_COLORS = ['#7c3aed','#ef4444','#14b8a6','#f59e0b','#8b5cf6','#06b6d4'];

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const { c } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const color = ACCENT_COLORS[group.id.charCodeAt(0) % ACCENT_COLORS.length];
  const initials = group.name.split(' ').slice(0,2).map(w => w[0]?.toUpperCase() ?? '').join('');

  const handleShare = async () => {
    await Share.share({ message: `Unisciti al gruppo "${group.name}" su Sodalis! Codice: ${group.invite_code}` });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => Animated.spring(scale,{toValue:0.98,useNativeDriver:true,speed:40}).start()}
      onPressOut={() => Animated.spring(scale,{toValue:1,useNativeDriver:true,speed:40}).start()}
    >
      <Animated.View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, transform:[{scale}] }]}>
        <View style={[styles.cardLeft, { backgroundColor: color+'18', borderRightColor: c.border }]}>
          <View style={[styles.cardAvatar, { backgroundColor: color+'25' }]}>
            <Text style={[styles.cardInitials, { color }]}>{initials}</Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <Text style={[styles.cardName, { color: c.text }]} numberOfLines={1}>{group.name}</Text>
          <Text style={[styles.cardDesc, { color: c.textSub }]} numberOfLines={1}>
            {group.description ?? 'Nessuna descrizione'}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={[styles.cardMetaText, { color: c.textHint }]}>
              👥 {group.member_count} · #{group.invite_code}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={handleShare} hitSlop={8} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={18} color={c.textSub} />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={16} color={c.textHint} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

function EmptyState({ c }: { c: any }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: c.surface2 }]}>
        <Text style={{ fontSize: 32 }}>🏕️</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: c.text }]}>Nessun gruppo</Text>
      <Text style={[styles.emptySub, { color: c.textSub }]}>
        Crea un gruppo o unisciti a uno esistente usando il bottone qui sotto.
      </Text>
    </View>
  );
}

// ── Modale generica bottom sheet ─────────────────────────────────────────────
function Sheet({ visible, onClose, title, subtitle, children }: any) {
  const { c } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={[styles.overlay, { backgroundColor: c.overlay }]} /></TouchableWithoutFeedback>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ justifyContent: 'flex-end' }}>
        <View style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
          {title && <Text style={[styles.sheetTitle, { color: c.text }]}>{title}</Text>}
          {subtitle && <Text style={[styles.sheetSub, { color: c.textSub }]}>{subtitle}</Text>}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CreateModal({ visible, onClose, onCreated, userId }: any) {
  const { c } = useTheme();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!name.trim()) { Alert.alert('Nome mancante'); return; }
    setLoading(true);
    const { error } = await supabase.from('groups').insert({ name:name.trim(), description:desc.trim()||null, created_by:userId, invite_code:'' });
    setLoading(false);
    if (error) { Alert.alert('Errore', error.message); return; }
    setName(''); setDesc(''); onClose(); onCreated();
  };

  const inp = [styles.input, { backgroundColor: c.surface2, borderColor: c.border, color: c.text }];

  return (
    <Sheet visible={visible} onClose={onClose} title="Nuovo gruppo"
      subtitle="Il codice invito viene generato automaticamente.">
      <Text style={[styles.fieldLabel, { color: c.textSub }]}>Nome *</Text>
      <TextInput style={inp} placeholder="Es. I Fantastici 5" placeholderTextColor={c.textHint}
        value={name} onChangeText={setName} maxLength={50} autoFocus />
      <Text style={[styles.fieldLabel, { color: c.textSub }]}>Descrizione (opzionale)</Text>
      <TextInput style={[...inp, { minHeight: 72, textAlignVertical: 'top' }]}
        placeholder="Di cosa tratta?" placeholderTextColor={c.textHint}
        value={desc} onChangeText={setDesc} maxLength={200} multiline />
      <View style={styles.row}>
        <Pressable style={[styles.btnSec, { backgroundColor: c.surface2, borderColor: c.border }]} onPress={onClose}>
          <Text style={[styles.btnSecText, { color: c.textSub }]}>Annulla</Text>
        </Pressable>
        <Pressable style={[styles.btnPri, { backgroundColor: c.accent }, loading && { opacity: 0.6 }]}
          onPress={handle} disabled={loading}>
          <Text style={styles.btnPriText}>{loading ? 'Creazione…' : 'Crea'}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function JoinModal({ visible, onClose, onJoined }: any) {
  const { c } = useTheme();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (code.trim().length < 6) { Alert.alert('Codice non valido'); return; }
    setLoading(true);
    const { error } = await supabase.rpc('join_group_by_code', { _code: code.trim().toUpperCase() });
    setLoading(false);
    if (error) { Alert.alert('Errore', error.message); return; }
    setCode(''); onClose(); onJoined();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Unisciti a un gruppo"
      subtitle="Chiedi il codice di 6 caratteri a chi è già dentro.">
      <TextInput
        style={[styles.codeInput, { backgroundColor: c.surface2, borderColor: c.border, color: c.text }]}
        placeholder="AB1C2D" placeholderTextColor={c.textHint}
        value={code} onChangeText={v => setCode(v.toUpperCase())} maxLength={6}
        autoCapitalize="characters" autoCorrect={false} autoFocus
      />
      <View style={styles.row}>
        <Pressable style={[styles.btnSec, { backgroundColor: c.surface2, borderColor: c.border }]} onPress={onClose}>
          <Text style={[styles.btnSecText, { color: c.textSub }]}>Annulla</Text>
        </Pressable>
        <Pressable style={[styles.btnPri, { backgroundColor: c.teal }, loading && { opacity: 0.6 }]}
          onPress={handle} disabled={loading}>
          <Text style={styles.btnPriText}>{loading ? '…' : 'Unisciti'}</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

function FAB({ onNew, onJoin }: { onNew:()=>void; onJoin:()=>void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const toggle = () => {
    Animated.spring(anim, { toValue: open?0:1, useNativeDriver:true, speed:20, bounciness:8 }).start();
    setOpen(o => !o);
  };
  const close = () => { Animated.spring(anim,{toValue:0,useNativeDriver:true,speed:20}).start(); setOpen(false); };
  const rot = anim.interpolate({ inputRange:[0,1], outputRange:['0deg','45deg'] });
  const op  = anim.interpolate({ inputRange:[0,.5,1], outputRange:[0,0,1] });
  const sc  = anim.interpolate({ inputRange:[0,1], outputRange:[.6,1] });

  return (
    <>
      {open && <TouchableWithoutFeedback onPress={close}><View style={StyleSheet.absoluteFill} /></TouchableWithoutFeedback>}
      <View style={styles.fabWrap} pointerEvents="box-none">
        {[{ label:'Nuovo gruppo', color:c.accent, action:onNew }, { label:'Unisciti', color:c.teal, action:onJoin }].map((item, i) => (
          <Animated.View key={i}
            style={[styles.fabRow, { opacity:op, transform:[{scale:sc}], marginBottom: i===0 ? 12 : 14 }]}
            pointerEvents={open?'auto':'none'}>
            <View style={[styles.fabLabel, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.fabLabelText, { color: c.text }]}>{item.label}</Text>
            </View>
            <TouchableOpacity style={[styles.fabSec, { backgroundColor: item.color }]}
              onPress={() => { close(); item.action(); }}>
              <Ionicons name={i===0?'add':'key'} size={20} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        ))}
        <TouchableOpacity style={[styles.fabMain, { backgroundColor: c.accent }]} onPress={toggle} activeOpacity={0.85}>
          <Animated.Text style={[styles.fabIcon, { transform:[{rotate:rot}] }]}>+</Animated.Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { c } = useTheme();
  const router = useRouter();
  const { groups, refreshing, refresh, refetch } = useGroups(user?.id);
  const [showNew, setShowNew] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  return (
    <View style={{ flex:1, backgroundColor: c.bg }}>
      <Stack.Screen options={{
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push('/(app)/profile')}
            hitSlop={8} style={styles.headerBtn}>
            <Ionicons name="person-circle-outline" size={26} color={c.text} />
          </TouchableOpacity>
        ),
      }} />
      <FlatList
        data={groups}
        keyExtractor={g => g.id}
        renderItem={({ item }) => <GroupCard group={item} onPress={() => router.push(`/(app)/group/${item.id}/lore`)} />}
        contentContainerStyle={[styles.list, groups.length === 0 && { flex:1 }]}
        ListEmptyComponent={<EmptyState c={c} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} />}
        ListHeaderComponent={groups.length > 0 ? (
          <Text style={[styles.listHeader, { color: c.textHint }]}>GRUPPI ({groups.length})</Text>
        ) : null}
      />
      <FAB onNew={() => setShowNew(true)} onJoin={() => setShowJoin(true)} />
      <CreateModal visible={showNew} onClose={() => setShowNew(false)} onCreated={refetch} userId={user?.id ?? ''} />
      <JoinModal visible={showJoin} onClose={() => setShowJoin(false)} onJoined={refetch} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerBtn: { width:40, height:40, alignItems:'center', justifyContent:'center', marginRight:4 },
  list: { padding:space.lg, paddingBottom:140 },
  listHeader: { fontSize:t.size.xs, fontWeight:t.weight.bold, letterSpacing:0.8, marginBottom:space.md },
  card: { borderRadius:radius.xl, borderWidth:1, marginBottom:space.md, flexDirection:'row', overflow:'hidden' },
  cardLeft: { width:64, alignItems:'center', justifyContent:'center', borderRightWidth:1 },
  cardAvatar: { width:40, height:40, borderRadius:radius.xl, alignItems:'center', justifyContent:'center' },
  cardInitials: { fontWeight:t.weight.bold, fontSize:t.size.md },
  cardBody: { flex:1, padding:space.md, gap:3 },
  cardName: { fontSize:t.size.base, fontWeight:t.weight.semibold },
  cardDesc: { fontSize:t.size.sm },
  cardMeta: { marginTop:space.xs },
  cardMetaText: { fontSize:t.size.xs },
  cardActions: { paddingRight:space.md, alignItems:'center', justifyContent:'center', gap:space.sm, flexDirection:'row' },
  shareBtn: { padding:4 },
  empty: { flex:1, justifyContent:'center', alignItems:'center', gap:space.md, padding:space['3xl'] },
  emptyIcon: { width:72, height:72, borderRadius:radius['2xl'], alignItems:'center', justifyContent:'center' },
  emptyTitle: { fontSize:t.size.lg, fontWeight:t.weight.semibold },
  emptySub: { fontSize:t.size.sm, textAlign:'center', lineHeight:20 },
  overlay: { flex:1 },
  sheet: { borderTopLeftRadius:radius['2xl'], borderTopRightRadius:radius['2xl'], padding:space['2xl'], paddingBottom:Platform.OS==='ios'?40:28, borderTopWidth:1 },
  handle: { width:36, height:4, borderRadius:radius.full, alignSelf:'center', marginBottom:space.xl },
  sheetTitle: { fontSize:t.size.xl, fontWeight:t.weight.bold, marginBottom:4, letterSpacing:-0.3 },
  sheetSub: { fontSize:t.size.sm, marginBottom:space.xl, lineHeight:20 },
  fieldLabel: { fontSize:t.size.sm, fontWeight:t.weight.medium, marginBottom:6 },
  input: { borderRadius:radius.lg, paddingHorizontal:space.lg, paddingVertical:14, fontSize:t.size.base, borderWidth:1, marginBottom:space.md },
  codeInput: { borderRadius:radius.lg, paddingHorizontal:space.lg, paddingVertical:18, fontSize:28, borderWidth:1, marginBottom:space.xl, fontFamily:Platform.OS==='ios'?'Menlo':'monospace', letterSpacing:10, textAlign:'center' },
  row: { flexDirection:'row', gap:space.md },
  btnSec: { flex:1, paddingVertical:14, borderRadius:radius.lg, alignItems:'center', borderWidth:1 },
  btnSecText: { fontSize:t.size.base, fontWeight:t.weight.medium },
  btnPri: { flex:2, paddingVertical:14, borderRadius:radius.lg, alignItems:'center' },
  btnPriText: { color:'#fff', fontSize:t.size.base, fontWeight:t.weight.semibold },
  fabWrap: { position:'absolute', bottom:32, left:0, right:0, paddingRight:space['2xl'], alignItems:'flex-end' },
  fabRow: { flexDirection:'row', alignItems:'center', gap:space.md },
  fabLabel: { borderRadius:radius['2xl'], paddingHorizontal:space.lg, paddingVertical:space.sm, borderWidth:1 },
  fabLabelText: { fontSize:t.size.sm, fontWeight:t.weight.semibold },
  fabMain: { width:56, height:56, borderRadius:28, justifyContent:'center', alignItems:'center', shadowColor:'#7c3aed', shadowOffset:{width:0,height:6}, shadowOpacity:0.4, shadowRadius:12, elevation:10 },
  fabIcon: { fontSize:28, color:'#fff', lineHeight:32, fontWeight:'300' },
  fabSec: { width:44, height:44, borderRadius:22, justifyContent:'center', alignItems:'center', elevation:6 },
});
