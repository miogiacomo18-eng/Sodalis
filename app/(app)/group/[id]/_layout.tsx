import { Tabs, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { supabase } from '../../../../lib/supabase';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function GroupTabLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const [groupName, setGroupName] = useState('Gruppo');

  useEffect(() => {
    if (!id) return;
    supabase.from('groups').select('name').eq('id',id).single()
      .then(({ data }) => { if (data) setGroupName(data.name); });
  }, [id]);

  const icon = (name: IconName, focused: boolean, size: number, color: string) => (
    <Ionicons name={focused ? name : `${name}-outline` as IconName} size={size} color={color} />
  );

  return (
    <>
      <Stack.Screen options={{
        title: groupName,
        headerShown: true,
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '600', fontSize: 16 },
        headerShadowVisible: false,
        headerRight: () => (
          <TouchableOpacity hitSlop={8} style={styles.btn}
            onPress={() => router.push({ pathname:'/(app)/group-settings/[id]', params:{ id } })}>
            <Ionicons name="settings-outline" size={20} color={c.text} />
          </TouchableOpacity>
        ),
      }} />
      <Tabs screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: c.tabBar, borderTopColor: c.border, borderTopWidth: 1, height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textHint,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}>
        <Tabs.Screen name="lore"       options={{ title:'Lore',      tabBarIcon: p => icon('book',p.focused,p.size,p.color) }} />
        <Tabs.Screen name="debiti"     options={{ title:'Debiti',    tabBarIcon: p => icon('swap-horizontal',p.focused,p.size,p.color) }} />
        <Tabs.Screen name="serate"     options={{ title:'Serate',    tabBarIcon: p => icon('calendar',p.focused,p.size,p.color) }} />
        <Tabs.Screen name="classifica" options={{ title:'Classifica',tabBarIcon: p => icon('trophy',p.focused,p.size,p.color) }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { width:40, height:40, alignItems:'center', justifyContent:'center', marginRight:4 },
});
