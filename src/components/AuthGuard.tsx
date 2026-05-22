'use client';

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { onAuth }              from '@/lib/auth';
import { User }                from 'firebase/auth';
import { Spinner }             from '@/components/Spinner';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | 'loading'>('loading');
  const router          = useRouter();

  useEffect(() => {
    return onAuth((u) => {
      setUser(u);
      if (!u) router.replace('/');
    });
  }, [router]);

  if (user === 'loading') {
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
