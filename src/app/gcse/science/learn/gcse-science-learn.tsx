'use client';
import { Spinner } from '@/components/Spinner';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { saveLessonProgress, getLessonProgress } from '@/lib/gcse-lessons';
import { onAuth } from '@/lib/auth';
import { LessonCardSwiper, Lesson } from '@/components/GCSELessonCard';

export default function GCSEScienceLearnPage() {
  return <AuthGuard><ScienceLearn /></AuthGuard>;
}

const TOPICS = [
  {
    section: '🧬 Biology',
    color: '#00e87a',
    practiseRoute: '/gcse/science/biology',
    items: [
      'Cell structure & function',
      'Cell division — mitosis',
      'Diffusion, osmosis & active transport',
      'Organisation — digestive system',
      'Blood & the heart',
      'Photosynthesis',
      'Aerobic & anaerobic respiration',
      'Pathogens & the immune system',
      'Vaccines & antibiotics',
      'Homeostasis — blood glucose',
      'Homeostasis — thermoregulation',
      'DNA, genes & chromosomes',
      'Monohybrid inheritance',
      'Natural selection & evolution',
      'Ecosystems & food chains',
    ],
  },
  {
    section: '⚗️ Chemistry',
    color: '#EF9F27',
    practiseRoute: '/gcse/science/chemistry',
    items: [
      'Atomic structure & isotopes',
      'The periodic table — trends',
      'Ionic bonding',
      'Covalent bonding',
      'Metallic bonding',
      'Moles & relative formula mass',
      'Percentage yield & atom economy',
      'Reactivity series & displacement',
      'Electrolysis',
      'Acids, alkalis & neutralisation',
      'Exothermic & endothermic reactions',
      'Rate of reaction — collision theory',
      'Reversible reactions & equilibrium',
      'Alkanes & alkenes',
      'Addition polymers',
    ],
  },
  {
    section: '⚛️ Physics',
    color: '#7F77DD',
    practiseRoute: '/gcse/science/physics',
    items: [
      'Energy stores & transfers',
      'Specific heat capacity',
      'Efficiency & power',
      'Circuit symbols & series circuits',
      'Parallel circuits & resistance',
      'I-V graphs & Ohm\'s law',
      'Mains electricity & safety',
      'Density & particle model',
      'Specific latent heat',
      'Radioactive decay & half-life',
      'Nuclear fission & fusion',
      'Speed, velocity & acceleration',
      'Newton\'s laws of motion',
      'Momentum & stopping distances',
      'Wave properties & the EM spectrum',
    ],
  },
];

const ACCENT = 'var(--green)';

type Phase = 'pick' | 'loading' | 'lesson';

function ScienceLearn() {
  const router = useRouter();
  const [uid, setUid]                   = useState('');
  const [lessonProgress, setLessonProgress] = useState<Record<string, {score:number;total:number}>>({});
  const [phase, setPhase]             = useState<Phase>('pick');
  const [lesson, setLesson]           = useState<Lesson | null>(null);
  const [activeTopic, setActiveTopic] = useState('');
  const [practiseRoute, setPractiseRoute] = useState('/gcse/science/biology');
  const [error, setError]             = useState('');

  useEffect(() => {
    return onAuth(async user => {
      if (!user) return;
      setUid(user.uid);
      const prog = await getLessonProgress(user.uid);
      const simplified: Record<string, {score:number;total:number}> = {};
      Object.entries(prog).forEach(([k,v]) => { simplified[k] = { score: v.score, total: v.totalCards }; });
      setLessonProgress(simplified);
    });
  }, []);

  async function loadLesson(topic: string, route: string) {
    setActiveTopic(topic);
    setPractiseRoute(route);
    setPhase('loading');
    setError('');
    try {
      const res  = await fetch('/api/gcse/learn', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subject: 'science', topic }),
      });
      const data = await res.json();
      if (!data.cards?.length) throw new Error();
      setLesson(data);
      setPhase('lesson');
    } catch {
      setError('Failed to load lesson. Try again.');
      setPhase('pick');
    }
  }

  if (phase === 'loading') return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Spinner />
        <p style={{ fontSize: '16px', color: 'var(--fg)', marginTop: '1.5rem', marginBottom: '6px' }}>Building your lesson…</p>
        <p style={{ fontSize: '13px', color: 'var(--fg-secondary)' }}>{activeTopic}</p>
      </div>
    </Shell>
  );

  if (phase === 'lesson' && lesson) return (
    <Shell>
      <LessonCardSwiper
        lesson={lesson}
        accentColor={ACCENT}
        practiseRoute={practiseRoute}
        onComplete={async (score, total) => {
          if (!uid || !lesson) return;
          const id = `${lesson.subject ?? 'science'}-${lesson.topic}`;
          await saveLessonProgress(uid, id, score, total);
          setLessonProgress(prev => ({ ...prev, [id]: { score, total } }));
        }}
        onBack={() => { setPhase('pick'); setLesson(null); }}
      />
    </Shell>
  );

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/gcse/science')} className="btn">← Back</button>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'var(--fg-secondary)' }}>SCIENCE · LEARN</p>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg)', lineHeight: 1 }}>Choose a topic</h1>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Each lesson explains the concept from scratch — definition, real example, diagram, common misconception, memory trick, practice question, and key facts to memorise.
      </p>

      {error && (
        <p style={{ fontSize: '13px', color: '#ff8080', marginBottom: '1rem', padding: '8px 12px', background: 'rgba(226,75,74,0.1)', borderRadius: '8px' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {TOPICS.map(group => (
          <div key={group.section}>
            <p style={{ fontSize: '11px', letterSpacing: '0.1em', fontWeight: 800, marginBottom: '8px', color: 'var(--muted)', textTransform: 'uppercase' }}>
              {group.section}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {group.items.map(topic => {
                const progKey = `science-${topic}`;
                const done    = !!lessonProgress[progKey];
                return (
                  <button key={topic} onClick={() => loadLesson(topic, group.practiseRoute)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                    border: `2.5px solid ${done ? 'var(--green)55' : group.color + '55'}`,
                    background: done ? 'var(--green-light)' : '#fff',
                    fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
                    transition: 'all 0.12s',
                    boxShadow: done ? '0 3px 0 var(--green-dark)55' : `0 3px 0 ${group.color}44`,
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: done ? '#2a7a00' : 'var(--fg-secondary)' }}>{topic}</span>
                    <span style={{ fontSize: done ? '16px' : '18px', color: done ? 'var(--green)' : group.color }}>
                      {done ? '✅' : '›'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}



function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 3rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(88,204,2,0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </main>
  );
}
