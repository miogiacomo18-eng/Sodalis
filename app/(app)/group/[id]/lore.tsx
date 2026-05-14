import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useGlobalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { useMembers } from '../../../../hooks/useMembers';
import { LoreReactions } from '../../../../components/LoreReactions';
import { space, radius, type as t } from '../../../../constants/tokens';

type Reaction = { user_id: string; emoji: string };
type Post = {
  id: string; content: string; created_at: string; serata_id: string | null;
  author_id: string; author_username: string; serata_title: string | null;
  mentions: { user_id: string; display_name: string }[];
  reactions: Reaction[];
};

export default function LoreTab() {
  const { id: groupId } = useGlobalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { c } = useTheme();
  const { members } = useMembers(groupId);
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [content, setContent] = useState('');
  const [taggedIds, setTaggedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!groupId) return;
    // Fetch lore + tutte le relazioni in una query
    const { data, error } = await supabase.from('lore')
      .select(`id,content,created_at,serata_id,author_id,
               profiles!author_id(username),
               serate(title),
               lore_mentions(mentioned_user_id),
               lore_reactions(user_id, emoji)`)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    if (error) { Alert.alert('Errore', error.message); return; }
    setPosts((data ?? []).map((r: any) => ({
      id: r.id, content: r.content, created_at: r.created_at, serata_id: r.serata_id, author_id: r.author_id,
      author_username: r.profiles?.username ?? '?',
      serata_title: r.serate?.title ?? null,
      mentions: (r.lore_mentions ?? []).map((m: any) => ({
        user_id: m.mentioned_user_id,
        display_name: members.find(mm => mm.user_id === m.mentioned_user_id)?.display_name ?? '?',
      })),
      reactions: r.lore_reactions ?? [],
    })));
    setRefreshing(false);
  }, [groupId, members]);

  useEffect(() => { fetch(); }, [fetch]);

  const getName = (id: string, fb: string) => members.find(m => m.user_id === id)?.display_name ?? fb;

  const handleAdd = async () => {
    if (!content.trim()) { Alert.alert('Errore', 'Scrivi qualcosa!'); return; }
    if (!groupId) return;
    setLoading(true);
    const { data: ld, error } = await supabase.from('lore')
      .insert({ group_id: groupId, author_id: user!.id, content: content.trim() })
      .select('id').single();
    if (error || !ld) { setLoading(false); Alert.alert('Errore', error?.message); return; }
    if (taggedIds.length > 0) {
      await supabase.from('lore_mentions').insert(taggedIds.map(uid => ({ lore_id: ld.id, mentioned_user_id: uid })));
    }
    setLoading(false); setContent(''); setTaggedIds([]); setShowModal(false); fetch();
  };

  const handleDelete = (id: string) => Alert.alert('Elimina lore', 'Irreversibile.', [
    { text: 'Annulla', style: 'cancel' },
    { text: 'Elimina', style: 'destructive', onPress: async () => { await supabase.from('lore').delete().eq('id', id); fetch(); } },
  ]);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  const others = members.filter(m => m.user_id !== user?.id);

  const renderPost = ({ item }: { item: Post }) => {
    const name = getName(item.author_id, item.author_username);
    const isMine = item.author_id === user?.id;
    return (
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.cardHead}>
          <View style={[styles.avi, { backgroundColor: c.accentMuted }]}>
            <Text style={[styles.aviText, { color: c.accent }]}>{name[0]?.toUpperCase() ?? '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: c.text }]}>{name}</Text>
            <Text style={[styles.date, { color: c.textHint }]}>{fmt(item.created_at)}</Text>
          </View>
          {item.serata_title && (
            <View style={[styles.serBadge, { backgroundColor: c.surface2, borderColor: c.border }]}>
              <Text style={[styles.serText, { color: c.textSub }]}>🌙 {item.serata_title}</Text>
            </View>
          )}
          {isMine && (
            <TouchableOpacity onPress={() => handleDelete(item.id)} hitSlop={12} style={styles.del}>
              <Ionicons name="trash-outline" size={15} color={c.textHint} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.content, { color: c.text }]}>{item.content}</Text>
        {item.mentions.length > 0 && (
          <View style={styles.tags}>
            {item.mentions.map(m => (
              <View key={m.user_id} style={[styles.tag, { backgroundColor: c.accentMuted, borderColor: c.accent + '30' }]}>
                <Text style={[styles.tagText, { color: c.accentBright }]}>@{m.display_name}</Text>
              </View>
            ))}
          </View>
        )}
        <LoreReactions loreId={item.id} initialReactions={item.reactions} />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={posts} keyExtractor={i => i.id} renderItem={renderPost}
        contentContainerStyle={[styles.list, posts.length === 0 && { flex: 1 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={c.accent} colors={[c.accent]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={[styles.emptyTitle, { color: c.text }]}>Nessuna lore ancora</Text>
            <Text style={[styles.emptySub, { color: c.textSub }]}>Inizia a registrare i momenti epici del gruppo!</Text>
          </View>
        }
      />
      <TouchableOpacity style={[styles.fab, { backgroundColor: c.accent }]} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
          <View style={[styles.overlay, { backgroundColor: c.overlay }]} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ justifyContent: 'flex-end' }}>
          <View style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.handle, { backgroundColor: c.borderStrong }]} />
            <Text style={[styles.sheetTitle, { color: c.text }]}>Aggiungi Lore</Text>
            <Text style={[styles.sheetSub, { color: c.textSub }]}>Registra un momento epico o una citazione memorabile.</Text>
            <TextInput style={[styles.textarea, { backgroundColor: c.surface2, borderColor: c.border, color: c.text }]}
              placeholder={`"E poi Marco ha detto…"`} placeholderTextColor={c.textHint}
              value={content} onChangeText={setContent} multiline numberOfLines={4} maxLength={1000} autoFocus />
            <Text style={[styles.charCount, { color: c.textHint }]}>{content.length}/1000</Text>
            {others.length > 0 && (
              <View>
                <Text style={[styles.tagLabel, { color: c.textSub }]}>
                  Tagga persone <Text style={{ color: c.textHint, fontWeight: '400' }}>(opzionale)</Text>
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
                  {others.map(m => {
                    const active = taggedIds.includes(m.user_id);
                    return (
                      <TouchableOpacity key={m.user_id}
                        style={[styles.tagChip, { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accentMuted : c.surface2 }]}
                        onPress={() => setTaggedIds(prev => active ? prev.filter(id => id !== m.user_id) : [...prev, m.user_id])}>
                        {active && <Ionicons name="checkmark" size={12} color={c.accent} />}
                        <Text style={[styles.tagChipText, { color: active ? c.accent : c.textSub }]}>@{m.display_name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            <View style={[styles.actions, { marginTop: space.xl }]}>
              <Pressable style={[styles.btnSec, { backgroundColor: c.surface2, borderColor: c.border }]} onPress={() => setShowModal(false)}>
                <Text style={[styles.btnSecText, { color: c.textSub }]}>Annulla</Text>
              </Pressable>
              <Pressable style={[styles.btnPri, { backgroundColor: c.accent }, loading && { opacity: 0.6 }]} onPress={handleAdd} disabled={loading}>
                <Text style={styles.btnPriText}>{loading ? 'Salvataggio…' : 'Pubblica'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingBottom: 100 },
  card: { borderRadius: radius.xl, borderWidth: 1, padding: space.lg, marginBottom: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  avi: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  aviText: { fontWeight: t.weight.bold, fontSize: t.size.md },
  name: { fontSize: t.size.sm, fontWeight: t.weight.semibold },
  date: { fontSize: t.size.xs, marginTop: 1 },
  serBadge: { borderRadius: radius.full, borderWidth: 1, paddingHorizontal: space.sm, paddingVertical: 3 },
  serText: { fontSize: t.size.xs, fontWeight: t.weight.medium },
  del: { padding: space.xs },
  content: { fontSize: t.size.base, lineHeight: 22 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md },
  tag: { borderRadius: radius.md, borderWidth: 1, paddingHorizontal: space.sm, paddingVertical: 3 },
  tagText: { fontSize: t.size.xs, fontWeight: t.weight.semibold },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: space.md },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: t.size.lg, fontWeight: t.weight.semibold },
  emptySub: { fontSize: t.size.sm, textAlign: 'center' },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  overlay: { flex: 1 },
  sheet: { borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: space['2xl'], paddingBottom: Platform.OS === 'ios' ? 40 : 28, borderTopWidth: 1 },
  handle: { width: 36, height: 4, borderRadius: radius.full, alignSelf: 'center', marginBottom: space.xl },
  sheetTitle: { fontSize: t.size.xl, fontWeight: t.weight.bold, marginBottom: 4 },
  sheetSub: { fontSize: t.size.sm, marginBottom: space.xl, lineHeight: 20 },
  textarea: { borderRadius: radius.lg, padding: space.lg, fontSize: t.size.base, borderWidth: 1, minHeight: 120, textAlignVertical: 'top' },
  charCount: { fontSize: t.size.xs, textAlign: 'right', marginTop: space.xs, marginBottom: space.md },
  tagLabel: { fontSize: t.size.sm, fontWeight: t.weight.semibold, marginBottom: space.md },
  tagChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.full, borderWidth: 1 },
  tagChipText: { fontSize: t.size.xs, fontWeight: t.weight.semibold },
  actions: { flexDirection: 'row', gap: space.md },
  btnSec: { flex: 1, paddingVertical: 14, borderRadius: radius.lg, alignItems: 'center', borderWidth: 1 },
  btnSecText: { fontSize: t.size.base, fontWeight: t.weight.medium },
  btnPri: { flex: 2, paddingVertical: 14, borderRadius: radius.lg, alignItems: 'center' },
  btnPriText: { color: '#fff', fontSize: t.size.base, fontWeight: t.weight.semibold },
});
