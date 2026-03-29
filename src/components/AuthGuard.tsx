'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { User } from 'firebase/auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | 'loading'>('loading');
  const router = useRouter();

  useEffect(() => {
    return onAuth((u) => {
      setUser(u);
      if (!u) router.replace('/');
    });
  }, [router]);

  if (user === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}