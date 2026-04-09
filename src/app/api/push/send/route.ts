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

// POST — send word of the day to all subscribers
// Called by Vercel cron at 07:00 daily
// Also callable manually for testing
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret so only Vercel can call this
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webpush = (await import('web-push')).default;
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    const db   = await getDb();
    const snap = await db.collection('push_subscriptions').get();

    if (snap.empty) {
      return NextResponse.json({ sent: 0, message: 'No subscribers' });
    }

    let sent  = 0;
    let failed = 0;
    const stale: string[] = [];

    await Promise.all(
      snap.docs.map(async (doc) => {
        const { uid, subscription } = doc.data();

        // Get a due word for this user
        try {
          const userDoc = await db.collection('users').doc(uid).get();
          if (!userDoc.exists) return;

          const profile = userDoc.data()!;
          const pairKey = `${profile.targetLang}-${profile.nativeLang}`;

          // Get user words
          const wordsSnap = await db
            .collection('user_words')
            .doc(uid)
            .collection(pairKey)
            .limit(50)
            .get();

          if (wordsSnap.empty) return;

          // Pick a random word
          const userWords = wordsSnap.docs.map(d => d.data());
          const randomUW  = userWords[Math.floor(Math.random() * userWords.length)];

          // Fetch the actual word
          const topicSlug = randomUW.topic.toLowerCase().replace(/\s+/g, '-');
          const wordSnap  = await db
            .collection('vocabulary')
            .doc(topicSlug)
            .collection('words')
            .doc(randomUW.wordId)
            .get();

          if (!wordSnap.exists) return;
          const word = wordSnap.data()!;

          // Get translation
          const transSnap = await db
            .collection('vocabulary')
            .doc(topicSlug)
            .collection('words')
            .doc(randomUW.wordId)
            .collection('translations')
            .doc(profile.nativeLang)
            .get();

          const meaning = transSnap.exists ? transSnap.data()!.meaning : '';

          const payload = JSON.stringify({
            title: '今日の言葉 · Word of the day',
            body:  `${word.kanji} — ${meaning}`,
            icon:  '/icon-192.png',
            url:   `/flashcards`,
          });

          await webpush.sendNotification(subscription, payload);
          sent++;
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            // Subscription expired — mark for cleanup
            stale.push(uid);
          }
          failed++;
        }
      })
    );

    // Clean up stale subscriptions
    await Promise.all(
      stale.map(uid => db.collection('push_subscriptions').doc(uid).delete())
    );

    return NextResponse.json({ sent, failed, staleRemoved: stale.length });
  } catch (err) {
    console.error('[push/send]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
