// app/auth.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui';
import { Input } from '../components/ui/Input';
import { Colors, Spacing, FontSize, FontWeight } from '../constants/theme';
import type { SignInForm, SignUpForm } from '../types';

const signInSchema = z.object({
  email:    z.string().email('Email non valida'),
  password: z.string().min(6, 'Password minimo 6 caratteri'),
});

const signUpSchema = z.object({
  email:        z.string().email('Email non valida'),
  password:     z.string().min(6, 'Password minimo 6 caratteri'),
  display_name: z.string().min(1, 'Il nome è obbligatorio').max(50),
});

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', display_name: '' },
  });

  async function handleSignIn(data: SignInForm) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email:    data.email,
      password: data.password,
    });
    setLoading(false);
    if (error) Alert.alert('Errore', error.message);
  }

  async function handleSignUp(data: SignUpForm) {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email:    data.email,
      password: data.password,
      options:  { data: { display_name: data.display_name } },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Errore', error.message);
    } else {
      Alert.alert(
        'Controlla la tua email',
        'Ti abbiamo inviato un link di conferma.'
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.header}>
          <Text style={styles.logo}>sodalis</Text>
          <Text style={styles.tagline}>la memoria del tuo gruppo</Text>
        </View>

        {/* Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggle_btn, mode === 'signin' && styles.toggle_btn_active]}
            onPress={() => setMode('signin')}
          >
            <Text style={[styles.toggle_text, mode === 'signin' && styles.toggle_text_active]}>
              Accedi
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggle_btn, mode === 'signup' && styles.toggle_btn_active]}
            onPress={() => setMode('signup')}
          >
            <Text style={[styles.toggle_text, mode === 'signup' && styles.toggle_text_active]}>
              Crea account
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sign In Form */}
        {mode === 'signin' && (
          <View style={styles.form}>
            <Controller
              control={signInForm.control}
              name="email"
              render={({ field, fieldState }) => (
                <Input
                  label="Email"
                  placeholder="tu@esempio.it"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={signInForm.control}
              name="password"
              render={({ field, fieldState }) => (
                <Input
                  label="Password"
                  placeholder="••••••••"
                  secureTextEntry
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Button
              title="Accedi"
              onPress={signInForm.handleSubmit(handleSignIn)}
              loading={loading}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        )}

        {/* Sign Up Form */}
        {mode === 'signup' && (
          <View style={styles.form}>
            <Controller
              control={signUpForm.control}
              name="display_name"
              render={({ field, fieldState }) => (
                <Input
                  label="Come ti chiamano"
                  placeholder="Il tuo nome"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={signUpForm.control}
              name="email"
              render={({ field, fieldState }) => (
                <Input
                  label="Email"
                  placeholder="tu@esempio.it"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={signUpForm.control}
              name="password"
              render={({ field, fieldState }) => (
                <Input
                  label="Password"
                  placeholder="••••••••"
                  secureTextEntry
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Button
              title="Crea account"
              onPress={signUpForm.handleSubmit(handleSignUp)}
              loading={loading}
              style={{ marginTop: Spacing.sm }}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    padding: Spacing.lg,
    paddingTop: 80,
    gap: Spacing.lg,
    flexGrow: 1,
  },
  header: { alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.lg },
  logo: {
    fontSize: 42,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggle_btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggle_btn_active: { backgroundColor: Colors.primary },
  toggle_text: { fontSize: FontSize.md, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  toggle_text_active: { color: Colors.textPrimary },
  form: { gap: Spacing.md },
});
