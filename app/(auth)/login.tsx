import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, type as t } from '../../constants/tokens';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { c } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Campi mancanti', 'Inserisci email e password.'); return; }
    setLoading(true);
    try { await signIn(email.trim(), password); }
    catch (e: any) { Alert.alert('Accesso negato', e.message ?? 'Riprova più tardi.'); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoBlock}>
          <View style={[styles.logoIcon, { backgroundColor: c.accentMuted }]}>
            <Text style={[styles.logoEmoji]}>⚔️</Text>
          </View>
          <Text style={[styles.appName, { color: c.text }]}>Sodalis</Text>
          <Text style={[styles.tagline, { color: c.textSub }]}>Bentornato nel gruppo</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={[styles.label, { color: c.textSub }]}>Email</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
            placeholder="nome@email.com" placeholderTextColor={c.textHint}
            autoCapitalize="none" keyboardType="email-address"
            value={email} onChangeText={setEmail}
          />
          <Text style={[styles.label, { color: c.textSub }]}>Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
            placeholder="••••••••" placeholderTextColor={c.textHint}
            secureTextEntry value={password} onChangeText={setPassword}
          />
          <Pressable
            style={[styles.btn, { backgroundColor: c.accent }, loading && { opacity: 0.6 }]}
            onPress={handleLogin} disabled={loading}
          >
            <Text style={styles.btnText}>{loading ? 'Accesso…' : 'Accedi'}</Text>
          </Pressable>
        </View>

        <Link href="/(auth)/register" asChild>
          <Pressable style={styles.link}>
            <Text style={[styles.linkText, { color: c.textSub }]}>
              Non hai un account?{' '}
              <Text style={{ color: c.accent, fontWeight: '600' }}>Registrati</Text>
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: space['2xl'], gap: space.md },
  logoBlock: { alignItems: 'center', marginBottom: space.xl, gap: space.sm },
  logoIcon: { width: 64, height: 64, borderRadius: radius.xl, justifyContent: 'center', alignItems: 'center', marginBottom: space.xs },
  logoEmoji: { fontSize: 28 },
  appName: { fontSize: t.size['3xl'], fontWeight: t.weight.bold, letterSpacing: -0.5 },
  tagline: { fontSize: t.size.base },
  form: { gap: space.sm },
  label: { fontSize: t.size.sm, fontWeight: t.weight.medium, marginBottom: -space.xs },
  input: { borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: 14, fontSize: t.size.base, borderWidth: 1 },
  btn: { borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center', marginTop: space.xs },
  btnText: { color: '#fff', fontSize: t.size.base, fontWeight: t.weight.semibold },
  link: { alignItems: 'center', paddingVertical: space.md },
  linkText: { fontSize: t.size.sm },
});
