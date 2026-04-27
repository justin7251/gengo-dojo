// src/app/api/gcse/mark-language/route.ts
import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function POST(req: NextRequest) {
  try {
    const { session, identified, peters } = await req.json();
    const client = await getGroq();

    const petersText = peters.map((p: { point: string; evidence: string; tech: string; effect: string; reader: string }, i: number) =>
      `Paragraph ${i + 1}:\nP: ${p.point}\nE: ${p.evidence}\nT: ${p.tech}\nE: ${p.effect}\nR: ${p.reader}`
    ).join('\n\n');

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `You are an AQA GCSE English Language examiner marking a language analysis question (AO2, 8 marks).

EXTRACT: ${session.extract}

QUESTION: ${session.question}

TECHNIQUES IDENTIFIED BY STUDENT: ${identified.join(', ') || 'None'}

ACTUAL TECHNIQUES IN EXTRACT: ${session.techniques.map((t: { name: string }) => t.name).join(', ')}

STUDENT'S PETER PARAGRAPHS:
${petersText}

Mark on AQA AO2 criteria (8 marks). Reward: clear identification of technique, embedded quotes, explained effect, perceptive analysis.

Return ONLY valid JSON:
{
  "marks": { "earned": 5, "max": 8 },
  "feedback": "Detailed examiner feedback of 150-200 words. Reference specific quotes from the student's work. Note what worked, what to improve, and how to reach the next band. Use AQA examiner language."
}`
      }]
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    return NextResponse.json(JSON.parse(raw));
  } catch (err) {
    console.error('[gcse/mark-language]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
