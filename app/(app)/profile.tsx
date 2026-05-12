// app/(app)/profile.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useUpdateProfile, useUpdateAvatar, uploadImage } from '../../hooks';
import { useAuthStore } from '../../store';
import { supabase } from '../../lib/supabase';
import { Button, Avatar, Divider } from '../../components/ui';
import { Input } from '../../components/ui/Input';
import { Colors, Spacing, FontSize, FontWeight, Radius } from '../../constants/theme';
import type { UpdateProfileForm } from '../../types';

const schema = z.object({
  display_name: z.string().min(1, 'Il nome è obbligatorio').max(50),
  username:     z.string().min(2, 'Username minimo 2 caratteri').max(30)
                  .regex(/^[a-z0-9_]+$/, 'Solo lettere minuscole, numeri e _'),
});

export default function ProfileScreen() {
  const profile    = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const updateProfile = useUpdateProfile();
  const updateAvatar  = useUpdateAvatar();
  const [loggingOut,     setLoggingOut]     = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const { control, handleSubmit } = useForm<UpdateProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      display_name: profile?.display_name ?? '',
      username:     profile?.username ?? '',
    },
  });

  async function onSubmit(data: UpdateProfileForm) {
    if (!profile) return;
    try {
      const updated = await updateProfile.mutateAsync({ userId: profile.id, form: data });
      setProfile(updated);
      Alert.alert('Salvato', 'Profilo aggiornato.');
    } catch {
      Alert.alert('Errore', 'Impossibile aggiornare il profilo. Username già in uso?');
    }
  }

  async function handlePickAvatar() {
    if (!profile) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso negato', 'Consenti l\'accesso alla galleria nelle impostazioni.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const path     = `${profile.id}/avatar.jpg`;
      const publicUrl = await uploadImage('avatars', path, asset.uri);
      const updated  = await updateAvatar.mutateAsync({ userId: profile.id, avatarUrl: publicUrl });
      setProfile(updated);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert('Errore', e?.message ?? 'Impossibile caricare la foto.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleLogout() {
    Alert.alert('Logout', 'Sei sicuro di voler uscire?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Esci',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await supabase.auth.signOut();
          setProfile(null);
          setLoggingOut(false);
        },
      },
    ]);
  }

  if (!profile) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profilo</Text>

      {/* Avatar con bottone modifica */}
      <View style={styles.avatar_section}>
        <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar} style={styles.avatar_wrapper}>
          <Avatar profile={profile} size={88} />
          <View style={styles.avatar_edit_badge}>
            <Text style={styles.avatar_edit_icon}>{uploadingAvatar ? '⏳' : '📷'}</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.display_name}>{profile.display_name}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        <Text style={styles.avatar_hint}>Tocca la foto per cambiarla</Text>
      </View>

      <Divider />

      {/* Edit form */}
      <View style={styles.form}>
        <Text style={styles.section_title}>Modifica profilo</Text>

        <Controller
          control={control}
          name="display_name"
          render={({ field, fieldState }) => (
            <Input
              label="Nome visualizzato"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="username"
          render={({ field, fieldState }) => (
            <Input
              label="Username"
              value={field.value}
              onChangeText={(t) => field.onChange(t.toLowerCase())}
              autoCapitalize="none"
              error={fieldState.error?.message}
              hint="Solo lettere minuscole, numeri e underscore"
            />
          )}
        />

        <Button
          title="Salva modifiche"
          onPress={handleSubmit(onSubmit)}
          loading={updateProfile.isPending}
        />
      </View>

      <Divider />

      <Button
        title="Logout"
        onPress={handleLogout}
        variant="danger"
        loading={loggingOut}
      />

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  content:      { padding: Spacing.lg, paddingTop: 60, gap: Spacing.lg },
  title:        { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  avatar_section: { alignItems: 'center', gap: Spacing.xs, padding: Spacing.md },
  avatar_wrapper: { position: 'relative', marginBottom: Spacing.xs },
  avatar_edit_badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  avatar_edit_icon: { fontSize: 13 },
  display_name: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: Spacing.xs },
  username:     { fontSize: FontSize.md, color: Colors.textSecondary },
  avatar_hint:  { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  section_title: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  form:         { gap: Spacing.md },
});
