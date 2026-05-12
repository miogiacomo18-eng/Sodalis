// app/(app)/groups/[id]/events/index.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEvents } from '../../../../../hooks';
import { Card, EmptyState, ErrorState, FAB } from '../../../../../components/ui';
import { SkeletonList } from '../../../../../components/ui/SkeletonLoader';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../../../../constants/theme';
import { formatEventDate } from '../../../../../utils';
import type { Event } from '../../../../../types';

export default function EventsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: events, isLoading, isError, refetch } = useEvents(id);
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌙 Serate</Text>
      </View>
      {isLoading && <SkeletonList count={4} />}

      {!isLoading && <FlatList
        data={events}
        keyExtractor={(e: Event) => e.id}
        contentContainerStyle={[styles.list, (!events || events.length === 0) && { flex: 1 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            emoji="🌙"
            title="Nessuna serata ancora"
            subtitle="Inizia tu. Crea la prima serata del gruppo."
            action={{ label: '+ Nuova serata', onPress: () => router.push(`/(app)/groups/${id}/events/new`) }}
          />
        }
        renderItem={({ item }: { item: Event }) => (
          <Card
            onPress={() => router.push(`/(app)/groups/${id}/events/${item.id}`)}
            style={styles.card}
          >
            <View style={styles.card_inner}>
              <View style={styles.date_badge}>
                <Text style={styles.date_text}>{formatEventDate(item.event_date)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.event_name}>{item.name}</Text>
                {item.location && <Text style={styles.event_loc}>📍 {item.location}</Text>}
                <View style={styles.badges}>
                  {item.tribunal_closed && (
                    <View style={styles.status_badge}>
                      <Text style={styles.status_text}>⚖️ Chiuso</Text>
                    </View>
                  )}
                  {item.tribunal_open && !item.tribunal_closed && (
                    <View style={[styles.status_badge, { borderColor: Colors.warning + '44' }]}>
                      <Text style={[styles.status_text, { color: Colors.warning }]}>⚖️ Votazioni aperte</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Card>
        )}
      />

      }
      <FAB onPress={() => router.push(`/(app)/groups/${id}/events/new`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  header:       { padding: Spacing.lg, paddingTop: 60 },
  title:        { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  list:         { padding: Spacing.lg },
  card:         { marginBottom: Spacing.sm },
  card_inner:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  date_badge:   { backgroundColor: Colors.primaryDim, borderRadius: Radius.sm, padding: Spacing.sm, minWidth: 60, alignItems: 'center' },
  date_text:    { fontSize: FontSize.xs, color: Colors.primaryLight, fontWeight: FontWeight.semibold },
  event_name:   { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  event_loc:    { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2 },
  badges:       { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  status_badge: { borderWidth: 1, borderColor: Colors.success + '44', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  status_text:  { fontSize: FontSize.xs, color: Colors.success },
  chevron:      { fontSize: 22, color: Colors.textTertiary },
});