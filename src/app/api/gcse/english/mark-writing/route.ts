import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// AQA level descriptors for writing (simplified)
const AO5_LEVELS = [
  { level: 4, range: '19-24', desc: 'Compelling, convincing communication. Varied, inventive structural and grammatical features.' },
  { level: 3, range: '13-18', desc: 'Consistent, clear communication. Structural and grammatical features used for effect.' },
  { level: 2, range: '7-12', desc: 'Some success in communicating. Some structural and grammatical features attempted.' },
  { level: 1, range: '1-6',  desc: 'Simple, limited communication. Basic structural and grammatical features.' },
];

export async function POST(req: NextRequest) {
  try {
    const { prompt: writingPrompt, essay } = await req.json() as {
      prompt: { title: string; type: string; instruction: string; form: string };
      essay:  string;
    };

    const wordCount = essay.split(/\s+/).filter(Boolean).length;

    const systemPrompt = `You are a senior AQA GCSE English Language examiner with 15 years of experience.
Mark this writing response against the AQA mark scheme for AO5 (24 marks) and AO6 (16 marks).

AO5 — Communicate clearly, effectively and imaginatively; select and adapt tone, style and register for different forms, purposes and audiences. Organise information and ideas, using structural and grammatical features to support coherence and cohesion.

AO6 — Use a range of vocabulary and sentence structures for clarity, purpose and effect, with accurate spelling and punctuation.

Be a fair but rigorous examiner. Do not be generous. Grade 4 students typically score 24-28/40. Grade 7 students score 32-36/40. Grade 9 students score 36-40/40.`;

    const userPrompt = `WRITING TASK:
Form: ${writingPrompt.form}
Instruction: ${writingPrompt.instruction}

STUDENT RESPONSE (${wordCount} words):
${essay}

Mark this response. Provide specific feedback using quotations from the student's work.

Return ONLY valid JSON:
{
  "feedback": {
    "ao5Marks": 16,
    "ao6Marks": 12,
    "total": 28,
    "ao5Grade": "Level 3 — Consistent, clear communication",
    "ao6Grade": "Level 3 — Generally accurate with some varied vocabulary",
    "levelDescriptor": "Grade 5–6 range · Consistent and clear writing with some effective structural choices",
    "strengths": [
      "Your opening paragraph immediately establishes atmosphere through the phrase '...' — this creates strong reader engagement from the outset.",
      "You demonstrate control of sentence variety, effectively using the short sentence '...' for emphasis."
    ],
    "targets": [
      "To move to the next level, develop your structural choices more consciously — consider how your ending could echo or contrast your opening to create a cyclical structure.",
      "Your vocabulary is generally appropriate but lacks the precise, ambitious word choices that characterise higher-level responses. Replace generic words like 'walked' and 'nice' with more precise alternatives."
    ],
    "modelSentence": "The silence pressed against her like something physical — a weight she hadn't known was there until, without warning, it lifted."
  }
}`;

    const client = await getGroq();
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[gcse/mark-writing]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
