'use client';

import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSEEnglishPage() {
  return <AuthGuard><GCSEEnglishHub /></AuthGuard>;
}

const SECTIONS = [
  {
    id:     'reading',
    emoji:  '📄',
    label:  'Reading',
    desc:   'Extract-based comprehension. Q1–Q4 style questions with AI marking.',
    marks:  'P1 Q1–Q4 · P2 Q1–Q4',
    color:  '#378ADD',
    dim:    'rgba(55,138,221,0.12)',
    border: 'rgba(55,138,221,0.3)',
    route:  '/gcse/english/reading',
  },
  {
    id:     'language',
    emoji:  '🔍',
    label:  'Language Analysis',
    desc:   'Identify techniques. Write PETER responses. AI grades your analysis.',
    marks:  'P1 Q2–Q3 · P2 Q3',
    color:  '#7F77DD',
    dim:    'rgba(127,119,221,0.12)',
    border: 'rgba(127,119,221,0.3)',
    route:  '/gcse/english/language',
  },
  {
    id:     'writing',
    emoji:  '✍️',
    label:  'Writing Practice',
    desc:   'Timed creative and transactional writing. AI marks AO5 + AO6.',
    marks:  'P1 Q5 · P2 Q5 · up to 40 marks',
    color:  '#D4537E',
    dim:    'rgba(212,83,126,0.12)',
    border: 'rgba(212,83,126,0.3)',
    route:  '/gcse/english/writing',
  },
  {
    id:     'vocab',
    emoji:  '📚',
    label:  'Vocabulary',
    desc:   'Master Tier 2 and Tier 3 academic vocabulary with spaced repetition.',
    marks:  'AO6 · vocabulary, spelling, punctuation',
    color:  '#00e87a',
    dim:    'rgba(0,232,122,0.1)',
    border: 'rgba(0,232,122,0.25)',
    route:  '/gcse/english/vocab',
  },
  {
    id:     'papers',
    emoji:  '📝',
    label:  'Mock Papers',
    desc:   'Full timed mock. AI generates a complete paper and marks every response.',
    marks:  'Full Paper 1 or Paper 2 · 80 marks',
    color:  '#EF9F27',
    dim:    'rgba(239,159,39,0.1)',
    border: 'rgba(239,159,39,0.25)',
    route:  '/gcse/english/papers',
  },
];

const AOS = [
  { ao: 'AO1', desc: 'Identify and interpret · retrieve information' },
  { ao: 'AO2', desc: 'Language techniques · effects on reader' },
  { ao: 'AO3', desc: 'Structure · organisation of text' },
  { ao: 'AO4', desc: 'Evaluate · critical response' },
  { ao: 'AO5', desc: 'Writing · communication and organisation' },
  { ao: 'AO6', desc: 'Writing · vocabulary, grammar, spelling' },
];

function GCSEEnglishHub() {
  const router = useRouter();

  return (
    <Screen>
      {/* Back to subject picker */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/gcse')} style={GHOST_BTN}>Subjects</button>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '28px' }}>📖</span>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)' }}>
              AQA · YEAR 11
            </p>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
              English Language
            </h1>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          AI-powered exam prep covering all AQA assessment objectives.
          Paper 1 · Paper 2 · AO1–AO6.
        </p>
      </div>

      {/* Paper breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Paper 1', sub: 'Fiction · Creative writing', color: '#378ADD' },
          { label: 'Paper 2', sub: 'Non-fiction · Transactional', color: '#7F77DD' },
        ].map(p => (
          <div key={p.label} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
            padding: '12px', border: `1px solid ${p.color}25`,
          }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{p.label}</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{p.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '1.25rem' }} />

      {/* Section cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
		<button onClick={() => router.push('/gcse/english/learn')} style={{
		  display: 'flex', alignItems: 'center', gap: '10px',
		  padding: '14px 16px', borderRadius: '14px', cursor: 'pointer',
		  border: '1px solid rgba(127,119,221,0.4)',
		  background: 'rgba(127,119,221,0.12)',
		  fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
		  marginBottom: '1rem',
		}}>
		  <span style={{ fontSize: '24px' }}></span>
		  <div>
			<p style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>Learn a topic first</p>
			<p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>7 swipeable lesson cards before you practise</p>
		  </div>
		  <span style={{ marginLeft: 'auto', fontSize: '18px', color: 'rgba(127,119,221,0.7)' }}></span>
		</button>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => router.push(s.route)}
            style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px', borderRadius: '14px', cursor: 'pointer',
              border: `1px solid ${s.border}`, background: s.dim,
              fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
              transition: 'all 0.15s',
            }}
          >
            {/* Icon */}
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
              background: `${s.color}20`, border: `1px solid ${s.color}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
            }}>
              {s.emoji}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{s.label}</span>
                <span style={{
                  fontSize: '10px', padding: '2px 6px', borderRadius: '99px',
                  background: `${s.color}18`, color: `${s.color}bb`,
                  border: `1px solid ${s.color}28`,
                }}>
                  {s.marks}
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
                {s.desc}
              </p>
            </div>

            <span style={{ fontSize: '18px', color: `${s.color}90`, flexShrink: 0 }}></span>
          </button>
        ))}
      </div>

      {/* AO quick reference */}
      <div style={{
        padding: '14px', background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <p style={{
          fontSize: '11px', letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.3)', marginBottom: '10px',
        }}>
          ASSESSMENT OBJECTIVES
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {AOS.map(a => (
            <div key={a.ao} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                fontSize: '11px', fontWeight: 700, color: '#7F77DD',
                minWidth: '32px', fontFamily: 'var(--font-mono)',
              }}>
                {a.ao}
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{a.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#06080f',
      backgroundImage: `
        radial-gradient(ellipse at top left, #0d1428 0%, #06080f 60%, #030508 100%),
        linear-gradient(rgba(127,119,221,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(127,119,221,0.02) 1px, transparent 1px)
      `,
      backgroundSize: 'auto, 40px 40px, 40px 40px',
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1.25rem 3rem',
      fontFamily: 'var(--font-ui)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', margin: '0 auto', width: '100%' }}>
        {children}
      </div>
    </main>
  );
}

const GHOST_BTN: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px', padding: '7px 14px',
  color: 'rgba(255,255,255,0.65)', fontSize: '13px',
  cursor: 'pointer', fontFamily: 'var(--font-ui)',
};
