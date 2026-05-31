'use client';
import { Spinner } from '@/components/Spinner';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getLesson, saveLessonDraft, publishLesson, GCSELesson } from '@/lib/gcse-lessons';
import { LessonCard, CardType } from '@/components/GCSELessonCard';

const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID ?? '';

const CARD_COLORS: Record<CardType, string> = {
  HOOK:    'var(--orange)',
  ANALOGY: 'var(--blue)',
  RULE:    'var(--purple)',
  EXAMPLE: 'var(--green)',
  BLANK:   'var(--pink)',
  EXPLAIN: 'var(--pink)',
  RECALL:  'var(--orange)',
};

const CARD_BG: Record<CardType, string> = {
  HOOK:    'var(--orange-light)',
  ANALOGY: 'var(--blue-light)',
  RULE:    'var(--purple-light)',
  EXAMPLE: 'var(--green-light)',
  BLANK:   'var(--purple-light)',
  EXPLAIN: 'var(--purple-light)',
  RECALL:  'var(--orange-light)',
};

export default function AdminEditLessonPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [authed, setAuthed]         = useState(false);
  const [lesson, setLesson]         = useState<GCSELesson | null>(null);
  const [cards, setCards]           = useState<LessonCard[]>([]);
  const [saving, setSaving]         = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved]           = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    return onAuth(async user => {
      if (!user) { router.push('/dashboard'); return; }
      if (ADMIN_UID && user.uid !== ADMIN_UID) { router.push('/dashboard'); return; }
      setAuthed(true);
      const l = await getLesson(id);
      if (!l) { router.push('/gcse/admin'); return; }
      setLesson(l);
      setCards(l.cards);
      setLoading(false);
    });
  }, [id]);

  function updateCard(idx: number, updates: Partial<LessonCard>) {
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, ...updates } : c));
    setSaved(false);
  }

  function updateStep(cardIdx: number, stepIdx: number, value: string) {
    const steps = [...(cards[cardIdx].steps ?? [])];
    steps[stepIdx] = value;
    updateCard(cardIdx, { steps });
  }

  function updateGuess(cardIdx: number, guessIdx: number, value: string) {
    const guesses = [...(cards[cardIdx].guesses ?? [])];
    guesses[guessIdx] = value;
    updateCard(cardIdx, { guesses });
  }

  async function handleSave() {
    if (!lesson) return;
    setSaving(true);
    await saveLessonDraft({ ...lesson, cards }, lesson.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handlePublish() {
    if (!lesson) return;
    setPublishing(true);
    await saveLessonDraft({ ...lesson, cards }, lesson.id);
    await publishLesson(lesson.id, true);
    setPublishing(false);
    router.push('/gcse/admin');
  }

  async function handleUnpublish() {
    if (!lesson) return;
    await publishLesson(lesson.id, false);
    setLesson(l => l ? { ...l, published: false } : l);
  }

  if (!authed || loading) return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    </Shell>
  );

  const card  = cards[activeCard];
  const color = card ? CARD_COLORS[card.type] : 'var(--green)';
  const bg    = card ? CARD_BG[card.type]     : 'var(--green-light)';

  return (
    <Shell>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button onClick={() => router.push('/gcse/admin')} className="btn" style={{ fontSize: '13px', padding: '7px 14px' }}>← Back</button>
        <div style={{ textAlign: 'center', flex: 1, padding: '0 8px' }}>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '2px', fontWeight: 600 }}>{lesson?.subject} · {lesson?.topic}</p>
          <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '99px', background: lesson?.published ? 'var(--green-light)' : 'var(--bg-secondary)', color: lesson?.published ? 'var(--green-dark)' : 'var(--muted)', border: `2px solid ${lesson?.published ? 'var(--green)' : 'var(--border-dark)'}`, fontWeight: 700 }}>
            {lesson?.published ? '✓ Published' : '· Draft'}
          </span>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn"
          style={{ fontSize: '13px', padding: '7px 14px', background: saved ? 'var(--green-light)' : undefined, borderColor: saved ? 'var(--green)' : undefined, color: saved ? 'var(--green-dark)' : undefined }}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save'}
        </button>
      </div>

      {/* Card tab strip */}
      <div style={{ display: 'flex', gap: '5px', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {cards.map((c, i) => (
          <button key={i} onClick={() => setActiveCard(i)} style={{
            flexShrink: 0, padding: '6px 11px', borderRadius: '10px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: 700,
            border: `2.5px solid ${activeCard === i ? CARD_COLORS[c.type] : 'var(--border-dark)'}`,
            background: activeCard === i ? CARD_BG[c.type] : '#fff',
            color: activeCard === i ? CARD_COLORS[c.type] : 'var(--muted)',
            boxShadow: activeCard === i ? `0 3px 0 ${CARD_COLORS[c.type]}55` : '0 3px 0 var(--border-dark)',
            transition: 'all 0.1s',
          }}>
            {i + 1} · {c.type}
          </button>
        ))}
      </div>

      {/* Card editor */}
      {card && (
        <div style={{ background: '#fff', borderRadius: '18px', padding: '18px', border: `2.5px solid ${color}55`, flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '1rem', boxShadow: `0 6px 0 ${color}55` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', color, padding: '4px 12px', background: bg, border: `2px solid ${color}55`, borderRadius: '99px' }}>
              {card.type}
            </span>
          </div>

          {/* HOOK */}
          {card.type === 'HOOK' && (<>
            <Field label="Question" value={card.question ?? ''} onChange={v => updateCard(activeCard, { question: v })} rows={2} />
            <div>
              <label style={LABEL}>Guesses — 3 plausible wrong answers</label>
              {(card.guesses ?? ['', '', '']).map((g, i) => (
                <input key={i} value={g} onChange={e => updateGuess(activeCard, i, e.target.value)}
                  placeholder={`Guess ${i + 1}`} style={{ ...INPUT, marginBottom: '6px' }} />
              ))}
            </div>
          </>)}

          {/* ANALOGY */}
          {card.type === 'ANALOGY' && (<>
            <Field label="Analogy sentence" value={card.analogy ?? ''} onChange={v => updateCard(activeCard, { analogy: v })} rows={2} />
            <Field label="Connection — why this analogy works" value={card.connection ?? ''} onChange={v => updateCard(activeCard, { connection: v })} rows={2} />
            <Field label="Visual — optional ASCII diagram" value={card.visual ?? ''} onChange={v => updateCard(activeCard, { visual: v })} rows={3} mono />
          </>)}

          {/* RULE */}
          {card.type === 'RULE' && (<>
            <Field label="The rule — one plain-English sentence" value={card.rule ?? ''} onChange={v => updateCard(activeCard, { rule: v })} rows={2} />
            <Field label="Formula — optional technical name" value={card.formula ?? ''} onChange={v => updateCard(activeCard, { formula: v })} rows={1} mono />
          </>)}

          {/* EXAMPLE */}
          {card.type === 'EXAMPLE' && (<>
            <Field label="Scenario — brief context (1 line)" value={card.scenario ?? ''} onChange={v => updateCard(activeCard, { scenario: v })} rows={1} />
            <div>
              <label style={LABEL}>Steps — max 3, max 10 words each</label>
              {(card.steps ?? ['', '', '']).map((s, i) => (
                <textarea key={i} value={s} onChange={e => updateStep(activeCard, i, e.target.value)}
                  placeholder={`Step ${i + 1}`} rows={2}
                  style={{ ...INPUT, fontFamily: 'monospace', marginBottom: '6px', resize: 'vertical' }} />
              ))}
            </div>
          </>)}

          {/* BLANK */}
          {card.type === 'BLANK' && (<>
            <Field label="Sentence — use ___ for the blank" value={card.sentence ?? ''} onChange={v => updateCard(activeCard, { sentence: v })} rows={2} />
            <Field label="Correct answer — one guessable word" value={card.answer ?? ''} onChange={v => updateCard(activeCard, { answer: v })} rows={1} mono />
            <Field label="Hint — one-word nudge" value={card.hint ?? ''} onChange={v => updateCard(activeCard, { hint: v })} rows={1} />
          </>)}

          {/* EXPLAIN */}
          {card.type === 'EXPLAIN' && (<>
            <Field label="Prompt — Explain to a friend why/how…" value={card.prompt ?? ''} onChange={v => updateCard(activeCard, { prompt: v })} rows={2} />
            <Field label="Model answer — 2–3 plain sentences" value={card.modelAnswer ?? ''} onChange={v => updateCard(activeCard, { modelAnswer: v })} rows={4} />
          </>)}

          {/* RECALL */}
          {card.type === 'RECALL' && (<>
            <Field label="Question — same as HOOK question" value={card.question ?? ''} onChange={v => updateCard(activeCard, { question: v })} rows={2} />
            <Field label="Full answer — complete plain-English explanation" value={card.answer ?? ''} onChange={v => updateCard(activeCard, { answer: v })} rows={4} />
          </>)}
        </div>
      )}

      {/* Publish / Unpublish */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {lesson?.published ? (
          <button onClick={handleUnpublish} className="btn btn-orange" style={{ flex: 1 }}>Unpublish</button>
        ) : (
          <button onClick={handlePublish} disabled={publishing} className="btn btn-primary" style={{ flex: 1 }}>
            {publishing ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}><Spinner size={14} color="#fff" /> Publishing…</span> : '✓ Save + Publish'}
          </button>
        )}
      </div>
    </Shell>
  );
}

// ── Helpers ───────────────────────────────────────────

function Field({ label, value, onChange, rows = 2, mono = false }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; mono?: boolean;
}) {
  return (
    <div>
      <label style={LABEL}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        style={{ ...INPUT, fontFamily: mono ? 'monospace' : 'var(--font-ui)', resize: 'vertical' }} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 2rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(88,204,2,0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '560px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </main>
  );
}

const LABEL: React.CSSProperties = {
  fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em',
  color: 'var(--muted)', display: 'block', marginBottom: '5px',
  textTransform: 'uppercase',
};
const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 13px',
  background: 'var(--bg-secondary)',
  border: '2.5px solid var(--border-dark)',
  borderRadius: '10px', color: 'var(--fg)',
  fontSize: '13px', outline: 'none', lineHeight: 1.6,
  boxShadow: '0 2px 0 var(--border-dark)',
  fontFamily: 'var(--font-ui)',
};
