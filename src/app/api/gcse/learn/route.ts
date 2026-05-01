import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ── Subject-specific card generation prompts ──────────

function buildPrompt(subject: string, topic: string): string {
  const subjectInstructions: Record<string, string> = {
    maths: `You are an expert GCSE Maths teacher creating lesson cards for: "${topic}"

Generate 7 lesson cards that teach this topic from scratch, step by step.
The student knows nothing about this topic yet.

Card types to use:
- EXPLAIN: Clear definition in simple language. No jargon without explanation.
- EXAMPLE: A fully worked example showing EVERY step. Use → between steps.
- VISUAL: A structured layout showing a pattern, formula breakdown, or diagram using text/ASCII.
- MISTAKE: One common error students make, then the correct approach side by side.
- MEMORY: A mnemonic, trick, or shortcut to remember the method.
- PRACTICE: ONE question for the student to try. Include the answer in "answer" field.
- SUMMARY: 3-4 bullet points recapping the key things to remember.

Return ONLY valid JSON:
{
  "topic": "${topic}",
  "subject": "maths",
  "cards": [
    {
      "type": "EXPLAIN",
      "title": "What is ${topic}?",
      "content": "Clear explanation in plain English. 2-4 sentences max.",
      "highlight": null
    },
    {
      "type": "EXAMPLE",
      "title": "Worked example",
      "content": "Problem statement here",
      "steps": ["Step 1: ...", "Step 2: ...", "Step 3: Answer = ..."],
      "highlight": "Key insight from this example"
    },
    {
      "type": "VISUAL",
      "title": "The pattern",
      "content": "ASCII diagram or structured text layout",
      "highlight": null
    },
    {
      "type": "MISTAKE",
      "title": "Common mistake",
      "wrong": "What students do wrong",
      "right": "What they should do instead",
      "content": "Why this mistake happens",
      "highlight": null
    },
    {
      "type": "MEMORY",
      "title": "Remember this",
      "content": "Mnemonic, trick, or shortcut",
      "highlight": "The key rule in one sentence"
    },
    {
      "type": "PRACTICE",
      "title": "Your turn",
      "content": "Question text here",
      "answer": "Full worked answer",
      "highlight": null
    },
    {
      "type": "SUMMARY",
      "title": "Key points",
      "bullets": ["Point 1", "Point 2", "Point 3", "Point 4"],
      "content": null,
      "highlight": null
    }
  ]
}`,

    science: `You are an expert AQA GCSE Science teacher creating lesson cards for: "${topic}"

Generate 7 lesson cards that teach this topic from scratch.
The student has not studied this topic yet.

Card types to use:
- EXPLAIN: What is it? Simple definition with real-world connection.
- EXAMPLE: A concrete example, experiment, or case study that illustrates the concept.
- VISUAL: A structured text diagram (e.g. food chain, equation breakdown, cell diagram in ASCII).
- MISTAKE: One common misconception students have, then the correct understanding.
- MEMORY: A mnemonic or memorable phrase for key facts/equations.
- PRACTICE: ONE exam-style question with model answer.
- SUMMARY: Key facts to remember — include any equations, definitions, or required facts.

Return ONLY valid JSON:
{
  "topic": "${topic}",
  "subject": "science",
  "cards": [
    {
      "type": "EXPLAIN",
      "title": "What is ${topic}?",
      "content": "Clear explanation with real-world context. 2-4 sentences.",
      "highlight": "The one sentence definition to memorise"
    },
    {
      "type": "EXAMPLE",
      "title": "Example",
      "content": "Concrete example or case study",
      "highlight": "Key point from this example"
    },
    {
      "type": "VISUAL",
      "title": "Diagram / Structure",
      "content": "ASCII diagram, flow chart, or structured layout",
      "highlight": null
    },
    {
      "type": "MISTAKE",
      "title": "Common misconception",
      "wrong": "What students incorrectly believe",
      "right": "The correct understanding",
      "content": "Why this confusion happens",
      "highlight": null
    },
    {
      "type": "MEMORY",
      "title": "Remember this",
      "content": "Mnemonic or memorable phrase",
      "highlight": "Any equation or key fact to memorise"
    },
    {
      "type": "PRACTICE",
      "title": "Exam question",
      "content": "Question text [X marks]",
      "answer": "Model answer with marking points",
      "highlight": null
    },
    {
      "type": "SUMMARY",
      "title": "Key facts",
      "bullets": ["Fact 1", "Fact 2", "Fact 3", "Fact 4"],
      "content": null,
      "highlight": null
    }
  ]
}`,

    english: `You are an expert AQA GCSE English Language teacher creating lesson cards for: "${topic}"

Generate 7 lesson cards that teach this skill or technique from scratch.
The student is unfamiliar with this topic.

Card types to use:
- EXPLAIN: What is the technique/skill? Plain English definition.
- EXAMPLE: An annotated text extract showing the technique in action. Label what the writer does and why.
- VISUAL: A structured template, framework, or annotated response structure.
- MISTAKE: A weak student response vs a strong student response (same question, different quality).
- MEMORY: A memorable acronym, structure, or phrase (e.g. PETER, AFOREST, DAFOREST).
- PRACTICE: ONE exam-style question with a model answer.
- SUMMARY: What to always do, what to never do, and the one-line formula.

Return ONLY valid JSON:
{
  "topic": "${topic}",
  "subject": "english",
  "cards": [
    {
      "type": "EXPLAIN",
      "title": "What is ${topic}?",
      "content": "Clear definition. Why do writers use this? What effect does it have?",
      "highlight": "One-sentence definition to memorise"
    },
    {
      "type": "EXAMPLE",
      "title": "Annotated example",
      "content": "A short text extract with the technique highlighted",
      "annotation": "Explanation of what the writer does and the effect on the reader",
      "highlight": null
    },
    {
      "type": "VISUAL",
      "title": "Response framework",
      "content": "Structured template or framework showing how to write about this technique",
      "highlight": null
    },
    {
      "type": "MISTAKE",
      "title": "Weak vs strong response",
      "wrong": "Example of a weak student response (surface-level, vague)",
      "right": "Example of a strong student response (specific, analytical)",
      "content": "What makes the difference",
      "highlight": null
    },
    {
      "type": "MEMORY",
      "title": "Remember this",
      "content": "Acronym, structure, or memorable phrase",
      "highlight": "The formula for a top-mark response"
    },
    {
      "type": "PRACTICE",
      "title": "Your turn",
      "content": "Question: [short extract] How does the writer use language here?",
      "answer": "Model answer demonstrating full technique",
      "highlight": null
    },
    {
      "type": "SUMMARY",
      "title": "Key rules",
      "bullets": ["Always do: ...", "Never do: ...", "Key phrase: ...", "Top tip: ..."],
      "content": null,
      "highlight": null
    }
  ]
}`,
  };

  return subjectInstructions[subject] ?? subjectInstructions.science;
}

export async function POST(req: NextRequest) {
  try {
    const { subject, topic } = await req.json() as {
      subject: string;
      topic:   string;
    };

    if (!subject || !topic) {
      return NextResponse.json({ error: 'Missing subject or topic' }, { status: 400 });
    }

    const client = await getGroq();
    const completion = await client.chat.completions.create({
      model:     'llama-3.3-70b-versatile',
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: buildPrompt(subject, topic) }],
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);

    if (!parsed.cards?.length) {
      return NextResponse.json({ error: 'Invalid lesson generated' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[gcse/learn]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
