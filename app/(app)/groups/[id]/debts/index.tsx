// app/(app)/groups/[id]/debts/index.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  useSocialActions, useActionTypes, useGroupMembers,
  useCreateSocialAction, useEvents, useAllTribunalResults,
  type TribunalResultRow,
} from '../../../../../hooks';
import { useAuthStore } from '../../../../../store';
import {
  Card, EmptyState, ErrorState, LoadingSpinner, FAB,
  Button, Avatar, Divider,
} from '../../../../../components/ui';
import { Input } from '../../../../../components/ui/Input';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../../../../constants/theme';
import { formatEventDate } from '../../../../../utils';
import type { SocialAction, ActionType, GroupMember, Event } from '../../../../../types';

export default function DebtsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const profile = useAuthStore((s) => s.profile);

  const { data: actions,     isLoading: aLoad, isError, error: aErr, refetch: rA } = useSocialActions(id);
  const { data: types,       isLoading: tLoad, refetch: rT           } = useActionTypes(id);
  const { data: members,     isLoading: mLoad, refetch: rM           } = useGroupMembers(id);
  const { data: events,      isLoading: eLoad, refetch: rE           } = useEvents(id);
  const { data: tribResults, isLoading: trLoad, refetch: rTR         } = useAllTribunalResults(id);
  const createAction = useCreateSocialAction();

  const [addModal,        setAddModal]        = useState(false);
  const [selectedType,    setSelectedType]    = useState('');
  const [fromMember,      setFromMember]      = useState('');
  const [toMembers,       setToMembers]       = useState<string[]>([]);
  const [note,            setNote]            = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [refreshing,      setRefreshing]      = useState(false);
  const [expandedEvents,  setExpandedEvents]  = useState<Set<string>>(new Set());

  const isLoading = aLoad || tLoad || mLoad || eLoad || trLoad;

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([rA(), rT(), rM(), rE(), rTR()]);
    setRefreshing(false);
  }

  if (isLoading) return <LoadingSpinner full />;
  if (isError)   return <ErrorState onRetry={rA} error={aErr} />;

  // ─── Raggruppa azioni per serata ─────────────────────────────
  const actionsByEvent: Record<string, SocialAction[]> = {};
  events?.forEach((ev) => { actionsByEvent[ev.id] = []; });
  actionsByEvent['__none__'] = [];
  actions?.forEach((a) => {
    const key = a.event_id ?? '__none__';
    if (!actionsByEvent[key]) actionsByEvent[key] = [];
    actionsByEvent[key].push(a);
  });

  // ─── Raggruppa risultati tribunale per evento ─────────────────
  const tribByEvent: Record<string, TribunalResultRow[]> = {};
  (tribResults ?? []).forEach((r: TribunalResultRow) => {
    if (!tribByEvent[r.event_id]) tribByEvent[r.event_id] = [];
    tribByEvent[r.event_id].push(r);
  });

  const eventSections = (events ?? []).filter((ev) =>
    (actionsByEvent[ev.id]?.length ?? 0) > 0 || ev.tribunal_closed
  );

  // ─── Helpers ──────────────────────────────────────────────────
  function toggleExpand(eventId: string) {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      next.has(eventId) ? next.delete(eventId) : next.add(eventId);
      return next;
    });
  }

  function toggleToMember(pid: string) {
    setToMembers((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  }

  function getMemberName(profileId: string) {
    const m = members?.find((m) => m.profile_id === profileId);
    return m?.nickname ?? m?.profile?.display_name ?? '?';
  }

  function openModal() {
    setSelectedType('');
    setFromMember(profile?.id ?? '');
    setToMembers([]);
    setNote('');
    setSelectedEventId('');
    setAddModal(true);
  }

  async function handleAdd() {
    if (!profile || !selectedType || !fromMember || toMembers.length === 0) {
      Alert.alert('Campi mancanti', 'Seleziona tipo, chi ha fatto e per chi.');
      return;
    }
    try {
      await createAction.mutateAsync({
        groupId: id,
        userId:  profile.id,
        form: {
          action_type_id:  selectedType,
          from_profile_id: fromMember,
          to_profile_ids:  toMembers,
          note:            note.trim() || undefined,
          event_id:        selectedEventId || undefined,
        },
      });
      setAddModal(false);
      if (selectedEventId) {
        setExpandedEvents((prev) => new Set([...prev, selectedEventId]));
      }
    } catch {
      Alert.alert('Errore', 'Impossibile registrare l\'azione.');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🤝 Debiti Sociali</Text>
        <Text style={styles.subtitle}>La memoria sociale del gruppo</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {eventSections.length === 0 && (actionsByEvent['__none__']?.length ?? 0) === 0 ? (
          <EmptyState
            emoji="🤝"
            title="Nessun gesto ancora"
            subtitle="Registra il primo gesto sociale del gruppo."
          />
        ) : (
          <>
            {eventSections.map((ev: Event) => {
              const isExpanded = expandedEvents.has(ev.id);
              const evActions  = actionsByEvent[ev.id] ?? [];
              const evTribs    = tribByEvent[ev.id] ?? [];

              const catWinners = evTribs.reduce<Record<string, TribunalResultRow>>((acc, r) => {
                if (!acc[r.category_id] || r.vote_count > acc[r.category_id].vote_count) {
                  acc[r.category_id] = r;
                }
                return acc;
              }, {});
              const winners = Object.values(catWinners);

              return (
                <Card key={ev.id} style={styles.event_card}>
                  <TouchableOpacity
                    style={styles.event_header}
                    onPress={() => toggleExpand(ev.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.event_name}>{ev.name}</Text>
                      <Text style={styles.event_date}>{formatEventDate(ev.event_date)}</Text>
                      <View style={styles.event_badges}>
                        {evActions.length > 0 && (
                          <View style={styles.badge}>
                            <Text style={styles.badge_text}>🤝 {evActions.length}</Text>
                          </View>
                        )}
                        {ev.tribunal_closed && (
                          <View style={[styles.badge, { borderColor: Colors.success + '44' }]}>
                            <Text style={[styles.badge_text, { color: Colors.success }]}>⚖️ chiuso</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.chevron}>{isExpanded ? '▾' : '▸'}</Text>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View>
                      <Divider style={{ marginVertical: Spacing.sm }} />

                      {winners.length > 0 && (
                        <View style={styles.section_block}>
                          <Text style={styles.block_title}>⚖️ Verdetti</Text>
                          {winners.map((w) => (
                            <View key={w.category_id} style={styles.verdict_row}>
                              <Text style={styles.verdict_emoji}>{w.category_emoji}</Text>
                              <Text style={styles.verdict_cat}>{w.category_name}</Text>
                              <Text style={styles.verdict_winner}>{getMemberName(w.voted_for_id)}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {evActions.length > 0 && (
                        <View style={[styles.section_block, winners.length > 0 && { marginTop: Spacing.sm }]}>
                          <Text style={styles.block_title}>🤝 Gesti</Text>
                          {evActions.map((action) => {
                            const toNames = action.to_profile_ids.map(getMemberName).join(', ');
                            return (
                              <View key={action.id} style={styles.action_row}>
                                <Text style={styles.action_emoji}>{action.action_type?.emoji}</Text>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.action_text}>
                                    <Text style={styles.action_bold}>{action.from_profile?.display_name}</Text>
                                    {' '}{action.action_type?.label}{' per '}
                                    <Text style={styles.action_bold}>{toNames}</Text>
                                  </Text>
                                  {action.note && (
                                    <Text style={styles.action_note}>"{action.note}"</Text>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )}
                </Card>
              );
            })}

            {(actionsByEvent['__none__']?.length ?? 0) > 0 && (
              <Card style={styles.event_card}>
                <TouchableOpacity
                  style={styles.event_header}
                  onPress={() => toggleExpand('__none__')}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.event_name}>Generale</Text>
                    <Text style={styles.event_date}>Gesti non collegati a una serata</Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badge_text}>🤝 {actionsByEvent['__none__'].length}</Text>
                  </View>
                  <Text style={styles.chevron}>{expandedEvents.has('__none__') ? '▾' : '▸'}</Text>
                </TouchableOpacity>

                {expandedEvents.has('__none__') && (
                  <View>
                    <Divider style={{ marginVertical: Spacing.sm }} />
                    {actionsByEvent['__none__'].map((action) => {
                      const toNames = action.to_profile_ids.map(getMemberName).join(', ');
                      return (
                        <View key={action.id} style={styles.action_row}>
                          <Text style={styles.action_emoji}>{action.action_type?.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.action_text}>
                              <Text style={styles.action_bold}>{action.from_profile?.display_name}</Text>
                              {' '}{action.action_type?.label}{' per '}
                              <Text style={styles.action_bold}>{toNames}</Text>
                            </Text>
                            {action.note && (
                              <Text style={styles.action_note}>"{action.note}"</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>
            )}
          </>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB onPress={openModal} />

      {/* Modal aggiungi azione */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modal_overlay}>
          <ScrollView style={styles.modal} contentContainerStyle={styles.modal_content}>
            <Text style={styles.modal_title}>Registra un gesto</Text>

            <Text style={styles.modal_label}>Tipo di azione</Text>
            <View style={styles.chips_wrap}>
              {(types ?? []).map((t: ActionType) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.chip, selectedType === t.id && styles.chip_active]}
                  onPress={() => setSelectedType(t.id)}
                >
                  <Text style={styles.chip_text}>{t.emoji} {t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modal_label}>Chi ha fatto</Text>
            <View style={styles.chips_wrap}>
              {(members ?? []).map((m: GroupMember) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.chip, fromMember === m.profile_id && styles.chip_active]}
                  onPress={() => setFromMember(m.profile_id)}
                >
                  {m.profile && <Avatar profile={m.profile} size={24} />}
                  <Text style={styles.chip_text}>
                    {m.nickname ?? m.profile?.display_name ?? '?'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modal_label}>Per chi</Text>
            <View style={styles.chips_wrap}>
              {(members ?? []).filter((m) => m.profile_id !== fromMember).map((m: GroupMember) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.chip, toMembers.includes(m.profile_id) && styles.chip_active]}
                  onPress={() => toggleToMember(m.profile_id)}
                >
                  {m.profile && <Avatar profile={m.profile} size={24} />}
                  <Text style={styles.chip_text}>
                    {m.nickname ?? m.profile?.display_name ?? '?'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Nota (opzionale)"
              placeholder="es. dopo aver perso a carte"
              value={note}
              onChangeText={setNote}
            />

            <Text style={styles.modal_label}>Collega a una serata (opzionale)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.events_row}>
                <TouchableOpacity
                  style={[styles.chip, !selectedEventId && styles.chip_active]}
                  onPress={() => setSelectedEventId('')}
                >
                  <Text style={styles.chip_text}>Nessuna</Text>
                </TouchableOpacity>
                {(events ?? []).slice(0, 8).map((ev: Event) => (
                  <TouchableOpacity
                    key={ev.id}
                    style={[styles.chip, selectedEventId === ev.id && styles.chip_active]}
                    onPress={() => setSelectedEventId(ev.id)}
                  >
                    <Text style={styles.chip_text}>{ev.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modal_actions}>
              <Button
                title="Annulla"
                onPress={() => setAddModal(false)}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Registra"
                onPress={handleAdd}
                loading={createAction.isPending}
                style={{ flex: 1 }}
              />
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  header:        { padding: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.sm },
  title:         { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle:      { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  list:          { padding: Spacing.lg, paddingTop: Spacing.sm },

  event_card:    { marginBottom: Spacing.sm },
  event_header:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  event_name:    { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  event_date:    { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  event_badges:  { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  badge:         { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badge_text:    { fontSize: FontSize.xs, color: Colors.textSecondary },
  chevron:       { fontSize: FontSize.md, color: Colors.textTertiary, width: 16 },
  section_block: { gap: Spacing.xs },
  block_title:   { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary, marginBottom: 4 },
  verdict_row:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 3 },
  verdict_emoji: { fontSize: 16, width: 24 },
  verdict_cat:   { fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1 },
  verdict_winner:{ fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.primaryLight },
  action_row:    { flexDirection: 'row', gap: Spacing.sm, paddingVertical: 4, alignItems: 'flex-start' },
  action_emoji:  { fontSize: 18, marginTop: 2 },
  action_text:   { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  action_bold:   { color: Colors.textPrimary, fontWeight: FontWeight.semibold },
  action_note:   { fontSize: FontSize.xs, color: Colors.textTertiary, fontStyle: 'italic', marginTop: 1 },

  modal_overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal:         { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modal_content: { padding: Spacing.lg, gap: Spacing.md },
  modal_title:   { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  modal_label:   { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  chips_wrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip:          { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceHigh, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  chip_active:   { borderColor: Colors.primary, backgroundColor: Colors.primaryDim },
  chip_text:     { fontSize: FontSize.sm, color: Colors.textSecondary },
  member_chip:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.surfaceHigh, borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  events_row:    { flexDirection: 'row', gap: Spacing.sm, paddingBottom: Spacing.xs },
  modal_actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});
