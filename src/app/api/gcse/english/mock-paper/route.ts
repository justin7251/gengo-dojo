// src/app/api/gcse/mock-paper/route.ts
import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function POST(req: NextRequest) {
  try {
    const { paper } = await req.json() as { paper: 'P1' | 'P2' };
    const isP1 = paper === 'P1';
    const client = await getGroq();

    const completion = await client.chat.completions.create({
      model:     'llama-3.3-70b-versatile',
      max_tokens: 2500,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Generate a complete AQA GCSE English Language ${isP1 ? 'Paper 1' : 'Paper 2'} mock paper.

Return ONLY valid JSON:
{
  "mock": {
    "title": "An evocative title for the paper",
    "paper": "${paper}",
    "extract": "${isP1 ? 'A fiction extract of 450-550 words. Literary, atmospheric, rich in language techniques.' : 'A non-fiction extract of 400-500 words. Could be journalism, travel writing, autobiography, or opinion piece with a clear viewpoint.'}",
    "questions": [
      {
        "number": 1,
        "ao": "AO1",
        "marks": 4,
        "section": "reading",
        "question": "${isP1 ? 'Read lines 1-10 of the source. List four things from this part of the text about [specific aspect].' : 'Read lines 1-10. Choose four statements which are TRUE about the extract.'}",
        "hint": "${isP1 ? 'Find four separate pieces of information. One point per mark. No analysis needed.' : 'Read carefully. Only tick statements directly supported by the text.'}"
      },
      {
        "number": 2,
        "ao": "${isP1 ? 'AO2' : 'AO1'}",
        "marks": 8,
        "section": "reading",
        "question": "${isP1 ? 'Look in detail at lines [X-Y] of the source. How does the writer use language here to describe [specific element]?' : 'You need to refer to the whole source. Summarise the [key theme or challenge] described in the text.'}",
        "hint": "${isP1 ? 'Use PETER: Point, Evidence, Technique, Effect, Reader response. 3-4 developed points.' : 'Find at least 4 separate points. Use your own words. Synthesise from across the whole text.'}"
      },
      {
        "number": 3,
        "ao": "${isP1 ? 'AO3' : 'AO2'}",
        "marks": ${isP1 ? 8 : 12},
        "section": "reading",
        "question": "${isP1 ? 'You now need to think about the whole of the source. How has the writer structured the text to interest you as a reader?' : 'How does the writer use language to convey their attitudes and feelings about [topic]?'}",
        "hint": "${isP1 ? 'Consider: beginnings and endings, focus shifts, turning points, narrative perspective, structural choices.' : 'Focus on HOW language creates effects. Use PETER method. 4-5 developed points.'}"
      },
      {
        "number": 4,
        "ao": "AO4",
        "marks": 20,
        "section": "reading",
        "question": "${isP1 ? 'Focus on the second half of the source. A student said: \'[A debatable evaluative statement about the text]\'. To what extent do you agree with this view?' : 'For this question, you need to refer to the whole source. Compare how the writers convey their different attitudes to [topic]. In your response, compare: their different attitudes; the methods used to convey attitudes; support with quotations.'}",
        "hint": "${isP1 ? 'Build a balanced argument. Use evidence throughout. Challenge and support the statement. 4-5 paragraphs.' : 'Write about both texts equally. Compare methods as well as ideas. Use connectives: similarly, in contrast, whereas.'}"
      },
      {
        "number": 5,
        "ao": "AO5+AO6",
        "marks": 40,
        "section": "writing",
        "question": "${isP1 ? 'You are going to enter a creative writing competition. Either: write a description suggested by [a vivid scenario related to the extract\'s setting]; or: write the opening part of a story suggested by [a compelling story starter]. (40 marks)' : 'A broadsheet newspaper has asked for opinion pieces on the following topic: [A debatable contemporary issue]. Write a newspaper article arguing your view. (40 marks)'}",
        "hint": "${isP1 ? 'AO5 (24): Communicate effectively. Use structure, tone, and form. AO6 (16): Vocabulary, sentences, spelling, punctuation. Aim 450-600 words.' : 'AO5 (24): Clear viewpoint, varied structure, persuasive techniques. AO6 (16): Formal register, accurate punctuation, varied vocabulary. Aim 450-600 words.'}"
      }
    ]
  }
}`
      }]
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    return NextResponse.json(JSON.parse(raw));
  } catch (err) {
    console.error('[gcse/mock-paper]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
