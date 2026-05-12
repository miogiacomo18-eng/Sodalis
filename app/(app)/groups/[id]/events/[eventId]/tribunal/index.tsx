// app/(app)/groups/[id]/events/[eventId]/tribunal/index.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  useEvent, useTribunalCategories, useGroupMembers,
  useMyVotes, useCastVotes, useCloseTribunal,
} from '../../../../../../../hooks';
import { useAuthStore } from '../../../../../../../store';
import {
  Button, Card, LoadingSpinner, ErrorState, Avatar,
} from '../../../../../../../components/ui';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../../../../../../constants/theme';
import type { TribunalCategory } from '../../../../../../../types';

export default function TribunalScreen() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const router  = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const { data: event,      isLoading: evLoad,  refetch: refetchEvent } = useEvent(eventId);
  const { data: categories, isLoading: catLoad, refetch: refetchCats  } = useTribunalCategories(id);
  const { data: members,    isLoading: memLoad, refetch: refetchMem   } = useGroupMembers(id);
  const { data: myVotes,    isLoading: voteLoad } = useMyVotes(eventId, profile?.id ?? '');
  const castVotes     = useCastVotes();
  const closeTribunal = useCloseTribunal();

  const [selections, setSelections] = useState<Record<string, string>>({});
  const [submitted,  setSubmitted]  = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchEvent(), refetchCats(), refetchMem()]);
    setRefreshing(false);
  }

  const isLoading = evLoad || catLoad || memLoad || voteLoad;
  if (isLoading) return <LoadingSpinner full />;
  if (!event)    return <ErrorState />;

  if (!categories || categories.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>‹ Serata</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.empty_center}>
          <Text style={{ fontSize: 48 }}>⚖️</Text>
          <Text style={[styles.title, { textAlign: 'center', marginTop: Spacing.md }]}>
            Nessuna categoria
          </Text>
          <Text style={styles.empty_sub}>
            Aggiungi le categorie del tribunale nelle impostazioni del gruppo.
          </Text>
          <Button
            title="Impostazioni gruppo"
            onPress={() => router.push(`/(app)/groups/${id}/settings`)}
            variant="secondary"
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      </View>
    );
  }

  const alreadyVoted   = (myVotes?.length ?? 0) > 0;
  const hasVoted       = alreadyVoted || submitted;
  const votableMembers = (members ?? []).filter((m) => m.profile_id !== profile?.id);
  const isOwner        = members?.find((m) => m.profile_id === profile?.id)?.role === 'owner';

  // Calcola quante categorie sono state compilate
  const filledCount = Object.values(selections).filter((v) => v !== '').length;
  const total       = categories.length;
  const progressPct = total > 0 ? (filledCount / total) * 100 : 0;

  function selectVote(categoryId: string, profileId: string) {
    if (hasVoted) return;
    Haptics.selectionAsync();
    setSelections((prev) => ({
      ...prev,
      [categoryId]: prev[categoryId] === profileId ? '' : profileId,
    }));
  }

  async function handleSubmit() {
    if (!profile) return;
    const voted = Object.entries(selections).filter(([, v]) => v !== '');
    if (voted.length === 0) {
      Alert.alert('Nessun voto', 'Seleziona almeno un candidato prima di inviare.');
      return;
    }
    Alert.alert(
      'Invia verdetto',
      `Stai votando per ${voted.length}/${total} categorie. Una volta inviato, non puoi modificare.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Invia',
          onPress: async () => {
            try {
              await castVotes.mutateAsync({
                votes: voted.map(([categoryId, votedForId]) => ({
                  event_id:     eventId,
                  category_id:  categoryId,
                  voter_id:     profile.id,
                  voted_for_id: votedForId,
                })),
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setSubmitted(true);
            } catch {
              Alert.alert('Errore', 'Impossibile inviare i voti.');
            }
          },
        },
      ]
    );
  }

  async function handleClose() {
    Alert.alert(
      'Chiudi il Tribunale',
      'I risultati saranno definitivi e visibili a tutti.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Chiudi',
          onPress: async () => {
            try {
              await closeTribunal.mutateAsync(eventId);
              router.replace(`/(app)/groups/${id}/events/${eventId}/tribunal/results`);
            } catch {
              Alert.alert('Errore', 'Impossibile chiudere il tribunale.');
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
      {/* Nav */}
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Serata</Text>
        </TouchableOpacity>
        {isOwner && event.tribunal_open && !event.tribunal_closed && (
          <TouchableOpacity onPress={handleClose}>
            <Text style={styles.close_btn}>Chiudi tribunale</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.title}>⚖️ Tribunale</Text>
      <Text style={styles.subtitle}>{event.name}</Text>

      {/* Barra progresso votazione */}
      {!hasVoted && votableMembers.length > 0 && (
        <View style={styles.progress_container}>
          <View style={styles.progress_header}>
            <Text style={styles.progress_label}>Categorie compilate</Text>
            <Text style={styles.progress_count}>{filledCount}/{total}</Text>
          </View>
          <View style={styles.progress_track}>
            <View style={[styles.progress_fill, { width: `${progressPct}%` }]} />
          </View>
        </View>
      )}

      {/* Banner già votato */}
      {hasVoted && (
        <View style={styles.voted_banner}>
          <Text style={styles.voted_text}>✅ Hai già votato. Grazie per la tua giustizia.</Text>
        </View>
      )}

      {votableMembers.length === 0 && (
        <View style={styles.voted_banner}>
          <Text style={styles.voted_text}>
            ⚠️ Sei l'unico membro — invita altri per votare.
          </Text>
        </View>
      )}

      {/* Categorie */}
      {categories.map((cat: TribunalCategory) => {
        const myVoteForCat = myVotes?.find((v) => v.category_id === cat.id);
        const selectedId   = selections[cat.id] ?? myVoteForCat?.voted_for_id ?? '';
        const isCompiled   = selectedId !== '';

        return (
          <View key={cat.id} style={styles.category}>
            <View style={styles.category_header}>
              <Text style={styles.category_title}>{cat.emoji} {cat.name}</Text>
              {!hasVoted && isCompiled && (
                <View style={styles.category_check}>
                  <Text style={styles.category_check_text}>✓</Text>
                </View>
              )}
            </View>

            {votableMembers.length === 0 ? (
              <Text style={styles.no_members}>Nessun membro votabile</Text>
            ) : (
              <View style={styles.members_grid}>
                {votableMembers.map((member) => {
                  const isSelected = selectedId === member.profile_id;
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.member_btn, isSelected && styles.member_btn_selected]}
                      onPress={() => selectVote(cat.id, member.profile_id)}
                      disabled={hasVoted}
                      activeOpacity={0.75}
                    >
                      {member.profile && <Avatar profile={member.profile} size={36} />}
                      <Text style={[styles.member_name, isSelected && styles.member_name_selected]}>
                        {member.nickname ?? member.profile?.display_name ?? '?'}
                      </Text>
                      {isSelected && <Text style={styles.check}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      {!hasVoted && votableMembers.length > 0 && (
        <Button
          title={`Invia il tuo verdetto (${filledCount}/${total})`}
          onPress={handleSubmit}
          loading={castVotes.isPending}
          disabled={filledCount === 0}
          style={styles.submit_btn}
        />
      )}

      {event.tribunal_closed && (
        <Button
          title="Vedi i risultati"
          onPress={() => router.push(`/(app)/groups/${id}/events/${eventId}/tribunal/results`)}
          variant="secondary"
          style={{ marginTop: Spacing.md }}
        />
      )}

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  content:     { padding: Spacing.lg, paddingTop: 60 },
  nav:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  back:        { fontSize: FontSize.lg, color: Colors.primary },
  close_btn:   { fontSize: FontSize.md, color: Colors.error, fontWeight: FontWeight.semibold },
  title:       { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary },
  subtitle:    { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.lg },

  progress_container: { marginBottom: Spacing.lg },
  progress_header:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  progress_label:     { fontSize: FontSize.sm, color: Colors.textSecondary },
  progress_count:     { fontSize: FontSize.sm, color: Colors.primary, fontWeight: FontWeight.semibold },
  progress_track: {
    height: 6, backgroundColor: Colors.surfaceHigh,
    borderRadius: 3,
  },
  progress_fill: {
    height: 6, backgroundColor: Colors.primary,
    borderRadius: 3,
  },

  voted_banner: {
    backgroundColor: Colors.success + '22', borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.success + '44',
  },
  voted_text: { fontSize: FontSize.sm, color: Colors.success },

  category: { marginBottom: Spacing.xl },
  category_header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.md,
  },
  category_title: {
    fontSize: FontSize.lg, fontWeight: FontWeight.semibold,
    color: Colors.textPrimary, flex: 1,
  },
  category_check: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  category_check_text: { fontSize: FontSize.xs, color: Colors.textPrimary, fontWeight: FontWeight.bold },

  no_members:  { fontSize: FontSize.sm, color: Colors.textTertiary, fontStyle: 'italic' },
  members_grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  member_btn:   {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.sm, paddingRight: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, minWidth: '45%',
  },
  member_btn_selected:  { borderColor: Colors.primary, backgroundColor: Colors.primaryDim },
  member_name:          { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  member_name_selected: { color: Colors.primaryLight, fontWeight: FontWeight.semibold },
  check:                { fontSize: FontSize.sm, color: Colors.primary },
  submit_btn:           { marginTop: Spacing.lg },

  empty_center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  empty_sub:    { color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
});
