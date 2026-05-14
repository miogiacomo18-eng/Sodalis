import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useGlobalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useTheme } from '../../../context/ThemeContext';
import { useMembers } from '../../../hooks/useMembers';
import { space, radius, type as t } from '../../../constants/tokens';

type Serata = { id: string; title: string; event_date: string; status: string; group_id: string };
type CatWinner = {
  category_id: string;
  category_name: string;
  is_mvp: boolean;
  points: number;
  winners: { user_id: string; votes: number }[];
};
type LorePost = { id: string; content: string; author_id: string };

export default function RecapScreen() {
  const { serataId, groupId } = useGlobalSearchParams<{ serataId: string; groupId: string }>();
  const { c } = useTheme();
  const { members } = useMembers(groupId);
  const [serata, setSerata] = useState<Serata | null>(null);
  const [winners, setWinners] = useState<CatWinner[]>([]);
  const [lore, setLore] = useState<LorePost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serataId) return;
    (async () => {
      // Carica dati serata + voti + categorie + lore
      const [sRes, votesRes, loreRes] = await Promise.all([
        supabase.from('serate').select('id,title,event_date,status,group_id').eq('id', serataId).single(),
        supabase.from('votes')
          .select('category_id,voted_user_id,vote_categories(name,is_mvp,points)')
          .eq('serata_id', serataId),
        supabase.from('lore').select('id,content,author_id').eq('serata_id', serataId).order('created_at'),
      ]);

      if (sRes.data) setSerata(sRes.data as Serata);
      setLore((loreRes.data ?? []) as LorePost[]);

      // Calcola i vincitori per categoria (gestisce pareggi)
      const tally = new Map<string, { name: string; is_mvp: boolean; points: number; counts: Map<string, number> }>();
      (votesRes.data ?? []).forEach((v: any) => {
        const cat = v.vote_categories;
        if (!cat) return;
        if (!tally.has(v.category_id)) {
          tally.set(v.category_id, { name: cat.name, is_mvp: cat.is_mvp, points: cat.points, counts: new Map() });
        }
        const t = tally.get(v.category_id)!;
        t.counts.set(v.voted_user_id, (t.counts.get(v.voted_user_id) ?? 0) + 1);
      });

      const result: CatWinner[] = [];
      tally.forEach((data, catId) => {
        const max = Math.max(...Array.from(data.counts.values()));
        const winnersIds: { user_id: string; votes: number }[] = [];
        data.counts.forEach((votes, uid) => {
          if (votes === max) winnersIds.push({ user_id: uid, votes });
        });
        result.push({
          category_id: catId,
          category_name: data.name,
          is_mvp: data.is_mvp,
          points: data.points,
          winners: winnersIds,
        });
      });

      // MVP prima, poi categorie bonus per punti decrescenti, infine i malus
      result.sort((a, b) => {
        if (a.is_mvp !== b.is_mvp) return a.is_mvp ? -1 : 1;
        return b.points - a.points;
      });

      setWinners(result);
      setLoading(false);
    })();
  }, [serataId]);

  const getName = (uid: string) => members.find(m => m.user_id === uid)?.display_name ?? '?';
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });

  const handleShare = async () => {
    if (!serata) return;
    // Costruisce un testo "epic recap" pronto da condividere su WhatsApp/Instagram
    const lines: string[] = [
      `🎉 RECAP: ${serata.title}`,
      `📅 ${fmtDate(serata.event_date)}`,
      '',
      ...winners.map(w => {
        const names = w.winners.map(x => getName(x.user_id)).join(' & ');
        const pts = w.points > 0 ? `+${w.points}` : `${w.points}`;
        const icon = w.is_mvp ? '👑' : w.points > 0 ? '🏆' : '💀';
        return `${icon} ${w.category_name}: ${names} (${pts} pt)`;
      }),
    ];
    if (lore.length > 0) {
      lines.push('', '📖 Lore della serata:');
      lore.slice(0, 3).forEach(l => lines.push(`• "${l.content}"`));
    }
    await Share.share({ message: lines.join('\n') });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (serata?.status !== 'closed') {
    return (
      <View style={[styles.notReady, { backgroundColor: c.bg }]}>
        <Text style={{ fontSize: 48 }}>⏳</Text>
        <Text style={[styles.notReadyTitle, { color: c.text }]}>Recap non disponibile</Text>
        <Text style={[styles.notReadySub, { color: c.textSub }]}>
          Il recap apparirà quando il creatore avrà chiuso le votazioni del Tribunale.
        </Text>
      </View>
    );
  }

  // Separa MVP, bonus, malus
  const mvpEntry = winners.find(w => w.is_mvp);
  const bonusEntries = winners.filter(w => !w.is_mvp && w.points > 0);
  const malusEntries = winners.filter(w => w.points < 0);

  // Componente per una singola categoria-vincitore
  const WinnerCard = ({ w, highlight }: { w: CatWinner; highlight?: 'gold' | 'normal' | 'danger' }) => {
    const colorMap = { gold: c.gold, normal: c.accent, danger: c.danger };
    const bgMap    = { gold: c.goldMuted, normal: c.accentMuted, danger: c.dangerMuted };
    const color = colorMap[highlight ?? 'normal'];
    const bg    = bgMap[highlight ?? 'normal'];
    const isMVP = highlight === 'gold';

    return (
      <View style={[styles.winnerCard, { backgroundColor: c.surface, borderColor: c.border },
        isMVP && { borderColor: c.gold + '60', borderWidth: 2 }]}>
        <View style={styles.wHead}>
          <Text style={[styles.wCatName, { color: c.text }]}>
            {isMVP ? '👑 ' : ''}{w.category_name}
          </Text>
          <View style={[styles.wPoints, { backgroundColor: bg }]}>
            <Text style={[styles.wPointsText, { color }]}>{w.points > 0 ? `+${w.points}` : w.points} pt</Text>
          </View>
        </View>
        <View style={styles.wWinners}>
          {w.winners.map((winner, i) => (
            <View key={winner.user_id} style={[styles.wWinnerRow, { backgroundColor: bg }]}>
              <View style={[styles.wAvi, { backgroundColor: color + '40' }]}>
                <Text style={[styles.wAviText, { color }]}>{getName(winner.user_id)[0]?.toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.wName, { color: c.text }]}>{getName(winner.user_id)}</Text>
                <Text style={[styles.wVotes, { color: c.textSub }]}>{winner.votes} {winner.votes === 1 ? 'voto' : 'voti'}</Text>
              </View>
              {w.winners.length > 1 && i === 0 && (
                <View style={[styles.tieBadge, { backgroundColor: c.surface }]}>
                  <Text style={[styles.tieText, { color: c.textHint }]}>EX AEQUO</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{
        title: 'Recap',
        headerRight: () => (
          <TouchableOpacity onPress={handleShare} hitSlop={8} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={20} color={c.text} />
          </TouchableOpacity>
        ),
      }} />

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={[styles.heroLabel, { color: c.textHint }]}>RECAP SERATA</Text>
        <Text style={[styles.heroTitle, { color: c.text }]}>{serata?.title}</Text>
        <Text style={[styles.heroDate, { color: c.textSub }]}>{serata && fmtDate(serata.event_date)}</Text>
      </View>

      {winners.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={{ fontSize: 36 }}>🤷</Text>
          <Text style={[styles.emptyTitle, { color: c.text }]}>Nessun voto registrato</Text>
          <Text style={[styles.emptySub, { color: c.textSub }]}>Il Tribunale è stato chiuso senza voti.</Text>
        </View>
      ) : (
        <>
          {/* MVP in evidenza */}
          {mvpEntry && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.gold }]}>👑 MVP DELLA SERATA</Text>
              <WinnerCard w={mvpEntry} highlight="gold" />
            </View>
          )}

          {/* Altri premi */}
          {bonusEntries.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.accent }]}>🏆 ALTRI PREMI</Text>
              {bonusEntries.map(w => <WinnerCard key={w.category_id} w={w} highlight="normal" />)}
            </View>
          )}

          {/* Punizioni */}
          {malusEntries.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.danger }]}>💀 PUNIZIONI</Text>
              {malusEntries.map(w => <WinnerCard key={w.category_id} w={w} highlight="danger" />)}
            </View>
          )}
        </>
      )}

      {/* Lore */}
      {lore.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.textHint }]}>📖 LORE DELLA SERATA</Text>
          {lore.map(l => (
            <View key={l.id} style={[styles.loreCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.loreAuthor, { color: c.textHint }]}>{getName(l.author_id)}</Text>
              <Text style={[styles.loreContent, { color: c.text }]}>{l.content}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space['4xl'] },
  shareBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  hero: { alignItems: 'center', paddingVertical: space['2xl'], gap: 4 },
  heroLabel: { fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: 1 },
  heroTitle: { fontSize: t.size['3xl'], fontWeight: t.weight.bold, letterSpacing: -0.5, textAlign: 'center' },
  heroDate: { fontSize: t.size.sm, marginTop: 2 },
  section: { marginBottom: space['2xl'] },
  sectionLabel: { fontSize: t.size.xs, fontWeight: t.weight.bold, letterSpacing: 0.8, marginBottom: space.md, marginLeft: 4 },
  winnerCard: { borderRadius: radius.xl, borderWidth: 1, padding: space.lg, marginBottom: space.md },
  wHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  wCatName: { fontSize: t.size.base, fontWeight: t.weight.semibold, flex: 1, marginRight: 8 },
  wPoints: { borderRadius: radius.full, paddingHorizontal: space.md, paddingVertical: 4 },
  wPointsText: { fontSize: t.size.xs, fontWeight: t.weight.bold },
  wWinners: { gap: space.sm },
  wWinnerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, padding: space.md },
  wAvi: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  wAviText: { fontSize: t.size.md, fontWeight: t.weight.bold },
  wName: { fontSize: t.size.base, fontWeight: t.weight.semibold },
  wVotes: { fontSize: t.size.xs, marginTop: 1 },
  tieBadge: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.full },
  tieText: { fontSize: 9, fontWeight: t.weight.bold, letterSpacing: 0.5 },
  loreCard: { borderRadius: radius.xl, borderWidth: 1, padding: space.lg, marginBottom: space.sm, gap: 4 },
  loreAuthor: { fontSize: t.size.xs, fontWeight: t.weight.semibold },
  loreContent: { fontSize: t.size.base, lineHeight: 22, fontStyle: 'italic' },
  empty: { borderRadius: radius.xl, borderWidth: 1, padding: space.xl, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: t.size.lg, fontWeight: t.weight.semibold },
  emptySub: { fontSize: t.size.sm, textAlign: 'center' },
  notReady: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space['2xl'], gap: space.md },
  notReadyTitle: { fontSize: t.size.lg, fontWeight: t.weight.semibold },
  notReadySub: { fontSize: t.size.sm, textAlign: 'center', lineHeight: 20 },
});
