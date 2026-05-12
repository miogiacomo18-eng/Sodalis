// app/(app)/groups/[id]/settings.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  useGroupMembers, useTribunalCategories, useActionTypes,
  useUpdateGroup, useLeaveGroup,
  useCreateTribunalCategory, useDeleteTribunalCategory,
  useKickMember, useTransferOwnership, useDeleteGroup,
  useCreateActionType, useDeleteActionType,
} from '../../../../hooks';
import { useAuthStore, useGroupStore } from '../../../../store';
import {
  Button, Card, LoadingSpinner, ErrorState, Divider, IconButton,
} from '../../../../components/ui';
import { Input } from '../../../../components/ui/Input';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../../../constants/theme';
import type { TribunalCategory, GroupMember, ActionType } from '../../../../types';

export default function GroupSettingsScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const group   = useGroupStore((s) => s.activeGroup);
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);

  const { data: members,    isLoading: mLoad, isError, refetch } = useGroupMembers(id);
  const { data: categories, isLoading: cLoad  } = useTribunalCategories(id);
  const { data: actionTypes, isLoading: atLoad } = useActionTypes(id);

  const updateGroup       = useUpdateGroup();
  const leaveGroup        = useLeaveGroup();
  const createCat         = useCreateTribunalCategory();
  const deleteCat         = useDeleteTribunalCategory();
  const kickMember        = useKickMember();
  const transferOwnership = useTransferOwnership();
  const deleteGroup       = useDeleteGroup();
  const createActionType  = useCreateActionType();
  const deleteActionType  = useDeleteActionType();

  const [groupName,    setGroupName]    = useState(group?.name ?? '');
  const [newCatName,   setNewCatName]   = useState('');
  const [newCatEmoji,  setNewCatEmoji]  = useState('🏅');
  const [newActLabel,  setNewActLabel]  = useState('');
  const [newActEmoji,  setNewActEmoji]  = useState('⭐');

  const isLoading = mLoad || cLoad || atLoad;
  const myRole  = members?.find((m) => m.profile_id === profile?.id)?.role;
  const isOwner = myRole === 'owner';

  // Dividi action types: default (globali) vs personalizzati (del gruppo)
  const customActionTypes = (actionTypes ?? []).filter((a: ActionType) => a.group_id === id);

  if (isLoading) return <LoadingSpinner full />;
  if (isError)   return <ErrorState onRetry={refetch} />;

  async function handleSaveName() {
    if (!groupName.trim()) return;
    try {
      await updateGroup.mutateAsync({ groupId: id, form: { name: groupName.trim() } });
      Alert.alert('Salvato', 'Nome gruppo aggiornato.');
    } catch {
      Alert.alert('Errore', 'Impossibile aggiornare il nome.');
    }
  }

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    try {
      await createCat.mutateAsync({
        groupId:    id,
        name:       newCatName.trim(),
        emoji:      newCatEmoji,
        orderIndex: (categories?.length ?? 0) + 1,
      });
      setNewCatName('');
      setNewCatEmoji('🏅');
    } catch {
      Alert.alert('Errore', 'Impossibile aggiungere la categoria.');
    }
  }

  async function handleDeleteCategory(cat: TribunalCategory) {
    Alert.alert(
      'Elimina categoria',
      `Vuoi eliminare "${cat.name}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            deleteCat.mutate({ categoryId: cat.id, groupId: id });
          },
        },
      ]
    );
  }

  async function handleAddActionType() {
    if (!newActLabel.trim()) return;
    try {
      await createActionType.mutateAsync({ groupId: id, label: newActLabel.trim(), emoji: newActEmoji });
      setNewActLabel('');
      setNewActEmoji('⭐');
    } catch {
      Alert.alert('Errore', 'Impossibile aggiungere il tipo di azione.');
    }
  }

  async function handleDeleteActionType(at: ActionType) {
    Alert.alert(
      'Elimina azione',
      `Vuoi eliminare "${at.label}"?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            deleteActionType.mutate({ actionTypeId: at.id, groupId: id });
          },
        },
      ]
    );
  }

  async function handleKick(member: GroupMember) {
    Alert.alert(
      'Espelli membro',
      `Vuoi rimuovere ${member.nickname ?? member.profile?.display_name ?? '?'} dal gruppo?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Espelli',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            try {
              await kickMember.mutateAsync({ groupId: id, profileId: member.profile_id });
            } catch {
              Alert.alert('Errore', 'Impossibile espellere il membro.');
            }
          },
        },
      ]
    );
  }

  async function handleTransfer(member: GroupMember) {
    const name = member.nickname ?? member.profile?.display_name ?? '?';
    Alert.alert(
      'Trasferisci proprietà',
      `Vuoi rendere ${name} il nuovo owner del gruppo? Diventerai un membro normale.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Trasferisci',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            try {
              await transferOwnership.mutateAsync({ groupId: id, newOwnerId: member.profile_id });
              Alert.alert('Fatto', `${name} è ora l'owner del gruppo.`);
            } catch {
              Alert.alert('Errore', 'Impossibile trasferire la proprietà.');
            }
          },
        },
      ]
    );
  }

  async function handleLeave() {
    if (!profile) return;
    if (isOwner && (members?.length ?? 0) > 1) {
      Alert.alert(
        'Non puoi lasciare',
        'Sei l\'owner. Trasferisci il ruolo a un altro membro prima di uscire.',
        [{ text: 'OK' }]
      );
      return;
    }
    Alert.alert(
      'Lascia il gruppo',
      'Non potrai più accedere a questa cricca.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Lascia',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            try {
              await leaveGroup.mutateAsync({ groupId: id, profileId: profile.id });
              setActiveGroup(null);
              router.replace('/(app)/groups');
            } catch {
              Alert.alert('Errore', 'Impossibile lasciare il gruppo.');
            }
          },
        },
      ]
    );
  }

  async function handleDeleteGroup() {
    Alert.alert(
      '⚠️ Elimina gruppo',
      `Vuoi eliminare "${group?.name}"? Tutti i dati (serate, lore, debiti, tribunali) saranno cancellati per sempre. Questa azione è irreversibile.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina per sempre',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            try {
              await deleteGroup.mutateAsync(id);
              setActiveGroup(null);
              router.replace('/(app)/groups');
            } catch {
              Alert.alert('Errore', 'Impossibile eliminare il gruppo.');
            }
          },
        },
      ]
    );
  }

  async function handleShareInvite() {
    if (!group) return;
    try {
      await Share.share({ message: `Entra nel gruppo "${group.name}" su Sodalis! Codice invito: ${group.invite_code}` });
    } catch { /* user cancelled */ }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Indietro</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Impostazioni</Text>

      {/* ── Invito ─────────────────────────────────────────── */}
      <Card style={styles.section_card}>
        <Text style={styles.section_title}>Codice invito</Text>
        <View style={styles.invite_row}>
          <Text style={styles.invite_code}>{group?.invite_code}</Text>
          <Button title="Condividi" onPress={handleShareInvite} variant="secondary" size="sm" />
        </View>
      </Card>

      {/* ── Nome gruppo (solo owner) ────────────────────────── */}
      {isOwner && (
        <Card style={styles.section_card}>
          <Text style={styles.section_title}>Nome gruppo</Text>
          <Input
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Nome del gruppo"
            containerStyle={{ marginTop: Spacing.sm }}
          />
          <Button
            title="Salva"
            onPress={handleSaveName}
            loading={updateGroup.isPending}
            size="sm"
            style={{ marginTop: Spacing.sm }}
          />
        </Card>
      )}

      {/* ── Categorie Tribunale ─────────────────────────────── */}
      <View>
        <Text style={styles.section_title_standalone}>⚖️ Categorie Tribunale</Text>
        <Text style={styles.section_sub}>Categorie per le votazioni di ogni serata.</Text>

        {categories?.map((cat: TribunalCategory) => (
          <Card key={cat.id} style={styles.item_card}>
            <View style={styles.item_row}>
              <Text style={styles.item_emoji}>{cat.emoji}</Text>
              <Text style={styles.item_name}>{cat.name}</Text>
              {cat.is_default && <Text style={styles.default_tag}>default</Text>}
              {isOwner && (
                <IconButton
                  icon="✕"
                  onPress={() => handleDeleteCategory(cat)}
                  color={Colors.textTertiary}
                  size={28}
                />
              )}
            </View>
          </Card>
        ))}

        {isOwner && (
          <Card style={styles.add_card}>
            <Text style={styles.add_label}>+ Nuova categoria</Text>
            <View style={styles.add_row}>
              <Input
                placeholder="Emoji"
                value={newCatEmoji}
                onChangeText={setNewCatEmoji}
                containerStyle={{ width: 64 }}
                style={{ textAlign: 'center' }}
                maxLength={4}
              />
              <Input
                placeholder="es. Chi ha dormito prima"
                value={newCatName}
                onChangeText={setNewCatName}
                containerStyle={{ flex: 1 }}
              />
            </View>
            <Button
              title="Aggiungi"
              onPress={handleAddCategory}
              loading={createCat.isPending}
              size="sm"
              variant="secondary"
              style={{ marginTop: Spacing.sm }}
            />
          </Card>
        )}
      </View>

      <Divider />

      {/* ── Tipi di azione personalizzati (solo owner) ──────── */}
      <View>
        <Text style={styles.section_title_standalone}>🤝 Azioni personalizzate</Text>
        <Text style={styles.section_sub}>Aggiungi gesti sociali specifici per questo gruppo.</Text>

        {customActionTypes.length === 0 && (
          <Text style={styles.empty_hint}>Nessuna azione personalizzata ancora.</Text>
        )}

        {customActionTypes.map((at: ActionType) => (
          <Card key={at.id} style={styles.item_card}>
            <View style={styles.item_row}>
              <Text style={styles.item_emoji}>{at.emoji}</Text>
              <Text style={styles.item_name}>{at.label}</Text>
              {isOwner && (
                <IconButton
                  icon="✕"
                  onPress={() => handleDeleteActionType(at)}
                  color={Colors.textTertiary}
                  size={28}
                />
              )}
            </View>
          </Card>
        ))}

        {isOwner && (
          <Card style={styles.add_card}>
            <Text style={styles.add_label}>+ Nuova azione</Text>
            <View style={styles.add_row}>
              <Input
                placeholder="Emoji"
                value={newActEmoji}
                onChangeText={setNewActEmoji}
                containerStyle={{ width: 64 }}
                style={{ textAlign: 'center' }}
                maxLength={4}
              />
              <Input
                placeholder="es. ha offerto la pizza"
                value={newActLabel}
                onChangeText={setNewActLabel}
                containerStyle={{ flex: 1 }}
              />
            </View>
            <Button
              title="Aggiungi"
              onPress={handleAddActionType}
              loading={createActionType.isPending}
              size="sm"
              variant="secondary"
              style={{ marginTop: Spacing.sm }}
            />
          </Card>
        )}
      </View>

      <Divider />

      {/* ── Membri ──────────────────────────────────────────── */}
      <View>
        <Text style={styles.section_title_standalone}>👥 Membri ({members?.length ?? 0})</Text>

        {members?.map((m: GroupMember) => {
          const isMe   = m.profile_id === profile?.id;
          const isOwnerMember = m.role === 'owner';
          const name   = m.nickname ?? m.profile?.display_name ?? '?';

          return (
            <Card key={m.id} style={styles.member_card}>
              <View style={styles.member_row}>
                <View style={styles.member_info}>
                  <View style={styles.member_name_row}>
                    <Text style={styles.member_name}>{name}</Text>
                    {isOwnerMember && <Text style={styles.owner_badge}>👑 owner</Text>}
                    {isMe && <Text style={styles.me_badge}>tu</Text>}
                  </View>
                  {m.profile?.username && (
                    <Text style={styles.member_username}>@{m.profile.username}</Text>
                  )}
                </View>

                {/* Azioni per owner su altri membri */}
                {isOwner && !isMe && (
                  <View style={styles.member_actions}>
                    <TouchableOpacity
                      style={styles.action_btn}
                      onPress={() => handleTransfer(m)}
                    >
                      <Text style={styles.transfer_text}>👑 Owner</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.action_btn, styles.kick_btn]}
                      onPress={() => handleKick(m)}
                    >
                      <Text style={styles.kick_text}>Espelli</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Card>
          );
        })}
      </View>

      <Divider />

      {/* ── Zona pericolosa ─────────────────────────────────── */}
      <View style={styles.danger_zone}>
        <Text style={styles.danger_title}>Zona pericolosa</Text>

        <Button
          title="Lascia il gruppo"
          onPress={handleLeave}
          variant="danger"
          loading={leaveGroup.isPending}
        />

        {isOwner && (
          <Button
            title="Elimina gruppo per sempre"
            onPress={handleDeleteGroup}
            variant="danger"
            loading={deleteGroup.isPending}
            style={{ marginTop: Spacing.sm }}
          />
        )}
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: Spacing.lg, paddingTop: 60, gap: Spacing.lg },
  nav:       { marginBottom: Spacing.xs },
  back:      { fontSize: FontSize.lg, color: Colors.primary },
  title:     { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  section_card: { gap: Spacing.sm },
  section_title: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  section_title_standalone: {
    fontSize: FontSize.md, fontWeight: FontWeight.bold,
    color: Colors.textPrimary, marginBottom: 4,
  },
  section_sub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },

  invite_row:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xs },
  invite_code: {
    fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold,
    color: Colors.primary, letterSpacing: 4,
  },

  item_card: { marginBottom: Spacing.sm },
  item_row:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  item_emoji: { fontSize: 20, width: 28 },
  item_name:  { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  default_tag: { fontSize: FontSize.xs, color: Colors.textTertiary, fontStyle: 'italic' },

  add_card:  { borderStyle: 'dashed', marginTop: Spacing.xs },
  add_label: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.sm },
  add_row:   { flexDirection: 'row', gap: Spacing.sm },

  empty_hint: { fontSize: FontSize.sm, color: Colors.textTertiary, fontStyle: 'italic', marginBottom: Spacing.sm },

  member_card:    { marginBottom: Spacing.sm },
  member_row:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  member_info:    { flex: 1 },
  member_name_row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  member_name:    { fontSize: FontSize.md, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  member_username: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  owner_badge:    { fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.semibold },
  me_badge: {
    fontSize: FontSize.xs, color: Colors.textTertiary,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  member_actions: { flexDirection: 'row', gap: Spacing.xs },
  action_btn: {
    paddingHorizontal: Spacing.sm, paddingVertical: 5,
    borderRadius: Radius.sm, borderWidth: 1,
    borderColor: Colors.border,
  },
  transfer_text: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.medium },
  kick_btn:   { borderColor: Colors.error + '44' },
  kick_text:  { fontSize: FontSize.xs, color: Colors.error, fontWeight: FontWeight.medium },

  danger_zone: { gap: Spacing.sm },
  danger_title: {
    fontSize: FontSize.sm, fontWeight: FontWeight.semibold,
    color: Colors.error, textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
});
