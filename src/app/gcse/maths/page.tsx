'use client';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSEMathsPage() { return <AuthGuard><GCSEMathsHub /></AuthGuard>; }

const SECTIONS = [
  { id: 'algebra',    emoji: '🔣', label: 'Algebra',                desc: 'Equations, inequalities, sequences, quadratics, simultaneous equations.', topics: ['Linear equations','Quadratics','Sequences','Inequalities','Functions'],        color: 'var(--blue)',   bg: 'var(--blue-light)',   route: '/gcse/maths/algebra',    marks: '~30% of paper' },
  { id: 'geometry',   emoji: '📐', label: 'Geometry & Measures',    desc: 'Angles, circles, trig, Pythagoras, vectors, transformations.',               topics: ['Pythagoras','Trigonometry','Circle theorems','Vectors','Area & volume'],     color: 'var(--purple)', bg: 'var(--purple-light)', route: '/gcse/maths/geometry',   marks: '~25% of paper' },
  { id: 'statistics', emoji: '📊', label: 'Statistics & Probability',desc: 'Data handling, averages, probability, cumulative frequency, box plots.',     topics: ['Mean/median/mode','Probability','Cumulative freq','Histograms','Correlation'], color: 'var(--green)', bg: 'var(--green-light)', route: '/gcse/maths/statistics', marks: '~15% of paper' },
  { id: 'number',     emoji: '🔢', label: 'Number',                 desc: 'Fractions, percentages, ratio, standard form, surds, indices.',              topics: ['Fractions','Percentages','Ratio','Standard form','Surds'],                 color: 'var(--orange)', bg: 'var(--orange-light)', route: '/gcse/maths/number',     marks: '~25% of paper' },
  { id: 'practice',   emoji: '📝', label: 'Practice Papers',        desc: 'Full timed mock papers. AI generates and marks step-by-step working.',       topics: ['Paper 1 (non-calc)','Paper 2 (calc)','Paper 3 (calc)','Topic mixes'],      color: 'var(--pink)',   bg: 'var(--purple-light)', route: '/gcse/maths/practice',   marks: '3 papers · 240 marks' },
];

function GCSEMathsHub() {
  const router = useRouter();
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button className="btn" style={{ fontSize: '13px', padding: '8px 14px' }} onClick={() => router.push('/gcse')}>← Subjects</button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, color: 'var(--fg)' }}>📐 Mathematics</span>
        <div style={{ width: '80px' }} />
      </div>
      <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600, marginBottom: '1rem' }}>
        AQA · Higher &amp; Foundation · All three papers covered.
      </p>

      {/* Paper pills */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '1.25rem' }}>
        {[{ l: 'Paper 1', sub: 'Non-calculator', c: 'var(--blue)' }, { l: 'Paper 2', sub: 'Calculator', c: 'var(--purple)' }, { l: 'Paper 3', sub: 'Calculator', c: 'var(--green)' }].map(p => (
          <div key={p.l} style={{ background: '#fff', borderRadius: '12px', padding: '10px', border: `2.5px solid ${p.c}55`, textAlign: 'center', boxShadow: `0 3px 0 ${p.c}55` }}>
            <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--fg)', marginBottom: '2px' }}>{p.l}</p>
            <p style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>{p.sub}</p>
          </div>
        ))}
      </div>

      {/* Learn first banner */}
      <button onClick={() => router.push('/gcse/maths/learn')} className="gcse-card-btn"
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '16px', cursor: 'pointer', border: '2.5px solid var(--purple)55', background: 'var(--purple-light)', fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%', marginBottom: '1rem', boxShadow: '0 5px 0 var(--purple-dark)55' }}>
        <span style={{ fontSize: '28px' }}>📚</span>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>Learn a topic first</p>
          <p style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>7 interactive lesson cards before you practise</p>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '20px', color: 'var(--purple)', fontWeight: 900 }}>›</span>
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
        {SECTIONS.map((s, i) => (
          <button key={s.id} onClick={() => router.push(s.route)} className="gcse-card-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '16px', cursor: 'pointer', border: `2.5px solid ${s.color}55`, background: '#fff', fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%', boxShadow: `0 5px 0 ${s.color}55`, animation: `bounceIn 0.4s ease ${i * 0.06}s both` }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0, background: s.bg, border: `2.5px solid ${s.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{s.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 800, color: 'var(--fg)' }}>{s.label}</span>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: s.bg, color: s.color, border: `2px solid ${s.color}55`, fontWeight: 700 }}>{s.marks}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4, marginBottom: '6px', fontWeight: 600 }}>{s.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {s.topics.map(t => <span key={t} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: s.bg, color: s.color, border: `1.5px solid ${s.color}40`, fontWeight: 700 }}>{t}</span>)}
              </div>
            </div>
            <span style={{ fontSize: '18px', color: s.color, flexShrink: 0, fontWeight: 900 }}>›</span>
          </button>
        ))}
      </div>

      {/* Tier info */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '2.5px solid var(--border-dark)', padding: '14px', boxShadow: '0 4px 0 var(--border-dark)' }}>
        <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Tier Information</p>
        {[{ t: 'Higher', g: 'Grades 4–9', d: 'Full content inc. surds, vectors, circle theorems' }, { t: 'Foundation', g: 'Grades 1–5', d: 'Core content up to grade 5 topics' }].map(t => (
          <div key={t.t} style={{ display: 'flex', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--blue)', minWidth: '80px' }}>{t.t}</span>
            <span style={{ fontSize: '12px', color: 'var(--fg-secondary)', fontWeight: 600 }}>{t.g} — {t.d}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes bounceIn { 0%{opacity:0;transform:scale(0.9)} 60%{transform:scale(1.03)} 100%{opacity:1;transform:scale(1)} }
        .gcse-card-btn:hover  { transform: translateY(-2px); }
        .gcse-card-btn:active { transform: translateY(3px); box-shadow: none !important; }
      `}</style>
    </Shell>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '1.5rem 1.25rem 4rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(28,176,246,0.07)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '560px', margin: '0 auto', width: '100%' }}>{children}</div>
    </main>
  );
}
