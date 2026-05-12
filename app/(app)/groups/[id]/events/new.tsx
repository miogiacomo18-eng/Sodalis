// app/(app)/groups/[id]/events/new.tsx
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateEvent } from '../../../../../hooks';
import { useAuthStore } from '../../../../../store';
import { Button } from '../../../../../components/ui';
import { Input } from '../../../../../components/ui/Input';
import { DatePicker } from '../../../../../components/ui/DatePicker';
import { Colors, Spacing, FontSize, FontWeight } from '../../../../../constants/theme';
import type { CreateEventForm } from '../../../../../types';

const schema = z.object({
  name:       z.string().min(1, 'Il nome è obbligatorio').max(80),
  event_date: z.string().min(1, 'La data è obbligatoria'),
  location:   z.string().max(100).optional(),
});

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export default function NewEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const createEvent = useCreateEvent();

  const { control, handleSubmit } = useForm<CreateEventForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', event_date: todayISO(), location: '' },
  });

  async function onSubmit(data: CreateEventForm) {
    if (!profile) return;
    try {
      const event = await createEvent.mutateAsync({
        groupId: id,
        userId:  profile.id,
        form:    {
          name:       data.name,
          event_date: data.event_date,
          location:   data.location || undefined,
        },
      });
      router.replace(`/(app)/groups/${id}/events/${event.id}`);
    } catch {
      Alert.alert('Errore', 'Impossibile creare la serata.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Indietro</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Nuova serata</Text>
      <Text style={styles.subtitle}>Dai un nome a questa serata. La ricorderete.</Text>

      <View style={styles.form}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              label="Nome serata"
              placeholder="es. Sabato al Barretto"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="event_date"
          render={({ field, fieldState }) => (
            <DatePicker
              label="Data della serata"
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="location"
          render={({ field, fieldState }) => (
            <Input
              label="Luogo (opzionale)"
              placeholder="es. Casa di Luca"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Button
          title="Crea serata"
          onPress={handleSubmit(onSubmit)}
          loading={createEvent.isPending}
          style={{ marginTop: Spacing.sm }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: Spacing.lg, paddingTop: 60, gap: Spacing.lg },
  nav:       { marginBottom: Spacing.sm },
  back:      { fontSize: FontSize.lg, color: Colors.primary },
  title:     { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle:  { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: -Spacing.sm },
  form:      { gap: Spacing.md },
});
