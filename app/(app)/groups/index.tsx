// app/(app)/groups/index.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, Alert, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useGroups, useJoinGroup } from '../../../hooks';
import { useAuthStore, useGroupStore } from '../../../store';
import { supabase } from '../../../lib/supabase';
import {
  Button, Card, EmptyState, ErrorState, LoadingSpinner,
} from '../../../components/ui';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../../constants/theme';
import type { Group } from '../../../types';

export default function GroupsScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);
  const { data: groups, isLoading, isError, refetch } = useGroups();

  const [joinModal, setJoinModal] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const joinMutation = useJoinGroup();

  function selectGroup(group: Group) {
    setActiveGroup(group);
    router.push(`/(app)/groups/${group.id}`);
  }

  async function handleJoin() {
    if (codeInput.length !== 6) {
      Alert.alert('Codice non valido', 'Il codice deve essere di 6 caratteri.');
      return;
    }
    try {
      const result = await joinMutation.mutateAsync(codeInput.toUpperCase());
      setJoinModal(false);
      setCodeInput('');
      Alert.alert('Benvenuto!', `Sei entrato in ${result.group_name} ${result.emoji}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore sconosciuto';
      Alert.alert('Errore', msg);
    }
  }

  async function handleLogout() {
    Alert.alert('Logout', 'Sei sicuro di voler uscire?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Esci',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          setProfile(null);
          setActiveGroup(null);
        },
      },
    ]);
  }

  if (isLoading) return <LoadingSpinner full />;
  if (isError) return <ErrorState onRetry={refetch} />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Ciao, {profile?.display_name?.split(' ')[0]} 👋
          </Text>
          <Text style={styles.subtitle}>I tuoi gruppi</Text>
        </View>
        <View style={styles.header_actions}>
          <TouchableOpacity
            style={styles.icon_btn}
            onPress={() => router.push('/(app)/profile')}
          >
            <Text style={styles.icon_btn_text}>👤</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.icon_btn}
            onPress={handleLogout}
          >
            <Text style={styles.icon_btn_text}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Groups list */}
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={[
          styles.list,
          (!groups || groups.length === 0) && { flex: 1 },
        ]}
        ListEmptyComponent={
          <EmptyState
            emoji="🫂"
            title="Nessun gruppo ancora"
            subtitle="Crea il primo gruppo o entra con un codice invito."
          />
        }
        renderItem={({ item }) => (
          <Card onPress={() => selectGroup(item)} style={styles.group_card}>
            <View style={styles.group_card_inner}>
              <View style={[styles.group_emoji_bg, { backgroundColor: item.color_hex + '22' }]}>
                <Text style={styles.group_emoji}>{item.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.group_name}>{item.name}</Text>
                <Text style={styles.group_code}>#{item.invite_code}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Card>
        )}
      />

      {/* Bottom actions */}
      <View style={styles.actions}>
        <Button
          title="Entra con codice"
          onPress={() => setJoinModal(true)}
          variant="secondary"
          style={{ flex: 1 }}
        />
        <Button
          title="Crea gruppo"
          onPress={() => router.push('/(app)/groups/new')}
          style={{ flex: 1 }}
        />
      </View>

      {/* Join modal */}
      <Modal visible={joinModal} transparent animationType="slide">
        <View style={styles.modal_overlay}>
          <View style={styles.modal}>
            <Text style={styles.modal_title}>Entra con codice</Text>
            <Text style={styles.modal_sub}>
              Inserisci il codice di 6 caratteri che ti ha mandato un amico.
            </Text>
            <TextInput
              style={styles.code_input}
              value={codeInput}
              onChangeText={(t) => setCodeInput(t.toUpperCase())}
              placeholder="AB1234"
              placeholderTextColor={Colors.textTertiary}
              maxLength={6}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Button
                title="Annulla"
                onPress={() => { setJoinModal(false); setCodeInput(''); }}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                title="Entra"
                onPress={handleJoin}
                loading={joinMutation.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  header:           {
    padding: Spacing.lg, paddingTop: 60,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  header_actions:   { flexDirection: 'row', gap: Spacing.sm, marginTop: 4 },
  icon_btn:         {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  icon_btn_text:    { fontSize: 18 },
  greeting:         { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle:         { fontSize: FontSize.md, color: Colors.textSecondary },
  list:             { padding: Spacing.lg, gap: Spacing.sm },
  group_card:       { marginBottom: Spacing.sm },
  group_card_inner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  group_emoji_bg:   { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  group_emoji:      { fontSize: 24 },
  group_name:       { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  group_code:       { fontSize: FontSize.sm, color: Colors.textTertiary, marginTop: 2 },
  chevron:          { fontSize: 22, color: Colors.textTertiary },
  actions:          { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, paddingBottom: 32 },
  modal_overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal:            {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: Spacing.lg, paddingBottom: 40, gap: Spacing.md,
  },
  modal_title:      { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  modal_sub:        { fontSize: FontSize.md, color: Colors.textSecondary },
  code_input:       {
    backgroundColor: Colors.surfaceHigh, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, padding: Spacing.md, color: Colors.textPrimary,
    fontSize: 28, fontWeight: FontWeight.bold, textAlign: 'center', letterSpacing: 6,
  },
});
