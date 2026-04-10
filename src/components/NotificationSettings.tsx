'use client';

import { useEffect, useState } from 'react';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed } from '@/lib/push';

interface Props {
  uid: string;
}

export default function NotificationSettings({ uid }: Props) {
  const [subscribed, setSubscribed]   = useState(false);
  const [supported, setSupported]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [toggling, setToggling]       = useState(false);
  const [permission, setPermission]   = useState<NotificationPermission>('default');

  useEffect(() => {
    const check = async () => {
      const isSupported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
      setSupported(isSupported);
      if (!isSupported) { setLoading(false); return; }
      setPermission(Notification.permission);
      const sub = await isPushSubscribed();
      setSubscribed(sub);
      setLoading(false);
    };
    check();
  }, []);

  async function handleToggle() {
    if (!uid || toggling) return;
    setToggling(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush(uid);
        setSubscribed(false);
      } else {
        const ok = await subscribeToPush(uid);
        setSubscribed(ok);
        setPermission(Notification.permission);
      }
    } finally {
      setToggling(false);
    }
  }

  if (!supported || loading) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 0',
    }}>
      <div>
        <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
          Daily word notifications
        </p>
        <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
          {permission === 'denied'
            ? 'Blocked in browser settings — enable in site permissions'
            : subscribed
            ? 'Word of the day at 07:00 every morning'
            : 'Get your daily word pushed to your home screen'}
        </p>
      </div>

      {permission !== 'denied' && (
        <button
          onClick={handleToggle}
          disabled={toggling}
          style={{
            position: 'relative',
            width: '48px', height: '26px',
            borderRadius: '13px',
            border: 'none',
            background: subscribed ? 'var(--teal)' : 'var(--border)',
            cursor: toggling ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute',
            top: '3px',
            left: subscribed ? '25px' : '3px',
            width: '20px', height: '20px',
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }} />
        </button>
      )}
    </div>
  );
}
