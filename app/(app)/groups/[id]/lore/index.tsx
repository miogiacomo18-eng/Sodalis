// app/(app)/groups/[id]/lore/index.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  useLoreEntries, useDeleteLore, useToggleReaction,
} from '../../../../../hooks';
import { useAuthStore } from '../../../../../store';
import {
  Card, EmptyState, ErrorState, FAB,
} from '../../../../../components/ui';
import { SkeletonList } from '../../../../../components/ui/SkeletonLoader';
import { Colors, Spacing, FontSize, FontWeight, Radius, LORE_EMOJIS } from '../../../../../constants/theme';
import { formatRelative } from '../../../../../utils';
import type { LoreEntry } from '../../../../../types';

export default function LoreScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const { data: entries, isLoading, isError, error, refetch } = useLoreEntries(id);
  const deleteLore     = useDeleteLore();
  const toggleReaction = useToggleReaction();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  if (isLoading) return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📖 Lore</Text>
        <Text style={styles.subtitle}>I momenti che non si dimenticano</Text>
      </View>
      <SkeletonList count={4} />
    </View>
  );
  if (isError)   return <ErrorState onRetry={refetch} error={error} />;

  function handleDelete(entry: LoreEntry) {
    if (entry.author_id !== profile?.id) return;
    Alert.alert(
      'Cancella lore',
      `Vuoi davvero cancellare "${entry.title}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            deleteLore.mutate({ loreId: entry.id, groupId: id });
          },
        },
      ]
    );
  }

  function handleReaction(entryId: string, emoji: string) {
    if (!profile) return;
    Haptics.selectionAsync();
    toggleReaction.mutate({ loreEntryId: entryId, profileId: profile.id, emoji, groupId: id });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📖 Lore</Text>
        <Text style={styles.subtitle}>I momenti che non si dimenticano</Text>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e: LoreEntry) => e.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            emoji="📖"
            title="Il libro è vuoto"
            subtitle="Aggiungi il primo momento iconico del gruppo."
            action={{ label: '+ Aggiungi lore', onPress: () => router.push(`/(app)/groups/${id}/lore/new`) }}
          />
        }
        renderItem={({ item }: { item: LoreEntry }) => {
          const reactionCounts = (item.reactions ?? []).reduce<Record<string, number>>(
            (acc, r) => { acc[r.emoji] = (acc[r.emoji] ?? 0) + 1; return acc; }, {}
          );
          const myReactions = new Set(
            (item.reactions ?? []).filter((r) => r.profile_id === profile?.id).map((r) => r.emoji)
          );
          const isPhoto    = item.type === 'photo';
          const photoUrl   = isPhoto && item.content.startsWith('http') ? item.content : null;

          return (
            <Card style={styles.entry_card}>
              {/* Header card */}
              <View style={styles.entry_header}>
                <View style={styles.type_badge}>
                  <Text style={styles.type_icon}>
                    {item.type === 'quote' ? '💬' : item.type === 'photo' ? '📸' : '📝'}
                  </Text>
                  <Text style={styles.type_label}>{item.type}</Text>
                </View>
                {item.author_id === profile?.id && (
                  <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.delete_btn}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Titolo */}
              <Text style={styles.entry_title}>{item.title}</Text>

              {/* Contenuto: foto o testo */}
              {photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.entry_photo}
                  resizeMode="cover"
                />
              ) : (
                <Text style={[
                  styles.entry_content,
                  item.type === 'quote' && styles.entry_quote,
                ]}>
                  {item.type === 'quote' ? `"${item.content}"` : item.content}
                </Text>
              )}

              {/* Meta */}
              <View style={styles.entry_meta}>
                <Text style={styles.meta_author}>{item.author?.display_name}</Text>
                {item.event && <Text style={styles.meta_event}>· {item.event.name}</Text>}
                <Text style={styles.meta_time}>{formatRelative(item.created_at)}</Text>
              </View>

              {/* Reazioni */}
              <View style={styles.reactions_row}>
                {Object.entries(reactionCounts).map(([emoji, count]) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.reaction_chip, myReactions.has(emoji) && styles.reaction_chip_active]}
                    onPress={() => handleReaction(item.id, emoji)}
                  >
                    <Text style={styles.reaction_chip_text}>{emoji} {count}</Text>
                  </TouchableOpacity>
                ))}
                {LORE_EMOJIS.filter((e) => !reactionCounts[e]).slice(0, 4).map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.reaction_add}
                    onPress={() => handleReaction(item.id, emoji)}
                  >
                    <Text style={styles.reaction_add_text}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>
          );
        }}
      />

      <FAB onPress={() => router.push(`/(app)/groups/${id}/lore/new`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  header:     { padding: Spacing.lg, paddingTop: 60 },
  title:      { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle:   { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  list:       { padding: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 100 },
  entry_card: { marginBottom: Spacing.md },
  entry_header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: Spacing.sm,
  },
  type_badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceHigh, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
  },
  type_icon:  { fontSize: 12 },
  type_label: { fontSize: FontSize.xs, color: Colors.textTertiary, textTransform: 'uppercase' },
  delete_btn: { fontSize: FontSize.sm, color: Colors.textTertiary, padding: Spacing.xs },

  entry_title:  {
    fontSize: FontSize.lg, fontWeight: FontWeight.bold,
    color: Colors.textPrimary, marginBottom: Spacing.xs,
  },
  entry_content: {
    fontSize: FontSize.md, color: Colors.textSecondary,
    lineHeight: 22, marginBottom: Spacing.sm,
  },
  entry_quote: {
    fontStyle: 'italic',
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingLeft: Spacing.sm,
  },
  entry_photo: {
    width: '100%', height: 200,
    borderRadius: Radius.md, marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceHigh,
  },

  entry_meta: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
    marginBottom: Spacing.sm, flexWrap: 'wrap',
  },
  meta_author:  { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.medium },
  meta_event:   { fontSize: FontSize.xs, color: Colors.textTertiary },
  meta_time:    { fontSize: FontSize.xs, color: Colors.textTertiary },

  reactions_row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reaction_chip: {
    backgroundColor: Colors.surfaceHigh, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  reaction_chip_active: { borderColor: Colors.primary, backgroundColor: Colors.primaryDim },
  reaction_chip_text:   { fontSize: FontSize.sm },
  reaction_add: {
    backgroundColor: Colors.surfaceHigh, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.border, opacity: 0.6,
  },
  reaction_add_text: { fontSize: FontSize.sm },
});
