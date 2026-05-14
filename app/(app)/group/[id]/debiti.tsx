import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGlobalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../context/AuthContext';
import { useTheme } from '../../../../context/ThemeContext';
import { useMembers, GroupMember } from '../../../../hooks/useMembers';
import { AddDebtModal } from '../../../../components/AddDebtModal';
import { space, radius, type as t } from '../../../../constants/tokens';

type DebtRow = {
  id: string; from_user_id: string; to_user_id: string;
  from_name: string; to_name: string;
  cat_name: string | null; cat_icon: string | null;
  created_by: string; created_at: string;
};

// Saldo bilaterale netto fra due persone (es. Marco deve 2 favori a Luca)
type PairBalance = { fromName: string; toName: string; net: number };

export default function DebitiTab() {
  const { id: groupId } = useGlobalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { c } = useTheme();
  const { members } = useMembers(groupId);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [rawDebts, setRawDebts] = useState<{ from_user_id: string; to_user_id: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'pair' | 'individual'>('pair'); // toggle saldi

  const fetch = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase.from('debts')
      .select('id,created_by,created_at,from_user_id,to_user_id,debt_categories(name,icon)')
      .eq('group_id', groupId).order('created_at', { ascending: false });
    const parsed: DebtRow[] = (data ?? []).map((r: any) => ({
      id: r.id, from_user_id: r.from_user_id, to_user_id: r.to_user_id,
      from_name: members.find(m => m.user_id === r.from_user_id)?.display_name ?? '?',
      to_name:   members.find(m => m.user_id === r.to_user_id)?.display_name ?? '?',
      cat_name: r.debt_categories?.name ?? null, cat_icon: r.debt_categories?.icon ?? null,
      created_by: r.created_by, created_at: r.created_at,
    }));
    setDebts(parsed);
    setRawDebts((data ?? []).map((r: any) => ({ from_user_id: r.from_user_id, to_user_id: r.to_user_id })));
    setRefreshing(false);
  }, [groupId, members]);

  useEffect(() => { fetch(); }, [fetch]);

  // ───────────────────────────────────────────────────────────────────────────
  // Calcolo saldi bilaterali NETTI
  // Per ogni coppia ordinata (A, B), conto:
  //   - favori da A verso B (A deve a B) → +1 a "A→B"
  //   - favori da B verso A (B deve a A) → -1 a "A→B"
  // Risultato finale: per ogni coppia, una sola riga con netto > 0
  // Esempio: Marco deve 3 a Luca, Luca deve 1 a Marco → "Marco deve 2 a Luca"
  // ───────────────────────────────────────────────────────────────────────────
  const pairBalances = useMemo<PairBalance[]>(() => {
    const map = new Map<string, number>();  // key = "fromId|toId" canonicalizzato
    rawDebts.forEach(d => {
      // Normalizzo la coppia in ordine alfabetico per evitare doppioni
      const [a, b] = [d.from_user_id, d.to_user_id].sort();
      const key = `${a}|${b}`;
      const isAtoB = d.from_user_id === a; // direzione: a deve a b?
      map.set(key, (map.get(key) ?? 0) + (isAtoB ? 1 : -1));
    });

    const result: PairBalance[] = [];
    map.forEach((net, key) => {
      if (net === 0) return; // sono pari → non mostrare
      const [a, b] = key.split('|');
      const aName = members.find(m => m.user_id === a)?.display_name ?? '?';
      const bName = members.find(m => m.user_id === b)?.display_name ?? '?';
      if (net > 0) result.push({ fromName: aName, toName: bName, net });
      else         result.push({ fromName: bName, toName: aName, net: -net });
    });
    return result.sort((x, y) => y.net - x.net);
  }, [rawDebts, members]);

  // Saldi individuali (modalità alternativa: somma algebrica come prima)
  const individualBalances = useMemo(() => {
    const balMap: Record<string, number> = {};
    members.forEach(m => { balMap[m.user_id] = 0; });
    rawDebts.forEach(r => {
      if (balMap[r.to_user_id]   !== undefined) balMap[r.to_user_id]   += 1;
      if (balMap[r.from_user_id] !== undefined) balMap[r.from_user_id] -= 1;
    });
    return members
      .map(m => ({ user_id: m.user_id, display_name: m.display_name, balance: balMap[m.user_id] ?? 0 }))
      .sort((a, b) => b.balance - a.balance);
  }, [rawDebts, members]);

  const del = (id: string) => Alert.alert('Elimina favore', 'Irreversibile.', [
    { text: 'Annulla', style: 'cancel' },
    { text: 'Elimina', style: 'destructive', onPress: async () => { await supabase.from('debts').delete().eq('id', id); fetch(); } },
  ]);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <FlatList
        data={debts}
        keyExtractor={i => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor={c.accent} colors={[c.accent]} />}
        ListHeaderComponent={
          <View>
            {/* Header con toggle */}
            <View style={styles.sHeader}>
              <Text style={[styles.sLabel, { color: c.textHint }]}>SALDI</Text>
              <View style={[styles.toggle, { backgroundColor: c.surface2, borderColor: c.border }]}>
                <TouchableOpacity
                  style={[styles.toggleBtn, viewMode === 'pair' && { backgroundColor: c.surface }]}
                  onPress={() => setViewMode('pair')}>
                  <Text style={[styles.toggleText, { color: viewMode === 'pair' ? c.text : c.textHint }]}>Tra coppie</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, viewMode === 'individual' && { backgroundColor: c.surface }]}
                  onPress={() => setViewMode('individual')}>
                  <Text style={[styles.toggleText, { color: viewMode === 'individual' ? c.text : c.textHint }]}>Individuali</Text>
                </TouchableOpacity>
              </View>
            </View>

            {viewMode === 'pair' ? (
              pairBalances.length === 0 ? (
                <View style={[styles.allPariCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={{ fontSize: 32 }}>🤝</Text>
                  <Text style={[styles.allPariText, { color: c.text }]}>Tutti in pari</Text>
                  <Text style={[styles.allPariSub, { color: c.textSub }]}>Nessun debito attivo nel gruppo.</Text>
                </View>
              ) : (
                pairBalances.map((p, i) => (
                  <View key={i} style={[styles.pairRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <Text style={[styles.pairText, { color: c.text }]}>
                      <Text style={{ fontWeight: t.weight.semibold }}>{p.fromName}</Text>
                      <Text style={{ color: c.textSub }}> deve </Text>
                      <Text style={{ color: c.danger, fontWeight: t.weight.bold }}>{p.net}</Text>
                      <Text style={{ color: c.textSub }}> {p.net === 1 ? 'favore' : 'favori'} a </Text>
                      <Text style={{ fontWeight: t.weight.semibold }}>{p.toName}</Text>
                    </Text>
                  </View>
                ))
              )
            ) : (
              individualBalances.length === 0 ? <Text style={[styles.emptyMini, { color: c.textHint }]}>Nessun membro.</Text>
              : individualBalances.map(b => {
                const color = b.balance === 0 ? c.textHint : b.balance > 0 ? c.teal : c.danger;
                return (
                  <View key={b.user_id} style={[styles.balRow, { backgroundColor: c.surface, borderColor: c.border }]}>
                    <View style={[styles.balAvi, { backgroundColor: color + '20' }]}>
                      <Text style={[styles.balAviText, { color }]}>{b.display_name[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={[styles.balName, { color: c.text }]}>{b.display_name}</Text>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.balScore, { color }]}>{b.balance > 0 ? '+' : ''}{b.balance}</Text>
                      <Text style={[styles.balLabel, { color: c.textHint }]}>{b.balance === 0 ? 'pari' : b.balance > 0 ? 'crediti' : 'debiti'}</Text>
                    </View>
                  </View>
                );
              })
            )}

            <Text style={[styles.sLabel, { color: c.textHint, marginTop: space.xl, marginBottom: space.md }]}>MOVIMENTI</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.debtRow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.debtText, { color: c.text }]}>
                <Text style={{ fontWeight: t.weight.semibold }}>{item.from_name}</Text>
                <Text style={{ color: c.textSub }}> deve a </Text>
                <Text style={{ fontWeight: t.weight.semibold }}>{item.to_name}</Text>
              </Text>
              {item.cat_name && (
                <View style={[styles.catBadge, { backgroundColor: c.surface2, borderColor: c.border }]}>
                  {item.cat_icon && <Text style={{ fontSize: 11 }}>{item.cat_icon}</Text>}
                  <Text style={[styles.catText, { color: c.textSub }]}>{item.cat_name}</Text>
                </View>
              )}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={[styles.debtDate, { color: c.textHint }]}>{fmt(item.created_at)}</Text>
              {item.created_by === user?.id && (
                <TouchableOpacity onPress={() => del(item.id)} hitSlop={10} style={{ padding: 4 }}>
                  <Ionicons name="trash-outline" size={14} color={c.textHint} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={[styles.emptyMini, { color: c.textHint }]}>Nessun favore registrato.</Text>}
      />
      <TouchableOpacity style={[styles.fab, { backgroundColor: c.accent }]} onPress={() => setShowModal(true)}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
      {groupId && (
        <AddDebtModal visible={showModal} onClose={() => setShowModal(false)} onCreated={fetch}
          groupId={groupId} members={members} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingBottom: 100 },
  sHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  sLabel: { fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: 0.8 },
  toggle: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: 1, padding: 2 },
  toggleBtn: { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.md },
  toggleText: { fontSize: t.size.xs, fontWeight: t.weight.semibold },
  pairRow: { borderRadius: radius.xl, borderWidth: 1, padding: space.lg, marginBottom: space.sm },
  pairText: { fontSize: t.size.base, lineHeight: 22 },
  allPariCard: { alignItems: 'center', borderRadius: radius.xl, borderWidth: 1, padding: space.xl, gap: 6 },
  allPariText: { fontSize: t.size.lg, fontWeight: t.weight.semibold },
  allPariSub: { fontSize: t.size.sm },
  emptyMini: { fontSize: t.size.sm, textAlign: 'center', paddingVertical: space.xl },
  balRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.xl, borderWidth: 1, padding: space.lg, marginBottom: space.sm },
  balAvi: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  balAviText: { fontSize: t.size.md, fontWeight: t.weight.bold },
  balName: { flex: 1, fontSize: t.size.base, fontWeight: t.weight.medium },
  balScore: { fontSize: t.size.lg, fontWeight: t.weight.bold },
  balLabel: { fontSize: t.size.xs },
  debtRow: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.xl, borderWidth: 1, padding: space.lg, marginBottom: space.sm },
  debtText: { fontSize: t.size.base },
  catBadge: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 4, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: space.sm, paddingVertical: 3 },
  catText: { fontSize: t.size.xs, fontWeight: t.weight.medium },
  debtDate: { fontSize: t.size.xs },
  fab: { position: 'absolute', bottom: 24, right: 24, width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
