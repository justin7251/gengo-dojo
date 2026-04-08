'use client';

// ── Register service worker ───────────────────────────

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[SW] registered:', reg.scope);
    return reg;
  } catch (err) {
    console.error('[SW] registration failed:', err);
    return null;
  }
}

// ── Request notification permission ──────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

// ── Subscribe to push ─────────────────────────────────

export async function subscribeToPush(uid: string): Promise<boolean> {
  try {
    const reg = await registerServiceWorker();
    if (!reg) return false;

    const granted = await requestNotificationPermission();
    if (!granted) return false;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      console.error('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set');
      return false;
    }

    // Check existing subscription
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Already subscribed — sync with server
      await saveSubscription(uid, existing);
      return true;
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
    });

    await saveSubscription(uid, subscription);
    return true;
  } catch (err) {
    console.error('[Push] subscribe failed:', err);
    return false;
  }
}

// ── Unsubscribe ───────────────────────────────────────

export async function unsubscribeFromPush(uid: string): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) return false;

    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return true;

    await subscription.unsubscribe();
    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid }),
    });
    return true;
  } catch (err) {
    console.error('[Push] unsubscribe failed:', err);
    return false;
  }
}

// ── Check subscription status ─────────────────────────

export async function isPushSubscribed(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;

  try {
    const reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

// ── Helpers ───────────────────────────────────────────

async function saveSubscription(uid: string, subscription: PushSubscription) {
  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, subscription: subscription.toJSON() }),
  });
  if (!res.ok) throw new Error('Failed to save subscription');
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer  = new ArrayBuffer(rawData.length);
  const view    = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    view[i] = rawData.charCodeAt(i);
  }
  return view;
}