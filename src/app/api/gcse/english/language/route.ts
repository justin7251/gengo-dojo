import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function POST(req: NextRequest) {
  try {
    const client = await getGroq();
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1200,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Generate a short fiction or descriptive extract (150-200 words) deliberately rich in language techniques for AQA GCSE English Language analysis practice.

Return ONLY valid JSON:
{
  "session": {
    "extract": "The extract text — 150-200 words, literary and atmospheric",
    "focus": "A short description of what the extract is about (e.g. 'A character arriving at a mysterious building at night')",
    "question": "How does the writer use language to create atmosphere in this extract? You could include the writer's choice of: words and phrases; language features and techniques; sentence forms. [8 marks]",
    "techniques": [
      {
        "name": "Metaphor",
        "quote": "the exact quote from the extract",
        "effect": "The effect this creates — what it makes the reader feel or understand"
      },
      {
        "name": "Pathetic fallacy",
        "quote": "the exact quote",
        "effect": "The effect"
      },
      {
        "name": "Sibilance",
        "quote": "the exact quote",
        "effect": "The effect"
      },
      {
        "name": "Short sentence",
        "quote": "the exact quote",
        "effect": "The effect"
      }
    ]
  }
}

Rules:
- Include at least 4 techniques, ideally 5-6
- The techniques must genuinely appear in the extract — quotes must be verbatim
- Write in a literary style appropriate for GCSE level
- Techniques should be varied: include at least one structural technique (sentence length, enjambment) and one sound device`
      }]
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[gcse/language]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
