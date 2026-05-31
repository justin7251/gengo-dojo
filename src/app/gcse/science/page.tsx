'use client';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSESciencePage() { return <AuthGuard><GCSEScienceHub /></AuthGuard>; }

const SUBJECTS = [
  { id: 'biology',    emoji: '🧬', label: 'Biology',             color: 'var(--green)',  bg: 'var(--green-light)',  route: '/gcse/science/biology',    topics: ['Cell biology','Organisation','Infection','Bioenergetics','Homeostasis','Inheritance','Ecology'], papers: 'Paper 1 · Paper 2' },
  { id: 'chemistry',  emoji: '⚗️',  label: 'Chemistry',           color: 'var(--orange)', bg: 'var(--orange-light)', route: '/gcse/science/chemistry',  topics: ['Atomic structure','Bonding','Quantitative','Chemical changes','Energy','Rates','Organic'],   papers: 'Paper 1 · Paper 2' },
  { id: 'physics',    emoji: '⚛️',  label: 'Physics',             color: 'var(--purple)', bg: 'var(--purple-light)', route: '/gcse/science/physics',    topics: ['Energy','Electricity','Particle model','Atomic structure','Forces','Waves','Magnetism','Space'], papers: 'Paper 1 · Paper 2' },
  { id: 'equations',  emoji: '🔢', label: 'Required Equations',  color: 'var(--blue)',   bg: 'var(--blue-light)',   route: '/gcse/science/equations',  topics: ['Physics equations','Chemistry calcs','Biology calcs','Unit conversions'],                      papers: 'All papers' },
  { id: 'practicals', emoji: '🔬', label: 'Required Practicals', color: 'var(--pink)',   bg: 'var(--purple-light)', route: '/gcse/science/practicals', topics: ['Method recall','Results analysis','Evaluation','Graph skills'],                               papers: 'Tested in all papers' },
];

const COMMAND_WORDS = [
  { w: 'Describe',  d: 'State the features — no explanation needed' },
  { w: 'Explain',   d: 'Give reasons — use "because" and "so"' },
  { w: 'Evaluate',  d: 'Use evidence to make a judgement' },
  { w: 'Calculate', d: 'Use numbers — show working, include units' },
  { w: 'Suggest',   d: 'Apply knowledge to an unfamiliar situation' },
];

function GCSEScienceHub() {
  const router = useRouter();
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button className="btn" style={{ fontSize: '13px', padding: '8px 14px' }} onClick={() => router.push('/gcse')}>← Subjects</button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, color: 'var(--fg)' }}>🔬 Combined Science</span>
        <div style={{ width: '80px' }} />
      </div>
      <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600, marginBottom: '1rem' }}>
        AQA Trilogy · Biology, Chemistry, Physics · 6 papers
      </p>

      {/* Paper grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '1.25rem' }}>
        {[{ l: 'Biology', sub: 'P1 + P2', c: 'var(--green)' }, { l: 'Chemistry', sub: 'P1 + P2', c: 'var(--orange)' }, { l: 'Physics', sub: 'P1 + P2', c: 'var(--purple)' }].map(p => (
          <div key={p.l} style={{ background: '#fff', borderRadius: '12px', padding: '10px', border: `2.5px solid ${p.c}55`, textAlign: 'center', boxShadow: `0 3px 0 ${p.c}55` }}>
            <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--fg)', marginBottom: '2px' }}>{p.l}</p>
            <p style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>{p.sub}</p>
          </div>
        ))}
      </div>

      {/* Learn first */}
      <button onClick={() => router.push('/gcse/science/learn')} className="gcse-card-btn"
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '16px', cursor: 'pointer', border: '2.5px solid var(--green)55', background: 'var(--green-light)', fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%', marginBottom: '1rem', boxShadow: '0 5px 0 var(--green-dark)55' }}>
        <span style={{ fontSize: '28px' }}>📚</span>
        <div>
          <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>Learn a topic first</p>
          <p style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>7 interactive lesson cards before you practise</p>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: '20px', color: 'var(--green)', fontWeight: 900 }}>›</span>
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
        {SUBJECTS.map((s, i) => (
          <button key={s.id} onClick={() => router.push(s.route)} className="gcse-card-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '16px', cursor: 'pointer', border: `2.5px solid ${s.color}55`, background: '#fff', fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%', boxShadow: `0 5px 0 ${s.color}55`, animation: `bounceIn 0.4s ease ${i * 0.06}s both` }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0, background: s.bg, border: `2.5px solid ${s.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{s.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 800, color: 'var(--fg)' }}>{s.label}</span>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: s.bg, color: s.color, border: `2px solid ${s.color}55`, fontWeight: 700 }}>{s.papers}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {s.topics.slice(0, 5).map(t => <span key={t} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: s.bg, color: s.color, border: `1.5px solid ${s.color}40`, fontWeight: 700 }}>{t}</span>)}
                {s.topics.length > 5 && <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600, alignSelf: 'center' }}>+{s.topics.length - 5} more</span>}
              </div>
            </div>
            <span style={{ fontSize: '18px', color: s.color, flexShrink: 0, fontWeight: 900 }}>›</span>
          </button>
        ))}
      </div>

      {/* Command words */}
      <div style={{ background: '#fff', borderRadius: '14px', border: '2.5px solid var(--border-dark)', padding: '14px 16px', boxShadow: '0 4px 0 var(--border-dark)' }}>
        <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>AQA Command Words</p>
        {COMMAND_WORDS.map(c => (
          <div key={c.w} style={{ display: 'flex', gap: '10px', marginBottom: '6px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--green-dark)', minWidth: '72px' }}>{c.w}</span>
            <span style={{ fontSize: '12px', color: 'var(--fg-secondary)', fontWeight: 600, lineHeight: 1.4 }}>{c.d}</span>
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
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(88,204,2,0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '560px', margin: '0 auto', width: '100%' }}>{children}</div>
    </main>
  );
}
