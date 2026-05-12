// app/(app)/groups/[id]/classifica/index.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  useGroupStandings, useAllTribunalResults, useGroupMembers,
  type StandingEntry, type TribunalResultRow,
} from '../../../../../hooks';
import { Card, EmptyState, LoadingSpinner, ErrorState, Divider } from '../../../../../components/ui';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../../../../constants/theme';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function ClassificaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: standings,  isLoading: sLoad,  isError: sErr,  error: sErrObj,  refetch: rS  } = useGroupStandings(id);
  const { data: tribResults,isLoading: trLoad, isError: trErr, error: trErrObj, refetch: rTR } = useAllTribunalResults(id);
  const { data: members,    isLoading: mLoad,                  refetch: rM  } = useGroupMembers(id);

  const [activeTab, setActiveTab]   = useState<'mondiale' | 'eventi'>('mondiale');
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([rS(), rTR(), rM()]);
    setRefreshing(false);
  }

  const isLoading = sLoad || trLoad || mLoad;
  const isError   = sErr || trErr;

  if (isLoading) return <LoadingSpinner full />;
  if (isError)   return <ErrorState onRetry={() => { rS(); rTR(); rM(); }} error={sErrObj ?? trErrObj} />;

  // Standings con fallback ai membri con 0 punti
  const displayStandings: StandingEntry[] =
    (standings && standings.length > 0)
      ? standings
      : (members ?? []).map((m) => ({
          profile_id:      m.profile_id,
          display_name:    m.profile?.display_name ?? '?',
          avatar_url:      m.profile?.avatar_url ?? null,
          nickname:        m.nickname,
          tribunal_wins:   0,
          tribunal_points: 0,
          social_actions:  0,
          social_points:   0,
          total_score:     0,
        }));

  // Raggruppa risultati tribunale per evento
  const eventIds = Array.from(new Set((tribResults ?? []).map((r) => r.event_id)));
  const tribByEvent = eventIds.map((eid) => ({
    event_id: eid,
    results:  (tribResults ?? []).filter((r) => r.event_id === eid),
  }));

  function getMemberName(profileId: string): string {
    const m = members?.find((m) => m.profile_id === profileId);
    return m?.nickname ?? m?.profile?.display_name ?? '?';
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Classifica</Text>
        <Text style={styles.subtitle}>Chi domina il gruppo?</Text>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mondiale' && styles.tab_active]}
          onPress={() => setActiveTab('mondiale')}
        >
          <Text style={[styles.tab_text, activeTab === 'mondiale' && styles.tab_text_active]}>
            🌍 Generale
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'eventi' && styles.tab_active]}
          onPress={() => setActiveTab('eventi')}
        >
          <Text style={[styles.tab_text, activeTab === 'eventi' && styles.tab_text_active]}>
            ⚖️ Tribunali
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Tab GENERALE ── */}
      {activeTab === 'mondiale' && (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          <View style={styles.legend}>
            <Text style={styles.legend_text}>
              🏆 Vittoria tribunale = 3 pt · 🤝 Gesto sociale = 1 pt
            </Text>
          </View>

          {displayStandings.length === 0 ? (
            <EmptyState
              emoji="🏆"
              title="Nessun dato ancora"
              subtitle="I punti si guadagnano vincendo il tribunale o ricevendo gesti sociali."
            />
          ) : (
            displayStandings.map((entry: StandingEntry, idx: number) => {
              const medal = MEDALS[idx] ?? null;
              return (
                <Card key={entry.profile_id} style={styles.standing_card}>
                  <View style={styles.standing_row}>
                    <View style={styles.standing_pos}>
                      {medal ? (
                        <Text style={styles.medal}>{medal}</Text>
                      ) : (
                        <Text style={styles.standing_num}>{idx + 1}</Text>
                      )}
                    </View>

                    <View style={styles.avatar_circle}>
                      <Text style={styles.avatar_initial}>
                        {(entry.nickname ?? entry.display_name).charAt(0).toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.standing_name}>
                        {entry.nickname ?? entry.display_name}
                      </Text>
                      <Text style={styles.standing_detail}>
                        {entry.tribunal_wins}x tribunale · {entry.social_actions}x gesti
                      </Text>
                    </View>

                    <View style={styles.score_box}>
                      <Text style={styles.score_number}>{entry.total_score}</Text>
                      <Text style={styles.score_label}>pt</Text>
                    </View>
                  </View>

                  {(entry.tribunal_points > 0 || entry.social_points > 0) && (
                    <View style={styles.breakdown}>
                      {entry.tribunal_points > 0 && (
                        <View style={styles.breakdown_item}>
                          <Text style={styles.breakdown_emoji}>🏆</Text>
                          <Text style={styles.breakdown_text}>+{entry.tribunal_points} pt tribunale</Text>
                        </View>
                      )}
                      {entry.social_points > 0 && (
                        <View style={styles.breakdown_item}>
                          <Text style={styles.breakdown_emoji}>🤝</Text>
                          <Text style={styles.breakdown_text}>+{entry.social_points} pt gesti</Text>
                        </View>
                      )}
                    </View>
                  )}
                </Card>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* ── Tab TRIBUNALI ── */}
      {activeTab === 'eventi' && (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
        >
          {tribByEvent.length === 0 ? (
            <EmptyState
              emoji="⚖️"
              title="Nessun tribunale chiuso"
              subtitle="I verdetti appariranno qui dopo la chiusura di un tribunale."
            />
          ) : (
            tribByEvent.map(({ event_id, results }) => {
              const catWinners = results.reduce<Record<string, TribunalResultRow>>((acc, r) => {
                if (!acc[r.category_id] || r.vote_count > acc[r.category_id].vote_count) {
                  acc[r.category_id] = r;
                }
                return acc;
              }, {});
              const winners = Object.values(catWinners);

              return (
                <Card key={event_id} style={styles.event_card}>
                  <Text style={styles.event_label}>Serata</Text>
                  <Divider style={{ marginVertical: Spacing.sm }} />
                  {winners.map((w) => (
                    <View key={w.category_id} style={styles.verdict_row}>
                      <Text style={styles.verdict_emoji}>{w.category_emoji}</Text>
                      <Text style={styles.verdict_cat}>{w.category_name}</Text>
                      <Text style={styles.verdict_winner}>{getMemberName(w.voted_for_id)}</Text>
                    </View>
                  ))}
                </Card>
              );
            })
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  header:           { padding: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.sm },
  title:            { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle:         { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  tabs:             { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.sm },
  tab:              { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.full },
  tab_active:       { backgroundColor: Colors.primaryDim },
  tab_text:         { fontSize: FontSize.sm, color: Colors.textTertiary, fontWeight: FontWeight.medium },
  tab_text_active:  { color: Colors.primaryLight },

  list:             { padding: Spacing.lg, paddingTop: Spacing.sm },
  legend:           { backgroundColor: Colors.surfaceHigh, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
  legend_text:      { fontSize: FontSize.xs, color: Colors.textTertiary, textAlign: 'center' },

  standing_card:    { marginBottom: Spacing.sm },
  standing_row:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  standing_pos:     { width: 32, alignItems: 'center' },
  medal:            { fontSize: 24 },
  standing_num:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textTertiary },
  avatar_circle:    {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryDim,
    alignItems: 'center', justifyContent: 'center',
  },
  avatar_initial:   { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.primaryLight },
  standing_name:    { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  standing_detail:  { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  score_box:        { alignItems: 'center' },
  score_number:     { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold, color: Colors.primary },
  score_label:      { fontSize: FontSize.xs, color: Colors.textTertiary },
  breakdown:        {
    flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm,
    paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  breakdown_item:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  breakdown_emoji:  { fontSize: 12 },
  breakdown_text:   { fontSize: FontSize.xs, color: Colors.textTertiary },

  event_card:       { marginBottom: Spacing.md },
  event_label:      { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  verdict_row:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  verdict_emoji:    { fontSize: 18, width: 28 },
  verdict_cat:      { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  verdict_winner:   { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primaryLight },
});
