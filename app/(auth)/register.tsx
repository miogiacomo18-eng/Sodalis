import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { space, radius, type as t } from '../../constants/tokens';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { c } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password || !confirm) { Alert.alert('Campi mancanti', 'Compila tutti i campi.'); return; }
    if (username.length < 3) { Alert.alert('Username troppo corto', 'Minimo 3 caratteri.'); return; }
    if (password !== confirm) { Alert.alert('Password', 'Le password non coincidono.'); return; }
    if (password.length < 6) { Alert.alert('Password', 'Minimo 6 caratteri.'); return; }
    setLoading(true);
    try {
      await signUp(email.trim(), password, username.trim().toLowerCase());
      Alert.alert('Fatto!', "Controlla la tua email per confermare l'account.");
    } catch (e: any) { Alert.alert('Errore', e.message ?? 'Riprova più tardi.'); }
    finally { setLoading(false); }
  };

  const field = (label: string, hint: string, value: string, onChange: (v: string) => void, props?: any) => (
    <View style={{ gap: space.xs }}>
      <Text style={[styles.label, { color: c.textSub }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.text }]}
        placeholder={hint} placeholderTextColor={c.textHint}
        value={value} onChangeText={onChange} {...props}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>Crea account</Text>
          <Text style={[styles.sub, { color: c.textSub }]}>Unisciti al gruppo</Text>
        </View>

        <View style={{ gap: space.md }}>
          {field('Username', 'il_tuo_nome', username, setUsername, { autoCapitalize: 'none', autoCorrect: false, maxLength: 30 })}
          {field('Email', 'nome@email.com', email, setEmail, { autoCapitalize: 'none', keyboardType: 'email-address' })}
          {field('Password', 'Minimo 6 caratteri', password, setPassword, { secureTextEntry: true })}
          {field('Conferma password', 'Ripeti la password', confirm, setConfirm, { secureTextEntry: true })}
        </View>

        <Pressable style={[styles.btn, { backgroundColor: c.accent }, loading && { opacity: 0.6 }]}
          onPress={handleRegister} disabled={loading}>
          <Text style={styles.btnText}>{loading ? 'Creazione…' : 'Crea account'}</Text>
        </Pressable>

        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.link}>
            <Text style={[styles.linkText, { color: c.textSub }]}>
              Hai già un account?{' '}
              <Text style={{ color: c.accent, fontWeight: '600' }}>Accedi</Text>
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  inner: { flexGrow: 1, justifyContent: 'center', padding: space['2xl'], gap: space.lg },
  header: { gap: space.xs, marginBottom: space.sm },
  title: { fontSize: t.size['2xl'], fontWeight: t.weight.bold, letterSpacing: -0.4 },
  sub: { fontSize: t.size.base },
  label: { fontSize: t.size.sm, fontWeight: t.weight.medium },
  input: { borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: 14, fontSize: t.size.base, borderWidth: 1 },
  btn: { borderRadius: radius.lg, paddingVertical: 14, alignItems: 'center', marginTop: space.sm },
  btnText: { color: '#fff', fontSize: t.size.base, fontWeight: t.weight.semibold },
  link: { alignItems: 'center', paddingVertical: space.md },
  linkText: { fontSize: t.size.sm },
});
