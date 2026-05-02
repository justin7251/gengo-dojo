'use client';

import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSEMathsPage() {
  return <AuthGuard><GCSEMathsHub /></AuthGuard>;
}

const SECTIONS = [
  {
    id:     'algebra',
    emoji:  '🔣',
    label:  'Algebra',
    desc:   'Equations, inequalities, sequences, quadratics, simultaneous equations.',
    topics: ['Linear equations', 'Quadratics', 'Sequences', 'Inequalities', 'Functions'],
    color:  '#378ADD',
    dim:    'rgba(55,138,221,0.12)',
    border: 'rgba(55,138,221,0.3)',
    route:  '/gcse/maths/algebra',
    marks:  '~30% of paper',
  },
  {
    id:     'geometry',
    emoji:  '📐',
    label:  'Geometry & Measures',
    desc:   'Angles, circles, trigonometry, Pythagoras, vectors, transformations.',
    topics: ['Pythagoras', 'Trigonometry', 'Circle theorems', 'Vectors', 'Area & volume'],
    color:  '#7F77DD',
    dim:    'rgba(127,119,221,0.12)',
    border: 'rgba(127,119,221,0.3)',
    route:  '/gcse/maths/geometry',
    marks:  '~25% of paper',
  },
  {
    id:     'statistics',
    emoji:  '📊',
    label:  'Statistics & Probability',
    desc:   'Data handling, averages, probability, cumulative frequency, box plots.',
    topics: ['Mean/median/mode', 'Probability', 'Cumulative frequency', 'Histograms', 'Correlation'],
    color:  '#00e87a',
    dim:    'rgba(0,232,122,0.1)',
    border: 'rgba(0,232,122,0.25)',
    route:  '/gcse/maths/statistics',
    marks:  '~15% of paper',
  },
  {
    id:     'number',
    emoji:  '🔢',
    label:  'Number',
    desc:   'Fractions, percentages, ratio, standard form, surds, indices.',
    topics: ['Fractions & decimals', 'Percentages', 'Ratio & proportion', 'Standard form', 'Surds'],
    color:  '#EF9F27',
    dim:    'rgba(239,159,39,0.1)',
    border: 'rgba(239,159,39,0.25)',
    route:  '/gcse/maths/number',
    marks:  '~25% of paper',
  },
  {
    id:     'practice',
    emoji:  '📝',
    label:  'Practice Papers',
    desc:   'Full timed mock papers. AI generates questions and marks step-by-step working.',
    topics: ['Paper 1 (non-calc)', 'Paper 2 (calc)', 'Paper 3 (calc)', 'Topic mixes'],
    color:  '#D4537E',
    dim:    'rgba(212,83,126,0.12)',
    border: 'rgba(212,83,126,0.3)',
    route:  '/gcse/maths/practice',
    marks:  '3 papers · 240 marks',
  },
];

function GCSEMathsHub() {
  const router = useRouter();

  return (
    <Screen>
      {/* Back */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/gcse')} style={GHOST_BTN}>← Subjects</button>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <span style={{ fontSize: '28px' }}>📐</span>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)' }}>
              AQA · YEAR 11
            </p>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
              Mathematics
            </h1>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
          AI-powered maths practice. Step-by-step worked solutions.
          Higher and Foundation tier. All three papers covered.
        </p>
      </div>

      {/* Paper breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '1.5rem' }}>
        {[
          { label: 'Paper 1', sub: 'Non-calculator', color: '#378ADD' },
          { label: 'Paper 2', sub: 'Calculator', color: '#7F77DD' },
          { label: 'Paper 3', sub: 'Calculator', color: '#00e87a' },
        ].map(p => (
          <div key={p.label} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
            padding: '10px', border: `1px solid ${p.color}25`, textAlign: 'center',
          }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{p.label}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{p.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', marginBottom: '1.25rem' }} />

      {/* Section cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/gcse/maths/learn')} style={{
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
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
              background: `${s.color}20`, border: `1px solid ${s.color}35`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
            }}>
              {s.emoji}
            </div>
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
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4, marginBottom: '6px' }}>
                {s.desc}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {s.topics.map(t => (
                  <span key={t} style={{
                    fontSize: '10px', padding: '2px 7px', borderRadius: '99px',
                    background: `${s.color}10`, color: `${s.color}80`,
                    border: `1px solid ${s.color}18`,
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <span style={{ fontSize: '18px', color: `${s.color}90`, flexShrink: 0 }}>›</span>
          </button>
        ))}
      </div>

      {/* Tier selector info */}
      <div style={{
        padding: '14px', background: 'rgba(255,255,255,0.03)',
        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
          TIER INFORMATION
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { tier: 'Higher', grades: 'Grades 4–9', desc: 'Full content including surds, vectors, circle theorems' },
            { tier: 'Foundation', grades: 'Grades 1–5', desc: 'Core content up to grade 5 topics' },
          ].map(t => (
            <div key={t.tier} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{
                fontSize: '11px', fontWeight: 700, color: '#378ADD',
                minWidth: '70px', fontFamily: 'var(--font-mono)', marginTop: '1px',
              }}>
                {t.tier}
              </span>
              <div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{t.grades}</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginLeft: '6px' }}>— {t.desc}</span>
              </div>
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
      background: '#050a18',
      backgroundImage: `
        radial-gradient(ellipse at top left, #0a1535 0%, #050a18 60%, #020810 100%),
        linear-gradient(rgba(55,138,221,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(55,138,221,0.025) 1px, transparent 1px)
      `,
      backgroundSize: 'auto, 40px 40px, 40px 40px',
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
