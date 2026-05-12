// app/(app)/groups/[id]/events/[eventId]/index.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useEvent, useLoreByEvent, useSocialActionsByEvent,
  useOpenTribunal, useGroupMembers,
} from '../../../../../../hooks';
import { useAuthStore } from '../../../../../../store';
import {
  Card, SectionHeader, LoadingSpinner, ErrorState, Button, Divider,
} from '../../../../../../components/ui';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../../../../../constants/theme';
import { formatEventDate, formatRelative } from '../../../../../../utils';

export default function EventDetailScreen() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const router  = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const { data: event,   isLoading: evLoad,  isError: evErr, refetch: refetchEvent }   = useEvent(eventId);
  const { data: lore,    isLoading: loreLoad, refetch: refetchLore    } = useLoreByEvent(eventId);
  const { data: actions, isLoading: actLoad,  refetch: refetchActions } = useSocialActionsByEvent(eventId);
  const { data: members } = useGroupMembers(id);
  const openTribunal = useOpenTribunal();

  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchEvent(), refetchLore(), refetchActions()]);
    setRefreshing(false);
  }

  const isLoading = evLoad || loreLoad || actLoad;
  if (isLoading) return <LoadingSpinner full />;
  if (evErr || !event) return <ErrorState onRetry={refetchEvent} />;

  const isMember = !!members?.find((m) => m.profile_id === profile?.id);

  async function handleOpenTribunal() {
    Alert.alert(
      'Apri il Tribunale',
      'Vuoi aprire le votazioni per questa serata?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Apri',
          onPress: async () => {
            try {
              await openTribunal.mutateAsync(eventId);
              await refetchEvent();
              router.push(`/(app)/groups/${id}/events/${eventId}/tribunal`);
            } catch {
              Alert.alert('Errore', 'Impossibile aprire il tribunale.');
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Serate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.event_name}>{event.name}</Text>
        <Text style={styles.event_date}>{formatEventDate(event.event_date)}</Text>
        {event.location && <Text style={styles.event_loc}>📍 {event.location}</Text>}
      </View>

      {/* Tribunal CTA */}
      <View style={styles.tribunal_section}>
        {!event.tribunal_open && !event.tribunal_closed && isMember && (
          <Card style={styles.tribunal_card}>
            <Text style={styles.tribunal_title}>⚖️ Tribunale del Sabato</Text>
            <Text style={styles.tribunal_sub}>
              Apri le votazioni per eleggere MVP, peggior scusa, e gli altri verdetti.
            </Text>
            <Button
              title="Apri il Tribunale"
              onPress={handleOpenTribunal}
              loading={openTribunal.isPending}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        )}
        {event.tribunal_open && !event.tribunal_closed && (
          <Card style={[styles.tribunal_card, { borderColor: Colors.warning + '44' }]}>
            <Text style={styles.tribunal_title}>⚖️ Votazioni aperte</Text>
            <Text style={styles.tribunal_sub}>I membri stanno votando. Partecipa anche tu.</Text>
            <Button
              title="Vai al Tribunale"
              onPress={() => router.push(`/(app)/groups/${id}/events/${eventId}/tribunal`)}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        )}
        {event.tribunal_closed && (
          <Card style={[styles.tribunal_card, { borderColor: Colors.success + '44' }]}>
            <Text style={styles.tribunal_title}>⚖️ Verdetti emessi</Text>
            <Text style={styles.tribunal_sub}>Il tribunale ha parlato.</Text>
            <Button
              title="Vedi i risultati"
              onPress={() => router.push(`/(app)/groups/${id}/events/${eventId}/tribunal/results`)}
              variant="secondary"
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        )}
      </View>

      <Divider />

      {/* Lore */}
      <View style={styles.section}>
        <SectionHeader
          title="Lore di questa serata"
          action={{
            label: '+ Aggiungi',
            onPress: () => router.push({ pathname: `/(app)/groups/${id}/lore/new`, params: { eventId } }),
          }}
        />
        {(lore?.length ?? 0) === 0 ? (
          <Text style={styles.empty_hint}>Nessun momento memorabile ancora.</Text>
        ) : (
          lore!.map((entry) => (
            <Card key={entry.id} style={styles.lore_card}>
              <View style={styles.lore_row}>
                <Text style={styles.lore_icon}>
                  {entry.type === 'quote' ? '💬' : entry.type === 'photo' ? '📸' : '📝'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lore_title}>{entry.title}</Text>
                  <Text style={styles.lore_content} numberOfLines={3}>{entry.content}</Text>
                  <Text style={styles.lore_meta}>
                    {entry.author?.display_name} · {formatRelative(entry.created_at)}
                  </Text>
                  {(entry.reactions?.length ?? 0) > 0 && (
                    <View style={styles.reactions}>
                      {Object.entries(
                        entry.reactions!.reduce<Record<string, number>>((acc, r) => {
                          acc[r.emoji] = (acc[r.emoji] ?? 0) + 1; return acc;
                        }, {})
                      ).map(([emoji, count]) => (
                        <View key={emoji} style={styles.reaction_pill}>
                          <Text style={styles.reaction_text}>{emoji} {count}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </Card>
          ))
        )}
      </View>

      <Divider />

      {/* Debiti */}
      <View style={styles.section}>
        <SectionHeader
          title="Gesti sociali"
          action={{
            label: '+ Aggiungi',
            onPress: () => router.push({ pathname: `/(app)/groups/${id}/debts`, params: { eventId } }),
          }}
        />
        {(actions?.length ?? 0) === 0 ? (
          <Text style={styles.empty_hint}>Nessun gesto registrato per questa serata.</Text>
        ) : (
          actions!.map((action) => {
            const toNames = action.to_profile_ids
              .map((pid) => members?.find((m) => m.profile_id === pid)?.profile?.display_name ?? '?')
              .join(', ');
            return (
              <Card key={action.id} style={styles.debt_card}>
                <Text style={styles.debt_text}>
                  {action.action_type?.emoji}{' '}
                  <Text style={styles.debt_bold}>{action.from_profile?.display_name}</Text>
                  {' '}{action.action_type?.label}{' per '}
                  <Text style={styles.debt_bold}>{toNames}</Text>
                </Text>
                {action.note && <Text style={styles.debt_note}>"{action.note}"</Text>}
              </Card>
            );
          })
        )}
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  content:          { padding: Spacing.lg, paddingTop: 60 },
  nav:              { marginBottom: Spacing.md },
  back:             { fontSize: FontSize.lg, color: Colors.primary },
  header:           { marginBottom: Spacing.lg },
  event_name:       { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  event_date:       { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: 4 },
  event_loc:        { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2 },
  tribunal_section: { marginBottom: Spacing.lg },
  tribunal_card:    {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.primaryDim,
  },
  tribunal_title:   { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  tribunal_sub:     { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },
  section:          { marginBottom: Spacing.lg },
  empty_hint:       { fontSize: FontSize.sm, color: Colors.textTertiary, fontStyle: 'italic', padding: Spacing.sm },
  lore_card:        { marginBottom: Spacing.sm },
  lore_row:         { flexDirection: 'row', gap: Spacing.sm },
  lore_icon:        { fontSize: 20, marginTop: 2 },
  lore_title:       { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  lore_content:     { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2, lineHeight: 20 },
  lore_meta:        { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: Spacing.xs },
  reactions:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  reaction_pill:    { backgroundColor: Colors.surfaceHigh, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  reaction_text:    { fontSize: FontSize.xs, color: Colors.textSecondary },
  debt_card:        { marginBottom: Spacing.sm },
  debt_text:        { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },
  debt_bold:        { color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  debt_note:        { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: Spacing.xs, fontStyle: 'italic' },
});