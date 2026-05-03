'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

// ── Topic pages ──────────────────────────────────────
// src/app/gcse/science/biology/page.tsx    → <ScienceTopicPage subject="biology" />
// src/app/gcse/science/chemistry/page.tsx  → <ScienceTopicPage subject="chemistry" />
// src/app/gcse/science/physics/page.tsx    → <ScienceTopicPage subject="physics" />

export type ScienceSubject = 'biology' | 'chemistry' | 'physics';

const SUBJECT_META: Record<ScienceSubject, {
  label:    string;
  emoji:    string;
  color:    string;
  paper1:   string[];
  paper2:   string[];
}> = {
  biology: {
    label: 'Biology', emoji: '🧬', color: '#00e87a',
    paper1: ['Cell biology', 'Organisation', 'Infection & response', 'Bioenergetics'],
    paper2: ['Homeostasis & response', 'Inheritance & variation', 'Ecology'],
  },
  chemistry: {
    label: 'Chemistry', emoji: '⚗️', color: '#EF9F27',
    paper1: ['Atomic structure & periodic table', 'Bonding & structure', 'Quantitative chemistry', 'Chemical changes', 'Energy changes'],
    paper2: ['Rates of reaction & equilibrium', 'Organic chemistry', 'Chemical analysis', 'Chemistry of the atmosphere', 'Using resources'],
  },
  physics: {
    label: 'Physics', emoji: '⚛️', color: '#7F77DD',
    paper1: ['Energy', 'Electricity', 'Particle model of matter', 'Atomic structure'],
    paper2: ['Forces', 'Waves', 'Magnetism & electromagnetism', 'Space physics'],
  },
};

type QuestionType = 'recall' | 'explain' | 'calculate' | 'evaluate';
type Phase        = 'setup' | 'generating' | 'answering' | 'feedback';

interface ScienceQuestion {
  number:    number;
  marks:     number;
  topic:     string;
  paper:     'P1' | 'P2';
  type:      QuestionType;
  question:  string;
  hint:      string;
}

interface MarkResult {
  questionNum: number;
  marks:       number;
  maxMarks:    number;
  modelAnswer: string;
  feedback:    string;
}

interface Props { subject: ScienceSubject; }

export function ScienceTopicPage({ subject }: Props) {
  const router = useRouter();
  const meta   = SUBJECT_META[subject];

  const [paper, setPaper]           = useState<'P1' | 'P2' | 'Both'>('Both');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [qType, setQType]           = useState<QuestionType | 'mixed'>('mixed');
  const [phase, setPhase]           = useState<Phase>('setup');
  const [questions, setQuestions]   = useState<ScienceQuestion[]>([]);
  const [answers, setAnswers]       = useState<Record<number, string>>({});
  const [results, setResults]       = useState<MarkResult[]>([]);
  const [error, setError]           = useState('');
  const [totalMarks, setTotalMarks] = useState({ earned: 0, max: 0 });

  const allTopics = paper === 'P1' ? meta.paper1
    : paper === 'P2' ? meta.paper2
    : [...meta.paper1, ...meta.paper2];

  async function generateQuestions() {
    setPhase('generating');
    setError('');
    try {
      const res  = await fetch('/api/gcse/science/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, topic: selectedTopic, paper, questionType: qType }),
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
      const res  = await fetch('/api/gcse/science/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
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

  // ── Setup ─────────────────────────────────────────
  if (phase === 'setup') return (
    <Screen color={color} onBack={() => router.push('/gcse/science')}>
      <TopBar onBack={() => router.push('/gcse/science')} title={`${meta.emoji} ${meta.label}`} />

      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        AI generates AQA-style questions. Answers marked against the mark scheme with model answers provided.
      </p>

      {/* Paper filter */}
      <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>PAPER</p>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem' }}>
        {(['Both', 'P1', 'P2'] as ('P1'|'P2'|'Both')[]).map(p => (
          <button key={p} onClick={() => { setPaper(p); setSelectedTopic(null); }} style={{
            flex: 1, padding: '8px', borderRadius: '10px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500,
            border: `1px solid ${paper === p ? `${color}55` : 'rgba(255,255,255,0.1)'}`,
            background: paper === p ? `${color}15` : 'rgba(255,255,255,0.04)',
            color: paper === p ? color : 'rgba(255,255,255,0.5)', transition: 'all 0.15s',
          }}>
            {p === 'Both' ? 'Both papers' : p === 'P1' ? 'Paper 1' : 'Paper 2'}
          </button>
        ))}
      </div>

      {/* Topic */}
      <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
        TOPIC <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 400 }}>— optional</span>
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.25rem' }}>
        <button onClick={() => setSelectedTopic(null)} style={{
          padding: '6px 12px', borderRadius: '99px', cursor: 'pointer',
          fontFamily: 'var(--font-ui)', fontSize: '12px',
          border: `1px solid ${!selectedTopic ? `${color}55` : 'rgba(255,255,255,0.1)'}`,
          background: !selectedTopic ? `${color}15` : 'rgba(255,255,255,0.04)',
          color: !selectedTopic ? color : 'rgba(255,255,255,0.5)', transition: 'all 0.15s',
        }}>Mixed</button>
        {allTopics.map(t => (
          <button key={t} onClick={() => setSelectedTopic(t)} style={{
            padding: '6px 12px', borderRadius: '99px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '12px',
            border: `1px solid ${selectedTopic === t ? `${color}55` : 'rgba(255,255,255,0.1)'}`,
            background: selectedTopic === t ? `${color}15` : 'rgba(255,255,255,0.04)',
            color: selectedTopic === t ? color : 'rgba(255,255,255,0.5)', transition: 'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      {/* Question type */}
      <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>QUESTION TYPE</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '2rem' }}>
        {([
          { key: 'mixed',    label: 'Mixed',    desc: '' },
          { key: 'recall',   label: 'Recall',   desc: 'State / Name / Give' },
          { key: 'explain',  label: 'Explain',  desc: 'Why / How' },
          { key: 'calculate',label: 'Calculate',desc: 'Equations' },
          { key: 'evaluate', label: 'Evaluate', desc: 'Discuss / Assess' },
        ] as { key: QuestionType | 'mixed'; label: string; desc: string }[]).map(qt => (
          <button key={qt.key} onClick={() => setQType(qt.key)} style={{
            padding: '6px 12px', borderRadius: '99px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '12px',
            border: `1px solid ${qType === qt.key ? `${color}55` : 'rgba(255,255,255,0.1)'}`,
            background: qType === qt.key ? `${color}15` : 'rgba(255,255,255,0.04)',
            color: qType === qt.key ? color : 'rgba(255,255,255,0.5)', transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: '5px',
          }}>
            {qt.label}
            {qt.desc && <span style={{ fontSize: '10px', opacity: 0.6 }}>— {qt.desc}</span>}
          </button>
        ))}
      </div>

      {error && <p style={{ fontSize: '13px', color: '#ff8080', marginBottom: '1rem', padding: '8px 12px', background: 'rgba(226,75,74,0.1)', borderRadius: '8px' }}>{error}</p>}

      <button onClick={generateQuestions} style={{ ...WHITE_BTN, width: '100%', padding: '14px', fontSize: '15px' }}>
        Generate questions →
      </button>
    </Screen>
  );

  // ── Generating / Marking ──────────────────────────
  if (phase === 'generating') return (
    <Screen color={color} onBack={() => router.push('/gcse/science')}>
      <TopBar onBack={() => router.push('/gcse/science')} title={`${meta.emoji} ${meta.label}`} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Spinner color={color} />
        <p style={{ fontSize: '16px', color: '#fff', marginTop: '1.5rem', marginBottom: '6px' }}>
          {results.length === 0 ? 'Generating questions…' : 'Marking answers…'}
        </p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          {results.length === 0
            ? `${meta.label} · ${selectedTopic ?? 'mixed topics'}`
            : 'Checking against AQA mark scheme'}
        </p>
      </div>
    </Screen>
  );

  // ── Answering ─────────────────────────────────────
  if (phase === 'answering') return (
    <Screen color={color} onBack={() => setPhase('setup')}>
      <TopBar onBack={() => setPhase('setup')} title={`${meta.emoji} ${meta.label}`} />
      <div style={{ flex: 1 }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '99px', background: `${color}18`, color: `${color}bb`, border: `1px solid ${color}28` }}>
            {questions.length} questions
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            {questions.reduce((s, q) => s + q.marks, 0)} marks total
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
          {questions.map(q => (
            <div key={q.number} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>Q{q.number}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: `${color}15`, color: `${color}aa` }}>
                  {q.marks} mark{q.marks !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                  {q.topic}
                </span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)' }}>
                  {q.type}
                </span>
              </div>

              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, marginBottom: '8px', whiteSpace: 'pre-wrap' }}>
                {q.question}
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', marginBottom: '12px' }}>
                💡 {q.hint}
              </p>

              <textarea
                value={answers[q.number] ?? ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.number]: e.target.value }))}
                placeholder={`Answer Q${q.number} here…${q.type === 'calculate' ? '\n\nRemember to show working and include units.' : ''}`}
                rows={q.marks >= 6 ? 8 : q.marks >= 3 ? 5 : 3}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                  color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '13px',
                  padding: '10px 12px', outline: 'none', resize: 'vertical', lineHeight: 1.6,
                }}
              />
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '4px', textAlign: 'right' }}>
                {(answers[q.number] ?? '').split(/\s+/).filter(Boolean).length} words
              </p>
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

  // ── Feedback ──────────────────────────────────────
  if (phase === 'feedback') return (
    <Screen color={color} onBack={() => setPhase('setup')}>
      <TopBar onBack={() => setPhase('setup')} title={`${meta.emoji} Results`} />
      <div style={{ flex: 1 }}>

        {/* Score */}
        <div style={{
          background: totalMarks.earned / totalMarks.max >= 0.8 ? 'rgba(0,232,122,0.1)' : totalMarks.earned / totalMarks.max >= 0.6 ? `${color}12` : 'rgba(226,75,74,0.1)',
          borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '1.5rem',
          border: `1px solid ${totalMarks.earned / totalMarks.max >= 0.8 ? 'rgba(0,232,122,0.3)' : totalMarks.earned / totalMarks.max >= 0.6 ? `${color}35` : 'rgba(226,75,74,0.3)'}`,
        }}>
          <p style={{ fontSize: '40px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {totalMarks.earned}/{totalMarks.max}
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
            {Math.round(totalMarks.earned / totalMarks.max * 100)}% · {meta.label}
          </p>
        </div>

        {/* Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem' }}>
          {results.map((r, i) => {
            const col = r.marks === r.maxMarks ? '#00e87a' : r.marks > 0 ? '#EF9F27' : '#E24B4A';
            const q   = questions.find(q => q.number === r.questionNum);
            return (
              <div key={i} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>Q{r.questionNum}</span>
                    {q && <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{q.topic}</span>}
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: col, fontFamily: 'var(--font-mono)' }}>
                    {r.marks}/{r.maxMarks}
                  </span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                  {/* Student answer */}
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', marginBottom: '5px' }}>YOUR ANSWER</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, fontStyle: 'italic' }}>
                      "{(answers[r.questionNum] ?? '(no answer)').slice(0, 180)}{(answers[r.questionNum]?.length ?? 0) > 180 ? '…' : ''}"
                    </p>
                  </div>
                  {/* Model answer */}
                  <div style={{ marginBottom: '10px' }}>
                    <p style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.25)', marginBottom: '5px' }}>MODEL ANSWER</p>
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 12px', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {r.modelAnswer}
                      </p>
                    </div>
                  </div>
                  {/* Feedback */}
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{r.feedback}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { setPhase('setup'); setQuestions([]); setResults([]); }} style={{ ...WHITE_BTN, flex: 1 }}>
            New questions
          </button>
          <button onClick={() => router.push('/gcse/science')} style={{ ...GHOST_BTN, flex: 1 }}>Hub</button>
        </div>
      </div>
    </Screen>
  );

  return null;
}

// ── Shared UI ──────────────────────────────────────
function Screen({ children, color, onBack }: { children: React.ReactNode; color: string; onBack: () => void }) {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#040e08',
      backgroundImage: `radial-gradient(ellipse at top, ${color}10 0%, #040e08 60%)`,
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1.25rem 2.5rem', fontFamily: 'var(--font-ui)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${color}15 1px,transparent 1px),linear-gradient(90deg,${color}15 1px,transparent 1px)`, backgroundSize: '40px 40px', opacity: 0.35 }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      <style>{`@keyframes spin { to{transform:rotate(360deg)} } @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </main>
  );
}

function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <button onClick={onBack} style={GHOST_BTN}>← Back</button>
      <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{title}</span>
      <div style={{ width: '60px' }} />
    </div>
  );
}

const WHITE_BTN: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', color: '#040e08', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' };
const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
function Spinner({ color }: { color: string }) { return <div style={{ width: '32px', height: '32px', border: `2px solid ${color}25`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />; }
