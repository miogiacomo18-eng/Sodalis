// app/(app)/groups/[id]/events/[eventId]/tribunal/results.tsx
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useEvent, useTribunalCategories, useGroupMembers,
  useTribunalVotes, computeTribunalResults,
} from '../../../../../../../hooks';
import { LoadingSpinner, ErrorState, Avatar } from '../../../../../../../components/ui';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../../../../../../constants/theme';

export default function TribunalResultsScreen() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const router = useRouter();

  const { data: event,      isLoading: evLoad  } = useEvent(eventId);
  const { data: categories, isLoading: catLoad } = useTribunalCategories(id);
  const { data: members,    isLoading: memLoad } = useGroupMembers(id);
  const { data: votes,      isLoading: vLoad   } = useTribunalVotes(eventId);

  const isLoading = evLoad || catLoad || memLoad || vLoad;

  if (isLoading) return <LoadingSpinner full />;
  if (!event || !categories || !members || !votes) return <ErrorState />;

  const results = computeTribunalResults(votes, categories, members);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Serata</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Text style={styles.gavel}>⚖️</Text>
        <Text style={styles.title}>Verdetti</Text>
        <Text style={styles.subtitle}>{event.name}</Text>
      </View>

      {results.map((result) => (
        <View key={result.category.id} style={styles.result_card}>
          <View style={styles.result_header}>
            <Text style={styles.category_emoji}>{result.category.emoji}</Text>
            <Text style={styles.category_name}>{result.category.name}</Text>
          </View>

          {result.winner ? (
            <>
              {/* Winner */}
              <View style={styles.winner_row}>
                <View style={styles.crown_wrapper}>
                  <Text style={styles.crown}>👑</Text>
                </View>
                <Avatar profile={result.winner} size={48} />
                <View style={styles.winner_info}>
                  <Text style={styles.winner_name}>{result.winner.display_name}</Text>
                  <Text style={styles.winner_stats}>
                    {result.vote_count} vot{result.vote_count === 1 ? 'o' : 'i'} · {result.percentage}%
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progress_track}>
                <View style={[styles.progress_fill, { width: `${result.percentage}%` }]} />
              </View>

              {/* Other candidates */}
              {result.all_votes.length > 1 && (
                <View style={styles.others}>
                  {result.all_votes.slice(1).map(({ profile: p, count }) => {
                    const pct = result.total_votes > 0
                      ? Math.round((count / result.total_votes) * 100)
                      : 0;
                    return (
                      <View key={p.id} style={styles.other_row}>
                        <Text style={styles.other_name}>{p.display_name}</Text>
                        <View style={styles.other_bar_track}>
                          <View style={[styles.other_bar_fill, { width: `${pct}%` }]} />
                        </View>
                        <Text style={styles.other_pct}>{pct}%</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.no_votes}>Nessun voto per questa categoria.</Text>
          )}
        </View>
      ))}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: Spacing.lg, paddingTop: 60 },
  nav:       { marginBottom: Spacing.md },
  back:      { fontSize: FontSize.lg, color: Colors.primary },
  header:    { alignItems: 'center', marginBottom: Spacing.xl, gap: Spacing.xs },
  gavel:     { fontSize: 56 },
  title:     { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  subtitle:  { fontSize: FontSize.md, color: Colors.textSecondary },
  result_card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
  },
  result_header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  category_emoji: { fontSize: 22 },
  category_name: {
    fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  winner_row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginBottom: Spacing.md, position: 'relative',
  },
  crown_wrapper: { position: 'absolute', left: 28, top: -12, zIndex: 1 },
  crown:       { fontSize: 18 },
  winner_info: { flex: 1 },
  winner_name: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  winner_stats: { fontSize: FontSize.sm, color: Colors.primary, marginTop: 2 },
  progress_track: {
    height: 4, backgroundColor: Colors.surfaceHigh,
    borderRadius: 2, marginBottom: Spacing.md,
  },
  progress_fill: {
    height: 4, backgroundColor: Colors.primary, borderRadius: 2,
  },
  others:    { gap: Spacing.sm },
  other_row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  other_name: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 80 },
  other_bar_track: {
    flex: 1, height: 4, backgroundColor: Colors.surfaceHigh, borderRadius: 2,
  },
  other_bar_fill: { height: 4, backgroundColor: Colors.borderLight, borderRadius: 2 },
  other_pct: { fontSize: FontSize.xs, color: Colors.textTertiary, width: 32, textAlign: 'right' },
  no_votes:  { fontSize: FontSize.sm, color: Colors.textTertiary, fontStyle: 'italic' },
});
