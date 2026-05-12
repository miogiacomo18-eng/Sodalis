// app/(app)/groups/[id]/members/index.tsx
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  useGroupMembers, useSocialActions, useTribunalVotes, useEvents,
} from '../../../../../hooks';
import { useAuthStore, useGroupStore } from '../../../../../store';
import {
  Card, ErrorState, Avatar, SectionHeader,
} from '../../../../../components/ui';
import { SkeletonList } from '../../../../../components/ui/SkeletonLoader';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../../../../constants/theme';

export default function MembersScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const group   = useGroupStore((s) => s.activeGroup);

  const { data: members, isLoading, isError, refetch } = useGroupMembers(id);
  const { data: actions } = useSocialActions(id);
  const { data: events  } = useEvents(id);

  if (isError) return <ErrorState onRetry={refetch} />;

  const myRole = members?.find((m) => m.profile_id === profile?.id)?.role;

  // Compute per-member stats
  const stats: Record<string, { actionsGiven: number; actionsReceived: number }> = {};
  members?.forEach((m) => {
    stats[m.profile_id] = { actionsGiven: 0, actionsReceived: 0 };
  });
  actions?.forEach((a) => {
    if (stats[a.from_profile_id]) stats[a.from_profile_id].actionsGiven += 1;
    a.to_profile_ids.forEach((pid) => {
      if (stats[pid]) stats[pid].actionsReceived += 1;
    });
  });

  function shareCode() {
    if (!group) return;
    Share.share({
      message: `Entra in "${group.name}" su Sodalis con il codice: ${group.invite_code}`,
    });
  }

  if (isLoading) return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.nav}><TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹ Home</Text></TouchableOpacity></View>
      <Text style={styles.title}>Membri</Text>
      <SkeletonList count={4} />
    </ScrollView>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Home</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Membri</Text>

      {/* Invite code */}
      {group && (
        <TouchableOpacity style={styles.invite_box} onPress={shareCode}>
          <View>
            <Text style={styles.invite_label}>Codice invito</Text>
            <Text style={styles.invite_code}>{group.invite_code}</Text>
          </View>
          <Text style={styles.share_icon}>📤</Text>
        </TouchableOpacity>
      )}

      <SectionHeader title={`${members?.length ?? 0} persone`} />

      {members?.map((member) => {
        const s = stats[member.profile_id];
        const isMe = member.profile_id === profile?.id;

        return (
          <Card key={member.id} style={styles.member_card}>
            <View style={styles.member_row}>
              {member.profile && (
                <Avatar profile={member.profile} size={44} />
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.name_row}>
                  <Text style={styles.member_name}>
                    {member.nickname
                      ? `${member.nickname}`
                      : member.profile?.display_name ?? '?'}
                  </Text>
                  {member.nickname && (
                    <Text style={styles.real_name}> ({member.profile?.display_name})</Text>
                  )}
                  {isMe && <Text style={styles.me_badge}> tu</Text>}
                </View>
                {member.role === 'owner' && (
                  <Text style={styles.role_badge}>👑 Owner</Text>
                )}
                <Text style={styles.member_stats}>
                  {s.actionsGiven} gesti dati · {s.actionsReceived} ricevuti
                </Text>
              </View>
            </View>
          </Card>
        );
      })}

      {/* Stats footer */}
      <View style={styles.footer}>
        <Text style={styles.footer_text}>
          {events?.length ?? 0} serate · {actions?.length ?? 0} gesti totali
        </Text>
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: Spacing.lg, paddingTop: 60, gap: Spacing.md },
  nav:       { marginBottom: Spacing.sm },
  back:      { fontSize: FontSize.lg, color: Colors.primary },
  title:     { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  invite_box: {
    backgroundColor: Colors.surface, borderRadius: Radius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  invite_label: { fontSize: FontSize.xs, color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
  invite_code:  { fontSize: 28, fontWeight: FontWeight.extrabold, color: Colors.primary, letterSpacing: 4, marginTop: 2 },
  share_icon:   { fontSize: 24 },
  member_card:  {},
  member_row:   { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  name_row:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  member_name:  { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  real_name:    { fontSize: FontSize.sm, color: Colors.textTertiary },
  me_badge:     { fontSize: FontSize.xs, color: Colors.primary, fontWeight: FontWeight.bold },
  role_badge:   { fontSize: FontSize.xs, color: Colors.warning, marginTop: 2 },
  member_stats: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 4 },
  footer:       { alignItems: 'center', padding: Spacing.lg },
  footer_text:  { fontSize: FontSize.sm, color: Colors.textTertiary },
});
