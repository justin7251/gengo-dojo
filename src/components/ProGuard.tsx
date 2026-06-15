'use client';

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { onAuth }              from '@/lib/auth';
import { getUserProfile }      from '@/lib/firestore';
import { isProUser }           from '@/lib/types';
import { Spinner }             from '@/components/Spinner';

// Gates an entire route (and everything nested under it) behind
// profile.isPro. Signed-out users are sent to '/', signed-in but
// non-pro users are sent to '/dashboard' — so the route behaves
// as if it doesn't exist for them.
export default function ProGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'allowed'>('loading');
  const router               = useRouter();

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) { router.replace('/'); return; }

      const profile = await getUserProfile(user.uid);
      if (isProUser(profile)) {
        setStatus('allowed');
      } else {
        router.replace('/dashboard');
      }
    });
  }, [router]);

  if (status !== 'allowed') {
    return (
      <div style={{
        minHeight:       '100vh',
        background:      'var(--bg)',
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             '16px',
        fontFamily:      'var(--font-ui)',
      }}>
        <div style={{ fontSize: '42px', animation: 'float 1.8s ease-in-out infinite' }}>
          🏯
        </div>
        <Spinner size={36} color="var(--green)" />
        <p style={{
          fontSize:   '14px',
          fontWeight: '700',
          color:      'var(--muted)',
          letterSpacing: '0.04em',
        }}>
          Loading dojo…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
