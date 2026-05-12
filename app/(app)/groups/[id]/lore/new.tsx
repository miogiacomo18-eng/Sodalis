// app/(app)/groups/[id]/lore/new.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useCreateLore, useEvents, uploadImage } from '../../../../../hooks';
import { useAuthStore } from '../../../../../store';
import { Button } from '../../../../../components/ui';
import { Input } from '../../../../../components/ui/Input';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../../../../constants/theme';
import type { CreateLoreForm, LoreType } from '../../../../../types';

const schema = z.object({
  type:     z.enum(['text', 'quote', 'photo']),
  title:    z.string().min(1, 'Il titolo è obbligatorio').max(80),
  content:  z.string().min(1, 'Il contenuto è obbligatorio'),
  event_id: z.string().optional(),
});

const TYPES: Array<{ value: LoreType; label: string; icon: string }> = [
  { value: 'text',  label: 'Testo',     icon: '📝' },
  { value: 'quote', label: 'Citazione', icon: '💬' },
  { value: 'photo', label: 'Foto',      icon: '📸' },
];

export default function NewLoreScreen() {
  const { id, eventId: preselectedEventId } = useLocalSearchParams<{
    id: string;
    eventId?: string;
  }>();
  const router  = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const createLore = useCreateLore();
  const { data: events } = useEvents(id);

  const [photoUri,      setPhotoUri]      = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { control, handleSubmit, watch, setValue } = useForm<CreateLoreForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      type:     'text',
      title:    '',
      content:  '',
      event_id: preselectedEventId ?? '',
    },
  });

  const loreType = watch('type');

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso negato', 'Consenti l\'accesso alla galleria nelle impostazioni.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !profile) return;

    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setUploadingPhoto(true);
    try {
      const path      = `${profile.id}/${Date.now()}.jpg`;
      const publicUrl = await uploadImage('lore-photos', path, asset.uri);
      setValue('content', publicUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setPhotoUri(null);
      Alert.alert('Errore', e?.message ?? 'Impossibile caricare la foto.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function onSubmit(data: CreateLoreForm) {
    if (!profile) return;
    try {
      await createLore.mutateAsync({
        groupId: id,
        userId:  profile.id,
        form:    {
          type:     data.type,
          title:    data.title,
          content:  data.content,
          event_id: data.event_id || undefined,
        },
      });
      router.back();
    } catch {
      Alert.alert('Errore', 'Impossibile salvare la lore.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.nav}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>‹ Indietro</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Aggiungi alla Lore</Text>
        <Text style={styles.subtitle}>Salva questo momento nella memoria del gruppo.</Text>

        {/* Selettore tipo */}
        <View style={styles.type_row}>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <>
                {TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.type_btn,
                      field.value === t.value && styles.type_btn_active,
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      field.onChange(t.value);
                      // Reset contenuto foto quando si cambia tipo
                      if (t.value !== 'photo') {
                        setPhotoUri(null);
                        setValue('content', '');
                      }
                    }}
                  >
                    <Text style={styles.type_icon}>{t.icon}</Text>
                    <Text style={[
                      styles.type_label,
                      field.value === t.value && styles.type_label_active,
                    ]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          />
        </View>

        <View style={styles.form}>
          {/* Titolo */}
          <Controller
            control={control}
            name="title"
            render={({ field, fieldState }) => (
              <Input
                label="Titolo"
                placeholder={
                  loreType === 'quote' ? 'Chi l\'ha detta?' :
                  loreType === 'photo' ? 'Descrivi la foto' :
                  'Dai un nome a questo momento'
                }
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          {/* Contenuto: testo/citazione = textarea, foto = upload */}
          {loreType === 'photo' ? (
            <Controller
              control={control}
              name="content"
              render={({ field, fieldState }) => (
                <View>
                  <Text style={styles.field_label}>Foto</Text>

                  {/* Preview foto */}
                  {(photoUri || field.value) ? (
                    <View style={styles.photo_preview_wrapper}>
                      <Image
                        source={{ uri: photoUri ?? field.value }}
                        style={styles.photo_preview}
                        resizeMode="cover"
                      />
                      {uploadingPhoto && (
                        <View style={styles.upload_overlay}>
                          <ActivityIndicator color={Colors.textPrimary} />
                          <Text style={styles.upload_text}>Caricamento...</Text>
                        </View>
                      )}
                    </View>
                  ) : null}

                  <Button
                    title={photoUri ? 'Cambia foto' : '📷 Scegli dalla galleria'}
                    onPress={handlePickPhoto}
                    variant="secondary"
                    loading={uploadingPhoto}
                    style={{ marginTop: Spacing.sm }}
                  />

                  {fieldState.error && (
                    <Text style={styles.error_text}>{fieldState.error.message}</Text>
                  )}
                </View>
              )}
            />
          ) : (
            <Controller
              control={control}
              name="content"
              render={({ field, fieldState }) => (
                <Input
                  label={loreType === 'quote' ? 'La frase' : 'Cosa è successo'}
                  placeholder={
                    loreType === 'quote' ? '"Quella volta che..."' : 'Racconta...'
                  }
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                  multiline
                  numberOfLines={4}
                  style={styles.textarea}
                />
              )}
            />
          )}

          {/* Collega a serata */}
          {events && events.length > 0 && (
            <View>
              <Text style={styles.field_label}>Collega a una serata (opzionale)</Text>
              <Controller
                control={control}
                name="event_id"
                render={({ field }) => (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.events_row}>
                      <TouchableOpacity
                        style={[styles.event_chip, !field.value && styles.event_chip_active]}
                        onPress={() => field.onChange('')}
                      >
                        <Text style={styles.event_chip_text}>Nessuna</Text>
                      </TouchableOpacity>
                      {events.map((ev) => (
                        <TouchableOpacity
                          key={ev.id}
                          style={[
                            styles.event_chip,
                            field.value === ev.id && styles.event_chip_active,
                          ]}
                          onPress={() => field.onChange(ev.id)}
                        >
                          <Text style={styles.event_chip_text}>{ev.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                )}
              />
            </View>
          )}

          <Button
            title="Salva nella Lore"
            onPress={handleSubmit(onSubmit)}
            loading={createLore.isPending}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: Spacing.lg, paddingTop: 60, gap: Spacing.lg },
  nav:       { marginBottom: Spacing.sm },
  back:      { fontSize: FontSize.lg, color: Colors.primary },
  title:     { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  subtitle:  { fontSize: FontSize.md, color: Colors.textSecondary, marginTop: -Spacing.sm },

  type_row: { flexDirection: 'row', gap: Spacing.sm },
  type_btn: {
    flex: 1, alignItems: 'center', padding: Spacing.sm,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  type_btn_active: { borderColor: Colors.primary, backgroundColor: Colors.primaryDim },
  type_icon:       { fontSize: 20 },
  type_label: { fontSize: FontSize.xs, color: Colors.textTertiary, fontWeight: FontWeight.medium },
  type_label_active: { color: Colors.primaryLight },

  form:     { gap: Spacing.md },
  textarea: { minHeight: 100, textAlignVertical: 'top' },

  field_label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary, marginBottom: Spacing.sm },

  photo_preview_wrapper: {
    borderRadius: Radius.lg, overflow: 'hidden',
    position: 'relative',
  },
  photo_preview: {
    width: '100%', height: 200,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceHigh,
  },
  upload_overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
  },
  upload_text: { fontSize: FontSize.sm, color: Colors.textPrimary },
  error_text: { fontSize: FontSize.xs, color: Colors.error, marginTop: 4 },

  events_row: { flexDirection: 'row', gap: Spacing.sm, paddingBottom: Spacing.xs },
  event_chip: {
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    borderWidth: 1, borderColor: Colors.border,
  },
  event_chip_active: { borderColor: Colors.primary, backgroundColor: Colors.primaryDim },
  event_chip_text: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
