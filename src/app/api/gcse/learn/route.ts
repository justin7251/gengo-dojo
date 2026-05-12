import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ── Writing rules ──────────────────────────────────────
const WRITING_RULES = `
STRICT WRITING RULES — a 10-12 year old must understand every word:

1. Max 12 words per sentence. Short. Clear. No exceptions.
2. Plain English FIRST. Technical term SECOND — always in brackets or after a dash.
   WRONG: "A quadratic equation is a polynomial of degree 2"
   RIGHT: "Some equations have x times x in them — these are called quadratic equations"
3. Never assume prior knowledge. If a concept needs another concept to understand it, explain the simpler one first.
4. Analogies must come from: food, sport, games, school, animals, phones, YouTube, family. NOT adult life.
5. Example numbers must be small and positive first. Negatives only after the positive version is shown.
6. The BLANK answer must be a word a student could guess from context — not a technical term.
7. The EXPLAIN prompt must be: "Explain to a friend/sibling" — never "describe the mechanism of"
8. Tone: excited, encouraging, like a cool older sibling. Never like a textbook.
`;

// ── Topic-specific teaching notes ─────────────────────
// These tell the AI exactly how to break down hard topics
const TOPIC_NOTES: Record<string, string> = {

  'quadratic equations': `
TEACHING NOTES FOR QUADRATIC EQUATIONS:

PREREQUISITE CHECK — before explaining quadratics, briefly remind them:
- x means "a mystery number we are trying to find"
- x² (x squared) means x times x — NOT x times 2

HOOK: Use a ball being thrown — it makes a curve, not a straight line.
Why does it curve? That is what quadratics describe.

ANALOGY: Use the squaring idea with simple numbers.
"If x is 3, then x² is 3×3=9. If x is 4, then x² is 4×4=16.
It grows much faster than just x. That fast growth makes curves."

RULE: Keep it to ONE idea — "a quadratic has x² in it and makes a U shape".
Do NOT show ax²+bx+c=0 to a 10-year-old. It is overwhelming.

EXAMPLE: Use the SIMPLEST possible quadratic — x² = 9.
Step 1: x times x equals 9
Step 2: What number times itself equals 9?
Step 3: x = 3 (because 3×3=9) or x = -3 (because -3×-3=9 too)
Do NOT use factorising (x²-5x+6=0) — that is a separate lesson.

BLANK: "x² means x ___ x" (answer: times)

EXPLAIN: "Your friend thinks x² means x+x. Show them why that is wrong with numbers."

REMEMBER: Factorising, the quadratic formula, and completing the square are all SEPARATE lessons.
This lesson only covers: what is x², what makes something quadratic, and the simplest solve.
`,

  'pythagoras theorem': `
TEACHING NOTES FOR PYTHAGORAS:

HOOK: "A 3m ladder leans against a wall. The bottom is 2m from the wall.
How high up the wall does it reach? You can work this out without measuring."

ANALOGY: Use a square drawn on each side of a right-angle triangle.
"The big square's area equals the two smaller squares added together."
Draw this as ASCII art — it is much clearer than words.

RULE: "In a right-angle triangle: a² + b² = c²
The longest side (c) is always opposite the right angle corner."

EXAMPLE: A 3-4-5 triangle. Use it because 9+16=25 is easy to check.
Step 1: 3² = 9, 4² = 16
Step 2: 9 + 16 = 25
Step 3: c = √25 = 5 ✓

BLANK: "The longest side is always opposite the ___ angle" (answer: right)

EXPLAIN: "Your friend says you need a ruler to find the missing side. Are they right?"
`,

  'trigonometry (soh cah toa)': `
TEACHING NOTES FOR TRIGONOMETRY:

HOOK: "A ramp goes up at an angle. You know how long the ramp is and the angle.
Can you work out how high it goes without measuring?"

ANALOGY: SOH CAH TOA is just three recipes. Each recipe uses two sides and an angle.
Like a recipe card — pick the right recipe for what you know and what you want to find.

RULE: Introduce the three sides FIRST with a clear picture:
- Hypotenuse = longest side, always opposite the right angle
- Opposite = side opposite the angle you are using
- Adjacent = side next to the angle you are using
Then: sin = O/H, cos = A/H, tan = O/A

EXAMPLE: Simple 30-60-90 triangle with hypotenuse = 10.
Find the opposite side using sin30 = 0.5.
Opposite = 10 × 0.5 = 5.

BLANK: "The side opposite the right angle is called the ___" (answer: hypotenuse)
`,

  'percentages': `
TEACHING NOTES FOR PERCENTAGES:

HOOK: "A game says you have 80% health. Another game says you have 40 out of 50 health.
Which one is doing better?"

ANALOGY: Per cent means "out of 100". Like a pie cut into 100 slices.
50% = 50 slices = half the pie.

RULE: To find a percentage of something: divide by 100, then multiply.
"Find 30% of 200: 200 ÷ 100 = 2, then 2 × 30 = 60"

EXAMPLE: Build up from simple to applied.
Step 1: 50% of 80 = 40 (half)
Step 2: 10% of 80 = 8 (divide by 10)
Step 3: 30% of 80 = 24 (three lots of 10%)
`,

  'probability basics': `
TEACHING NOTES FOR PROBABILITY:

HOOK: "You flip a coin 10 times. You get heads 8 times. Was that fair?"

ANALOGY: Probability is just a fraction. How many ways can this happen?
Out of how many things could happen total?

RULE: Probability = number of ways it can happen ÷ total outcomes
Always between 0 (impossible) and 1 (certain).

EXAMPLE: Rolling a dice.
P(getting a 3) = 1/6 — only one 3, six possible outcomes.
P(getting an even number) = 3/6 = 1/2 — three even numbers (2,4,6).
`,
};

function getTopicNotes(topic: string): string {
  const key = topic.toLowerCase();
  for (const [k, v] of Object.entries(TOPIC_NOTES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return '';
}

function buildPrompt(subject: string, topic: string): string {
  const topicNotes = getTopicNotes(topic);

  return `You are a brilliant teacher explaining "${topic}" (${subject}) to a 10-12 year old student who has never seen this topic.
${WRITING_RULES}
${topicNotes ? `\n${topicNotes}\n` : ''}

Generate exactly 7 lesson cards: HOOK → ANALOGY → RULE → EXAMPLE → BLANK → EXPLAIN → RECALL

HOOK: One surprising question. 3 natural wrong guesses. No answer yet. Max 15 words.
ANALOGY: Everyday comparison from a child's world. One sentence + optional ASCII visual.
RULE: Plain English version (1 sentence) then technical name. Max 20 words total.
EXAMPLE: One concrete example, 3 steps, max 10 words each. Use small positive numbers first.
BLANK: One sentence, one simple guessable word blanked with ___. Not a technical term.
EXPLAIN: Ask them to explain to a friend/sibling. Give a fun real scenario.
RECALL: Same question as HOOK. Full plain-English answer at the end.

Return ONLY valid JSON:
{
  "topic": "${topic}",
  "subject": "${subject}",
  "cards": [
    {
      "type": "HOOK",
      "question": "Why does a thrown ball make a curve shape instead of going in a straight line?",
      "guesses": [
        "Because the wind pushes it sideways",
        "Because gravity pulls it down as it moves",
        "Because the ball spins around"
      ]
    },
    {
      "type": "ANALOGY",
      "analogy": "It is like counting tiles in a square — 3 tiles wide and 3 tiles tall means 9 tiles total, not 6",
      "connection": "x squared means x groups of x — it grows much faster than just adding x",
      "visual": "  x = 3\\n  x² = 3 × 3 = 9\\n  (NOT 3 + 3 = 6)"
    },
    {
      "type": "RULE",
      "rule": "Some equations have x times x in them. That makes them curve when you draw them.",
      "formula": "These are called quadratic equations"
    },
    {
      "type": "EXAMPLE",
      "scenario": "Find x when x² = 9",
      "steps": [
        "x times x equals 9",
        "What number times itself makes 9?",
        "x = 3 because 3 × 3 = 9"
      ]
    },
    {
      "type": "BLANK",
      "sentence": "x² means x ___ x",
      "answer": "times",
      "hint": "What maths operation does squared mean?"
    },
    {
      "type": "EXPLAIN",
      "prompt": "Your friend thinks x² and x+x are the same thing. Show them why they are wrong using the number 4.",
      "modelAnswer": "x² means x times x. So if x is 4, then x² is 4 times 4 which is 16. But x+x with 4 is just 4+4 which is 8. They are very different!"
    },
    {
      "type": "RECALL",
      "question": "Why does a thrown ball make a curve shape instead of going in a straight line?",
      "answer": "Gravity pulls the ball down while it moves forward. This makes it follow a curved path — a U shape. Maths can describe this curved path using a quadratic equation, which has x times x in it."
    }
  ]
}

FINAL CHECK before returning: Read every sentence. Could a 10-year-old read it out loud and understand it immediately? If not — simplify it.`;
}

export async function POST(req: NextRequest) {
  try {
    const { subject, topic } = await req.json() as { subject: string; topic: string };

    if (!subject || !topic) {
      return NextResponse.json({ error: 'Missing subject or topic' }, { status: 400 });
    }

    const client = await getGroq();
    const completion = await client.chat.completions.create({
      model:     'llama-3.3-70b-versatile',
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: buildPrompt(subject, topic) }],
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);


    if (!parsed.cards?.length) {
      return NextResponse.json({ error: 'Invalid lesson generated' }, { status: 502 });
    }

    // Generate 3 quick-check questions based on the lesson
    const lessonContext = JSON.stringify(
      parsed.cards.map((c: Record<string, unknown>) => ({
        type: c.type, rule: c.rule, sentence: c.sentence, question: c.question,
      }))
    );

    const qcCompletion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Based on a lesson about "${topic}" (${subject}) for a 10-12 year old, generate 3 quick-check questions.
Lesson context: ${lessonContext}

Q1: Multiple choice (4 options, test core idea)
Q2: Fill in the blank (one simple word)
Q3: Short answer (explain to a friend)

Plain English only. Max 12 words per sentence.

Return ONLY valid JSON:
{
  "quickCheck": [
    {
      "type": "multipleChoice",
      "question": "Short simple question here?",
      "choices": ["Correct answer", "Wrong option 1", "Wrong option 2", "Wrong option 3"],
      "correctIndex": 0,
      "explanation": "One sentence explaining why this is right"
    },
    {
      "type": "fillBlank",
      "sentence": "Sentence with one ___ word missing",
      "answer": "word",
      "explanation": "One sentence explanation"
    },
    {
      "type": "shortAnswer",
      "question": "Explain this to a friend — what would you say?",
      "modelAnswer": "Simple 2-3 sentence model answer.",
      "keywords": ["key", "words"]
    }
  ]
}`,
      }],
    });

    const qcParsed = JSON.parse(qcCompletion.choices[0].message.content ?? '{}');
    return NextResponse.json({ ...parsed, quickCheck: qcParsed.quickCheck ?? [] });

  } catch (err) {
    console.error('[gcse/learn]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
