import { NextRequest, NextResponse } from 'next/server';

async function getGroq() {
  const Groq = (await import('groq-sdk')).default;
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function POST(req: NextRequest) {
  try {
    const { paper } = await req.json() as { paper: 'P1' | 'P2' };
    const isP1 = paper === 'P1';

    const prompt = isP1 ? `Generate an AQA GCSE English Language Paper 1 style fiction extract and questions.

Return ONLY valid JSON:
{
  "session": {
    "title": "A short evocative title",
    "paper": "P1",
    "extract": "A fiction extract of approximately 400-500 words. Should be engaging, atmospheric, and rich in language techniques. Could be from any genre: literary fiction, thriller, coming-of-age, etc. Write in a literary style suitable for GCSE level. DO NOT include chapter headings or author names — just the prose.",
    "questions": [
      {
        "number": 1,
        "ao": "AO1",
        "marks": 4,
        "question": "Read lines 1-10. List four things from this part of the text about [specific aspect].",
        "hint": "Find four separate pieces of information. One point per mark. No analysis needed."
      },
      {
        "number": 2,
        "ao": "AO2",
        "marks": 8,
        "question": "Look in detail at lines [X-Y]. How does the writer use language here to describe [specific element]? You could include the writer's choice of: words and phrases; language features and techniques; sentence forms.",
        "hint": "Use PETER: Point, Evidence, Technique, Effect, Reader response. Aim for 3-4 developed points."
      },
      {
        "number": 3,
        "ao": "AO3",
        "marks": 8,
        "question": "You now need to think about the whole of the source. How has the writer structured the text to interest you as a reader?",
        "hint": "Consider: beginnings and endings, focus shifts, narrative perspective, sentence/paragraph structure, turning points."
      },
      {
        "number": 4,
        "ao": "AO4",
        "marks": 20,
        "question": "Focus this part of your answer on the second half of the source. A student, having read this section, said: '[A debatable statement about the text's tone, character, or theme].' To what extent do you agree? In your response, you could: write about your own impressions of [aspect]; evaluate how the writer has created these impressions; support your opinions with quotations from the text.",
        "hint": "Write a balanced argument. Use evidence. Challenge and support the statement. Aim for 4-5 developed paragraphs."
      }
    ]
  }
}` : `Generate an AQA GCSE English Language Paper 2 style non-fiction source and questions.

Return ONLY valid JSON:
{
  "session": {
    "title": "A clear factual title",
    "paper": "P2",
    "extract": "A non-fiction extract of approximately 350-400 words. Could be a newspaper article, opinion piece, travel writing, biography, or reportage. Should have a clear viewpoint and use rhetorical techniques. Write in the style of quality journalism or non-fiction writing. Include a realistic byline date (e.g. 'The Guardian, 2019').",
    "questions": [
      {
        "number": 1,
        "ao": "AO1",
        "marks": 4,
        "question": "Read lines 1-15. Choose four statements below which are TRUE. [AI: list 8 true/false statements, 4 of which are true].",
        "hint": "Read carefully. Four statements must be demonstrably true based on the text. Shade four circles."
      },
      {
        "number": 2,
        "ao": "AO1",
        "marks": 8,
        "question": "You need to refer to the whole source. The writer describes [a key aspect of the topic]. Summarise the different difficulties or challenges described in the text.",
        "hint": "Synthesise information from across the whole text. Find 4+ distinct points. Use your own words where possible."
      },
      {
        "number": 3,
        "ao": "AO2",
        "marks": 12,
        "question": "You now need to think about the whole of the source. How does the writer use language to convey their views and feelings about [topic]? You could include the writer's choice of: words and phrases; language features and techniques; sentence forms.",
        "hint": "Focus on HOW language creates effects. Use PETER method. 4-5 developed points. Focus on writer's methods, not just what they say."
      },
      {
        "number": 4,
        "ao": "AO3",
        "marks": 16,
        "question": "For this question, you need to refer to the whole of source A, together with the whole of source B. Compare how the two writers convey their different attitudes to [topic]. In your answer, you could: compare their different attitudes; compare the methods they use to convey their attitudes; support your ideas with quotations from both texts.",
        "hint": "Note: For this practice, compare your response to what a second source might argue. Write about both similarities and differences in attitude and method."
      }
    ]
  }
}`;

    const client = await getGroq();
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
    });

    const raw    = completion.choices[0].message.content ?? '{}';
    const parsed = JSON.parse(raw);

    if (!parsed.session) {
      return NextResponse.json({ error: 'Invalid session generated' }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[gcse/reading]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
