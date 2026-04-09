import { NextRequest, NextResponse } from 'next/server';
import { TargetLang, NativeLang, TRANSLATION_LANG } from '@/lib/types';

function getTargetLangName(targetLang: TargetLang): string {
  const names: Record<TargetLang, string> = {
    ja: 'Japanese', zh: 'Mandarin Chinese',
    ko: 'Korean',   es: 'Spanish', fr: 'French',
  };
  return names[targetLang];
}

export async function POST(req: NextRequest) {
  try {
    const { words, targetLang, nativeLang } = await req.json() as {
      words: { id: string; kanji: string; reading: string; meaning: string; topic: string }[];
      targetLang: TargetLang;
      nativeLang: NativeLang;
    };

    if (!words?.length || !targetLang || !nativeLang) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const targetName      = getTargetLangName(targetLang);
    const translationLang = TRANSLATION_LANG[nativeLang];
    const topics          = [...new Set(words.map(w => w.topic))].join(', ');

    const wordList = words
      .map(w => `- ${w.kanji} (${w.reading}) = ${w.meaning}`)
      .join('\n');

    const prompt = `Write a vivid, immersive scene in ${targetName} that naturally incorporates ALL of the following vocabulary words. The scene should feel like a short paragraph from a story or travel journal.

Vocabulary to include:
${wordList}

Topic context: ${topics}

Requirements:
- Write ONLY in ${targetName} — no English or other languages in the scene itself
- Use each word naturally in context — do not force them awkwardly
- The scene should be 4-6 sentences long
- Make it vivid and interesting, not just a list of sentences
- Every word from the list MUST appear in the scene

Then provide a ${translationLang} translation of the scene.

Return ONLY valid JSON:
{
  "scene": "the scene written entirely in ${targetName}",
  "translation": "${translationLang} translation of the full scene"
}`;

    const Groq   = (await import('groq-sdk')).default;
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await client.chat.completions.create({
      model:           'llama-3.3-70b-versatile',
      max_tokens:      800,
      response_format: { type: 'json_object' },
      messages:        [{ role: 'user', content: prompt }],
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);

    if (!parsed.scene || !parsed.translation) {
      return NextResponse.json({ error: 'Invalid scene generated' }, { status: 502 });
    }

    return NextResponse.json({
      scene:       parsed.scene,
      translation: parsed.translation,
    });

  } catch (err) {
    console.error('[scene-api]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
