import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Animated, Pressable, Modal, TouchableWithoutFeedback } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { space, radius, type as t } from '../constants/tokens';

const EMOJIS = ['😂', '🔥', '💀', '👏', '❤️', '🤡'];

type ReactionGroup = { emoji: string; count: number; iReacted: boolean };

type Props = {
  loreId: string;
  // Reactions iniziali dal fetch principale di lore (per evitare N+1 query)
  initialReactions?: { user_id: string; emoji: string }[];
};

/**
 * Reactions emoji su un post lore.
 * - Aggregazione locale: raggruppa per emoji, mostra contatore + se l'utente corrente ha reagito
 * - Toggle ottimistico: aggiorna subito la UI, poi sincronizza con DB
 * - Picker: tap sul pulsante "+" per scegliere tra le emoji disponibili
 */
export function LoreReactions({ loreId, initialReactions = [] }: Props) {
  const { user } = useAuth();
  const { c } = useTheme();
  const [reactions, setReactions] = useState(initialReactions);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Sincronizza con prop iniziale se cambia (refresh parent)
  useEffect(() => { setReactions(initialReactions); }, [JSON.stringify(initialReactions)]);

  // Aggrega le reactions per emoji
  const grouped: ReactionGroup[] = EMOJIS
    .map(emoji => {
      const matches = reactions.filter(r => r.emoji === emoji);
      return {
        emoji,
        count: matches.length,
        iReacted: matches.some(r => r.user_id === user?.id),
      };
    })
    .filter(g => g.count > 0); // mostra solo quelle con almeno una reaction

  const toggleReaction = async (emoji: string) => {
    if (!user) return;
    const already = reactions.find(r => r.emoji === emoji && r.user_id === user.id);

    if (already) {
      // Update ottimistico: rimuovo subito
      setReactions(prev => prev.filter(r => !(r.emoji === emoji && r.user_id === user.id)));
      const { error } = await supabase
        .from('lore_reactions')
        .delete()
        .eq('lore_id', loreId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
      // Se fallisce ripristino
      if (error) setReactions(prev => [...prev, { user_id: user.id, emoji }]);
    } else {
      setReactions(prev => [...prev, { user_id: user.id, emoji }]);
      const { error } = await supabase.from('lore_reactions').insert({ lore_id: loreId, user_id: user.id, emoji });
      if (error) setReactions(prev => prev.filter(r => !(r.emoji === emoji && r.user_id === user.id)));
    }
  };

  return (
    <>
      <View style={styles.row}>
        {grouped.map(g => (
          <TouchableOpacity
            key={g.emoji}
            style={[styles.chip, {
              backgroundColor: g.iReacted ? c.accentMuted : c.surface2,
              borderColor: g.iReacted ? c.accent : c.border,
            }]}
            onPress={() => toggleReaction(g.emoji)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{g.emoji}</Text>
            <Text style={[styles.count, { color: g.iReacted ? c.accent : c.textSub }]}>{g.count}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: c.surface2, borderColor: c.border }]}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 13, color: c.textHint }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Picker: piccolo modal centrato con la lista emoji */}
      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setPickerVisible(false)}>
          <View style={[styles.overlay, { backgroundColor: c.overlay }]}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={[styles.pickerCard, { backgroundColor: c.surface, borderColor: c.border }]}
            >
              {EMOJIS.map(emoji => {
                const already = reactions.some(r => r.emoji === emoji && r.user_id === user?.id);
                return (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.pickerItem, already && { backgroundColor: c.accentMuted }]}
                    onPress={() => { toggleReaction(emoji); setPickerVisible(false); }}
                  >
                    <Text style={styles.pickerEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1 },
  emoji: { fontSize: 14 },
  count: { fontSize: t.size.xs, fontWeight: t.weight.semibold },
  addBtn: { width: 28, height: 26, borderRadius: radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  pickerCard: { flexDirection: 'row', borderRadius: radius['2xl'], borderWidth: 1, padding: space.sm, gap: 4 },
  pickerItem: { padding: space.sm, borderRadius: radius.lg },
  pickerEmoji: { fontSize: 28 },
});
