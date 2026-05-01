import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// Topic distribution for a balanced paper
const TOPIC_DIST = {
  algebra:    ['linear equations', 'quadratics', 'sequences', 'simultaneous equations', 'functions'],
  number:     ['percentages', 'ratio', 'standard form', 'fractions', 'indices'],
  geometry:   ['Pythagoras', 'trigonometry', 'area and volume', 'angles', 'transformations'],
  statistics: ['probability', 'averages', 'cumulative frequency', 'tree diagrams'],
};

const HIGHER_ONLY = [
  'surds', 'vectors', 'circle theorems', 'bounds', 'histograms',
  'completing the square', 'functions and composition', 'fractional indices',
];

export async function POST(req: NextRequest) {
  try {
    const { tier, paper } = await req.json() as {
      tier:  'Foundation' | 'Higher';
      paper: 'P1' | 'P2' | 'P3';
    };

    const isCalc    = paper !== 'P1';
    const tierNote  = tier === 'Foundation'
      ? 'Foundation tier (grades 1-5). Do NOT include: ' + HIGHER_ONLY.join(', ')
      : 'Higher tier (grades 1-9). Include a full range from grade 3 routine to grade 8-9 problem-solving.';

    const calcNote  = isCalc
      ? 'Calculator paper — can include complex decimals, trigonometry calculations, and statistical calculations.'
      : 'Non-calculator paper — all answers must be achievable without a calculator. Use exact values, simple numbers, and Pythagoras with integer answers where possible.';

    const client = await getGroq();
    const completion = await client.chat.completions.create({
      model:      'llama-3.3-70b-versatile',
      max_tokens:  3000,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Generate a full AQA GCSE Mathematics ${paper} mock paper.
${tierNote}
${calcNote}

The paper should have 20-25 questions totalling exactly 80 marks.
Cover all four topic areas: algebra, number, geometry, statistics.
Include a mix of:
- 1-2 mark routine questions (grades 1-3)
- 3-4 mark standard questions (grades 4-6)  
- 5-6 mark problem-solving questions (grades 7-9, Higher only)

Return ONLY valid JSON:
{
  "questions": [
    {
      "number": 1,
      "marks": 1,
      "subtopic": "Number — Integers",
      "calc": false,
      "question": "Write 360 as a product of its prime factors.",
      "hint": "Use a factor tree or repeated division."
    },
    {
      "number": 2,
      "marks": 3,
      "subtopic": "Algebra — Linear equations",
      "calc": false,
      "question": "Solve 4(2x - 1) = 3(x + 5)\\n\\nShow your working.",
      "hint": "Expand the brackets first."
    }
  ]
}

Rules:
- 20-25 questions, exactly 80 marks total
- question: use \\n for line breaks, ^ for powers (x^2), sqrt() for roots
- hint: one sentence starting point
- subtopic: format as "TopicArea — SubTopic" (e.g. "Geometry — Trigonometry")
- calc field: true if question requires calculator, false if not (all false for P1)
- Spread marks: roughly 30% number, 30% algebra, 25% geometry, 15% statistics
- Last 3-4 questions should be harder multi-step problems (Higher only for grade 8-9)`
      }]
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);

    // Validate total marks
    if (!parsed.questions?.length) {
      return NextResponse.json({ error: 'Invalid paper generated' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[gcse/maths/mock]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
