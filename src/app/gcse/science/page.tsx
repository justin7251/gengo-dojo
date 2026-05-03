'use client';

import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSESciencePage() {
  return <AuthGuard><GCSEScienceHub /></AuthGuard>;
}

const SUBJECTS = [
  {
    id:     'biology',
    emoji:  '🧬',
    label:  'Biology',
    color:  '#00e87a',
    dim:    'rgba(0,232,122,0.1)',
    border: 'rgba(0,232,122,0.25)',
    route:  '/gcse/science/biology',
    topics: ['Cell biology', 'Organisation', 'Infection & response', 'Bioenergetics', 'Homeostasis', 'Inheritance', 'Ecology'],
    papers: 'Paper 1 · Paper 2',
  },
  {
    id:     'chemistry',
    emoji:  '⚗️',
    label:  'Chemistry',
    color:  '#EF9F27',
    dim:    'rgba(239,159,39,0.1)',
    border: 'rgba(239,159,39,0.25)',
    route:  '/gcse/science/chemistry',
    topics: ['Atomic structure', 'Bonding', 'Quantitative chemistry', 'Chemical changes', 'Energy changes', 'Rates of reaction', 'Organic chemistry'],
    papers: 'Paper 1 · Paper 2',
  },
  {
    id:     'physics',
    emoji:  '⚛️',
    label:  'Physics',
    color:  '#7F77DD',
    dim:    'rgba(127,119,221,0.12)',
    border: 'rgba(127,119,221,0.3)',
    route:  '/gcse/science/physics',
    topics: ['Energy', 'Electricity', 'Particle model', 'Atomic structure', 'Forces', 'Waves', 'Magnetism', 'Space'],
    papers: 'Paper 1 · Paper 2',
  },
  {
    id:     'equations',
    emoji:  '🔢',
    label:  'Required Equations',
    color:  '#378ADD',
    dim:    'rgba(55,138,221,0.1)',
    border: 'rgba(55,138,221,0.25)',
    route:  '/gcse/science/equations',
    topics: ['Physics equations', 'Chemistry calculations', 'Biology calculations', 'Unit conversions'],
    papers: 'All papers',
  },
  {
    id:     'practicals',
    emoji:  '🔬',
    label:  'Required Practicals',
    color:  '#D4537E',
    dim:    'rgba(212,83,126,0.1)',
    border: 'rgba(212,83,126,0.25)',
    route:  '/gcse/science/practicals',
    topics: ['Method recall', 'Results analysis', 'Evaluation questions', 'Graph skills'],
    papers: 'Tested in all papers',
  },
];

function GCSEScienceHub() {
  const router = useRouter();

  return (
    <Screen>
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/gcse')} style={GHOST_BTN}>← Subjects</button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '28px' }}>🔬</span>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)' }}>AQA · YEAR 11</p>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
              Combined Science
            </h1>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          Biology, Chemistry and Physics. AI generates exam questions, marks answers, and explains required practicals. Trilogy route · 6 papers.
        </p>
      </div>

      {/* Paper grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Biology',   sub: 'P1 + P2', color: '#00e87a' },
          { label: 'Chemistry', sub: 'P1 + P2', color: '#EF9F27' },
          { label: 'Physics',   sub: 'P1 + P2', color: '#7F77DD' },
        ].map(p => (
          <div key={p.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px', border: `1px solid ${p.color}20`, textAlign: 'center' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{p.label}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{p.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '1.25rem' }} />

      {/* Subject cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/gcse/science/learn')} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 16px', borderRadius: '14px', cursor: 'pointer',
          border: '1px solid rgba(127,119,221,0.4)',
          background: 'rgba(127,119,221,0.12)',
          fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
          marginBottom: '1rem',
        }}>
          <span style={{ fontSize: '24px' }}>📚</span>
          <div>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>Learn a topic first</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>7 swipeable lesson cards before you practise</p>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '18px', color: 'rgba(127,119,221,0.7)' }}>›</span>
        </button>
        {SUBJECTS.map(s => (
          <button key={s.id} onClick={() => router.push(s.route)} style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '14px 16px', borderRadius: '14px', cursor: 'pointer',
            border: `1px solid ${s.border}`, background: s.dim,
            fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
            transition: 'all 0.15s',
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0, background: `${s.color}20`, border: `1px solid ${s.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              {s.emoji}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{s.label}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: `${s.color}18`, color: `${s.color}bb`, border: `1px solid ${s.color}28` }}>
                  {s.papers}
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {s.topics.slice(0, 5).map(t => (
                  <span key={t} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: `${s.color}10`, color: `${s.color}80`, border: `1px solid ${s.color}18` }}>{t}</span>
                ))}
                {s.topics.length > 5 && (
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', alignSelf: 'center' }}>+{s.topics.length - 5} more</span>
                )}
              </div>
            </div>
            <span style={{ fontSize: '18px', color: `${s.color}90`, flexShrink: 0 }}>›</span>
          </button>
        ))}
      </div>

      {/* Command word reminder */}
      <div style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>AQA COMMAND WORDS</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {[
            { word: 'Describe',  def: 'State the features of — no explanation needed' },
            { word: 'Explain',   def: 'Give reasons for — use "because" and "so"' },
            { word: 'Evaluate',  def: 'Use evidence to make a judgement' },
            { word: 'Calculate', def: 'Use numbers — show working, include units' },
            { word: 'Suggest',   def: 'Apply knowledge to an unfamiliar situation' },
          ].map(c => (
            <div key={c.word} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#00e87a', minWidth: '60px', fontFamily: 'var(--font-mono)' }}>{c.word}</span>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{c.def}</span>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#040e08', backgroundImage: 'radial-gradient(ellipse at top left, #081c10 0%, #040e08 60%, #020807 100%)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 3rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,232,122,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,232,122,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', margin: '0 auto', width: '100%' }}>{children}</div>
    </main>
  );
}

const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
