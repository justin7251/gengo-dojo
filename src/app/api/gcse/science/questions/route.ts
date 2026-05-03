import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const TOPIC_DETAIL: Record<string, Record<string, string>> = {
  biology: {
    'Cell biology':            'cells (prokaryotic/eukaryotic), cell organelles, cell division (mitosis), diffusion, osmosis, active transport',
    'Organisation':            'tissues, organs, organ systems, digestive system, blood, heart, lungs, plants (transpiration, translocation)',
    'Infection & response':    'pathogens (bacteria, viruses, fungi, protists), immune system, vaccines, antibiotics, drug development',
    'Bioenergetics':           'photosynthesis (equation, factors), aerobic respiration, anaerobic respiration, exercise',
    'Homeostasis & response':  'nervous system, brain, reflexes, endocrine system, insulin/glucagon, menstrual cycle, thermoregulation, osmoregulation',
    'Inheritance & variation': 'DNA, genes, chromosomes, Mendel, monohybrid inheritance, sex determination, mutation, natural selection, evolution',
    'Ecology':                 'food chains/webs, abiotic/biotic factors, adaptation, cycling of materials, biodiversity, human impact',
  },
  chemistry: {
    'Atomic structure & periodic table': 'atomic structure, isotopes, history of the atom, periodic table trends, groups 1/7/0',
    'Bonding & structure':               'ionic bonding, covalent bonding, metallic bonding, giant structures, nanoparticles',
    'Quantitative chemistry':            'relative formula mass, moles, concentration, titration, percentage yield, atom economy',
    'Chemical changes':                  'reactivity series, displacement, electrolysis, acids and alkalis, neutralisation, pH',
    'Energy changes':                    'exothermic/endothermic, activation energy, bond energies, reaction profiles',
    'Rates of reaction & equilibrium':   'collision theory, factors affecting rate, catalysts, reversible reactions, Le Chatelier',
    'Organic chemistry':                 'crude oil, hydrocarbons, alkanes, alkenes, addition polymers, condensation polymers',
    'Chemical analysis':                 'purity, formulations, chromatography, flame tests, ion tests',
    'Chemistry of the atmosphere':       'evolution of atmosphere, greenhouse gases, global warming, air pollution',
    'Using resources':                   'finite/renewable resources, water treatment, life cycle assessment, corrosion, alloys',
  },
  physics: {
    'Energy':                         'energy stores and transfers, specific heat capacity, efficiency, power, insulation',
    'Electricity':                    'circuit symbols, series/parallel circuits, resistance, I-V graphs, AC/DC, power, mains electricity',
    'Particle model of matter':       'states of matter, particle model, pressure, specific heat capacity, specific latent heat',
    'Atomic structure':               'atomic model, radioactivity (alpha, beta, gamma), half-life, nuclear equations, fission, fusion',
    'Forces':                         'scalars/vectors, speed/velocity, acceleration, distance-time graphs, Newton\'s laws, momentum, pressure',
    'Waves':                          'wave properties, reflection, refraction, EM spectrum, uses/dangers of EM waves, sound',
    'Magnetism & electromagnetism':   'magnetic fields, electromagnets, motor effect, Fleming\'s left hand rule, generators, transformers',
    'Space physics':                  'Solar System, life cycle of stars, Big Bang, red-shift',
  },
};

const QUESTION_TYPE_INSTRUCTIONS: Record<string, string> = {
  mixed:    'Mix of recall, explain, calculate, and evaluate questions.',
  recall:   'State/Name/Give questions — short factual answers, 1-2 marks each.',
  explain:  'Explain/Describe/How questions — require use of because/therefore, 2-4 marks each.',
  calculate:'Calculate questions — require equations and numerical answers, 2-4 marks each. Always specify units.',
  evaluate: 'Evaluate/Discuss/Assess questions — require balanced arguments or application of knowledge, 4-6 marks each.',
};

export async function POST(req: NextRequest) {
  try {
    const { subject, topic, paper, questionType } = await req.json() as {
      subject:      string;
      topic:        string | null;
      paper:        'P1' | 'P2' | 'Both';
      questionType: string;
    };

    const topicDetail = topic && TOPIC_DETAIL[subject]?.[topic]
      ? `Specifically focus on: ${TOPIC_DETAIL[subject][topic]}`
      : `Cover a range of topics from ${subject}`;

    const paperNote = paper === 'Both'
      ? `Can cover any ${subject} topic`
      : paper === 'P1'
      ? `Paper 1 topics only`
      : `Paper 2 topics only`;

    const typeInstructions = QUESTION_TYPE_INSTRUCTIONS[questionType] ?? QUESTION_TYPE_INSTRUCTIONS.mixed;

    const client = await getGroq();
    const completion = await client.chat.completions.create({
      model:     'llama-3.3-70b-versatile',
      max_tokens: 1800,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Generate 5 AQA GCSE ${subject.charAt(0).toUpperCase() + subject.slice(1)} exam-style questions.
${topicDetail}
${paperNote}
Question style: ${typeInstructions}

Use realistic AQA command words. Include context/stimulus material where appropriate (e.g. describe data from a graph, give a scenario).

Return ONLY valid JSON:
{
  "questions": [
    {
      "number": 1,
      "marks": 2,
      "topic": "Cell biology",
      "paper": "P1",
      "type": "recall",
      "question": "State two differences between a plant cell and an animal cell.\n\n[2 marks]",
      "hint": "Think about organelles that are unique to plant cells."
    }
  ]
}

Rules:
- Exactly 5 questions, total 15-20 marks
- type field: one of recall / explain / calculate / evaluate
- Include [X marks] at end of question text
- For calculate questions: include all necessary data in the question
- For evaluate questions: provide a stimulus (data, graph description, or scenario) to evaluate
- hint: one sentence giving a starting strategy, not the answer
- Vary marks: mix of 1-2 mark and 3-4 mark questions (and 5-6 if evaluate type)`,
      }]
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[gcse/science/questions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
