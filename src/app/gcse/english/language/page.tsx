'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSELanguagePage() {
  return <AuthGuard><GCSELanguage /></AuthGuard>;
}

type Phase = 'setup' | 'generating' | 'analysing' | 'feedback';

interface Technique {
  name:     string;
  quote:    string;
  effect:   string;
}

interface AnalysisSession {
  extract:    string;
  focus:      string;
  techniques: Technique[];
  question:   string;
}

interface PETERResponse {
  point:    string;
  evidence: string;
  tech:     string;
  effect:   string;
  reader:   string;
}

const TECHNIQUE_LIST = [
  'Metaphor', 'Simile', 'Personification', 'Alliteration',
  'Sibilance', 'Onomatopoeia', 'Hyperbole', 'Pathetic fallacy',
  'Rule of three', 'Repetition', 'Rhetorical question', 'Contrast',
  'Juxtaposition', 'Semantic field', 'Enjambment', 'Caesura',
];

function GCSELanguage() {
  const router = useRouter();

  const [phase, setPhase]         = useState<Phase>('setup');
  const [session, setSession]     = useState<AnalysisSession | null>(null);
  const [peters, setPeters]       = useState<PETERResponse[]>([
    { point: '', evidence: '', tech: '', effect: '', reader: '' },
    { point: '', evidence: '', tech: '', effect: '', reader: '' },
  ]);
  const [identified, setIdentified] = useState<string[]>([]);
  const [feedback, setFeedback]   = useState<string>('');
  const [marks, setMarks]         = useState<{ earned: number; max: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [marking, setMarking]     = useState(false);
  const [error, setError]         = useState('');
  const [activeTab, setActiveTab] = useState<'identify' | 'peter'>('identify');

  async function generateSession() {
    setGenerating(true);
    setError('');
    setPhase('generating');
    try {
      const res  = await fetch('/api/gcse/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!data.session) throw new Error();
      setSession(data.session);
      setIdentified([]);
      setPeters([
        { point: '', evidence: '', tech: '', effect: '', reader: '' },
        { point: '', evidence: '', tech: '', effect: '', reader: '' },
      ]);
      setFeedback('');
      setMarks(null);
      setPhase('analysing');
      setActiveTab('identify');
    } catch {
      setError('Failed to generate extract. Try again.');
      setPhase('setup');
    } finally {
      setGenerating(false);
    }
  }

  async function submitAnalysis() {
    if (!session || marking) return;
    setMarking(true);
    setError('');
    try {
      const res  = await fetch('/api/gcse/mark-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, identified, peters }),
      });
      const data = await res.json();
      setFeedback(data.feedback ?? '');
      setMarks(data.marks ?? null);
      setPhase('feedback');
    } catch {
      setError('Marking failed. Try again.');
    } finally {
      setMarking(false);
    }
  }

  function updatePeter(idx: number, field: keyof PETERResponse, value: string) {
    setPeters(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  // ── Setup ──────────────────────────────────────────
  if (phase === 'setup' || phase === 'generating') return (
    <Screen>
      <TopBar onBack={() => router.push('/gcse')} title="🔍 Language Analysis" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          AI generates an extract with hidden language techniques. Identify them, then write PETER analysis paragraphs.
        </p>

        {/* PETER reminder */}
        <div style={{ background: 'rgba(127,119,221,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '1.5rem', border: '1px solid rgba(127,119,221,0.2)' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(127,119,221,0.8)', marginBottom: '10px', letterSpacing: '0.08em' }}>PETER ANALYSIS STRUCTURE</p>
          {[
            { letter: 'P', label: 'Point',    desc: 'State the technique and what it does' },
            { letter: 'E', label: 'Evidence', desc: 'Quote directly from the text' },
            { letter: 'T', label: 'Technique', desc: 'Name the language technique used' },
            { letter: 'E', label: 'Effect',   desc: 'Explain the effect on the reader' },
            { letter: 'R', label: 'Reader',   desc: 'How does the reader respond/feel?' },
          ].map(p => (
            <div key={p.letter + p.label} style={{ display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#7F77DD', width: '18px', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>{p.letter}</span>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{p.label}</span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginLeft: '6px' }}>— {p.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {error && <p style={{ fontSize: '13px', color: '#ff8080', marginBottom: '1rem', padding: '8px 12px', background: 'rgba(226,75,74,0.1)', borderRadius: '8px' }}>{error}</p>}

        <button
          onClick={generateSession}
          disabled={generating}
          style={{ ...WHITE_BTN, width: '100%', padding: '15px', fontSize: '15px', opacity: generating ? 0.6 : 1 }}
        >
          {generating ? 'Generating extract…' : 'Generate extract →'}
        </button>
      </div>
    </Screen>
  );

  // ── Analysing ──────────────────────────────────────
  if (phase === 'analysing' && session) return (
    <Screen>
      <TopBar onBack={() => setPhase('setup')} title="🔍 Language Analysis" />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Extract */}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '16px', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(127,119,221,0.6)', marginBottom: '8px' }}>EXTRACT — {session.focus}</p>
          <p style={{ fontSize: '14px', lineHeight: 1.85, color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap' }}>{session.extract}</p>
        </div>

        {/* AQA Question */}
        <div style={{ background: 'rgba(127,119,221,0.08)', borderRadius: '12px', padding: '12px 16px', marginBottom: '1.25rem', border: '1px solid rgba(127,119,221,0.2)' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(127,119,221,0.6)', marginBottom: '4px' }}>AQA QUESTION · 8 MARKS</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{session.question}</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
          {(['identify', 'peter'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, padding: '9px', borderRadius: '10px', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500,
              border: `1px solid ${activeTab === tab ? 'rgba(127,119,221,0.5)' : 'rgba(255,255,255,0.1)'}`,
              background: activeTab === tab ? 'rgba(127,119,221,0.15)' : 'rgba(255,255,255,0.04)',
              color: activeTab === tab ? '#9F99E8' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.15s',
            }}>
              {tab === 'identify' ? '① Identify Techniques' : '② Write PETER'}
            </button>
          ))}
        </div>

        {/* Tab: Identify */}
        {activeTab === 'identify' && (
          <div style={{ animation: 'fadeIn 0.15s ease' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px', lineHeight: 1.5 }}>
              Read the extract. Tap every technique you can spot. Don't worry about getting all of them — focus on what you can support with a quote.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.5rem' }}>
              {TECHNIQUE_LIST.map(t => {
                const active = identified.includes(t);
                return (
                  <button key={t} onClick={() => setIdentified(prev => active ? prev.filter(x => x !== t) : [...prev, t])}
                    style={{
                      padding: '6px 12px', borderRadius: '99px', cursor: 'pointer',
                      fontFamily: 'var(--font-ui)', fontSize: '12px', transition: 'all 0.15s',
                      border: `1px solid ${active ? 'rgba(127,119,221,0.6)' : 'rgba(255,255,255,0.12)'}`,
                      background: active ? 'rgba(127,119,221,0.2)' : 'rgba(255,255,255,0.04)',
                      color: active ? '#9F99E8' : 'rgba(255,255,255,0.5)',
                      fontWeight: active ? 600 : 400,
                    }}>
                    {active ? '✓ ' : ''}{t}
                  </button>
                );
              })}
            </div>
            {identified.length > 0 && (
              <div style={{ padding: '10px 14px', background: 'rgba(127,119,221,0.08)', borderRadius: '10px', border: '1px solid rgba(127,119,221,0.15)', marginBottom: '1rem' }}>
                <p style={{ fontSize: '12px', color: 'rgba(127,119,221,0.7)', marginBottom: '4px' }}>You spotted: {identified.length} technique{identified.length !== 1 ? 's' : ''}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{identified.join(' · ')}</p>
              </div>
            )}
            <button onClick={() => setActiveTab('peter')} style={{ ...WHITE_BTN, width: '100%' }}>
              Next: Write PETER analysis →
            </button>
          </div>
        )}

        {/* Tab: PETER */}
        {activeTab === 'peter' && (
          <div style={{ animation: 'fadeIn 0.15s ease' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', lineHeight: 1.5 }}>
              Write 2 PETER analysis paragraphs using techniques you identified. Each paragraph = 1 technique.
            </p>
            {peters.map((p, i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: '14px', padding: '14px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(127,119,221,0.7)', marginBottom: '12px', letterSpacing: '0.06em' }}>
                  PARAGRAPH {i + 1}
                </p>
                {([
                  { key: 'point',    label: 'P — Point',    ph: 'The writer uses [technique] to...' },
                  { key: 'evidence', label: 'E — Evidence', ph: 'This is shown in the quote "..."' },
                  { key: 'tech',     label: 'T — Technique', ph: 'This is an example of [technique name]' },
                  { key: 'effect',   label: 'E — Effect',   ph: 'The effect of this is...' },
                  { key: 'reader',   label: 'R — Reader',   ph: 'This makes the reader feel / think...' },
                ] as { key: keyof PETERResponse; label: string; ph: string }[]).map(field => (
                  <div key={field.key} style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '10px', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.3)', display: 'block', marginBottom: '4px' }}>
                      {field.label}
                    </label>
                    <textarea
                      value={p[field.key]}
                      onChange={e => updatePeter(i, field.key, e.target.value)}
                      placeholder={field.ph}
                      rows={2}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '13px', padding: '8px 10px', outline: 'none', resize: 'none', lineHeight: 1.5 }}
                    />
                  </div>
                ))}
              </div>
            ))}

            {error && <p style={{ fontSize: '13px', color: '#ff8080', marginBottom: '1rem' }}>{error}</p>}

            <button
              onClick={submitAnalysis}
              disabled={marking}
              style={{ ...WHITE_BTN, width: '100%', padding: '14px', fontSize: '15px', opacity: marking ? 0.6 : 1 }}
            >
              {marking ? 'Marking…' : 'Submit for marking →'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </Screen>
  );

  // ── Feedback ───────────────────────────────────────
  if (phase === 'feedback') return (
    <Screen>
      <TopBar onBack={() => setPhase('setup')} title="🔍 Feedback" />
      <div style={{ flex: 1 }}>
        {marks && (
          <div style={{
            background: marks.earned / marks.max >= 0.75 ? 'rgba(0,232,122,0.1)' : marks.earned / marks.max >= 0.5 ? 'rgba(239,159,39,0.1)' : 'rgba(226,75,74,0.1)',
            borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '1.5rem',
            border: `1px solid ${marks.earned / marks.max >= 0.75 ? 'rgba(0,232,122,0.3)' : marks.earned / marks.max >= 0.5 ? 'rgba(239,159,39,0.3)' : 'rgba(226,75,74,0.3)'}`,
          }}>
            <p style={{ fontSize: '40px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
              {marks.earned}/{marks.max}
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
              AO2 · Language Analysis
            </p>
          </div>
        )}

        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(127,119,221,0.6)', marginBottom: '10px' }}>EXAMINER FEEDBACK</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{feedback}</p>
        </div>

        {/* Techniques that were actually present */}
        {session && (
          <div style={{ background: 'rgba(127,119,221,0.07)', borderRadius: '12px', padding: '14px', marginBottom: '1.5rem', border: '1px solid rgba(127,119,221,0.15)' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(127,119,221,0.6)', marginBottom: '10px' }}>TECHNIQUES IN THE EXTRACT</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {session.techniques.map((t, i) => (
                <div key={i} style={{ borderBottom: i < session.techniques.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingBottom: i < session.techniques.length - 1 ? '8px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#9F99E8' }}>{t.name}</span>
                    {identified.includes(t.name) && <span style={{ fontSize: '10px', color: '#00e87a' }}>✓ you spotted this</span>}
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginBottom: '2px' }}>"{t.quote}"</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{t.effect}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={generateSession} style={{ ...WHITE_BTN, flex: 1 }}>New extract</button>
          <button onClick={() => router.push('/gcse')} style={{ ...GHOST_BTN, flex: 1 }}>Hub</button>
        </div>
      </div>
    </Screen>
  );

  return null;
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#080614', backgroundImage: 'radial-gradient(ellipse at top, #130d30 0%, #080614 60%)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 2.5rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(127,119,221,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(127,119,221,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
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
const WHITE_BTN: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', color: '#080614', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' };
const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
