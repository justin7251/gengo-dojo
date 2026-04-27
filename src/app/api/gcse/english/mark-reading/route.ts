import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function POST(req: NextRequest) {
  try {
    const { extract, questions, answers } = await req.json() as {
      extract:   string;
      questions: { number: number; ao: string; marks: number; question: string }[];
      answers:   { questionNum: number; text: string }[];
    };

    const answerBlock = answers.map(a => {
      const q = questions.find(q => q.number === a.questionNum);
      return `Q${a.questionNum} [${q?.ao} · ${q?.marks} marks]: ${a.text}`;
    }).join('\n\n');

    const qBlock = questions.map(q =>
      `Q${q.number}: ${q.question} [${q.ao} · ${q.marks} marks]`
    ).join('\n');

    const prompt = `You are an experienced AQA GCSE English Language examiner.

EXTRACT:
${extract}

QUESTIONS:
${qBlock}

STUDENT ANSWERS:
${answerBlock}

Mark each answer using AQA mark scheme principles. Be honest — reward genuine understanding, penalise vague or unsupported responses.

For each question provide:
- Marks awarded (out of the maximum)
- 2-3 sentences of specific, actionable feedback using AQA language
- What the student did well (if anything)
- One specific target for improvement
- For AO2/AO3 questions: note if PETER structure was used

Return ONLY valid JSON:
{
  "feedback": [
    {
      "questionNum": 1,
      "marks": 3,
      "maxMarks": 4,
      "feedback": "You identified three valid points clearly drawn from the text. To gain the fourth mark, you needed to include a reference to [specific detail]. Your points are well-selected but some lack direct textual support — always anchor each point in the extract."
    }
  ]
}`;

    const client = await getGroq();
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[gcse/mark-reading]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
