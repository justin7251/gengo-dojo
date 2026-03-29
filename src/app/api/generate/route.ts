import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { interest, lang, level } = await req.json();

  const langName = lang === 'ja' ? 'Japanese' : 'Mandarin Chinese';

  const prompt = `Generate 15 ${langName} vocabulary words related to "${interest}" for a ${level} learner.
Return ONLY valid JSON with no markdown or explanation.
Format:
{
  "topic": "${interest}",
  "words": [
    {
      "kanji": "字",
      "reading": "よみかた",
      "romanization": "yomikata",
      "meaning": "English meaning",
      "example": "Example sentence in ${langName}",
      "type": "noun"
    }
  ]
}
${lang === 'zh' ? 'Use simplified Chinese. Reading = pinyin.' : 'Reading = hiragana/katakana.'}
Word types: noun, verb, adjective, other. Return exactly 15 words.`;

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1500,
    response_format: { type: 'json_object' },  // forces clean JSON
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = completion.choices[0].message.content ?? '{}';
  const parsed = JSON.parse(raw);

  return NextResponse.json(parsed);
}