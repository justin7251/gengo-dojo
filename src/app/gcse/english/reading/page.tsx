'use client';
import { Spinner } from '@/components/Spinner';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSEReadingPage() {
  return <AuthGuard><GCSEReading /></AuthGuard>;
}

type Paper  = 'P1' | 'P2';
type Phase  = 'setup' | 'generating' | 'reading' | 'answering' | 'feedback';

interface Question {
  number:    number;
  ao:        string;
  marks:     number;
  question:  string;
  hint:      string;
}

interface GeneratedSession {
  title:     string;
  paper:     Paper;
  extract:   string;
  questions: Question[];
}

interface Answer {
  questionNum: number;
  text:        string;
  feedback?:   string;
  marks?:      number;
  maxMarks?:   number;
}

function GCSEReading() {
  const router = useRouter();

  const [paper, setPaper]       = useState<Paper>('P1');
  const [phase, setPhase]       = useState<Phase>('setup');
  const [session, setSession]   = useState<GeneratedSession | null>(null);
  const [answers, setAnswers]   = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Answer[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [marking, setMarking]   = useState(false);
  const [error, setError]       = useState('');
  const [showExtract, setShowExtract] = useState(false);
  const [totalMarks, setTotalMarks]   = useState({ earned: 0, max: 0 });

  async function generateSession() {
    setPhase('generating');
    setError('');
    try {
      const res  = await fetch('/api/gcse/english/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paper }),
      });
      const data = await res.json();
      if (!data.session) throw new Error('No session returned');
      setSession(data.session);
      setAnswers({});
      setFeedback([]);
      setCurrentQ(0);
      setPhase('reading');
    } catch {
      setError('Failed to generate extract. Please try again.');
      setPhase('setup');
    }
  }

  async function markAnswers() {
    if (!session || marking) return;
    setMarking(true);
    try {
      const res  = await fetch('/api/gcse/english/mark-reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extract:   session.extract,
          questions: session.questions,
          answers:   Object.entries(answers).map(([num, text]) => ({ questionNum: Number(num), text })),
        }),
      });
      const data = await res.json();
      setFeedback(data.feedback ?? []);
      const earned = (data.feedback ?? []).reduce((s: number, f: Answer) => s + (f.marks ?? 0), 0);
      const max    = session.questions.reduce((s, q) => s + q.marks, 0);
      setTotalMarks({ earned, max });
      setPhase('feedback');
    } catch {
      setError('Marking failed. Please try again.');
    } finally {
      setMarking(false);
    }
  }

  // ── Setup ──────────────────────────────────────────
  if (phase === 'setup') return (
    <Shell>
      <TopBar onBack={() => router.push('/gcse')} title="📄 Reading" />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          AI generates a new extract and AQA-style questions every session.
          Practise retrieving information, analysing language, structure, and evaluating.
        </p>

        <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'var(--fg-secondary)', marginBottom: '10px' }}>SELECT PAPER</p>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '2rem' }}>
          {(['P1', 'P2'] as Paper[]).map(p => (
            <button key={p} onClick={() => setPaper(p)} style={{
              flex: 1, padding: '16px', borderRadius: '14px', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', transition: 'all 0.15s', textAlign: 'left',
              border: `1px solid ${paper === p ? 'rgba(55,138,221,0.5)' : 'rgba(255,255,255,0.1)'}`,
              background: paper === p ? 'rgba(55,138,221,0.12)' : 'var(--bg-secondary)',
            }}>
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fg)', marginBottom: '4px' }}>{p === 'P1' ? 'Paper 1' : 'Paper 2'}</p>
              <p style={{ fontSize: '12px', color: 'var(--fg-secondary)', lineHeight: 1.4 }}>
                {p === 'P1' ? 'Fiction extract · Q1–Q4\nRetrieval, language, structure, evaluation' : 'Non-fiction extract · Q1–Q4\nTrue/False, summary, language, compare'}
              </p>
            </button>
          ))}
        </div>

        <div style={{ padding: '14px', background: 'rgba(55,138,221,0.08)', borderRadius: '12px', border: '1px solid rgba(55,138,221,0.2)', marginBottom: '2rem' }}>
          <p style={{ fontSize: '12px', color: 'rgba(55,138,221,0.8)', marginBottom: '6px', fontWeight: 500 }}>What to expect</p>
          {paper === 'P1' ? (
            <div style={{ fontSize: '12px', color: 'var(--fg-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p>Q1 — List 4 true statements (4 marks · AO1)</p>
              <p>Q2 — Language analysis of a section (8 marks · AO2)</p>
              <p>Q3 — Structure analysis of whole text (8 marks · AO3)</p>
              <p>Q4 — Evaluate a statement about the text (20 marks · AO4)</p>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--fg-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p>Q1 — 4 true/false statements (4 marks · AO1)</p>
              <p>Q2 — Summarise differences (8 marks · AO1)</p>
              <p>Q3 — Analyse writer's methods (12 marks · AO2)</p>
              <p>Q4 — Compare perspectives (16 marks · AO3+AO4)</p>
            </div>
          )}
        </div>

        {error && <p style={{ fontSize: '13px', color: '#ff8080', marginBottom: '1rem', padding: '8px 12px', background: 'rgba(226,75,74,0.1)', borderRadius: '8px', border: '1px solid rgba(226,75,74,0.2)' }}>{error}</p>}

        <button onClick={generateSession} style={{ ...WHITE_BTN, width: '100%', padding: '15px', fontSize: '15px' }}>
          Generate extract + questions →
        </button>
      </div>
    </Shell>
  );

  // ── Generating ─────────────────────────────────────
  if (phase === 'generating') return (
    <Shell>
      <TopBar onBack={() => router.push('/gcse')} title="📄 Reading" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Spinner />
        <p style={{ fontSize: '16px', color: 'var(--fg)', marginTop: '1.5rem', marginBottom: '6px' }}>Generating extract…</p>
        <p style={{ fontSize: '13px', color: 'var(--fg-secondary)' }}>AI is writing a {paper === 'P1' ? 'fiction' : 'non-fiction'} passage and AQA-style questions</p>
      </div>
    </Shell>
  );

  // ── Reading ────────────────────────────────────────
  if (phase === 'reading' && session) return (
    <Shell>
      <TopBar onBack={() => setPhase('setup')} title="📄 Reading" />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(55,138,221,0.7)', marginBottom: '4px' }}>
            {session.paper === 'P1' ? 'PAPER 1 · FICTION' : 'PAPER 2 · NON-FICTION'}
          </p>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg)', marginBottom: '4px' }}>{session.title}</h2>
          <p style={{ fontSize: '12px', color: 'var(--fg-secondary)' }}>{session.questions.length} questions · {session.questions.reduce((s, q) => s + q.marks, 0)} marks total</p>
        </div>

        {/* Extract */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: '14px', padding: '16px', marginBottom: '1.5rem', border: '1px solid var(--bg-secondary)' }}>
          <button onClick={() => setShowExtract(e => !e)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', marginBottom: showExtract ? '12px' : '0' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>📄 Read the extract</span>
            <span style={{ fontSize: '13px', color: 'var(--fg-secondary)', transform: showExtract ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
          </button>
          {showExtract && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div style={{ height: '1px', background: 'var(--bg-secondary)', marginBottom: '12px' }} />
              <p style={{ fontSize: '14px', lineHeight: 1.85, color: 'var(--fg-secondary)', whiteSpace: 'pre-wrap' }}>
                {session.extract}
              </p>
            </div>
          )}
        </div>

        <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', marginBottom: '1rem', textAlign: 'center' }}>
          Read the extract, then answer the questions below.
        </p>

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
          {session.questions.map((q, i) => (
            <div key={q.number} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '16px', border: '1px solid var(--bg-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>Q{q.number}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(55,138,221,0.15)', color: 'rgba(55,138,221,0.8)', border: '1px solid rgba(55,138,221,0.2)' }}>{q.ao}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'var(--bg-secondary)', color: 'var(--fg-secondary)' }}>{q.marks} marks</span>
              </div>
              <p style={{ fontSize: '14px', color: 'var(--fg-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>{q.question}</p>
              <p style={{ fontSize: '11px', color: 'var(--fg-secondary)', marginBottom: '10px', fontStyle: 'italic' }}>💡 {q.hint}</p>
              <textarea
                value={answers[q.number] ?? ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.number]: e.target.value }))}
                placeholder="Write your answer here…"
                rows={q.marks >= 20 ? 10 : q.marks >= 8 ? 6 : 3}
                style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid #fff', borderRadius: '10px', color: 'var(--fg)', fontFamily: 'var(--font-ui)', fontSize: '14px', padding: '10px 12px', outline: 'none', resize: 'vertical', lineHeight: 1.6 }}
              />
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', textAlign: 'right' }}>
                {(answers[q.number] ?? '').split(/\s+/).filter(Boolean).length} words
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={markAnswers}
          disabled={marking || Object.keys(answers).length === 0}
          style={{ ...WHITE_BTN, width: '100%', padding: '15px', fontSize: '15px', opacity: Object.keys(answers).length === 0 ? 0.4 : 1 }}>
          {marking ? 'Marking…' : 'Submit for marking →'}
        </button>
      </div>
    </Shell>
  );

  // ── Feedback ────────────────────────────────────────
  if (phase === 'feedback' && session) return (
    <Shell>
      <TopBar onBack={() => setPhase('setup')} title="📄 Feedback" />
      <div style={{ flex: 1 }}>
        {/* Score banner */}
        <div style={{
          background: totalMarks.earned / totalMarks.max >= 0.7 ? 'rgba(0,232,122,0.12)' : totalMarks.earned / totalMarks.max >= 0.5 ? 'rgba(239,159,39,0.12)' : 'rgba(226,75,74,0.12)',
          borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '1.5rem',
          border: `1px solid ${totalMarks.earned / totalMarks.max >= 0.7 ? 'rgba(0,232,122,0.3)' : totalMarks.earned / totalMarks.max >= 0.5 ? 'rgba(239,159,39,0.3)' : 'rgba(226,75,74,0.3)'}`,
        }}>
          <p style={{ fontSize: '40px', fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {totalMarks.earned}/{totalMarks.max}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', marginTop: '6px' }}>
            {Math.round(totalMarks.earned / totalMarks.max * 100)}% · {totalMarks.earned / totalMarks.max >= 0.7 ? 'Grade 6–7 range' : totalMarks.earned / totalMarks.max >= 0.5 ? 'Grade 4–5 range' : 'Grade 3 or below'}
          </p>
        </div>

        {/* Per-question feedback */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
          {feedback.map((f, i) => {
            const q = session.questions.find(q => q.number === f.questionNum);
            const pct = (f.marks ?? 0) / (f.maxMarks ?? 1);
            const col = pct >= 0.75 ? '#00e87a' : pct >= 0.5 ? '#EF9F27' : '#E24B4A';
            return (
              <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--bg-secondary)' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>Q{f.questionNum}</span>
                    {q && <span style={{ fontSize: '11px', color: 'var(--fg-secondary)' }}>{q.ao}</span>}
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: col, fontFamily: 'var(--font-mono)' }}>
                    {f.marks}/{f.maxMarks}
                  </span>
                </div>
                <div style={{ padding: '14px 16px' }}>
                  {/* Answer */}
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'var(--fg-secondary)', marginBottom: '5px' }}>YOUR ANSWER</p>
                    <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
                      "{answers[f.questionNum]?.slice(0, 200)}{(answers[f.questionNum]?.length ?? 0) > 200 ? '…' : ''}"
                    </p>
                  </div>
                  {/* Feedback */}
                  <div style={{ fontSize: '13px', color: 'var(--fg-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '10px 12px', border: '1px solid var(--bg-secondary)' }}>
                    {f.feedback}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { setPhase('setup'); setSession(null); }} style={{ ...WHITE_BTN, flex: 1 }}>New extract</button>
          <button onClick={() => router.push('/gcse')} style={{ ...GHOST_BTN, flex: 1 }}>Hub</button>
        </div>
      </div>

      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </Shell>
  );

  return null;
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#050b18', backgroundImage: 'radial-gradient(ellipse at top, #0a1530 0%, #050b18 60%)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 2.5rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(55,138,221,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(55,138,221,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </main>
  );
}
function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <button onClick={onBack} className="btn">← Back</button>
      <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fg)' }}>{title}</span>
      <div style={{ width: '60px' }} />
    </div>
  );
}
const WHITE_BTN: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', color: '#050b18', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' };

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
