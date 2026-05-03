'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
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

const ACCENT = '#00e87a';

type Phase = 'pick' | 'loading' | 'lesson';

function ScienceLearn() {
  const router = useRouter();
  const [phase, setPhase]             = useState<Phase>('pick');
  const [lesson, setLesson]           = useState<Lesson | null>(null);
  const [activeTopic, setActiveTopic] = useState('');
  const [practiseRoute, setPractiseRoute] = useState('/gcse/science/biology');
  const [error, setError]             = useState('');

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
    <Screen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <Spinner />
        <p style={{ fontSize: '16px', color: '#fff', marginTop: '1.5rem', marginBottom: '6px' }}>Building your lesson…</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{activeTopic}</p>
      </div>
    </Screen>
  );

  if (phase === 'lesson' && lesson) return (
    <Screen>
      <LessonCardSwiper
        lesson={lesson}
        accentColor={ACCENT}
        practiseRoute={practiseRoute}
        onBack={() => { setPhase('pick'); setLesson(null); }}
      />
    </Screen>
  );

  return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/gcse/science')} style={GHOST_BTN}>← Back</button>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)' }}>SCIENCE · LEARN</p>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>Choose a topic</h1>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
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
            <p style={{ fontSize: '11px', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '8px', color: group.color + 'aa' }}>
              {group.section.toUpperCase()}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {group.items.map(topic => (
                <button key={topic} onClick={() => loadLesson(topic, group.practiseRoute)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                  border: `1px solid ${group.color}20`,
                  background: group.color + '08',
                  fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>{topic}</span>
                  <span style={{ fontSize: '18px', color: group.color + '70' }}>›</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#040e08', backgroundImage: 'radial-gradient(ellipse at top, #081c10 0%, #040e08 60%)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 2.5rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,232,122,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,232,122,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </main>
  );
}

const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
function Spinner() { return <div style={{ width: '32px', height: '32px', border: '2px solid rgba(0,232,122,0.15)', borderTopColor: '#00e87a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />; }
