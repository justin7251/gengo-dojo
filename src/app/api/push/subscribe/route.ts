import { NextRequest, NextResponse } from 'next/server';

async function getDb() {
  const { initializeApp, getApps, getApp, cert } = await import('firebase-admin/app');
  const { getFirestore }                          = await import('firebase-admin/firestore');
  const app = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId:   process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
  return getFirestore(app);
}

// POST — save subscription
export async function POST(req: NextRequest) {
  try {
    const { uid, subscription } = await req.json();
    if (!uid || !subscription) {
      return NextResponse.json({ error: 'Missing uid or subscription' }, { status: 400 });
    }

    const db = await getDb();
    await db.collection('push_subscriptions').doc(uid).set({
      uid,
      subscription,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }, { merge: true });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/subscribe]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — remove subscription
export async function DELETE(req: NextRequest) {
  try {
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: 'Missing uid' }, { status: 400 });

    const db = await getDb();
    await db.collection('push_subscriptions').doc(uid).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/subscribe DELETE]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
