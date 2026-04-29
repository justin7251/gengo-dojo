import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const SUBTOPIC_MAP: Record<string, Record<string, string>> = {
  algebra: {
    linear:       'linear equations (one and two step, with unknowns on both sides)',
    simultaneous: 'simultaneous equations (elimination and substitution methods)',
    quadratics:   'quadratic equations (factorising, quadratic formula, completing the square)',
    sequences:    'sequences and nth term (arithmetic and geometric)',
    inequalities: 'inequalities (solving, number lines, regions)',
    functions:    'functions and composite functions',
    factorising:  'factorising expressions (common factors, difference of two squares)',
    rearranging:  'rearranging formulae',
  },
  geometry: {
    pythagoras:    'Pythagoras theorem (finding hypotenuse and shorter sides)',
    trigonometry:  'trigonometry SOH CAH TOA (finding sides and angles)',
    circles:       'circle theorems (all 8 theorems, arc length, sector area)',
    vectors:       'vectors (addition, subtraction, scalar multiplication, proof)',
    'area-volume': 'area and volume (prisms, cylinders, cones, spheres, frustums)',
    angles:        'angles in parallel lines, polygons, and bearings',
    transformations: 'transformations (reflection, rotation, translation, enlargement)',
    congruence:    'congruence and similarity (SSS, SAS, ASA, RHS; similar shapes)',
  },
  statistics: {
    averages:      'mean, median, mode and range (including grouped data)',
    probability:   'basic probability (single and combined events)',
    'tree-diagrams': 'tree diagrams (with and without replacement)',
    'cum-freq':    'cumulative frequency (drawing and interpreting graphs)',
    'box-plots':   'box plots (drawing and comparing)',
    histograms:    'histograms (frequency density, unequal class widths)',
    correlation:   'scatter graphs, correlation and lines of best fit',
    venn:          'Venn diagrams (two and three circles, notation)',
  },
  number: {
    fractions:     'fractions and decimals (operations, recurring decimals)',
    percentages:   'percentages (increase/decrease, reverse percentage, compound interest)',
    ratio:         'ratio and proportion (simplifying, sharing, direct/inverse proportion)',
    'standard-form': 'standard form (converting, calculating)',
    surds:         'surds (simplifying, rationalising the denominator)',
    indices:       'indices and powers (laws of indices, fractional and negative)',
    bounds:        'bounds and accuracy (upper/lower bounds, error intervals)',
    'prime-factors': 'prime factor decomposition, HCF and LCM',
  },
};

export async function POST(req: NextRequest) {
  try {
    const { topic, subtopic, tier } = await req.json() as {
      topic:    string;
      subtopic: string | null;
      tier:     'Foundation' | 'Higher';
    };

    const subtopicDesc = subtopic && SUBTOPIC_MAP[topic]?.[subtopic]
      ? SUBTOPIC_MAP[topic][subtopic]
      : `mixed ${topic} topics`;

    const tierNote = tier === 'Foundation'
      ? 'Foundation tier (grades 1-5). Avoid surds, vectors, circle theorems, and other Higher-only content.'
      : 'Higher tier (grades 4-9). Include a range of difficulty from grade 4 up to grade 8-9.';

    const client = await getGroq();
    const completion = await client.chat.completions.create({
      model:     'llama-3.3-70b-versatile',
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Generate 5 AQA GCSE Mathematics exam-style questions on: ${subtopicDesc}
Tier: ${tierNote}

Questions should vary in difficulty (1-2 mark routine questions up to 4-5 mark problem-solving).
Use realistic AQA question phrasing. Include context where appropriate (e.g. "A rectangle has length 3x+2...").

Return ONLY valid JSON:
{
  "questions": [
    {
      "number": 1,
      "marks": 2,
      "subtopic": "Linear equations",
      "question": "Solve 3x + 7 = 22\n\nShow your working.",
      "hint": "Subtract 7 from both sides first, then divide."
    },
    {
      "number": 2,
      "marks": 3,
      "subtopic": "Linear equations",
      "question": "Solve 5x - 3 = 2x + 9\n\nShow your working.",
      "hint": "Collect x terms on one side and numbers on the other."
    }
  ]
}

Rules:
- Exactly 5 questions
- Total marks between 15-20
- question field: use \\n for line breaks, use ^ for powers (e.g. x^2), use sqrt() for square roots
- hint field: one sentence giving a starting point, not the full solution
- Mix of routine and problem-solving questions
- No multiple choice — all require written working`
      }]
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[gcse/maths/questions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
