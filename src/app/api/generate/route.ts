import { NextRequest, NextResponse } from 'next/server';
import { TargetLang, NativeLang, TRANSLATION_LANG } from '@/lib/types';

// ── Language helpers ──────────────────────────────────

function getTargetLangName(targetLang: TargetLang): string {
  const names: Record<TargetLang, string> = {
    ja: 'Japanese', zh: 'Mandarin Chinese',
    ko: 'Korean',   es: 'Spanish', fr: 'French',
  };
  return names[targetLang];
}

function getScriptRules(targetLang: TargetLang): string {
  switch (targetLang) {
    case 'ja': return `- "kanji" = the word in kanji/kana (never empty — loanwords use katakana e.g. サッカー).
- "reading" = hiragana or katakana only (never romaji, never empty).
- "romanization" = romaji reading.`;
    case 'zh': return `- "kanji" = simplified Chinese characters (never empty).
- "reading" = pinyin with tone marks (never empty).
- "romanization" = pinyin without tone marks.`;
    case 'ko': return `- "kanji" = the word in hangul (never empty).
- "reading" = romanized Korean using Revised Romanization (never empty).
- "romanization" = same as reading.`;
    case 'es':
    case 'fr': return `- "kanji" = the word in ${targetLang === 'es' ? 'Spanish' : 'French'} (never empty).
- "reading" = pronunciation guide (IPA or syllable breakdown, never empty).
- "romanization" = same as kanji for latin scripts.`;
  }
}

function buildWordId(kanji: string, targetLang: TargetLang): string {
  return `${targetLang}-${kanji}`;
}

// ── Firebase Admin (server-side only) ────────────────
// NOTE: Firebase Admin SDK uses .exists as a PROPERTY, not .exists() as a function
// This is different from the client SDK which uses .exists()

async function getFirestoreDb() {
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

// ── Groq client ───────────────────────────────────────

async function getGroqClient() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ── Generate full words ───────────────────────────────

async function generateFullWords(
  interest:              string,
  targetLang:            TargetLang,
  nativeLang:            NativeLang,
  level:                 string,
  existingRomanizations: string[]
): Promise<Record<string, unknown>[]> {
  const targetName      = getTargetLangName(targetLang);
  const translationLang = TRANSLATION_LANG[nativeLang];
  const scriptRules     = getScriptRules(targetLang);
  const exclusionLine   = existingRomanizations.length > 0
    ? `- Do NOT generate any of these already-existing words: ${existingRomanizations.slice(-40).join(', ')}.`
    : '';

  const prompt = `Generate 15 ${targetName} vocabulary words related to "${interest}" for a ${level} learner.
Return ONLY valid JSON — no markdown, no explanation.

Schema:
{
  "topic": "${interest}",
  "words": [
    {
      "kanji": "柔道",
      "reading": "じゅうどう",
      "romanization": "judo",
      "example": "彼は柔道をしています。",
      "type": "noun",
      "meaning": "${translationLang} meaning",
      "example_translation": "${translationLang} translation of the example"
    }
  ]
}

Rules:
- Return exactly 15 words.
- Every field must be a non-empty string.
- "example" must be 100% in ${targetName} — no other language.
- "meaning" must be in ${translationLang}.
- "example_translation" must be in ${translationLang}.
- "type" must be one of: noun, verb, adjective, other.
${scriptRules}
${exclusionLine}`;

  const client     = await getGroqClient();
  const completion = await client.chat.completions.create({
    model:           'llama-3.3-70b-versatile',
    max_tokens:      1500,
    response_format: { type: 'json_object' },
    messages:        [{ role: 'user', content: prompt }],
  });

  const raw    = completion.choices[0].message.content ?? '{}';
  const parsed = JSON.parse(raw);
  return parsed.words ?? [];
}

// ── Generate translations only ────────────────────────

async function generateTranslations(
  words:      { kanji: string; romanization: string; example: string }[],
  targetLang: TargetLang,
  nativeLang: NativeLang
): Promise<Record<string, { meaning: string; example_translation: string }>> {
  const targetName      = getTargetLangName(targetLang);
  const translationLang = TRANSLATION_LANG[nativeLang];

  const prompt = `Translate these ${targetName} vocabulary words into ${translationLang}.
Return ONLY valid JSON — no markdown, no explanation.

Words:
${words.map(w => `- ${w.kanji} (${w.romanization}): "${w.example}"`).join('\n')}

Return exactly:
{
  "translations": [
    {
      "kanji": "柔道",
      "meaning": "${translationLang} meaning here",
      "example_translation": "${translationLang} translation of the example here"
    }
  ]
}

Rules:
- Return exactly ${words.length} translations in the same order.
- Every field must be a non-empty string.
- "meaning" and "example_translation" must be in ${translationLang}.`;

  const client     = await getGroqClient();
  const completion = await client.chat.completions.create({
    model:           'llama-3.3-70b-versatile',
    max_tokens:      800,
    response_format: { type: 'json_object' },
    messages:        [{ role: 'user', content: prompt }],
  });

  const raw    = completion.choices[0].message.content ?? '{}';
  const parsed = JSON.parse(raw);

  const result: Record<string, { meaning: string; example_translation: string }> = {};
  for (const t of (parsed.translations ?? [])) {
    if (t.kanji && t.meaning && t.example_translation) {
      result[t.kanji] = {
        meaning:             t.meaning,
        example_translation: t.example_translation,
      };
    }
  }
  return result;
}

// ── Route handler ─────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { interest, targetLang, nativeLang, level } = await req.json() as {
      interest:   string;
      targetLang: TargetLang;
      nativeLang: NativeLang;
      level:      string;
    };

    if (!interest || !targetLang || !nativeLang || !level) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db          = await getFirestoreDb();
    const topicSlug   = interest.toLowerCase().replace(/\s+/g, '-');
    const wordsColRef = db.collection('vocabulary').doc(topicSlug).collection('words');

    // ── 1. Load existing words for this topic + targetLang ────────────────
    const existingSnap = await wordsColRef
      .where('targetLang', '==', targetLang)
      .get();

    const existingWords = existingSnap.docs.map(d => d.data() as {
      kanji:        string;
      reading:      string;
      romanization: string;
      example:      string;
      type:         string;
      targetLang:   string;
    });

    const existingRomanizations = existingWords.map(w => w.romanization.toLowerCase());

    // ── 2. Check which words already have this nativeLang translation ─────
    // IMPORTANT: Firebase Admin SDK uses .exists as a PROPERTY (not a function)
    const wordsNeedingTranslation: typeof existingWords = [];
    const wordsWithTranslation: Array<{
      word:        typeof existingWords[0];
      translation: { meaning: string; example_translation: string };
    }> = [];

    for (const word of existingWords) {
      const wId       = buildWordId(word.kanji, targetLang as TargetLang);
      const transSnap = await wordsColRef
        .doc(wId)
        .collection('translations')
        .doc(nativeLang)
        .get();

      // Admin SDK: .exists is a boolean property, NOT a function
      if (transSnap.exists) {
        const t = transSnap.data() as { meaning: string; example_translation: string };
        wordsWithTranslation.push({ word, translation: t });
      } else {
        wordsNeedingTranslation.push(word);
      }
    }

    // ── 3. Decide what to generate ────────────────────────────────────────
    let newWordDocs: Record<string, unknown>[] = [];

    // Short-circuit: all existing words already have this translation → no Groq call needed
    if (existingWords.length > 0 && wordsNeedingTranslation.length === 0) {
      // Just return what we already have
      const responseWords = wordsWithTranslation.map(({ word, translation }) => ({
        kanji:               word.kanji,
        reading:             word.reading,
        romanization:        word.romanization,
        example:             word.example,
        type:                word.type,
        targetLang:          word.targetLang,
        topic:               interest,
        meaning:             translation.meaning,
        example_translation: translation.example_translation,
      }));
      return NextResponse.json({ topic: interest, words: responseWords });
    }

    // Case A: No words exist → generate everything
    if (existingWords.length === 0) {
      const generated = await generateFullWords(
        interest, targetLang as TargetLang, nativeLang as NativeLang,
        level, existingRomanizations
      );

      newWordDocs = generated.filter((w: Record<string, unknown>) =>
        w.kanji && w.reading && w.romanization &&
        w.meaning && w.example && w.example_translation
      );

      const batch = db.batch();

      for (const w of newWordDocs) {
        const wId     = buildWordId(w.kanji as string, targetLang as TargetLang);
        const wordRef = wordsColRef.doc(wId);

        // Shared word doc
        batch.set(wordRef, {
          kanji:        w.kanji,
          reading:      w.reading,
          romanization: w.romanization,
          example:      w.example,
          type:         w.type,
          targetLang,
          topic:        interest,
          createdAt:    Date.now(),
        }, { merge: true });

        // Translation subcollection
        batch.set(wordRef.collection('translations').doc(nativeLang), {
          meaning:             w.meaning,
          example_translation: w.example_translation,
          nativeLang,
          createdAt:           Date.now(),
        }, { merge: true });
      }

      // Topic meta doc
      batch.set(
        db.collection('vocabulary').doc(topicSlug),
        { topic: interest, targetLang, updatedAt: Date.now() },
        { merge: true }
      );

      await batch.commit();

    // Case B: Words exist but missing this translation → translate only
    } else if (wordsNeedingTranslation.length > 0) {
      const translations = await generateTranslations(
        wordsNeedingTranslation,
        targetLang as TargetLang,
        nativeLang as NativeLang
      );

      const batch = db.batch();
      for (const word of wordsNeedingTranslation) {
        const t = translations[word.kanji];
        if (t) {
          const wId      = buildWordId(word.kanji, targetLang as TargetLang);
          const transRef = wordsColRef.doc(wId).collection('translations').doc(nativeLang);
          batch.set(transRef, {
            meaning:             t.meaning,
            example_translation: t.example_translation,
            nativeLang,
            createdAt:           Date.now(),
          }, { merge: true });
        }
      }
      await batch.commit();
    }

    // ── 4. Re-fetch and build response ────────────────────────────────────
    const freshSnap = await wordsColRef
      .where('targetLang', '==', targetLang)
      .get();

    const responseWords = await Promise.all(
      freshSnap.docs.map(async (wordDoc) => {
        const word      = wordDoc.data();
        const transSnap = await wordDoc.ref
          .collection('translations')
          .doc(nativeLang)
          .get();

        // Admin SDK: .exists is a property
        if (!transSnap.exists) return null;

        const trans = transSnap.data()!;

        return {
          kanji:               word.kanji,
          reading:             word.reading,
          romanization:        word.romanization,
          example:             word.example,
          type:                word.type,
          targetLang:          word.targetLang,
          topic:               word.topic,
          meaning:             trans.meaning,
          example_translation: trans.example_translation,
        };
      })
    );

    const validWords = responseWords.filter(Boolean);

    if (!validWords.length) {
      return NextResponse.json(
        { error: 'Failed to generate vocabulary.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ topic: interest, words: validWords });

  } catch (err) {
    console.error('[vocab-api]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
