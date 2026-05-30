import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function getDb() {
  const { initializeApp, getApps, getApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const app = getApps().length
    ? getApp()
    : initializeApp({ credential: cert({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') }) });
  return getFirestore(app);
}

// ── Writing rules ──────────────────────────────────────
const WRITING_RULES = `
STRICT WRITING RULES — a 10-12 year old must understand every word:
1. Max 12 words per sentence. Short. Clear. No exceptions.
2. Plain English FIRST. Technical term SECOND — always in brackets or after a dash.
   WRONG: "A quadratic equation is a polynomial of degree 2"
   RIGHT: "Some equations have x times x in them — these are called quadratic equations"
3. Never assume prior knowledge. Explain simpler concepts first.
4. Analogies from: food, sport, games, school, animals, phones, YouTube, family. NOT adult life.
5. Example numbers must be small and positive first. Negatives only after positives.
6. The BLANK answer must be a word a student could guess from context — not a technical term.
7. The EXPLAIN prompt must be: "Explain to a friend/sibling" — never "describe the mechanism of"
8. Tone: excited, encouraging, like a cool older sibling. Never like a textbook.
`;

// ── Topic-specific notes (full coverage) ──────────────
const TOPIC_NOTES: Record<string, string> = {
  // ── MATHS ──
  'quadratic equations': `
HOOK: A ball thrown in the air makes a curve — why a curve and not a straight line?
ANALOGY: x² is like counting tiles in a square grid — 3×3=9, not 3+3=6. It grows faster.
RULE: "Some equations have x times x in them — called quadratic equations."
EXAMPLE: x²=9 → what times itself equals 9? x=3 (and x=-3).
BLANK: "x² means x ___ x" (answer: times)
EXPLAIN: "Your friend thinks x² = x+x. Show them wrong using the number 4."
RECALL: Same hook question — full answer about gravity causing the curve.`,

  'pythagoras': `
HOOK: A ladder leaning on a wall — can you find the height without measuring?
ANALOGY: Draw squares on each side of a right triangle — the big square area = two small squares added.
RULE: a²+b²=c² — the longest side is always opposite the right angle.
EXAMPLE: 3-4-5 triangle: 9+16=25, c=√25=5.
BLANK: "The longest side is opposite the ___ angle" (answer: right)
EXPLAIN: "Friend says you need a ruler. Are they right?"`,

  'trigonometry': `
HOOK: A ramp at an angle — can you find the height without measuring?
ANALOGY: SOH CAH TOA is three recipe cards. Pick the right recipe for what you know.
RULE: Label Hyp/Opp/Adj first. sin=O/H, cos=A/H, tan=O/A.
EXAMPLE: sin30=0.5, hyp=10 → opp=10×0.5=5.
BLANK: "The side opposite the right angle is called the ___" (answer: hypotenuse)`,

  'percentages': `
HOOK: 80% health vs 40/50 health — which is better?
ANALOGY: Per cent = out of 100 slices of pie.
RULE: "To find X% of something: divide by 100, multiply by X."
EXAMPLE: 10% of 80=8, 30% of 80=24 (three lots of 10%).
BLANK: "Per cent means out of ___" (answer: 100)`,

  'probability': `
HOOK: Flip a coin 10 times, get heads 8 times — was that fair?
ANALOGY: Probability is just a fraction — how many ways can it happen ÷ total possible outcomes.
RULE: P = favourable ÷ total. Always between 0 (impossible) and 1 (certain).
EXAMPLE: Roll a dice. P(3)=1/6. P(even)=3/6=½.
BLANK: "Probability is always between 0 and ___" (answer: 1)`,

  'algebra': `
HOOK: I think of a number, double it, add 3, get 11 — what was my number?
ANALOGY: x is a mystery box. Algebra is opening the box step by step.
RULE: Do the same thing to both sides of the equals sign.
EXAMPLE: 2x+3=11 → subtract 3 → 2x=8 → divide by 2 → x=4.
BLANK: "In an equation, x stands for an ___ number" (answer: unknown)`,

  'simultaneous equations': `
HOOK: Two friends order food. Their total prices tell you what each item costs — how?
ANALOGY: Two clues in a mystery. Neither clue alone solves it. Together they do.
RULE: Make one variable equal in both equations, then subtract to eliminate it.
EXAMPLE: x+y=5, x-y=1 → add them → 2x=6 → x=3, y=2.
BLANK: "Simultaneous equations have ___ unknowns" (answer: two)`,

  'inequalities': `
HOOK: Speed limit is 70mph — all these speeds are allowed: 60, 65, 69. What about 70? 71?
ANALOGY: A bouncer at a club — must be over 18. Not exactly 18. Greater than.
RULE: < means less than, > means greater than. Flip the sign when multiplying by a negative.
EXAMPLE: 2x<10 → x<5. Numbers less than 5 work: 4, 3, 2...
BLANK: "The symbol < means ___ than" (answer: less)`,

  'sequences': `
HOOK: 2, 4, 6, 8 — what comes next? What about 3, 6, 12, 24?
ANALOGY: A staircase (add the same each time) vs a snowball (multiply each time).
RULE: Arithmetic: add same number each time. Geometric: multiply same number each time.
EXAMPLE: nth term of 3,7,11,15 = 4n-1. Check: n=1 gives 4-1=3 ✓.
BLANK: "In an arithmetic sequence you always ___ the same amount" (answer: add)`,

  'standard form': `
HOOK: The sun is 150,000,000,000 metres away — how do scientists write this tidily?
ANALOGY: Like a phone's abbreviations — 1.5B instead of 1,500,000,000.
RULE: A×10ⁿ where A is between 1 and 10. n is the number of places the decimal moves.
EXAMPLE: 3,400,000 = 3.4×10⁶. 0.00056 = 5.6×10⁻⁴.
BLANK: "In standard form, the first number must be between 1 and ___" (answer: 10)`,

  // ── SCIENCE — BIOLOGY ──
  'cell biology': `
HOOK: Why do plants look green? Why do animals need to eat but plants don't?
ANALOGY: A cell is like a tiny city — each part has a specific job.
RULE: Animal cells: nucleus, cell membrane, cytoplasm, mitochondria, ribosomes.
Plant cells add: cell wall, chloroplasts, vacuole.
EXAMPLE: Mitochondria = power station. Chloroplast = solar panel.
BLANK: "The ___ controls what enters and leaves the cell" (answer: membrane)`,

  'photosynthesis': `
HOOK: A plant in a dark room — will it survive? Why not?
ANALOGY: A plant is a solar-powered food factory.
RULE: carbon dioxide + water → glucose + oxygen (needs light energy, chlorophyll).
EXAMPLE: More light = more photosynthesis, up to a limit (light saturation).
BLANK: "Photosynthesis happens in the ___" (answer: chloroplast)`,

  'respiration': `
HOOK: Why do you breathe faster when you exercise?
ANALOGY: Respiration is like burning fuel in a car — release energy stored in food.
RULE: Aerobic: glucose+oxygen→CO₂+water+energy. Anaerobic: glucose→lactic acid+energy (less).
BLANK: "Aerobic respiration requires ___" (answer: oxygen)`,

  'homeostasis': `
HOOK: You go outside in -5°C — why don't you freeze?
ANALOGY: Your body has a thermostat, just like a heating system.
RULE: Homeostasis keeps internal conditions constant: temperature, blood sugar, water.
BLANK: "Normal human body temperature is ___ degrees C" (answer: 37)`,

  'genetics': `
HOOK: You look like your parents — but not exactly. Why?
ANALOGY: DNA is a recipe book. Genes are individual recipes.
RULE: Dominant allele (capital) always shows. Recessive (lowercase) only shows if both copies present.
BLANK: "Each person inherits ___ alleles for each gene" (answer: two)`,

  // ── SCIENCE — CHEMISTRY ──
  'atomic structure': `
HOOK: Everything around you is made of the same tiny building blocks — what are they?
ANALOGY: An atom is like a tiny solar system — nucleus in the middle, electrons orbiting.
RULE: Protons and neutrons in nucleus. Electrons in shells. Protons=atomic number.
EXAMPLE: Carbon has 6 protons, 6 neutrons, 6 electrons.
BLANK: "The atomic number tells you the number of ___" (answer: protons)`,

  'bonding': `
HOOK: Why does water flow but salt forms solid crystals?
ANALOGY: Ionic bonding = giving away your keys (transfer electrons). Covalent = sharing headphones.
RULE: Ionic: metal+non-metal, transfer electrons, forms lattice. Covalent: non-metals, share electrons.
BLANK: "Ionic bonds form between a ___ and a non-metal" (answer: metal)`,

  'rates of reaction': `
HOOK: Why does warm milk go off faster than cold milk?
ANALOGY: Reaction rate = how often cars collide at an intersection.
RULE: More collisions = faster rate. Increase: concentration, temperature, surface area, catalyst.
BLANK: "A catalyst ___ the rate of reaction" (answer: increases)`,

  'organic chemistry': `
HOOK: Plastic, petrol, and alcohol — what do they have in common?
ANALOGY: Carbon atoms are like LEGO — they snap together in millions of ways.
RULE: Alkanes: CₙH₂ₙ₊₂. Alkenes: CₙH₂ₙ (double bond). Alkenes are unsaturated.
BLANK: "Alkenes contain a carbon-carbon double ___" (answer: bond)`,

  // ── SCIENCE — PHYSICS ──
  'forces': `
HOOK: A book sits on a table. Is anything pushing on it? Is it moving? Why not?
ANALOGY: Forces are like a tug of war — balanced forces = no movement.
RULE: Resultant force = 0 → object stays still or constant velocity. F=ma.
BLANK: "When forces are balanced, the resultant force is ___" (answer: zero)`,

  'energy': `
HOOK: A battery goes flat — where did the energy go?
ANALOGY: Energy is like money — it changes form but never disappears.
RULE: Energy cannot be created or destroyed — only transferred or stored.
EXAMPLE: KE=½mv². GPE=mgh. Efficiency = useful output ÷ total input × 100.
BLANK: "Energy is measured in ___" (answer: joules)`,

  'electricity': `
HOOK: Why do you get a shock touching a metal door handle after walking on carpet?
ANALOGY: Current is like water flowing through pipes. Voltage is the water pressure.
RULE: V=IR (Ohms law). Series: same current, voltages add. Parallel: same voltage, currents add.
BLANK: "V = I × ___" (answer: R)`,

  'waves': `
HOOK: How does your phone get signal inside a building with no windows?
ANALOGY: Waves are like ripples in a pond — they spread out from the source.
RULE: wave speed = frequency × wavelength. Transverse vs longitudinal.
BLANK: "Wave speed = frequency × ___" (answer: wavelength)`,

  'magnetism': `
HOOK: Why does a compass always point north?
ANALOGY: Magnetic field lines are like invisible arrows around a magnet.
RULE: Like poles repel, unlike attract. Field lines go N→S outside the magnet.
BLANK: "Like poles ___ each other" (answer: repel)`,
};

function getTopicNotes(topic: string): string {
  const key = topic.toLowerCase();
  for (const [k, v] of Object.entries(TOPIC_NOTES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return '';
}

// ── Single-call prompt: lesson + quickCheck together ──
function buildCombinedPrompt(subject: string, topic: string): string {
  const notes = getTopicNotes(topic);
  return `You are a brilliant teacher explaining "${topic}" (${subject}) to a 10-12 year old student.
${WRITING_RULES}
${notes ? `\nTEACHING NOTES:\n${notes}\n` : ''}

Generate a complete lesson object with:
1. Exactly 7 lesson cards: HOOK → ANALOGY → RULE → EXAMPLE → BLANK → EXPLAIN → RECALL
2. Exactly 3 quick-check questions after the lesson

LESSON CARD FORMATS:
HOOK:    { type:"HOOK",    question, guesses:[3 natural wrong guesses] }
ANALOGY: { type:"ANALOGY", analogy, connection, visual? }
RULE:    { type:"RULE",    rule, formula? }
EXAMPLE: { type:"EXAMPLE", scenario, steps:[3 steps max 10 words each] }
BLANK:   { type:"BLANK",   sentence(with ___), answer(simple guessable word), hint }
EXPLAIN: { type:"EXPLAIN", prompt("Explain to a friend…"), modelAnswer }
RECALL:  { type:"RECALL",  question(same as HOOK), answer(full plain-English) }

QUICK-CHECK FORMATS:
Q1: multipleChoice  { type, question, choices:[4], correctIndex, explanation }
Q2: fillBlank       { type, sentence(with ___), answer, explanation }
Q3: shortAnswer     { type, question, modelAnswer, keywords:[3-5] }

Return ONLY valid JSON:
{
  "topic": "${topic}",
  "subject": "${subject}",
  "cards": [...7 cards...],
  "quickCheck": [...3 questions...]
}

FINAL CHECK: every sentence readable by a 10-year-old. Plain English first, technical term second.`;
}

// ── Cache key ──────────────────────────────────────────
function cacheKey(subject: string, topic: string): string {
  return `${subject}__${topic}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const { subject, topic } = await req.json() as { subject: string; topic: string };
    if (!subject || !topic) return NextResponse.json({ error: 'Missing subject or topic' }, { status: 400 });

    const db  = await getDb();
    const key = cacheKey(subject, topic);
    const ref = db.collection('gcse_lesson_cache').doc(key);

    // ── Serve from cache if exists ─────────────────────
    const cached = await ref.get();
    if (cached.exists) {
      const data = cached.data()!;
      // Refresh cache weekly
      const age = Date.now() - (data.cachedAt ?? 0);
      if (age < 7 * 24 * 60 * 60 * 1000) {
        return NextResponse.json({ ...data.lesson, _cached: true });
      }
    }

    // ── Generate lesson + quickCheck in ONE call ───────
    const client     = await getGroq();
    const completion = await client.chat.completions.create({
      model:           'llama-3.3-70b-versatile',
      max_tokens:      3000,
      response_format: { type: 'json_object' },
      messages:        [{ role: 'user', content: buildCombinedPrompt(subject, topic) }],
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);

    if (!parsed.cards?.length) {
      return NextResponse.json({ error: 'Invalid lesson generated' }, { status: 502 });
    }

    // Ensure quickCheck array exists
    if (!Array.isArray(parsed.quickCheck)) parsed.quickCheck = [];

    // ── Cache the result ───────────────────────────────
    await ref.set({ lesson: parsed, cachedAt: Date.now(), subject, topic });

    return NextResponse.json(parsed);

  } catch (err) {
    console.error('[gcse/learn]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
