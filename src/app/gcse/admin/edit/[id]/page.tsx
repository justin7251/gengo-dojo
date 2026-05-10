'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getLesson, saveLessonDraft, publishLesson, GCSELesson } from '@/lib/gcse-lessons';
import { LessonCard, CardType } from '@/components/GCSELessonCard';

const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID ?? '';

const CARD_COLORS: Record<CardType, string> = {
  HOOK:    '#EF9F27',
  ANALOGY: '#378ADD',
  RULE:    '#7F77DD',
  EXAMPLE: '#00e87a',
  BLANK:   '#D4537E',
  EXPLAIN: '#D4537E',
  RECALL:  '#EF9F27',
};

export default function AdminEditLessonPage() {
  const router    = useRouter();
  const { id }    = useParams<{ id: string }>();

  const [authed, setAuthed]     = useState(false);
  const [lesson, setLesson]     = useState<GCSELesson | null>(null);
  const [cards, setCards]       = useState<LessonCard[]>([]);
  const [saving, setSaving]     = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved]       = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [loading, setLoading]   = useState(true);

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
    const card = cards[cardIdx];
    const steps = [...(card.steps ?? [])];
    steps[stepIdx] = value;
    updateCard(cardIdx, { steps });
  }

  function updateBullet(cardIdx: number, bulletIdx: number, value: string) {
    const card = cards[cardIdx];
    const bullets = [...(card.bullets ?? [])];
    bullets[bulletIdx] = value;
    updateCard(cardIdx, { bullets });
  }

  function updateGuess(cardIdx: number, guessIdx: number, value: string) {
    const card = cards[cardIdx];
    const guesses = [...(card.guesses ?? [])];
    guesses[guessIdx] = value;
    updateCard(cardIdx, { guesses });
  }

  async function handleSave() {
    if (!lesson) return;
    setSaving(true);
    await saveLessonDraft({ ...lesson, cards }, lesson.id);
    setSaving(false);
    setSaved(true);
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
    <Screen>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    </Screen>
  );

  const card    = cards[activeCard];
  const color   = card ? CARD_COLORS[card.type] : '#fff';

  return (
    <Screen>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button onClick={() => router.push('/gcse/admin')} style={GHOST_BTN}>Back</button>
        <div style={{ textAlign: 'center', flex: 1, padding: '0 8px' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '2px' }}>{lesson?.subject} · {lesson?.topic}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: lesson?.published ? 'rgba(0,232,122,0.12)' : 'rgba(255,255,255,0.06)', color: lesson?.published ? '#00e87a' : 'rgba(255,255,255,0.3)' }}>
              {lesson?.published ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '7px 14px', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer',
          background: saved ? 'rgba(0,232,122,0.15)' : 'rgba(255,255,255,0.08)',
          border: `1px solid ${saved ? 'rgba(0,232,122,0.4)' : 'rgba(255,255,255,0.15)'}`,
          color: saved ? '#00e87a' : 'rgba(255,255,255,0.7)',
          fontSize: '13px', fontFamily: 'var(--font-ui)', fontWeight: 500,
          transition: 'all 0.2s',
        }}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {/* Card tab strip */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {cards.map((c, i) => (
          <button key={i} onClick={() => setActiveCard(i)} style={{
            flexShrink: 0, padding: '5px 10px', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: activeCard === i ? 700 : 400,
            border: `1px solid ${activeCard === i ? CARD_COLORS[c.type] + '60' : 'rgba(255,255,255,0.1)'}`,
            background: activeCard === i ? CARD_COLORS[c.type] + '18' : 'transparent',
            color: activeCard === i ? CARD_COLORS[c.type] : 'rgba(255,255,255,0.4)',
            transition: 'all 0.15s',
          }}>
            {i + 1} {c.type}
          </button>
        ))}
      </div>

      {/* Card editor */}
      {card && (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '16px', border: `1px solid ${color}20`, flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1rem' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', color, padding: '4px 10px', background: color + '18', borderRadius: '99px' }}>
              {card.type}
            </span>
          </div>

          {/* ── HOOK fields ── */}
          {card.type === 'HOOK' && (
            <>
              <Field label="Question" value={card.question ?? ''} onChange={v => updateCard(activeCard, { question: v })} rows={2} />
              <div>
                <label style={LABEL_STYLE}>Guesses (3 wrong-ish answers)</label>
                {(card.guesses ?? ['', '', '']).map((g, i) => (
                  <input key={i} value={g} onChange={e => updateGuess(activeCard, i, e.target.value)}
                    placeholder={`Guess ${i + 1}`}
                    style={{ ...INPUT_STYLE, marginBottom: '6px' }} />
                ))}
              </div>
            </>
          )}

          {/* ── ANALOGY fields ── */}
          {card.type === 'ANALOGY' && (
            <>
              <Field label="Analogy sentence" value={card.analogy ?? ''} onChange={v => updateCard(activeCard, { analogy: v })} rows={2} />
              <Field label="Connection (why it works)" value={card.connection ?? ''} onChange={v => updateCard(activeCard, { connection: v })} rows={2} />
              <Field label="Visual (ASCII diagram)" value={card.visual ?? ''} onChange={v => updateCard(activeCard, { visual: v })} rows={3} mono />
            </>
          )}

          {/* ── RULE fields ── */}
          {card.type === 'RULE' && (
            <>
              <Field label="The rule (one sentence)" value={card.rule ?? ''} onChange={v => updateCard(activeCard, { rule: v })} rows={2} />
              <Field label="Formula (optional)" value={card.formula ?? ''} onChange={v => updateCard(activeCard, { formula: v })} rows={1} mono />
            </>
          )}

          {/* ── EXAMPLE fields ── */}
          {card.type === 'EXAMPLE' && (
            <>
              <Field label="Scenario (brief context)" value={card.scenario ?? ''} onChange={v => updateCard(activeCard, { scenario: v })} rows={1} />
              <div>
                <label style={LABEL_STYLE}>Steps (3 steps)</label>
                {(card.steps ?? ['', '', '']).map((s, i) => (
                  <textarea key={i} value={s} onChange={e => updateStep(activeCard, i, e.target.value)}
                    placeholder={`Step ${i + 1}`} rows={2}
                    style={{ ...INPUT_STYLE, fontFamily: 'var(--font-mono)', marginBottom: '6px', resize: 'vertical' }} />
                ))}
              </div>
            </>
          )}

          {/* ── BLANK fields ── */}
          {card.type === 'BLANK' && (
            <>
              <Field label='Sentence (use ___ for the blank)' value={card.sentence ?? ''} onChange={v => updateCard(activeCard, { sentence: v })} rows={2} />
              <Field label="Correct answer" value={card.answer ?? ''} onChange={v => updateCard(activeCard, { answer: v })} rows={1} mono />
              <Field label="Hint (one word)" value={card.hint ?? ''} onChange={v => updateCard(activeCard, { hint: v })} rows={1} />
            </>
          )}

          {/* ── EXPLAIN fields ── */}
          {card.type === 'EXPLAIN' && (
            <>
              <Field label="Prompt (Explain why/how...)" value={card.prompt ?? ''} onChange={v => updateCard(activeCard, { prompt: v })} rows={2} />
              <Field label="Model answer (2-3 sentences)" value={card.modelAnswer ?? ''} onChange={v => updateCard(activeCard, { modelAnswer: v })} rows={4} />
            </>
          )}

          {/* ── RECALL fields ── */}
          {card.type === 'RECALL' && (
            <>
              <Field label="Question (same as HOOK)" value={card.question ?? ''} onChange={v => updateCard(activeCard, { question: v })} rows={2} />
              <Field label="Full answer" value={card.answer ?? ''} onChange={v => updateCard(activeCard, { answer: v })} rows={4} />
            </>
          )}
        </div>
      )}

      {/* Publish / Unpublish */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {lesson?.published ? (
          <button onClick={handleUnpublish} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid rgba(239,159,39,0.4)', background: 'rgba(239,159,39,0.1)', color: '#EF9F27', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            Unpublish
          </button>
        ) : (
          <button onClick={handlePublish} disabled={publishing} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#00e87a', color: '#040e08', fontSize: '14px', fontWeight: 700, cursor: publishing ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)', opacity: publishing ? 0.6 : 1 }}>
            {publishing ? 'Publishing...' : 'Save + Publish'}
          </button>
        )}
      </div>

      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </Screen>
  );
}

function Field({ label, value, onChange, rows = 2, mono = false }: { label: string; value: string; onChange: (v: string) => void; rows?: number; mono?: boolean }) {
  return (
    <div>
      <label style={LABEL_STYLE}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows}
        style={{ ...INPUT_STYLE, fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)', resize: 'vertical' }} />
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#06080f', backgroundImage: 'radial-gradient(ellipse at top left, #0d1428 0%, #06080f 60%)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 2rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,232,122,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,232,122,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '560px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </main>
  );
}

const LABEL_STYLE: React.CSSProperties = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: '5px' };
const INPUT_STYLE: React.CSSProperties = { width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none', lineHeight: 1.6 };
const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
function Spinner() { return <div style={{ width: '28px', height: '28px', border: '2px solid rgba(0,232,122,0.15)', borderTopColor: '#00e87a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />; }
