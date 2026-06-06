'use client';
import { Spinner } from '@/components/Spinner';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSEMathsPracticePage() {
  return <AuthGuard><MathsPractice /></AuthGuard>;
}

type Tier   = 'Foundation' | 'Higher';
type Paper  = 'P1' | 'P2' | 'P3';
type Phase  = 'setup' | 'generating' | 'active' | 'marking' | 'results';

interface MathsQuestion {
  number:   number;
  marks:    number;
  question: string;
  hint:     string;
  subtopic: string;
  calc:     boolean;
}

interface MarkResult {
  questionNum: number;
  marks:       number;
  maxMarks:    number;
  working:     string;
  feedback:    string;
}

const PAPER_META: Record<Paper, { label: string; desc: string; calc: boolean; time: number }> = {
  P1: { label: 'Paper 1', desc: 'Non-calculator · 80 marks · 1h 30m', calc: false, time: 90 },
  P2: { label: 'Paper 2', desc: 'Calculator · 80 marks · 1h 30m',     calc: true,  time: 90 },
  P3: { label: 'Paper 3', desc: 'Calculator · 80 marks · 1h 30m',     calc: true,  time: 90 },
};

function MathsPractice() {
  const router = useRouter();

  const [tier, setTier]           = useState<Tier>('Higher');
  const [paper, setPaper]         = useState<Paper>('P1');
  const [phase, setPhase]         = useState<Phase>('setup');
  const [questions, setQuestions] = useState<MathsQuestion[]>([]);
  const [answers, setAnswers]     = useState<Record<number, string>>({});
  const [results, setResults]     = useState<MarkResult[]>([]);
  const [timeLeft, setTimeLeft]   = useState(90 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [error, setError]         = useState('');
  const [totalMarks, setTotalMarks] = useState({ earned: 0, max: 0 });
  const timerRef                  = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const elapsed  = PAPER_META[paper].time * 60 - timeLeft;
  const timerPct = Math.round((elapsed / (PAPER_META[paper].time * 60)) * 100);
  const timerColor = timeLeft < 600 ? 'var(--red)' : timeLeft < 1800 ? 'var(--orange)' : 'var(--blue)';

  async function generatePaper() {
    setPhase('generating');
    setError('');
    try {
      const res  = await fetch('/api/gcse/maths/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, paper }),
      });
      const data = await res.json();
      if (!data.questions?.length) throw new Error();
      setQuestions(data.questions);
      setAnswers({});
      setResults([]);
      setTimeLeft(PAPER_META[paper].time * 60);
      setPhase('active');
      setTimerActive(true);
    } catch {
      setError('Failed to generate paper. Try again.');
      setPhase('setup');
    }
  }

  async function submitPaper() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    setPhase('marking');
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
      setPhase('results');
    } catch {
      setError('Marking failed. Try again.');
      setPhase('active');
    }
  }

  // ── Setup ──────────────────────────────────────────
  if (phase === 'setup') return (
    <Shell>
      <TopBar onBack={() => router.push('/gcse/maths')} title="📝 Practice Paper" />

      <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Full timed AQA-style mock paper. AI generates questions across all topics and marks your step-by-step working.
      </p>

      {/* Tier */}
      <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'var(--fg-secondary)', marginBottom: '8px' }}>TIER</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {(['Foundation', 'Higher'] as Tier[]).map(t => (
          <button key={t} onClick={() => setTier(t)} style={{
            flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500,
            border: `1px solid ${tier === t ? 'rgba(55,138,221,0.5)' : 'rgba(255,255,255,0.1)'}`,
            background: tier === t ? 'rgba(55,138,221,0.12)' : 'var(--bg-secondary)',
            color: tier === t ? '#7bbfff' : 'rgba(255,255,255,0.5)', transition: 'all 0.15s',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* Paper */}
      <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'var(--fg-secondary)', marginBottom: '8px' }}>PAPER</p>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem' }}>
        {(['P1', 'P2', 'P3'] as Paper[]).map(p => (
          <button key={p} onClick={() => setPaper(p)} style={{
            flex: 1, padding: '12px 8px', borderRadius: '10px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', textAlign: 'center', transition: 'all 0.15s',
            border: `1px solid ${paper === p ? 'rgba(55,138,221,0.5)' : 'rgba(255,255,255,0.1)'}`,
            background: paper === p ? 'rgba(55,138,221,0.12)' : 'var(--bg-secondary)',
          }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)', marginBottom: '2px' }}>
              {PAPER_META[p].label}
            </p>
            <p style={{ fontSize: '10px', color: 'var(--fg-secondary)', lineHeight: 1.3 }}>
              {PAPER_META[p].desc}
            </p>
          </button>
        ))}
      </div>

      <div style={{ padding: '12px 14px', background: 'rgba(55,138,221,0.07)', borderRadius: '10px', border: '1px solid rgba(55,138,221,0.18)', marginBottom: '2rem', fontSize: '12px', color: 'var(--fg-secondary)' }}>
        <p style={{ color: 'rgba(55,138,221,0.8)', fontWeight: 500, marginBottom: '4px' }}>Exam conditions</p>
        <p>⏱ {PAPER_META[paper].time} minutes · timer visible throughout</p>
        <p>{PAPER_META[paper].calc ? '🧮 Calculator allowed' : '🚫 No calculator'}</p>
        <p>✍️ Show all working — partial marks available</p>
        <p>🤖 AI marks step-by-step with model solutions</p>
      </div>

      {error && <p style={{ fontSize: '13px', color: '#ff8080', marginBottom: '1rem' }}>{error}</p>}

      <button onClick={generatePaper} style={{ ...WHITE_BTN, width: '100%', padding: '14px', fontSize: '15px' }}>
        Start paper →
      </button>
    </Shell>
  );

  // ── Generating / Marking ───────────────────────────
  if (phase === 'generating' || phase === 'marking') return (
    <Shell>
      <TopBar onBack={() => router.push('/gcse/maths')} title="📝 Practice Paper" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Spinner />
        <p style={{ fontSize: '16px', color: 'var(--fg)', marginTop: '1.5rem', marginBottom: '6px' }}>
          {phase === 'generating' ? 'Generating paper…' : 'Marking your working…'}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--fg-secondary)' }}>
          {phase === 'generating' ? `${tier} · ${PAPER_META[paper].label}` : 'Checking step-by-step for method marks'}
        </p>
      </div>
    </Shell>
  );

  // ── Active paper ───────────────────────────────────
  if (phase === 'active') return (
    <Shell>
      {/* Sticky timer */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg)', paddingBottom: '10px', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setPhase('setup'); }} className="btn">← Exit</button>
          <div style={{ padding: '6px 16px', borderRadius: '99px', fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: timerColor, background: 'rgba(0,0,0,0.4)', border: `1px solid ${timerColor}40`, transition: 'all 1s' }}>
            {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--fg-secondary)', fontFamily: 'var(--font-mono)' }}>
            {Object.keys(answers).length}/{questions.length}
          </span>
        </div>
        <div style={{ height: '3px', background: 'var(--bg-secondary)', borderRadius: '2px' }}>
          <div style={{ height: '3px', background: timerColor, borderRadius: '2px', width: `${timerPct}%`, transition: 'width 1s linear', boxShadow: `0 0 6px ${timerColor}` }} />
        </div>
      </div>

      {/* Paper header */}
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(55,138,221,0.7)', marginBottom: '4px' }}>
          AQA GCSE MATHEMATICS · {tier.toUpperCase()} · {PAPER_META[paper].label.toUpperCase()}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--fg-secondary)' }}>
          {PAPER_META[paper].calc ? '🧮 Calculator allowed' : '🚫 No calculator'} · {questions.reduce((s, q) => s + q.marks, 0)} marks total
        </p>
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
        {questions.map(q => (
          <div key={q.number} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '16px', border: '1px solid var(--bg-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>Q{q.number}</span>
              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(55,138,221,0.15)', color: 'rgba(55,138,221,0.8)' }}>{q.marks} mark{q.marks !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'var(--bg-secondary)', color: 'var(--fg-secondary)' }}>{q.subtopic}</span>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--fg-secondary)', lineHeight: 1.7, marginBottom: '8px', whiteSpace: 'pre-wrap', fontFamily: q.question.match(/[=^²³√]/) ? 'var(--font-mono)' : 'var(--font-ui)' }}>
              {q.question}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '10px' }}>💡 {q.hint}</p>
            <textarea
              value={answers[q.number] ?? ''}
              onChange={e => setAnswers(p => ({ ...p, [q.number]: e.target.value }))}
              placeholder={`Show working for Q${q.number}…`}
              rows={4}
              style={{ width: '100%', background: 'var(--bg-secondary)', border: '2px solid var(--border-dark)', borderRadius: '10px', color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: '13px', padding: '10px 12px', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
            />
          </div>
        ))}
      </div>

      {error && <p style={{ fontSize: '13px', color: '#ff8080', marginBottom: '1rem' }}>{error}</p>}

      <button onClick={submitPaper} disabled={Object.keys(answers).length === 0}
        style={{ ...WHITE_BTN, width: '100%', padding: '14px', fontSize: '15px', opacity: Object.keys(answers).length === 0 ? 0.4 : 1 }}>
        Submit for marking →
      </button>
    </Shell>
  );

  // ── Results ────────────────────────────────────────
  if (phase === 'results') {
    const pctScore = totalMarks.max > 0 ? Math.round(totalMarks.earned / totalMarks.max * 100) : 0;
    const grade    = pctScore >= 90 ? '9' : pctScore >= 80 ? '8' : pctScore >= 70 ? '7' : pctScore >= 60 ? '6' : pctScore >= 50 ? '5' : pctScore >= 40 ? '4' : pctScore >= 30 ? '3' : '2';
    return (
      <Shell>
        <TopBar onBack={() => setPhase('setup')} title="📝 Results" />

        {/* Grade banner */}
        <div style={{
          background: pctScore >= 70 ? 'rgba(0,232,122,0.1)' : pctScore >= 50 ? 'rgba(55,138,221,0.1)' : 'rgba(226,75,74,0.1)',
          borderRadius: '18px', padding: '24px', textAlign: 'center', marginBottom: '1.5rem',
          border: `1px solid ${pctScore >= 70 ? 'rgba(0,232,122,0.25)' : pctScore >= 50 ? 'rgba(55,138,221,0.25)' : 'rgba(226,75,74,0.25)'}`,
        }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'var(--fg-secondary)', marginBottom: '6px' }}>AQA GRADE ESTIMATE</p>
          <p style={{ fontSize: '64px', fontWeight: 700, color: 'var(--fg)', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{grade}</p>
          <p style={{ fontSize: '15px', color: 'var(--fg-secondary)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
            {totalMarks.earned}/{totalMarks.max} · {pctScore}%
          </p>
        </div>

        {/* Per-question */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
          {results.map((r, i) => {
            const col = r.marks === r.maxMarks ? 'var(--green)' : r.marks > 0 ? 'var(--orange)' : 'var(--red)';
            return (
              <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--bg-secondary)' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--bg-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>Q{r.questionNum}</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: col, fontFamily: 'var(--font-mono)' }}>{r.marks}/{r.maxMarks}</span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <p style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '6px' }}>MODEL SOLUTION</p>
                  <pre style={{ fontSize: '13px', color: 'var(--fg-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--bg-secondary)', marginBottom: '8px', margin: '0 0 8px 0' }}>
                    {r.working}
                  </pre>
                  <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', lineHeight: 1.6 }}>{r.feedback}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { setPhase('setup'); setQuestions([]); setResults([]); }} style={{ ...WHITE_BTN, flex: 1 }}>New paper</button>
          <button onClick={() => router.push('/gcse/maths')} style={{ ...GHOST_BTN, flex: 1 }}>Hub</button>
        </div>
      </Shell>
    );
  }

  return null;
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 2.5rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(55,138,221,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(55,138,221,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 3rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(88,204,2,0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </main>
  );
}

const GHOST_BTN: React.CSSProperties = {
  background: '#fff', border: '2.5px solid var(--border-dark)', borderRadius: '10px',
  padding: '7px 14px', color: 'var(--fg-secondary)', fontSize: '13px',
  cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: '0 3px 0 var(--border-dark)',
};
