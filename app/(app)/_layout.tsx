import { Stack } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
export default function AppLayout() {
  const { c } = useTheme();
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: c.bg },
      headerTintColor: c.text,
      headerTitleStyle: { fontWeight: '600', fontSize: 16 },
      headerShadowVisible: false,
      contentStyle: { backgroundColor: c.bg },
      headerBackTitleStyle: { fontSize: 14 },
    }}>
      <Stack.Screen name="index" options={{ title: 'I tuoi gruppi' }} />
      <Stack.Screen name="profile" options={{ title: 'Profilo', presentation: 'modal' }} />
      <Stack.Screen name="group/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="group-settings/[id]" options={{ title: 'Impostazioni gruppo', presentation: 'modal' }} />
      <Stack.Screen name="group-categories/[id]" options={{ title: 'Categorie personalizzate', presentation: 'modal' }} />
      <Stack.Screen name="serata/[serataId]" options={{ title: 'Dettaglio Serata' }} />
      <Stack.Screen name="tribunale/[serataId]" options={{ title: '⚖️ Il Tribunale' }} />
      <Stack.Screen name="recap/[serataId]" options={{ title: '🎉 Recap' }} />
    </Stack>
  );
}
