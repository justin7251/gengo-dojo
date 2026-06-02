'use client';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSEEnglishPage() { return <AuthGuard><GCSEEnglishHub /></AuthGuard>; }

const SECTIONS = [
  { id: 'reading',  emoji: '📄', label: 'Reading',          desc: 'Extract-based comprehension. Q1–Q4 style questions with AI marking.',     marks: 'P1 Q1–Q4 · P2 Q1–Q4',          color: 'var(--blue)',   bg: 'var(--blue-light)',   route: '/gcse/english/reading'  },
  { id: 'language', emoji: '🔍', label: 'Language Analysis',desc: 'Identify techniques. Write PETER responses. AI grades your analysis.',     marks: 'P1 Q2–Q3 · P2 Q3',              color: 'var(--purple)', bg: 'var(--purple-light)', route: '/gcse/english/language' },
  { id: 'writing',  emoji: '✍️', label: 'Writing Practice', desc: 'Timed creative and transactional writing. AI marks AO5 + AO6.',           marks: 'P1 Q5 · P2 Q5 · up to 40 marks', color: 'var(--pink)',   bg: 'var(--purple-light)', route: '/gcse/english/writing'  },
  { id: 'vocab',    emoji: '📚', label: 'Vocabulary',       desc: 'Master Tier 2 and Tier 3 academic vocabulary with spaced repetition.',     marks: 'AO6 · vocab, spelling',          color: 'var(--green)',  bg: 'var(--green-light)',  route: '/gcse/english/vocab'    },
  { id: 'papers',   emoji: '📝', label: 'Mock Papers',      desc: 'Full timed mock. AI generates a complete paper and marks every response.', marks: 'Full P1 or P2 · 80 marks',       color: 'var(--orange)', bg: 'var(--orange-light)', route: '/gcse/english/papers'   },
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
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button className="btn" style={{ fontSize: '13px', padding: '8px 14px' }} onClick={() => router.push('/gcse')}>← Subjects</button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, color: 'var(--fg)' }}>📖 English</span>
        <div style={{ width: '80px' }} />
      </div>

      <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600, marginBottom: '1rem' }}>AQA Year 11 · Paper 1 &amp; Paper 2 · AO1–AO6</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '1.25rem' }}>
        {[{ label: 'Paper 1', sub: 'Fiction · Creative writing', c: 'var(--blue)' }, { label: 'Paper 2', sub: 'Non-fiction · Transactional', c: 'var(--purple)' }].map(p => (
          <div key={p.label} style={{ background: '#fff', borderRadius: '12px', padding: '12px', border: `2.5px solid ${p.c}55`, textAlign: 'center', boxShadow: `0 3px 0 ${p.c}55` }}>
            <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--fg)', marginBottom: '2px' }}>{p.label}</p>
            <p style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{p.sub}</p>
          </div>
        ))}
      </div>

      {/* Learn first */}
      <button onClick={() => router.push('/gcse/english/learn')} className="gcse-card-btn"
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '16px', cursor: 'pointer', border: '2.5px solid var(--purple)55', background: 'var(--purple-light)', fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%', marginBottom: '1rem', boxShadow: '0 5px 0 var(--purple-dark)55' }}>
        <span style={{ fontSize: '28px' }}>📚</span>
        <div><p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>Learn a topic first</p><p style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>7 interactive lesson cards before you practise</p></div>
        <span style={{ marginLeft: 'auto', fontSize: '20px', color: 'var(--purple)', fontWeight: 900 }}>›</span>
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
        {SECTIONS.map((s, i) => (
          <button key={s.id} onClick={() => router.push(s.route)} className="gcse-card-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '16px', cursor: 'pointer', border: `2.5px solid ${s.color}55`, background: '#fff', fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%', boxShadow: `0 5px 0 ${s.color}55`, animation: `bounceIn 0.4s ease ${i * 0.06}s both` }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0, background: s.bg, border: `2.5px solid ${s.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>{s.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 800, color: 'var(--fg)' }}>{s.label}</span>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: s.bg, color: s.color, border: `2px solid ${s.color}55`, fontWeight: 700 }}>{s.marks}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.4, fontWeight: 600 }}>{s.desc}</p>
            </div>
            <span style={{ fontSize: '18px', color: s.color, flexShrink: 0, fontWeight: 900 }}>›</span>
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: '14px', border: '2.5px solid var(--border-dark)', padding: '14px 16px', boxShadow: '0 4px 0 var(--border-dark)' }}>
        <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Assessment Objectives</p>
        {AOS.map(a => (
          <div key={a.ao} style={{ display: 'flex', gap: '10px', marginBottom: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--purple)', minWidth: '32px', fontFamily: 'monospace' }}>{a.ao}</span>
            <span style={{ fontSize: '12px', color: 'var(--fg-secondary)', fontWeight: 600 }}>{a.desc}</span>
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
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(127,119,221,0.07)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '560px', margin: '0 auto', width: '100%' }}>{children}</div>
    </main>
  );
}
