'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSEPapersPage() {
  return <AuthGuard><GCSEPapers /></AuthGuard>;
}

type Paper  = 'P1' | 'P2';
type Phase  = 'setup' | 'generating' | 'active' | 'submitting' | 'results';

interface MockQuestion { number: number; ao: string; marks: number; question: string; hint: string; section: 'reading' | 'writing'; }
interface MockPaper { title: string; paper: Paper; extract: string; questions: MockQuestion[]; }
interface MarkResult { questionNum: number; marks: number; maxMarks: number; feedback: string; }

const PAPER_TIMES = { P1: 105, P2: 105 }; // minutes

function GCSEPapers() {
  const router = useRouter();

  const [paper, setPaper]         = useState<Paper>('P1');
  const [phase, setPhase]         = useState<Phase>('setup');
  const [mock, setMock]           = useState<MockPaper | null>(null);
  const [answers, setAnswers]     = useState<Record<number, string>>({});
  const [results, setResults]     = useState<MarkResult[]>([]);
  const [timeLeft, setTimeLeft]   = useState(105 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [error, setError]         = useState('');
  const [showExtract, setShowExtract] = useState(false);
  const [totalMarks, setTotalMarks] = useState({ earned: 0, max: 0 });
  const timerRef                  = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, timeLeft]);

  const mins    = Math.floor(timeLeft / 60);
  const secs    = timeLeft % 60;
  const elapsed = PAPER_TIMES[paper] * 60 - timeLeft;
  const pct     = Math.round((elapsed / (PAPER_TIMES[paper] * 60)) * 100);

  async function generatePaper() {
    setPhase('generating');
    setError('');
    try {
      const res  = await fetch('/api/gcse/mock-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper }),
      });
      const data = await res.json();
      if (!data.mock) throw new Error();
      setMock(data.mock);
      setAnswers({});
      setResults([]);
      setTimeLeft(PAPER_TIMES[paper] * 60);
      setPhase('active');
      setTimerActive(true);
      setShowExtract(true);
    } catch {
      setError('Failed to generate paper. Try again.');
      setPhase('setup');
    }
  }

  async function submitPaper() {
    if (!mock || timerRef.current) clearInterval(timerRef.current!);
    setTimerActive(false);
    setPhase('submitting');
    try {
      const res  = await fetch('/api/gcse/mark-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mock, answers: Object.entries(answers).map(([num, text]) => ({ questionNum: Number(num), text })) }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
      const earned = (data.results ?? []).reduce((s: number, r: MarkResult) => s + r.marks, 0);
      const max    = mock!.questions.reduce((s, q) => s + q.marks, 0);
      setTotalMarks({ earned, max });
      setPhase('results');
    } catch {
      setError('Marking failed.');
      setPhase('active');
    }
  }

  const readingQs = mock?.questions.filter(q => q.section === 'reading') ?? [];
  const writingQs = mock?.questions.filter(q => q.section === 'writing') ?? [];

  // ── Setup ──────────────────────────────────────────
  if (phase === 'setup') return (
    <Screen>
      <TopBar onBack={() => router.push('/gcse')} title="📝 Mock Paper" />
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        A full AQA-style mock paper with AI-generated extract and all questions.
        1 hour 45 minutes. 80 marks. AI marks every answer against the mark scheme.
      </p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem' }}>
        {(['P1', 'P2'] as Paper[]).map(p => (
          <button key={p} onClick={() => setPaper(p)} style={{
            flex: 1, padding: '16px', borderRadius: '14px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', textAlign: 'left', transition: 'all 0.15s',
            border: `1px solid ${paper === p ? 'rgba(239,159,39,0.5)' : 'rgba(255,255,255,0.1)'}`,
            background: paper === p ? 'rgba(239,159,39,0.1)' : 'rgba(255,255,255,0.03)',
          }}>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{p === 'P1' ? 'Paper 1' : 'Paper 2'}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{p === 'P1' ? 'Fiction · Creative writing\n1h 45m · 80 marks' : 'Non-fiction · Transactional\n1h 45m · 80 marks'}</p>
          </button>
        ))}
      </div>

      <div style={{ padding: '14px', background: 'rgba(239,159,39,0.07)', borderRadius: '12px', border: '1px solid rgba(239,159,39,0.2)', marginBottom: '2rem' }}>
        <p style={{ fontSize: '12px', color: 'rgba(239,159,39,0.8)', marginBottom: '6px', fontWeight: 500 }}>Exam conditions</p>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <p>⏱ 1 hour 45 minutes · timer visible throughout</p>
          <p>📄 Section A: Reading (40 marks) · Q1–Q4</p>
          <p>✍️ Section B: Writing (40 marks) · Q5</p>
          <p>🤖 AI marks every answer and gives AQA-style feedback</p>
        </div>
      </div>

      {error && <p style={{ fontSize: '13px', color: '#ff8080', marginBottom: '1rem' }}>{error}</p>}

      <button onClick={generatePaper} style={{ ...WHITE_BTN, width: '100%', padding: '15px', fontSize: '15px' }}>
        Start mock paper →
      </button>
    </Screen>
  );

  // ── Generating ─────────────────────────────────────
  if (phase === 'generating') return (
    <Screen>
      <TopBar onBack={() => setPhase('setup')} title="📝 Mock Paper" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Spinner />
        <p style={{ fontSize: '16px', color: '#fff', marginTop: '1.5rem', marginBottom: '6px' }}>Generating your paper…</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Writing extract, questions, and mark scheme</p>
      </div>
    </Screen>
  );

  // ── Submitting ─────────────────────────────────────
  if (phase === 'submitting') return (
    <Screen>
      <TopBar onBack={() => setPhase('setup')} title="📝 Mock Paper" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Spinner />
        <p style={{ fontSize: '16px', color: '#fff', marginTop: '1.5rem', marginBottom: '6px' }}>Marking your paper…</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>This may take a moment — marking all questions</p>
      </div>
    </Screen>
  );

  // ── Active paper ───────────────────────────────────
  if (phase === 'active' && mock) return (
    <Screen>
      {/* Sticky timer bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#04090e', paddingBottom: '10px', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setPhase('setup'); }} style={GHOST_BTN}>← Exit</button>
          <div style={{
            padding: '6px 16px', borderRadius: '99px',
            fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700,
            color: timeLeft < 600 ? '#E24B4A' : timeLeft < 1800 ? '#EF9F27' : '#EF9F27',
            background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(239,159,39,0.3)',
          }}>
            {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
          </div>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
            {Object.keys(answers).length}/{mock.questions.length} answered
          </span>
        </div>
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
          <div style={{ height: '3px', background: '#EF9F27', borderRadius: '2px', width: `${pct}%`, transition: 'width 1s linear', boxShadow: '0 0 6px rgba(239,159,39,0.5)' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(239,159,39,0.7)', marginBottom: '4px' }}>
            AQA GCSE ENGLISH LANGUAGE · {mock.paper === 'P1' ? 'PAPER 1' : 'PAPER 2'}
          </p>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{mock.title}</h2>
        </div>

        {/* Section A */}
        <div style={{ padding: '10px 14px', background: 'rgba(55,138,221,0.08)', borderRadius: '10px', border: '1px solid rgba(55,138,221,0.2)', marginBottom: '1rem' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(55,138,221,0.8)' }}>SECTION A — READING · 40 marks</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>Read the extract then answer Q1–Q4</p>
        </div>

        {/* Extract */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '16px', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => setShowExtract(e => !e)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', marginBottom: showExtract ? '12px' : '0' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>📄 Extract</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', transform: showExtract ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
          </button>
          {showExtract && (
            <p style={{ fontSize: '14px', lineHeight: 1.85, color: 'rgba(255,255,255,0.82)', whiteSpace: 'pre-wrap', animation: 'fadeIn 0.2s ease' }}>
              {mock.extract}
            </p>
          )}
        </div>

        {/* Reading questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
          {readingQs.map(q => (
            <div key={q.number} style={{ background: 'rgba(0,0,0,0.28)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>Q{q.number}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(55,138,221,0.15)', color: 'rgba(55,138,221,0.8)' }}>{q.ao}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>{q.marks} marks</span>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, marginBottom: '6px' }}>{q.question}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginBottom: '10px' }}>💡 {q.hint}</p>
              <textarea value={answers[q.number] ?? ''} onChange={e => setAnswers(p => ({ ...p, [q.number]: e.target.value }))}
                placeholder="Write your answer here…" rows={q.marks >= 20 ? 10 : q.marks >= 8 ? 6 : 3}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '13px', padding: '10px 12px', outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', textAlign: 'right' }}>{(answers[q.number] ?? '').split(/\s+/).filter(Boolean).length} words</p>
            </div>
          ))}
        </div>

        {/* Section B */}
        <div style={{ padding: '10px 14px', background: 'rgba(212,83,126,0.08)', borderRadius: '10px', border: '1px solid rgba(212,83,126,0.2)', marginBottom: '1rem' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(212,83,126,0.8)' }}>SECTION B — WRITING · 40 marks</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>AO5 (24) + AO6 (16) · Aim 450–600 words</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
          {writingQs.map(q => (
            <div key={q.number} style={{ background: 'rgba(0,0,0,0.28)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(212,83,126,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>Q{q.number}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(212,83,126,0.15)', color: 'rgba(212,83,126,0.8)' }}>{q.ao}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>{q.marks} marks</span>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, marginBottom: '10px' }}>{q.question}</p>
              <textarea value={answers[q.number] ?? ''} onChange={e => setAnswers(p => ({ ...p, [q.number]: e.target.value }))}
                placeholder="Write your response here…" rows={14}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '13px', padding: '10px 12px', outline: 'none', resize: 'none', lineHeight: 1.75 }} />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', textAlign: 'right' }}>{(answers[q.number] ?? '').split(/\s+/).filter(Boolean).length} words</p>
            </div>
          ))}
        </div>

        {error && <p style={{ fontSize: '13px', color: '#ff8080', marginBottom: '1rem' }}>{error}</p>}

        <button onClick={submitPaper} disabled={Object.keys(answers).length === 0}
          style={{ ...WHITE_BTN, width: '100%', padding: '15px', fontSize: '15px', opacity: Object.keys(answers).length === 0 ? 0.4 : 1 }}>
          Submit paper for marking →
        </button>
      </div>

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </Screen>
  );

  // ── Results ────────────────────────────────────────
  if (phase === 'results' && mock) {
    const pctScore = totalMarks.max > 0 ? Math.round(totalMarks.earned / totalMarks.max * 100) : 0;
    const grade    = pctScore >= 90 ? '9' : pctScore >= 80 ? '8' : pctScore >= 70 ? '7' : pctScore >= 60 ? '6' : pctScore >= 50 ? '5' : pctScore >= 40 ? '4' : pctScore >= 30 ? '3' : '2';
    return (
      <Screen>
        <TopBar onBack={() => setPhase('setup')} title="📝 Results" />
        <div style={{ flex: 1 }}>
          {/* Banner */}
          <div style={{ background: pctScore >= 70 ? 'rgba(0,232,122,0.1)' : pctScore >= 50 ? 'rgba(239,159,39,0.1)' : 'rgba(226,75,74,0.1)', borderRadius: '18px', padding: '24px', textAlign: 'center', marginBottom: '1.5rem', border: `1px solid ${pctScore >= 70 ? 'rgba(0,232,122,0.25)' : pctScore >= 50 ? 'rgba(239,159,39,0.25)' : 'rgba(226,75,74,0.25)'}` }}>
            <p style={{ fontSize: '12px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>AQA GRADE ESTIMATE</p>
            <p style={{ fontSize: '64px', fontWeight: 700, color: '#fff', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{grade}</p>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
              {totalMarks.earned}/{totalMarks.max} marks · {pctScore}%
            </p>
          </div>

          {/* Per-question results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
            {results.map((r, i) => {
              const q   = mock.questions.find(q => q.number === r.questionNum);
              const col = r.marks / r.maxMarks >= 0.75 ? '#00e87a' : r.marks / r.maxMarks >= 0.5 ? '#EF9F27' : '#E24B4A';
              return (
                <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>Q{r.questionNum}</span>
                      {q && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{q.ao}</span>}
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: col, fontFamily: 'var(--font-mono)' }}>{r.marks}/{r.maxMarks}</span>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{r.feedback}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setPhase('setup'); setMock(null); setResults([]); }} style={{ ...WHITE_BTN, flex: 1 }}>New paper</button>
            <button onClick={() => router.push('/gcse')} style={{ ...GHOST_BTN, flex: 1 }}>Hub</button>
          </div>
        </div>
      </Screen>
    );
  }

  return null;
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#06080a', backgroundImage: 'radial-gradient(ellipse at top, #111820 0%, #06080a 60%)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 2.5rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(239,159,39,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(239,159,39,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </main>
  );
}
function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <button onClick={onBack} style={GHOST_BTN}>← Back</button>
      <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{title}</span>
      <div style={{ width: '60px' }} />
    </div>
  );
}
const WHITE_BTN: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', color: '#06080a', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' };
const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
function Spinner() { return <div style={{ width: '32px', height: '32px', border: '2px solid rgba(239,159,39,0.2)', borderTopColor: '#EF9F27', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />; }
