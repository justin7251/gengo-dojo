'use client';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSEPage() { return <AuthGuard><GCSESubjectPicker /></AuthGuard>; }

const SUBJECTS = [
  { id: 'english', emoji: '📖', label: 'English Language', board: 'AQA Year 11', desc: 'Reading comprehension, language analysis, creative and transactional writing. AI marks every response.', sections: ['Reading', 'Language Analysis', 'Writing', 'Vocab', 'Mock Papers'], color: 'var(--purple)', bg: 'var(--purple-light)', route: '/gcse/english' },
  { id: 'maths',   emoji: '📐', label: 'Mathematics',      board: 'AQA Year 11', desc: 'Algebra, geometry, statistics, and number. Step-by-step worked solutions with AI marking.',             sections: ['Algebra', 'Geometry', 'Statistics', 'Number', 'Papers'],     color: 'var(--blue)',   bg: 'var(--blue-light)',   route: '/gcse/maths'   },
  { id: 'science', emoji: '🔬', label: 'Combined Science', board: 'AQA Year 11', desc: 'Biology, chemistry, and physics. Key equations, required practicals, and exam questions.',               sections: ['Biology', 'Chemistry', 'Physics', 'Equations', 'Practicals'], color: 'var(--green)',  bg: 'var(--green-light)',  route: '/gcse/science' },
];

function GCSESubjectPicker() {
  const router = useRouter();
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button className="btn" style={{ fontSize: '13px', padding: '8px 14px' }} onClick={() => router.push('/dashboard')}>← Dashboard</button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 800, color: 'var(--fg)' }}>📚 GCSE Prep</span>
        <div style={{ width: '80px' }} />
      </div>
      <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600, marginBottom: '1.5rem' }}>
        AI-powered exam prep. Choose a subject to begin.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {SUBJECTS.map((s, i) => (
          <button key={s.id} onClick={() => router.push(s.route)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '18px', borderRadius: '18px', cursor: 'pointer', border: `2.5px solid ${s.color}55`, background: '#fff', fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%', transition: 'all 0.1s', boxShadow: `0 6px 0 ${s.color}55`, animation: `bounceIn 0.45s cubic-bezier(0.34,1.56,0.64,1) ${i * 0.07}s both` }}
            className="gcse-subj-btn">
            <div style={{ width: '54px', height: '54px', borderRadius: '14px', flexShrink: 0, background: s.bg, border: `2.5px solid ${s.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>{s.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, color: 'var(--fg)' }}>{s.label}</span>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: s.bg, color: s.color, border: `2px solid ${s.color}55`, fontWeight: 700 }}>{s.board}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '10px', fontWeight: 600 }}>{s.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {s.sections.map(sec => (
                  <span key={sec} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '99px', background: s.bg, color: s.color, border: `2px solid ${s.color}40`, fontWeight: 700 }}>{sec}</span>
                ))}
              </div>
            </div>
            <span style={{ fontSize: '20px', color: s.color, flexShrink: 0, alignSelf: 'center', fontWeight: 900 }}>›</span>
          </button>
        ))}
      </div>
      <style>{`
        @keyframes bounceIn { 0%{opacity:0;transform:scale(0.88)} 60%{transform:scale(1.03)} 100%{opacity:1;transform:scale(1)} }
        .gcse-subj-btn:hover  { transform: translateY(-2px); }
        .gcse-subj-btn:active { transform: translateY(4px); box-shadow: none !important; }
      `}</style>
    </Shell>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '1.5rem 1.25rem 4rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(206,130,255,0.07)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '560px', margin: '0 auto', width: '100%' }}>{children}</div>
    </main>
  );
}
