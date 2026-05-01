'use client';

import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSEPage() {
  return <AuthGuard><GCSESubjectPicker /></AuthGuard>;
}

const SUBJECTS = [
  {
    id:       'english',
    emoji:    '??',
    label:    'English Language',
    board:    'AQA Year 11',
    desc:     'Reading comprehension, language analysis, creative and transactional writing. AI marks every response.',
    sections: ['Reading', 'Language Analysis', 'Writing', 'Vocabulary', 'Mock Papers'],
    color:    '#7F77DD',
    dim:      'rgba(127,119,221,0.12)',
    border:   'rgba(127,119,221,0.3)',
    route:    '/gcse/english',
    ready:    true,
  },
  {
    id:       'maths',
    emoji:    '??',
    label:    'Mathematics',
    board:    'AQA Year 11',
    desc:     'Algebra, geometry, statistics, and number. Step-by-step worked solutions with AI marking.',
    sections: ['Algebra', 'Geometry', 'Statistics', 'Number', 'Practice Papers'],
    color:    '#378ADD',
    dim:      'rgba(55,138,221,0.12)',
    border:   'rgba(55,138,221,0.3)',
    route:    '/gcse/maths',
    ready:    true,
  },
  {
    id:       'science',
    emoji:    '??',
    label:    'Combined Science',
    board:    'AQA Year 11',
    desc:     'Biology, chemistry, and physics. Key equations, required practicals, and exam questions.',
    sections: ['Biology', 'Chemistry', 'Physics', 'Equations', 'Practice Papers'],
    color:    '#00e87a',
    dim:      'rgba(0,232,122,0.1)',
    border:   'rgba(0,232,122,0.25)',
    route:    '/gcse/science',
    ready:    false,
  },
];

function GCSESubjectPicker() {
  const router = useRouter();

  return (
    <Screen>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <button onClick={() => router.push('/dashboard')} style={GHOST_BTN}>Dashboard</button>
      </div>

      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>
          AQA YEAR 11
        </p>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', marginBottom: '6px' }}>
          GCSE Prep
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
          AI-powered exam preparation. Choose a subject to begin.
        </p>
      </div>

      {/* Subject cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2rem' }}>
        {SUBJECTS.map(s => (
          <button
            key={s.id}
            onClick={() => s.ready && router.push(s.route)}
            disabled={!s.ready}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '16px',
              padding: '18px', borderRadius: '16px', cursor: s.ready ? 'pointer' : 'not-allowed',
              border: `1px solid ${s.ready ? s.border : 'rgba(255,255,255,0.07)'}`,
              background: s.ready ? s.dim : 'rgba(255,255,255,0.02)',
              opacity: s.ready ? 1 : 0.5,
              fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
              transition: 'all 0.15s',
            }}
          >
            {/* Icon */}
            <div style={{
              width: '54px', height: '54px', borderRadius: '14px', flexShrink: 0,
              background: s.ready ? `${s.color}20` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${s.ready ? `${s.color}35` : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '26px',
            }}>
              {s.emoji}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{s.label}</span>
                <span style={{
                  fontSize: '10px', padding: '2px 7px', borderRadius: '99px',
                  background: `${s.color}18`, color: `${s.color}cc`,
                  border: `1px solid ${s.color}30`,
                }}>
                  {s.board}
                </span>
                {!s.ready && (
                  <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.3)' }}>
                    Coming soon
                  </span>
                )}
              </div>

              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: '10px' }}>
                {s.desc}
              </p>

              {/* Section pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {s.sections.map(sec => (
                  <span key={sec} style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                    background: s.ready ? `${s.color}12` : 'rgba(255,255,255,0.04)',
                    color: s.ready ? `${s.color}90` : 'rgba(255,255,255,0.25)',
                    border: `1px solid ${s.ready ? `${s.color}20` : 'rgba(255,255,255,0.06)'}`,
                  }}>
                    {sec}
                  </span>
                ))}
              </div>
            </div>

            {/* Arrow */}
            {s.ready && (
              <span style={{ fontSize: '20px', color: `${s.color}80`, flexShrink: 0, alignSelf: 'center' }}>?</span>
            )}
          </button>
        ))}
      </div>

      {/* Coming soon note */}
      <div style={{
        padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
        borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)',
        fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center',
      }}>
        Maths and Science coming soon English is fully available now
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
        radial-gradient(ellipse at 20% 20%, rgba(127,119,221,0.06) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 80%, rgba(0,232,122,0.04) 0%, transparent 50%),
        linear-gradient(rgba(127,119,221,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(127,119,221,0.02) 1px, transparent 1px)
      `,
      backgroundSize: 'auto, auto, 40px 40px, 40px 40px',
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
