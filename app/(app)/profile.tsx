import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useUserStats } from '../../hooks/useUserStats';
import { supabase } from '../../lib/supabase';
import { space, radius, type as t } from '../../constants/tokens';

type ThemeMode = 'light'|'dark'|'system';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { c, mode, setMode } = useTheme();
  const { stats, loading: statsLoading } = useUserStats(user?.id);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('username').eq('id', user.id).single()
      .then(({ data }) => { if (data) setUsername(data.username); });
  }, [user?.id]);

  const handleLogout = () => Alert.alert('Logout', 'Vuoi uscire?', [
    { text: 'Annulla', style: 'cancel' },
    { text: 'Esci', style: 'destructive', onPress: signOut },
  ]);

  const handleDeleteAccount = () => Alert.alert('⚠️ Cancella account',
    'Questa azione è IRREVERSIBILE. Tutti i tuoi dati verranno eliminati.',
    [{ text: 'Annulla', style: 'cancel' },
     { text: 'Continua', style: 'destructive', onPress: confirmDelete }]);

  const confirmDelete = () => Alert.alert('Sei davvero sicuro?', 'Ultima conferma prima della cancellazione definitiva.',
    [{ text: 'No, annulla', style: 'cancel' },
     { text: 'Sì, cancella tutto', style: 'destructive', onPress: async() => {
       setLoading(true);
       const { error } = await supabase.rpc('delete_my_account');
       if (error) { setLoading(false); Alert.alert('Errore', error.message); return; }
       await signOut();
     }}]);

  const themeOptions: { label: string; value: ThemeMode; icon: string }[] = [
    { label: 'Sistema', value: 'system', icon: 'phone-portrait-outline' },
    { label: 'Chiaro',  value: 'light',  icon: 'sunny-outline' },
    { label: 'Scuro',   value: 'dark',   icon: 'moon-outline' },
  ];

  // Card stat: numero + etichetta + icona
  const StatCard = ({ icon, value, label, color }: { icon: string; value: number | string; label: string; color?: string }) => (
    <View style={[styles.statCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={[styles.statIcon, { backgroundColor: (color ?? c.accent) + '20' }]}>
        <Ionicons name={icon as any} size={18} color={color ?? c.accent} />
      </View>
      <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textSub }]}>{label}</Text>
    </View>
  );

  const Section = ({ label, children }: any) => (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: c.textHint }]}>{label}</Text>
      {children}
    </View>
  );

  const Row = ({ icon, label, color, onPress, last }: any) => (
    <>
      <TouchableOpacity style={styles.rowItem} onPress={onPress} activeOpacity={0.7}>
        <Ionicons name={icon} size={18} color={color ?? c.textSub} style={{ width: 24 }} />
        <Text style={[styles.rowLabel, { color: color ?? c.text, flex: 1 }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={16} color={c.textHint} />
      </TouchableOpacity>
      {!last && <View style={[styles.divider, { backgroundColor: c.border }]} />}
    </>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <View style={[styles.avatarBlock, { borderBottomColor: c.border }]}>
        <View style={[styles.avatar, { backgroundColor: c.accentMuted }]}>
          <Text style={[styles.avatarText, { color: c.accent }]}>{username[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={[styles.displayName, { color: c.text }]}>@{username}</Text>
        <Text style={[styles.email, { color: c.textSub }]}>{user?.email}</Text>
      </View>

      {/* Statistiche */}
      <Section label="LE TUE STATISTICHE">
        {statsLoading ? (
          <View style={[styles.loadingBox, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ActivityIndicator color={c.accent} />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard icon="trophy"           value={stats.total_points}    label="Punti totali"   color={c.accent} />
            <StatCard icon="ribbon"           value={stats.mvp_count}       label="MVP vinti"      color={c.gold} />
            <StatCard icon="calendar"         value={stats.serate_played}   label="Serate giocate" color={c.teal} />
            <StatCard icon="star"             value={stats.categories_won}  label="Categorie vinte" color={c.accent} />
            <StatCard icon="book"             value={stats.lore_written}    label="Lore scritte" />
            <StatCard icon="people"           value={stats.groups_count}    label="Gruppi" />
            <StatCard icon="arrow-up-circle"  value={stats.favors_done}     label="Favori fatti"   color={c.teal} />
            <StatCard icon="arrow-down-circle" value={stats.favors_received} label="Favori ricevuti" color={c.danger} />
          </View>
        )}
      </Section>

      {/* Tema */}
      <Section label="ASPETTO">
        <View style={[styles.themeRow, { backgroundColor: c.surface, borderColor: c.border }]}>
          {themeOptions.map((opt, i) => (
            <TouchableOpacity key={opt.value}
              style={[styles.themeChip,
                { borderColor: mode === opt.value ? c.accent : c.border,
                  backgroundColor: mode === opt.value ? c.accentMuted : c.surface2 },
                i > 0 && { marginLeft: space.sm }]}
              onPress={() => setMode(opt.value)}>
              <Ionicons name={opt.icon as any} size={16} color={mode === opt.value ? c.accent : c.textSub} />
              <Text style={[styles.themeChipText, { color: mode === opt.value ? c.accent : c.textSub }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      {/* Account */}
      <Section label="ACCOUNT">
        <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Row icon="log-out-outline" label="Logout" onPress={handleLogout} />
          <Row icon="trash-outline" label={loading ? 'Cancellazione…' : 'Cancella account'} color={c.danger} onPress={handleDeleteAccount} last />
        </View>
      </Section>

      <Text style={[styles.version, { color: c.textHint }]}>Sodalis · v0.1</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space['4xl'] },
  avatarBlock: { alignItems: 'center', paddingVertical: space['3xl'], marginBottom: space.lg, borderBottomWidth: 1 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: space.md },
  avatarText: { fontSize: 32, fontWeight: t.weight.bold },
  displayName: { fontSize: t.size.lg, fontWeight: t.weight.semibold },
  email: { fontSize: t.size.sm, marginTop: 4 },
  section: { marginBottom: space['2xl'] },
  sectionLabel: { fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: 0.8, marginBottom: space.sm, marginLeft: 4 },
  sectionCard: { borderRadius: radius.xl, borderWidth: 1, overflow: 'hidden' },
  // Stats grid: 2 colonne con gap
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  statCard: { width: '48.5%', borderRadius: radius.xl, borderWidth: 1, padding: space.lg, gap: 4 },
  statIcon: { width: 32, height: 32, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  statValue: { fontSize: t.size.xl, fontWeight: t.weight.bold },
  statLabel: { fontSize: t.size.xs, fontWeight: t.weight.medium },
  loadingBox: { padding: space['2xl'], borderRadius: radius.xl, borderWidth: 1, alignItems: 'center' },
  // Tema
  themeRow: { flexDirection: 'row', padding: space.lg, borderRadius: radius.xl, borderWidth: 1 },
  themeChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1 },
  themeChipText: { fontSize: t.size.sm, fontWeight: t.weight.semibold },
  // Account rows
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg },
  rowLabel: { fontSize: t.size.base, fontWeight: t.weight.medium },
  divider: { height: 1, marginLeft: 56 },
  version: { textAlign: 'center', fontSize: t.size.xs, marginTop: space.xl },
});
