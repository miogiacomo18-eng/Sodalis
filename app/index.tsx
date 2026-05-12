import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/ui';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingSpinner full />;
  if (hasSession) return <Redirect href="/(app)/groups" />;
  return <Redirect href="/auth" />;
}