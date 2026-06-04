'use client';
import { Spinner } from '@/components/Spinner';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

// ── Topic pages ────────────────────────────────────────────────────────────────
// Each topic page just re-exports this shared component with a topic prop.
// Create four files:
//   src/app/gcse/maths/algebra/page.tsx     → <MathsTopic topic="algebra" />
//   src/app/gcse/maths/geometry/page.tsx    → <MathsTopic topic="geometry" />
//   src/app/gcse/maths/statistics/page.tsx  → <MathsTopic topic="statistics" />
//   src/app/gcse/maths/number/page.tsx      → <MathsTopic topic="number" />

export type MathsTopic = 'algebra' | 'geometry' | 'statistics' | 'number';

const TOPIC_META: Record<MathsTopic, {
  label:    string;
  emoji:    string;
  color:    string;
  subtopics: { id: string; label: string; difficulty: 'F' | 'H' | 'F/H' }[];
}> = {
  algebra: {
    label: 'Algebra', emoji: '🔣', color: '#378ADD',
    subtopics: [
      { id: 'linear',        label: 'Linear equations',          difficulty: 'F/H' },
      { id: 'simultaneous',  label: 'Simultaneous equations',    difficulty: 'F/H' },
      { id: 'quadratics',    label: 'Quadratic equations',       difficulty: 'F/H' },
      { id: 'sequences',     label: 'Sequences & nth term',      difficulty: 'F/H' },
      { id: 'inequalities',  label: 'Inequalities',              difficulty: 'F/H' },
      { id: 'functions',     label: 'Functions & graphs',        difficulty: 'H'   },
      { id: 'factorising',   label: 'Factorising expressions',   difficulty: 'F/H' },
      { id: 'rearranging',   label: 'Rearranging formulae',      difficulty: 'F/H' },
    ],
  },
  geometry: {
    label: 'Geometry & Measures', emoji: '📐', color: '#7F77DD',
    subtopics: [
      { id: 'pythagoras',    label: 'Pythagoras theorem',        difficulty: 'F/H' },
      { id: 'trigonometry',  label: 'Trigonometry (SOH CAH TOA)',difficulty: 'F/H' },
      { id: 'circles',       label: 'Circle theorems',           difficulty: 'H'   },
      { id: 'vectors',       label: 'Vectors',                   difficulty: 'H'   },
      { id: 'area-volume',   label: 'Area & volume',             difficulty: 'F/H' },
      { id: 'angles',        label: 'Angles & parallel lines',   difficulty: 'F/H' },
      { id: 'transformations',label: 'Transformations',          difficulty: 'F/H' },
      { id: 'congruence',    label: 'Congruence & similarity',   difficulty: 'F/H' },
    ],
  },
  statistics: {
    label: 'Statistics & Probability', emoji: '📊', color: '#00e87a',
    subtopics: [
      { id: 'averages',      label: 'Mean, median, mode, range', difficulty: 'F/H' },
      { id: 'probability',   label: 'Probability (basic)',       difficulty: 'F/H' },
      { id: 'tree-diagrams', label: 'Tree diagrams',             difficulty: 'F/H' },
      { id: 'cum-freq',      label: 'Cumulative frequency',      difficulty: 'F/H' },
      { id: 'box-plots',     label: 'Box plots',                 difficulty: 'F/H' },
      { id: 'histograms',    label: 'Histograms',                difficulty: 'H'   },
      { id: 'correlation',   label: 'Scatter graphs & correlation', difficulty: 'F/H' },
      { id: 'venn',          label: 'Venn diagrams',             difficulty: 'F/H' },
    ],
  },
  number: {
    label: 'Number', emoji: '🔢', color: '#EF9F27',
    subtopics: [
      { id: 'fractions',     label: 'Fractions & decimals',      difficulty: 'F/H' },
      { id: 'percentages',   label: 'Percentages',               difficulty: 'F/H' },
      { id: 'ratio',         label: 'Ratio & proportion',        difficulty: 'F/H' },
      { id: 'standard-form', label: 'Standard form',             difficulty: 'F/H' },
      { id: 'surds',         label: 'Surds',                     difficulty: 'H'   },
      { id: 'indices',       label: 'Indices & powers',          difficulty: 'F/H' },
      { id: 'bounds',        label: 'Bounds & accuracy',         difficulty: 'H'   },
      { id: 'prime-factors', label: 'Prime factors, HCF, LCM',  difficulty: 'F/H' },
    ],
  },
};

type Tier  = 'Foundation' | 'Higher';
type Phase = 'setup' | 'generating' | 'answering' | 'feedback';

interface MathsQuestion {
  number:    number;
  marks:     number;
  question:  string;
  hint:      string;
  tier:      Tier;
  subtopic:  string;
}

interface MarkResult {
  questionNum: number;
  marks:       number;
  maxMarks:    number;
  working:     string;
  feedback:    string;
}

interface MathsTopicProps { topic: MathsTopic; }

export function MathsTopicPage({ topic }: MathsTopicProps) {
  const router   = useRouter();
  const meta     = TOPIC_META[topic];

  const [tier, setTier]             = useState<Tier>('Higher');
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [phase, setPhase]           = useState<Phase>('setup');
  const [questions, setQuestions]   = useState<MathsQuestion[]>([]);
  const [answers, setAnswers]       = useState<Record<number, string>>({});
  const [results, setResults]       = useState<MarkResult[]>([]);
  const [error, setError]           = useState('');
  const [totalMarks, setTotalMarks] = useState({ earned: 0, max: 0 });

  const filteredSubs = meta.subtopics.filter(s =>
    tier === 'Foundation' ? s.difficulty !== 'H' : true
  );

  async function generateQuestions() {
    setPhase('generating');
    setError('');
    try {
      const res  = await fetch('/api/gcse/maths/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subtopic: selectedSub, tier }),
      });
      const data = await res.json();
      if (!data.questions?.length) throw new Error();
      setQuestions(data.questions);
      setAnswers({});
      setResults([]);
      setPhase('answering');
    } catch {
      setError('Failed to generate questions. Try again.');
      setPhase('setup');
    }
  }

  async function submitAnswers() {
    setPhase('generating');
    setError('');
    try {
      const res  = await fetch('/api/gcse/maths/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions,
          answers: Object.entries(answers).map(([num, text]) => ({ questionNum: Number(num), text })),
        }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
      const earned = (data.results ?? []).reduce((s: number, r: MarkResult) => s + r.marks, 0);
      const max    = questions.reduce((s, q) => s + q.marks, 0);
      setTotalMarks({ earned, max });
      setPhase('feedback');
    } catch {
      setError('Marking failed. Try again.');
      setPhase('answering');
    }
  }

  const color = meta.color;

  // ── Setup ────────────────────────────────────────────
  if (phase === 'setup') return (
    <Screen color={color} onBack={() => router.push('/gcse/maths')}>
      <TopBar onBack={() => router.push('/gcse/maths')} title={`${meta.emoji} ${meta.label}`} />

      <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        AI generates exam-style questions. Show your working — partial marks available.
      </p>

      {/* Tier */}
      <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'var(--fg-secondary)', marginBottom: '8px' }}>TIER</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {(['Foundation', 'Higher'] as Tier[]).map(t => (
          <button key={t} onClick={() => { setTier(t); setSelectedSub(null); }} style={{
            flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500,
            border: `1px solid ${tier === t ? `${color}60` : 'rgba(255,255,255,0.1)'}`,
            background: tier === t ? `${color}15` : 'var(--bg-secondary)',
            color: tier === t ? color : 'rgba(255,255,255,0.5)', transition: 'all 0.15s',
          }}>
            {t} {t === 'Foundation' ? '(Grades 1–5)' : '(Grades 4–9)'}
          </button>
        ))}
      </div>

      {/* Subtopic */}
      <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'var(--fg-secondary)', marginBottom: '8px' }}>
        SUBTOPIC <span style={{ color: 'var(--muted)', fontWeight: 400 }}>— optional, leave blank for mixed</span>
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.5rem' }}>
        <button onClick={() => setSelectedSub(null)} style={{
          padding: '6px 12px', borderRadius: '99px', cursor: 'pointer',
          fontFamily: 'var(--font-ui)', fontSize: '12px',
          border: `1px solid ${selectedSub === null ? `${color}60` : 'rgba(255,255,255,0.1)'}`,
          background: selectedSub === null ? `${color}15` : 'var(--bg-secondary)',
          color: selectedSub === null ? color : 'rgba(255,255,255,0.5)', transition: 'all 0.15s',
        }}>
          Mixed
        </button>
        {filteredSubs.map(s => (
          <button key={s.id} onClick={() => setSelectedSub(s.id)} style={{
            padding: '6px 12px', borderRadius: '99px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '12px',
            border: `1px solid ${selectedSub === s.id ? `${color}60` : 'rgba(255,255,255,0.1)'}`,
            background: selectedSub === s.id ? `${color}15` : 'var(--bg-secondary)',
            color: selectedSub === s.id ? color : 'rgba(255,255,255,0.5)', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            {s.label}
            {s.difficulty === 'H' && (
              <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '99px', background: 'rgba(127,119,221,0.2)', color: '#9F99E8' }}>H</span>
            )}
          </button>
        ))}
      </div>

      {error && <p style={{ fontSize: '13px', color: '#ff8080', marginBottom: '1rem', padding: '8px 12px', background: 'rgba(226,75,74,0.1)', borderRadius: '8px' }}>{error}</p>}

      <button onClick={generateQuestions} style={{ ...WHITE_BTN, width: '100%', padding: '14px', fontSize: '15px' }}>
        Generate questions →
      </button>
    </Screen>
  );

  // ── Generating / Marking ─────────────────────────────
  if (phase === 'generating') return (
    <Screen color={color} onBack={() => router.push('/gcse/maths')}>
      <TopBar onBack={() => router.push('/gcse/maths')} title={`${meta.emoji} ${meta.label}`} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Spinner color={color} />
        <p style={{ fontSize: '16px', color: 'var(--fg)', marginTop: '1.5rem', marginBottom: '6px' }}>
          {results.length === 0 ? 'Generating questions…' : 'Marking your working…'}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--fg-secondary)' }}>
          {results.length === 0 ? `${tier} tier · ${selectedSub ?? 'mixed ' + topic}` : 'Checking step-by-step working'}
        </p>
      </div>
    </Screen>
  );

  // ── Answering ────────────────────────────────────────
  if (phase === 'answering') return (
    <Screen color={color} onBack={() => setPhase('setup')}>
      <TopBar onBack={() => setPhase('setup')} title={`${meta.emoji} ${meta.label}`} />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '99px', background: `${color}18`, color: `${color}bb`, border: `1px solid ${color}28`, letterSpacing: '0.04em' }}>
            {tier}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--fg-secondary)' }}>
            {questions.length} questions · {questions.reduce((s, q) => s + q.marks, 0)} marks total
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
          {questions.map(q => (
            <div key={q.number} style={{
              background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '16px',
              border: '1px solid var(--bg-secondary)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>Q{q.number}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: `${color}15`, color: `${color}aa` }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'var(--bg-secondary)', color: 'var(--fg-secondary)' }}>{q.subtopic}</span>
              </div>

              {/* Question text — preserve formatting for equations */}
              <p style={{
                fontSize: '15px', color: 'var(--fg-secondary)', lineHeight: 1.7,
                marginBottom: '8px', whiteSpace: 'pre-wrap',
                fontFamily: q.question.includes('=') || q.question.includes('^') ? 'var(--font-mono)' : 'var(--font-ui)',
              }}>
                {q.question}
              </p>

              <p style={{ fontSize: '11px', color: 'var(--fg-secondary)', fontStyle: 'italic', marginBottom: '12px' }}>
                💡 {q.hint}
              </p>

              {/* Answer box */}
              <label style={{ fontSize: '11px', letterSpacing: '0.06em', color: 'var(--fg-secondary)', display: 'block', marginBottom: '6px' }}>
                SHOW YOUR WORKING
              </label>
              <textarea
                value={answers[q.number] ?? ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.number]: e.target.value }))}
                placeholder={`Working and answer for Q${q.number}…\n\nE.g.\n3x + 5 = 14\n3x = 9\nx = 3`}
                rows={5}
                style={{
                  width: '100%', background: 'var(--bg-secondary)',
                  border: '2px solid var(--border-dark)', borderRadius: '10px',
                  color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: '13px',
                  padding: '10px 12px', outline: 'none', resize: 'vertical', lineHeight: 1.6,
                }}
              />
            </div>
          ))}
        </div>

        {error && <p style={{ fontSize: '13px', color: '#ff8080', marginBottom: '1rem' }}>{error}</p>}

        <button
          onClick={submitAnswers}
          disabled={Object.keys(answers).length === 0}
          style={{ ...WHITE_BTN, width: '100%', padding: '14px', fontSize: '15px', opacity: Object.keys(answers).length === 0 ? 0.4 : 1 }}
        >
          Mark my answers →
        </button>
      </div>
    </Screen>
  );

  // ── Feedback ────────────────────────────────────────
  if (phase === 'feedback') return (
    <Screen color={color} onBack={() => setPhase('setup')}>
      <TopBar onBack={() => setPhase('setup')} title={`${meta.emoji} Results`} />
      <div style={{ flex: 1 }}>

        {/* Score banner */}
        <div style={{
          background: totalMarks.earned / totalMarks.max >= 0.8 ? 'rgba(0,232,122,0.1)' : totalMarks.earned / totalMarks.max >= 0.6 ? `${color}15` : 'rgba(226,75,74,0.1)',
          borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '1.5rem',
          border: `1px solid ${totalMarks.earned / totalMarks.max >= 0.8 ? 'rgba(0,232,122,0.3)' : totalMarks.earned / totalMarks.max >= 0.6 ? `${color}40` : 'rgba(226,75,74,0.3)'}`,
        }}>
          <p style={{ fontSize: '40px', fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {totalMarks.earned}/{totalMarks.max}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', marginTop: '6px' }}>
            {Math.round(totalMarks.earned / totalMarks.max * 100)}% · {tier} tier · {meta.label}
          </p>
        </div>

        {/* Per-question results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
          {results.map((r, i) => {
            const col = r.marks === r.maxMarks ? '#00e87a' : r.marks > 0 ? '#EF9F27' : '#E24B4A';
            return (
              <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--bg-secondary)' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>Q{r.questionNum}</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: col, fontFamily: 'var(--font-mono)' }}>{r.marks}/{r.maxMarks}</span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  {/* Model working */}
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--fg-secondary)', marginBottom: '6px' }}>MODEL WORKING</p>
                    <pre style={{ fontSize: '13px', color: 'var(--fg-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--bg-secondary)', margin: 0 }}>
                      {r.working}
                    </pre>
                  </div>
                  {/* Feedback */}
                  <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', lineHeight: 1.6 }}>{r.feedback}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { setPhase('setup'); setQuestions([]); setResults([]); }} style={{ ...WHITE_BTN, flex: 1 }}>
            New questions
          </button>
          <button onClick={() => router.push('/gcse/maths')} style={{ ...GHOST_BTN, flex: 1 }}>Hub</button>
        </div>
      </div>
    </Screen>
  );

  return null;
}

// ── Shared UI ──────────────────────────────────────────
function Screen({ children, color, onBack }: { children: React.ReactNode; color: string; onBack: () => void }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 3rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '260px', height: '260px', borderRadius: '50%', background: `${color}10`, filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem' }}>
          <button onClick={onBack} className="btn" style={{ fontSize: '13px', padding: '8px 14px' }}>← Back</button>
        </div>
        {children}
      </div>
    </main>
  );
}

function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <button onClick={onBack} className="btn">← Back</button>
      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)' }}>{title}</span>
      <div style={{ width: '60px' }} />
    </div>
  );
}



const WHITE_BTN: React.CSSProperties = { background: 'var(--green)', border: '2.5px solid var(--green-dark)', borderRadius: '12px', padding: '11px 24px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: '0 4px 0 var(--green-dark)' };
const GHOST_BTN: React.CSSProperties = { background: '#fff', border: '2.5px solid var(--border-dark)', borderRadius: '10px', padding: '7px 14px', color: 'var(--fg-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: '0 3px 0 var(--border-dark)' };
