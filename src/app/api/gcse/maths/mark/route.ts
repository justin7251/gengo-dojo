import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function POST(req: NextRequest) {
  try {
    const { questions, answers } = await req.json() as {
      questions: { number: number; marks: number; question: string; subtopic: string }[];
      answers:   { questionNum: number; text: string }[];
    };

    const answerBlock = answers.map(a => {
      const q = questions.find(q => q.number === a.questionNum);
      return `Q${a.questionNum} [${q?.subtopic} · ${q?.marks} marks]:\nQuestion: ${q?.question}\nStudent working:\n${a.text || '(no answer)'}`;
    }).join('\n\n---\n\n');

    const client = await getGroq();
    const completion = await client.chat.completions.create({
      model:     'llama-3.3-70b-versatile',
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an AQA GCSE Mathematics examiner. Mark each answer using the AQA mark scheme principles:
- M marks: method marks (awarded for correct method even if arithmetic error)
- A marks: accuracy marks (correct answer, only if method is correct)
- B marks: independent marks (awarded regardless of method)
Award marks generously for correct method with minor arithmetic slips.
Always provide the full model working showing every step clearly.`,
        },
        {
          role: 'user',
          content: `Mark these GCSE Maths answers. Award method marks where working shows correct approach even if the final answer is wrong.

${answerBlock}

Return ONLY valid JSON:
{
  "results": [
    {
      "questionNum": 1,
      "marks": 2,
      "maxMarks": 2,
      "working": "3x + 7 = 22\\n3x = 22 - 7\\n3x = 15\\nx = 5",
      "feedback": "Full marks. Clear method shown with correct answer."
    },
    {
      "questionNum": 2,
      "marks": 1,
      "maxMarks": 3,
      "working": "5x - 3 = 2x + 9\\n5x - 2x = 9 + 3\\n3x = 12\\nx = 4",
      "feedback": "1 mark awarded for collecting x terms correctly (M1). The arithmetic error in the final step lost the accuracy marks. Remember to check your answer by substituting back."
    }
  ]
}

Rules:
- working field: show every step of the model solution using \\n for line breaks
- Use ^ for powers, sqrt() for roots in working
- feedback: 1-2 sentences. Reference what the student did correctly/incorrectly. Mention specific marks lost and why.
- Be fair — award method marks wherever the student demonstrates correct mathematical reasoning`
        }
      ]
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[gcse/maths/mark]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
