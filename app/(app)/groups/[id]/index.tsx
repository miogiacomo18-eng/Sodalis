// app/(app)/groups/[id]/index.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useEvents, useLoreEntries, useSocialActions, useGroupMembers,
} from '../../../../hooks';
import { useAuthStore, useGroupStore } from '../../../../store';
import { Card, SectionHeader, LoadingSpinner, Avatar } from '../../../../components/ui';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../../../constants/theme';
import { formatEventDate, formatRelative, truncate } from '../../../../utils';

export default function GroupHomeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const group   = useGroupStore((s) => s.activeGroup);
  const profile = useAuthStore((s) => s.profile);

  const { data: events,        isLoading: evLoading,   refetch: refetchEv   } = useEvents(id);
  const { data: loreEntries,   isLoading: loreLoading, refetch: refetchLore } = useLoreEntries(id);
  const { data: socialActions, isLoading: debtLoading, refetch: refetchDebt } = useSocialActions(id);
  const { data: members,                               refetch: refetchMem  } = useGroupMembers(id);

  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchEv(), refetchLore(), refetchDebt(), refetchMem()]);
    setRefreshing(false);
  }

  const isLoading = evLoading || loreLoading || debtLoading;
  if (isLoading || !group) return <LoadingSpinner full />;

  const latestEvent   = events?.[0];
  const recentLore    = loreEntries?.slice(0, 3) ?? [];
  const recentActions = socialActions?.slice(0, 3) ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.header_top}>
          <View style={[styles.group_badge, { backgroundColor: group.color_hex + '22' }]}>
            <Text style={styles.group_emoji}>{group.emoji}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push(`/(app)/groups/${id}/settings`)}>
            <Text style={styles.settings_icon}>⚙️</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.group_name}>{group.name}</Text>
        <TouchableOpacity onPress={() => router.push(`/(app)/groups/${id}/members`)}>
          <Text style={styles.members_count}>{members?.length ?? 0} membri →</Text>
        </TouchableOpacity>
      </View>

      {/* Ultima serata */}
      <View style={styles.section}>
        <SectionHeader
          title="Ultima serata"
          action={latestEvent ? {
            label: 'Tutte',
            onPress: () => router.push(`/(app)/groups/${id}/events`),
          } : undefined}
        />
        {latestEvent ? (
          <Card onPress={() => router.push(`/(app)/groups/${id}/events/${latestEvent.id}`)}>
            <Text style={styles.event_name}>{latestEvent.name}</Text>
            <Text style={styles.event_date}>{formatEventDate(latestEvent.event_date)}</Text>
            {latestEvent.location && <Text style={styles.event_location}>📍 {latestEvent.location}</Text>}
            {latestEvent.tribunal_closed && <Text style={styles.tribunal_badge}>⚖️ Verdetti emessi</Text>}
            {latestEvent.tribunal_open && !latestEvent.tribunal_closed && (
              <Text style={[styles.tribunal_badge, { color: Colors.warning }]}>⚖️ Votazioni aperte</Text>
            )}
          </Card>
        ) : (
          <Card onPress={() => router.push(`/(app)/groups/${id}/events/new`)}>
            <Text style={styles.empty_hint}>+ Crea la prima serata</Text>
          </Card>
        )}
      </View>

      {/* Ultimi lore */}
      <View style={styles.section}>
        <SectionHeader
          title="Lore recente"
          action={{ label: 'Tutto', onPress: () => router.push(`/(app)/groups/${id}/lore`) }}
        />
        {recentLore.length > 0 ? (
          recentLore.map((entry) => (
            <Card key={entry.id} style={styles.lore_card}>
              <View style={styles.lore_header}>
                <Text style={styles.lore_type}>
                  {entry.type === 'quote' ? '💬' : entry.type === 'photo' ? '📸' : '📝'}
                </Text>
                <Text style={styles.lore_title}>{entry.title}</Text>
              </View>
              <Text style={styles.lore_content} numberOfLines={2}>
                {truncate(entry.content, 100)}
              </Text>
              <Text style={styles.lore_meta}>
                {entry.author?.display_name} · {formatRelative(entry.created_at)}
              </Text>
            </Card>
          ))
        ) : (
          <Card onPress={() => router.push(`/(app)/groups/${id}/lore/new`)}>
            <Text style={styles.empty_hint}>+ Aggiungi il primo momento iconico</Text>
          </Card>
        )}
      </View>

      {/* Ultimi debiti */}
      <View style={styles.section}>
        <SectionHeader
          title="Debiti recenti"
          action={{ label: 'Tutti', onPress: () => router.push(`/(app)/groups/${id}/debts`) }}
        />
        {recentActions.length > 0 ? (
          recentActions.map((action) => {
            const toNames = action.to_profile_ids
              .map((pid) => members?.find((m) => m.profile_id === pid)?.profile?.display_name ?? '?')
              .join(', ');
            return (
              <Card key={action.id} style={styles.debt_card}>
                <Text style={styles.debt_text}>
                  <Text style={styles.debt_highlight}>{action.from_profile?.display_name}</Text>
                  {' '}{action.action_type?.label}{' '}
                  <Text style={styles.debt_highlight}>{toNames}</Text>
                </Text>
                {action.note && <Text style={styles.debt_note}>{action.note}</Text>}
              </Card>
            );
          })
        ) : (
          <Card onPress={() => router.push(`/(app)/groups/${id}/debts`)}>
            <Text style={styles.empty_hint}>+ Registra un gesto sociale</Text>
          </Card>
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  content:         { padding: Spacing.lg, paddingTop: 60 },
  header:          { marginBottom: Spacing.xl },
  header_top:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  group_badge:     { width: 56, height: 56, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  group_emoji:     { fontSize: 28 },
  settings_icon:   { fontSize: 22 },
  group_name:      { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  members_count:   { fontSize: FontSize.sm, color: Colors.primary, marginTop: 4 },
  section:         { marginBottom: Spacing.xl },
  event_name:      { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  event_date:      { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  event_location:  { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2 },
  tribunal_badge:  { fontSize: FontSize.sm, color: Colors.success, marginTop: Spacing.sm },
  empty_hint:      { fontSize: FontSize.md, color: Colors.textTertiary, textAlign: 'center', padding: Spacing.sm },
  lore_card:       { marginBottom: Spacing.sm },
  lore_header:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  lore_type:       { fontSize: 16 },
  lore_title:      { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, flex: 1 },
  lore_content:    { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  lore_meta:       { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: Spacing.xs },
  debt_card:       { marginBottom: Spacing.sm },
  debt_text:       { fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 22 },
  debt_highlight:  { color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  debt_note:       { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: Spacing.xs, fontStyle: 'italic' },
});