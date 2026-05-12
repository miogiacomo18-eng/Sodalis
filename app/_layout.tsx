import React, { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { queryClient } from '../lib/queryClient';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store';
import type { Session } from '@supabase/supabase-js';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const setProfile = useAuthStore((s) => s.setProfile);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (_event, s) => {
    console.log('Auth event:', _event, 'session:', !!s);
    setSession(s);
    if (s?.user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', s.user.id)
        .single();
      console.log('Profile loaded:', data?.id, 'error:', error?.message);
      if (data) setProfile(data);
    } else {
      setProfile(null);
    }
  }
);

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    const inAuthScreen = segments[0] === 'auth';
    if (!session && !inAuthScreen) {
      router.replace('/auth');
    } else if (session && inAuthScreen) {
      router.replace('/(app)/groups');
    }
  }, [session, segments]);

  if (session === undefined) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Slot />
    </QueryClientProvider>
  );
}