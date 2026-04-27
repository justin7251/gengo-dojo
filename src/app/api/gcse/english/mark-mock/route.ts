import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function POST(req: NextRequest) {
  try {
    const { mock, answers } = await req.json() as {
      mock: {
        extract:   string;
        questions: { number: number; ao: string; marks: number; question: string; section: string }[];
      };
      answers: { questionNum: number; text: string }[];
    };

    const client = await getGroq();

    // Mark all questions in one call for speed
    const answerBlock = answers.map(a => {
      const q = mock.questions.find(q => q.number === a.questionNum);
      return `Q${a.questionNum} [${q?.ao} · ${q?.marks} marks · ${q?.section}]:\n${a.text || '(no answer)'}`;
    }).join('\n\n---\n\n');

    const completion = await client.chat.completions.create({
      model:     'llama-3.3-70b-versatile',
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'system',
        content: 'You are a senior AQA GCSE English Language examiner. Mark each answer against AQA criteria. Be rigorous and specific. Use examiner language. For writing (Q5), apply AO5 (24) and AO6 (16) mark scheme bands.'
      }, {
        role: 'user',
        content: `EXTRACT:
${mock.extract}

STUDENT ANSWERS:
${answerBlock}

Mark every question. For Q5 (writing, 40 marks) give AO5 marks, AO6 marks, and combined total.

Return ONLY valid JSON:
{
  "results": [
    {
      "questionNum": 1,
      "marks": 3,
      "maxMarks": 4,
      "feedback": "Specific 2-3 sentence feedback referencing the student's answer and what they need to do to score higher. Use AQA examiner language."
    },
    {
      "questionNum": 5,
      "marks": 28,
      "maxMarks": 40,
      "feedback": "AO5: 17/24 — [feedback]. AO6: 11/16 — [feedback]. Overall: [what worked, one target, model phrase]."
    }
  ]
}`
      }]
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    return NextResponse.json(JSON.parse(raw));
  } catch (err) {
    console.error('[gcse/mark-mock]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
