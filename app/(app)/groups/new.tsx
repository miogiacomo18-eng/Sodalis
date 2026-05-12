// app/(app)/groups/new.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateGroup } from '../../../hooks';
import { useAuthStore } from '../../../store';
import { Button } from '../../../components/ui';
import { Input } from '../../../components/ui/Input';
import { Colors, Spacing, Radius, FontSize, FontWeight, GROUP_EMOJIS } from '../../../constants/theme';
import type { CreateGroupForm } from '../../../types';

const schema = z.object({
  name:      z.string().min(1, 'Il nome è obbligatorio').max(50),
  emoji:     z.string().min(1),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colore non valido'),
});

const COLORS = [
  '#7C6AF7','#F97316','#10B981','#F43F5E',
  '#0EA5E9','#A855F7','#EAB308','#EC4899',
];

export default function NewGroupScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const createGroup = useCreateGroup();
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const { control, handleSubmit } = useForm<CreateGroupForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:      '',
      emoji:     '🍕',
      color_hex: '#7C6AF7',
    },
  });

async function onSubmit(data: CreateGroupForm) {
  console.log('onSubmit chiamato, profile:', profile?.id);
  if (!profile) {
    Alert.alert('Errore', 'Profilo non caricato. Riprova.');
    return;
  }
  try {
    console.log('Chiamo createGroup con:', data, profile.id);
    const group = await createGroup.mutateAsync({ form: data, userId: profile.id });
    console.log('Gruppo creato:', group.id);
    setCreatedCode(group.invite_code);
  } catch (err) {
    console.error('ERRORE CREAZIONE GRUPPO:', err);
    Alert.alert('Errore', err instanceof Error ? err.message : 'Impossibile creare il gruppo.');
  }
}
  if (createdCode) {
    return (
      <View style={styles.success}>
        <Text style={styles.success_emoji}>🎉</Text>
        <Text style={styles.success_title}>Gruppo creato!</Text>
        <Text style={styles.success_sub}>
          Condividi questo codice con i tuoi amici per farli entrare.
        </Text>
        <View style={styles.code_box}>
          <Text style={styles.code}>{createdCode}</Text>
        </View>
        <Button
          title="Condividi codice"
          onPress={() => Share.share({ message: `Entra in Sodalis con il codice: ${createdCode}` })}
          variant="secondary"
        />
        <Button title="Vai al gruppo" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Indietro</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Nuovo gruppo</Text>

      <Controller
        control={control}
        name="name"
        render={({ field, fieldState }) => (
          <Input
            label="Nome del gruppo"
            placeholder="es. I soliti idioti"
            value={field.value}
            onChangeText={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />

      <Text style={styles.section_label}>Emoji</Text>
      <Controller
        control={control}
        name="emoji"
        render={({ field }) => (
          <View style={styles.emoji_grid}>
            {GROUP_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.emoji_btn, field.value === e && styles.emoji_btn_selected]}
                onPress={() => field.onChange(e)}
              >
                <Text style={styles.emoji_text}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      <Text style={styles.section_label}>Colore</Text>
      <Controller
        control={control}
        name="color_hex"
        render={({ field }) => (
          <View style={styles.color_row}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.color_btn,
                  { backgroundColor: c },
                  field.value === c && styles.color_btn_selected,
                ]}
                onPress={() => field.onChange(c)}
              />
            ))}
          </View>
        )}
      />

      <Button
        title="Crea gruppo"
        onPress={handleSubmit(onSubmit)}
        loading={createGroup.isPending}
        style={{ marginTop: Spacing.lg }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: Spacing.lg, paddingTop: 60, gap: Spacing.lg },
  nav:       { marginBottom: Spacing.sm },
  back:      { fontSize: FontSize.lg, color: Colors.primary },
  title:     { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  section_label: {
    fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary,
  },
  emoji_grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  emoji_btn: {
    width: 48, height: 48, borderRadius: Radius.md,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  emoji_btn_selected: { borderColor: Colors.primary, borderWidth: 2 },
  emoji_text: { fontSize: 24 },
  color_row: { flexDirection: 'row', gap: Spacing.sm },
  color_btn: { width: 36, height: 36, borderRadius: 18 },
  color_btn_selected: { borderWidth: 3, borderColor: Colors.textPrimary },
  success: {
    flex: 1, backgroundColor: Colors.background,
    padding: Spacing.lg, alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
  },
  success_emoji: { fontSize: 56 },
  success_title: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  success_sub:   { fontSize: FontSize.md, color: Colors.textSecondary, textAlign: 'center' },
  code_box: {
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.lg, padding: Spacing.lg, marginVertical: Spacing.sm,
  },
  code: {
    fontSize: 36, fontWeight: FontWeight.extrabold, color: Colors.primary,
    letterSpacing: 8, textAlign: 'center',
  },
});
