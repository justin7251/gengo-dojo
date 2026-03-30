import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { interest, lang, level } = await req.json();

    if (!interest || !lang || !level) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // ── 1. Load existing words from Firestore cache ───
    const { initializeApp, getApps, getApp } = await import('firebase-admin/app');
    const { getFirestore }                    = await import('firebase-admin/firestore');
    const { cert }                            = await import('firebase-admin/app');

    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId:    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }

    const db      = getFirestore();
    const cacheId = `${lang}-${level}-${interest.toLowerCase().replace(/\s+/g, '-')}`;
    const cacheDoc = await db.collection('vocabulary_cache').doc(cacheId).get();

    const existingRomanizations: string[] = cacheDoc.exists
      ? ((cacheDoc.data()?.words ?? []) as { romanization?: string }[])
          .map(w => w.romanization ?? '')
          .filter(Boolean)
      : [];

    // ── 2. Build prompt with exclusion list ──────────
    const langName   = lang === 'ja' ? 'Japanese' : 'Mandarin Chinese';
    const scriptRules = lang === 'zh'
      ? '- Use simplified Chinese. "reading" = pinyin with tone marks.'
      : `- "kanji" = word in kanji/kana (never empty — loanwords use katakana).
- "reading" = hiragana or katakana only (never romaji, never empty).`;

    const exclusionLine = existingRomanizations.length > 0
      ? `- Do NOT generate any of these words (already learned): ${existingRomanizations.slice(-40).join(', ')}.`
      : '';

    const prompt = `Generate 15 ${langName} vocabulary words related to "${interest}" for a ${level} learner.
Return ONLY valid JSON — no markdown, no explanation.

Schema:
{
  "topic": "${interest}",
  "words": [
    {
      "kanji": "柔道",
      "reading": "じゅうどう",
      "romanization": "judo",
      "meaning": "judo",
      "example": "彼は柔道の練習をしています。",
      "example_translation": "He is practicing judo.",
      "type": "noun"
    }
  ]
}

Rules:
- Return exactly 15 words.
- Every field must be a non-empty string.
- "example" must be 100% ${langName} script — no English, no romaji.
- "example_translation" is the English translation of the example.
- "type" must be one of: noun, verb, adjective, other.
${scriptRules}
${exclusionLine}`;

    // ── 3. Call GROQ ──────────────────────────────────
    const Groq   = (await import('groq-sdk')).default;
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);

    // ── 4. Validate + deduplicate ─────────────────────
    const existingSet = new Set(existingRomanizations.map(r => r.toLowerCase()));

    const words = (parsed.words ?? [])
      .filter((w: Record<string, unknown>) =>
        w.kanji && w.reading && w.romanization && w.meaning && w.example && w.example_translation
      )
      .filter((w: Record<string, unknown>) =>
        !existingSet.has((w.romanization as string).toLowerCase().trim())
      );

    if (!words.length) {
      return NextResponse.json(
        { error: 'Failed to generate new vocabulary. All words already learned!' },
        { status: 502 }
      );
    }

    return NextResponse.json({ topic: interest, words });

  } catch (err) {
    console.error('[vocab-api]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}