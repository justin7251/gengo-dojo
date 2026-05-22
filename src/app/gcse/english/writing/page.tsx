'use client';
import { Spinner } from '@/components/Spinner';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSEWritingPage() {
  return <AuthGuard><GCSEWriting /></AuthGuard>;
}

type WritingType = 'creative' | 'transactional';
type Phase = 'setup' | 'writing' | 'marking' | 'feedback';

interface Prompt { title: string; type: WritingType; instruction: string; form: string; timing: string; }
interface Feedback {
  ao5Marks: number; ao6Marks: number; total: number;
  ao5Grade: string; ao6Grade: string;
  strengths: string[]; targets: string[]; modelSentence: string;
  levelDescriptor: string;
}

const PROMPTS: Prompt[] = [
  { title: 'The Empty House', type: 'creative', form: 'Short story', timing: '45 min', instruction: 'Write a short story suggested by this image: an old house at the end of a street, all windows dark, one door slightly ajar.' },
  { title: 'Social Media & Young People', type: 'transactional', form: 'Article', timing: '45 min', instruction: 'A magazine for young people has asked for articles with the title: "Social media is doing more harm than good to young people\'s mental health." Write the article.' },
  { title: 'The Last Train', type: 'creative', form: 'Descriptive writing', timing: '45 min', instruction: 'Write a description suggested by this image: a near-empty train station late at night, one figure waiting on the platform.' },
  { title: 'School Starting Times', type: 'transactional', form: 'Letter', timing: '45 min', instruction: 'Your school is considering starting the school day at 10am instead of 9am. Write a letter to your headteacher arguing for or against this change.' },
  { title: 'The Discovery', type: 'creative', form: 'Short story', timing: '45 min', instruction: 'Write a story that begins with the words: "It was only when she looked more closely that she realised something was very wrong."' },
  { title: 'Climate & Young People', type: 'transactional', form: 'Speech', timing: '45 min', instruction: 'Write a speech to be delivered at a school assembly arguing that young people have a responsibility to act on climate change.' },
];

function GCSEWriting() {
  const router = useRouter();

  const [writingType, setWritingType] = useState<WritingType>('creative');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [phase, setPhase]           = useState<Phase>('setup');
  const [essay, setEssay]           = useState('');
  const [feedback, setFeedback]     = useState<Feedback | null>(null);
  const [timeLeft, setTimeLeft]     = useState(45 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [error, setError]           = useState('');
  const timerRef                    = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, timeLeft]);

  function startWriting(prompt: Prompt) {
    setSelectedPrompt(prompt);
    setEssay('');
    setFeedback(null);
    setTimeLeft(45 * 60);
    setPhase('writing');
    setTimerActive(true);
  }

  async function submitForMarking() {
    if (!selectedPrompt || !essay.trim()) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    setPhase('marking');
    setError('');
    try {
      const res  = await fetch('/api/gcse/english/mark-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: selectedPrompt, essay }),
      });
      const data = await res.json();
      if (!data.feedback) throw new Error('No feedback returned');
      setFeedback(data.feedback);
      setPhase('feedback');
    } catch {
      setError('Marking failed. Please try again.');
      setPhase('writing');
    }
  }

  const mins    = Math.floor(timeLeft / 60);
  const secs    = timeLeft % 60;
  const wordCount = essay.split(/\s+/).filter(Boolean).length;
  const filteredPrompts = PROMPTS.filter(p => p.type === writingType);

  // ── Setup ──────────────────────────────────────────
  if (phase === 'setup') return (
    <Screen>
      <TopBar onBack={() => router.push('/gcse')} title="✍️ Writing" />
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Choose a writing task. AI marks your response using the AQA AO5 and AO6 mark scheme.
        Aim for 450–600 words in 45 minutes.
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {(['creative', 'transactional'] as WritingType[]).map(t => (
          <button key={t} onClick={() => setWritingType(t)} style={{
            flex: 1, padding: '10px', borderRadius: '10px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500,
            border: `1px solid ${writingType === t ? 'rgba(212,83,126,0.5)' : 'rgba(255,255,255,0.1)'}`,
            background: writingType === t ? 'rgba(212,83,126,0.12)' : 'rgba(255,255,255,0.04)',
            color: writingType === t ? '#D4537E' : 'rgba(255,255,255,0.5)',
            transition: 'all 0.15s',
          }}>
            {t === 'creative' ? '🎨 Creative (P1 Q5)' : '📋 Transactional (P2 Q5)'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredPrompts.map((p, i) => (
          <button key={i} onClick={() => startWriting(p)} style={{
            padding: '16px', borderRadius: '14px', cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
            fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
            transition: 'all 0.15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{p.title}</span>
              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(212,83,126,0.15)', color: 'rgba(212,83,126,0.8)', border: '1px solid rgba(212,83,126,0.2)' }}>{p.form}</span>
              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{p.timing}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{p.instruction.slice(0, 100)}…</p>
          </button>
        ))}
      </div>
    </Screen>
  );

  // ── Writing ────────────────────────────────────────
  if (phase === 'writing' && selectedPrompt) return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setPhase('setup'); }} style={GHOST_BTN}>← Back</button>
        {/* Timer */}
        <div style={{
          padding: '6px 14px', borderRadius: '99px', fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700,
          color: timeLeft < 300 ? '#E24B4A' : timeLeft < 600 ? '#EF9F27' : '#00e87a',
          background: timeLeft < 300 ? 'rgba(226,75,74,0.12)' : 'rgba(0,0,0,0.3)',
          border: `1px solid ${timeLeft < 300 ? 'rgba(226,75,74,0.3)' : 'rgba(255,255,255,0.1)'}`,
          transition: 'all 1s',
        }}>
          {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
        </div>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>{wordCount} words</span>
      </div>

      {/* Prompt */}
      <div style={{ background: 'rgba(212,83,126,0.08)', borderRadius: '14px', padding: '14px 16px', marginBottom: '1rem', border: '1px solid rgba(212,83,126,0.2)' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#D4537E' }}>{selectedPrompt.form}</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>40 marks · AO5 + AO6</span>
        </div>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>{selectedPrompt.instruction}</p>
      </div>

      {/* Writing tips */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['Use paragraphs', 'Vary sentence length', 'Precise vocabulary', 'Structural features', 'Accurate punctuation'].map(tip => (
          <span key={tip} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
            {tip}
          </span>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        autoFocus
        value={essay}
        onChange={e => setEssay(e.target.value)}
        placeholder="Begin writing here…"
        style={{
          width: '100%', flex: 1, minHeight: '320px',
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px', color: '#fff', fontFamily: 'var(--font-ui)',
          fontSize: '14px', padding: '14px', outline: 'none',
          resize: 'none', lineHeight: 1.75, marginBottom: '1rem',
        }}
      />

      {error && <p style={{ fontSize: '13px', color: '#ff8080', marginBottom: '1rem' }}>{error}</p>}

      <button onClick={submitForMarking} disabled={wordCount < 50} style={{ ...WHITE_BTN, width: '100%', padding: '14px', fontSize: '15px', opacity: wordCount < 50 ? 0.4 : 1 }}>
        Submit for marking ({wordCount < 50 ? `${50 - wordCount} more words needed` : `${wordCount} words`})
      </button>
    </Screen>
  );

  // ── Marking ────────────────────────────────────────
  if (phase === 'marking') return (
    <Screen>
      <TopBar onBack={() => router.push('/gcse')} title="✍️ Writing" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Spinner />
        <p style={{ fontSize: '16px', color: '#fff', marginTop: '1.5rem', marginBottom: '6px' }}>Marking your writing…</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Assessing AO5 and AO6 against AQA mark scheme</p>
      </div>
    </Screen>
  );

  // ── Feedback ────────────────────────────────────────
  if (phase === 'feedback' && feedback && selectedPrompt) return (
    <Screen>
      <TopBar onBack={() => setPhase('setup')} title="✍️ Feedback" />
      <div style={{ flex: 1 }}>

        {/* Score */}
        <div style={{ background: 'rgba(212,83,126,0.1)', borderRadius: '16px', padding: '20px', marginBottom: '1.5rem', border: '1px solid rgba(212,83,126,0.25)', textAlign: 'center' }}>
          <p style={{ fontSize: '42px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
            {feedback.total}/40
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>
            {feedback.levelDescriptor}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px' }}>
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '12px' }}>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>{feedback.ao5Marks}/24</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>AO5 · Communication</p>
              <p style={{ fontSize: '11px', color: '#D4537E', marginTop: '2px' }}>{feedback.ao5Grade}</p>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '10px', padding: '12px' }}>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)' }}>{feedback.ao6Marks}/16</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>AO6 · Technical</p>
              <p style={{ fontSize: '11px', color: '#D4537E', marginTop: '2px' }}>{feedback.ao6Grade}</p>
            </div>
          </div>
        </div>

        {/* Strengths */}
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(0,232,122,0.6)', marginBottom: '8px' }}>✓ WHAT WORKED</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {feedback.strengths.map((s, i) => (
              <div key={i} style={{ padding: '10px 14px', background: 'rgba(0,232,122,0.07)', borderRadius: '10px', border: '1px solid rgba(0,232,122,0.15)' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{s}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Targets */}
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(239,159,39,0.7)', marginBottom: '8px' }}>△ TARGETS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {feedback.targets.map((t, i) => (
              <div key={i} style={{ padding: '10px 14px', background: 'rgba(239,159,39,0.07)', borderRadius: '10px', border: '1px solid rgba(239,159,39,0.15)' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{t}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Model sentence */}
        <div style={{ padding: '14px 16px', background: 'rgba(127,119,221,0.08)', borderRadius: '12px', border: '1px solid rgba(127,119,221,0.2)', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(127,119,221,0.7)', marginBottom: '8px' }}>→ MODEL SENTENCE</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, fontStyle: 'italic' }}>"{feedback.modelSentence}"</p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setPhase('setup')} style={{ ...WHITE_BTN, flex: 1 }}>Try another</button>
          <button onClick={() => router.push('/gcse')} style={{ ...GHOST_BTN, flex: 1 }}>Hub</button>
        </div>
      </div>

      </Screen>
  );

  return null;
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#100510', backgroundImage: 'radial-gradient(ellipse at top right, #2d0a1e 0%, #100510 60%)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 2.5rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(212,83,126,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(212,83,126,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
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
const WHITE_BTN: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', color: '#100510', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' };
const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
