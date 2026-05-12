// app/(app)/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="groups/index"   />
      <Stack.Screen name="groups/new"     options={{ presentation: 'modal' }} />
      <Stack.Screen name="groups/[id]"    />
      <Stack.Screen name="profile"        options={{ presentation: 'modal' }} />
    </Stack>
  );
}
