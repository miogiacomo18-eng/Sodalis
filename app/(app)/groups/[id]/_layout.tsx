// app/(app)/groups/[id]/_layout.tsx
import React, { useEffect } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Tabs, useLocalSearchParams, useRouter } from 'expo-router';
import { useGroups } from '../../../../hooks';
import { useGroupStore } from '../../../../store';
import { Colors, FontSize } from '../../../../constants/theme';

export default function GroupLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: groups } = useGroups();
  const setActiveGroup = useGroupStore((s) => s.setActiveGroup);
  const group = useGroupStore((s) => s.activeGroup);
  const router = useRouter();

  useEffect(() => {
    if (groups && id) {
      const g = groups.find((g) => g.id === id);
      if (g) setActiveGroup(g);
    }
  }, [groups, id]);

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors.surface,
          borderBottomColor: Colors.border,
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          color: Colors.textPrimary,
          fontSize: FontSize.lg,
          fontWeight: '600',
        },
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.push('/(app)/groups')}
            style={{ paddingHorizontal: 16 }}
          >
            <Text style={{ color: Colors.primary, fontSize: FontSize.lg }}>‹ Gruppi</Text>
          </TouchableOpacity>
        ),
        headerTitle: group?.name ?? '',
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor:  Colors.border,
          borderTopWidth:  1,
          paddingBottom:   8,
          height:          60,
        },
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle:        { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title:      'Home',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="lore/index"
        options={{
          title:      'Lore',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📖</Text>,
        }}
      />
      <Tabs.Screen
        name="debts/index"
        options={{
          title:      'Debiti',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🤝</Text>,
        }}
      />
      <Tabs.Screen
        name="events/index"
        options={{
          title:      'Serate',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🌙</Text>,
        }}
      />
      <Tabs.Screen
        name="classifica/index"
        options={{
          title:      'Classifica',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏆</Text>,
        }}
      />
      {/* Schermate fuori dalla tab bar */}
      <Tabs.Screen name="events/new"                              options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="events/[eventId]/index"                  options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="events/[eventId]/tribunal/index"         options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="events/[eventId]/tribunal/results"       options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="lore/new"                                options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="members/index"                           options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="settings"                                options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}
