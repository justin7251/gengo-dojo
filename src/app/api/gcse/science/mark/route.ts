import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const SUBJECT_GUIDANCE: Record<string, string> = {
  biology: `AQA Biology marking principles:
- Award marks for correct scientific content, not specific wording
- For 'explain' questions: must include a mechanism (because/therefore/so)
- For 'describe' questions: state the feature — no explanation needed
- QWC (quality of written communication) applies to 6-mark questions
- Accept equivalent correct scientific terms`,

  chemistry: `AQA Chemistry marking principles:
- For calculations: award method mark for correct equation even if arithmetic wrong
- For equations: accept state symbols unless specifically asked for
- 'Describe a test': must include reagent AND expected result
- For 'explain' questions on bonding: must refer to specific particles
- Consequential marks: if wrong answer used correctly in next step, award mark`,

  physics: `AQA Physics marking principles:
- For calculations: show equation (M), substitution (M), correct answer with units (A)
- Units are essential for final mark in calculate questions
- For 'explain' questions: must link cause to effect
- For graphs: award marks for correct shape, labels, and units
- Significant figures: accept 2-3 sig figs unless question specifies`,
};

export async function POST(req: NextRequest) {
  try {
    const { subject, questions, answers } = await req.json() as {
      subject:   string;
      questions: { number: number; marks: number; topic: string; type: string; question: string }[];
      answers:   { questionNum: number; text: string }[];
    };

    const guidance = SUBJECT_GUIDANCE[subject] ?? '';

    const answerBlock = answers.map(a => {
      const q = questions.find(q => q.number === a.questionNum);
      return `Q${a.questionNum} [${q?.topic} · ${q?.type} · ${q?.marks} marks]:
Question: ${q?.question}
Student answer: ${a.text || '(no answer)'}`;
    }).join('\n\n---\n\n');

    const client = await getGroq();
    const completion = await client.chat.completions.create({
      model:     'llama-3.3-70b-versatile',
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an experienced AQA GCSE ${subject.charAt(0).toUpperCase() + subject.slice(1)} examiner.
${guidance}
Mark each answer fairly. Award marks for correct scientific content.
For each question provide:
1. Marks earned
2. A model answer (what a full-mark response looks like)
3. Specific feedback referencing the student's answer`,
        },
        {
          role: 'user',
          content: `Mark these answers:

${answerBlock}

Return ONLY valid JSON:
{
  "results": [
    {
      "questionNum": 1,
      "marks": 1,
      "maxMarks": 2,
      "modelAnswer": "Plant cells have a cell wall (made of cellulose) [1] and a permanent vacuole [1] / chloroplasts [1]. (Any two)",
      "feedback": "You correctly identified the cell wall — 1 mark. You did not mention the permanent vacuole or chloroplasts, which are the other key differences. Animal cells do not have these structures."
    }
  ]
}

Rules:
- modelAnswer: write as an AQA mark scheme entry with [1] after each marking point
- feedback: 2-3 sentences. Acknowledge what was correct, state what was missing. Use correct scientific language.
- Be accurate — do not award marks for vague or incorrect statements
- For calculate questions with wrong answers: check if method was correct and award method marks`,
        }
      ]
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[gcse/science/mark]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
