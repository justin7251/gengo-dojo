'use client';

// ── English Learn ─────────────────────────────────────
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getPublishedLessons, getLessonProgress, saveLessonProgress, GCSELesson, LessonProgress } from '@/lib/gcse-lessons';
import { LessonCardSwiper } from '@/components/GCSELessonCard';
import AuthGuard from '@/components/AuthGuard';

// ── Shared learn page components ──────────────────────

export function LessonListHeader({
  title, accent, onBack, completed, total,
}: {
  title: string; accent: string; onBack: () => void; completed: number; total: number;
}) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={GHOST_BTN}>Back</button>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: accent + '99' }}>
            {title.toUpperCase()}
          </p>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>Learn</h1>
        </div>
        {total > 0 && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: accent, fontFamily: 'var(--font-mono)' }}>
              {completed}/{total}
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>DONE</p>
          </div>
        )}
      </div>
      {total > 0 && (
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div style={{ height: '3px', background: accent, borderRadius: '2px', width: `${Math.round((completed / total) * 100)}%`, transition: 'width 0.4s', boxShadow: `0 0 6px ${accent}80` }} />
        </div>
      )}
    </>
  );
}

export function LessonList({
  sections, progress, accent, onSelect, empty,
}: {
  sections: Record<string, GCSELesson[]>;
  progress: Record<string, LessonProgress>;
  accent:   string;
  onSelect: (l: GCSELesson) => void;
  empty:    string;
}) {
  if (Object.keys(sections).length === 0) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem 0' }}>
      <p style={{ fontSize: '36px', marginBottom: '1rem' }}>📚</p>
      <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>No lessons yet</p>
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{empty}</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {Object.entries(sections).map(([section, sLessons]) => (
        <div key={section}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: accent + 'aa', fontWeight: 600, marginBottom: '8px' }}>
            {section.toUpperCase()}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sLessons.map(l => {
              const done  = progress[l.id]?.completed;
              const score = progress[l.id]?.score;
              const tot   = progress[l.id]?.totalCards;
              return (
                <button key={l.id} onClick={() => onSelect(l)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: '10px', cursor: 'pointer',
                  border: `1px solid ${done ? accent + '40' : accent + '18'}`,
                  background: done ? accent + '08' : accent + '04',
                  fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0, background: done ? accent + '22' : 'rgba(255,255,255,0.05)', border: `1px solid ${done ? accent + '50' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '13px', color: done ? accent : 'rgba(255,255,255,0.25)' }}>
                        {done ? '\u2713' : '\u25CB'}
                      </span>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', color: '#fff', fontWeight: done ? 600 : 400 }}>{l.topic}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>
                        {l.cards.length} cards
                        {done && score !== undefined && tot !== undefined && (
                          <span style={{ color: accent, marginLeft: '6px' }}>· {score}/{tot} correct</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: '16px', color: done ? accent : accent + '40' }}>›</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Screen({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <main style={{ minHeight: '100vh', background: '#060810', backgroundImage: `radial-gradient(ellipse at top, ${accent}12 0%, #060810 55%)`, display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 2.5rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${accent}18 1px,transparent 1px),linear-gradient(90deg,${accent}18 1px,transparent 1px)`, backgroundSize: '40px 40px', opacity: 0.4 }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
        <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
      </div>
    </main>
  );
}

export const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
export function Spinner({ color }: { color: string }) { return <div style={{ width: '28px', height: '28px', border: `2px solid ${color}20`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />; }

// ─────────────────────────────────────────────────────
// English learn page
// src/app/gcse/english/learn/page.tsx
// ─────────────────────────────────────────────────────
export function EnglishLearnPage() {
  return <AuthGuard><EnglishLearn /></AuthGuard>;
}

const ENGLISH_ACCENT = '#7F77DD';

function getSectionEnglish(topic: string): string {
  const t = topic.toLowerCase();
  if (['metaphor', 'simile', 'personif', 'alliter', 'sibilance', 'pathetic', 'semantic', 'hyperbole', 'juxtapos', 'repetition'].some(k => t.includes(k))) return 'Language Techniques';
  if (['retrieval', 'inferr', 'language analysis', 'structure analysis', 'evaluat', 'compar', 'summar'].some(k => t.includes(k))) return 'Reading Skills';
  if (['persuade', 'describ', 'creative', 'argument', 'letter', 'newspaper', 'speech', 'sentence'].some(k => t.includes(k))) return 'Writing Skills';
  return 'Grammar & Punctuation';
}

function EnglishLearn() {
  const router = useRouter();
  const [uid, setUid]           = useState('');
  const [lessons, setLessons]   = useState<GCSELesson[]>([]);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [active, setActive]     = useState<GCSELesson | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    return onAuth(async user => {
      if (!user) return;
      setUid(user.uid);
      const [ls, prog] = await Promise.all([
        getPublishedLessons('english'),
        getLessonProgress(user.uid),
      ]);
      setLessons(ls);
      setProgress(prog);
      setLoading(false);
    });
  }, []);

  async function handleComplete(score: number, total: number) {
    if (!active || !uid) return;
    await saveLessonProgress(uid, active.id, score, total);
    setProgress(prev => ({ ...prev, [active.id]: { lessonId: active.id, completed: true, completedAt: null, score, totalCards: total } }));
  }

  if (loading) return <Screen accent={ENGLISH_ACCENT}><div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner color={ENGLISH_ACCENT} /></div></Screen>;

  if (active) return (
    <Screen accent={ENGLISH_ACCENT}>
      <LessonCardSwiper lesson={active} accentColor={ENGLISH_ACCENT} practiseRoute="/gcse/english/reading" onBack={() => setActive(null)} onComplete={handleComplete} quickCheck={active.quickCheck} />
    </Screen>
  );

  const sections: Record<string, GCSELesson[]> = {};
  lessons.forEach(l => {
    const s = getSectionEnglish(l.topic);
    if (!sections[s]) sections[s] = [];
    sections[s].push(l);
  });

  const completed = Object.values(progress).filter(p => p.completed).length;

  return (
    <Screen accent={ENGLISH_ACCENT}>
      <LessonListHeader title="English" accent={ENGLISH_ACCENT} onBack={() => router.push('/gcse/english')} completed={completed} total={lessons.length} />
      <LessonList sections={sections} progress={progress} accent={ENGLISH_ACCENT} onSelect={setActive} empty="English lessons are being created. Check back soon." />
    </Screen>
  );
}

// ─────────────────────────────────────────────────────
// Science learn page
// src/app/gcse/science/learn/page.tsx
// ─────────────────────────────────────────────────────
export function ScienceLearnPage() {
  return <AuthGuard><ScienceLearn /></AuthGuard>;
}

const SCIENCE_ACCENT = '#00e87a';

function getSectionScience(topic: string): string {
  const t = topic.toLowerCase();
  if (['cell', 'osmosis', 'diffusion', 'mitosis', 'photosyn', 'respirat', 'pathogen', 'vaccine', 'homeosta', 'insulin', 'dna', 'gene', 'inherit', 'evolut', 'ecosys', 'food chain'].some(k => t.includes(k))) return 'Biology';
  if (['atom', 'ionic', 'covalent', 'metallic', 'mole', 'concentrat', 'yield', 'reactiv', 'electrol', 'acid', 'alkali', 'exotherm', 'endotherm', 'rate', 'equilib', 'alkane', 'alkene', 'polymer'].some(k => t.includes(k))) return 'Chemistry';
  return 'Physics';
}

function ScienceLearn() {
  const router = useRouter();
  const [uid, setUid]           = useState('');
  const [lessons, setLessons]   = useState<GCSELesson[]>([]);
  const [progress, setProgress] = useState<Record<string, LessonProgress>>({});
  const [active, setActive]     = useState<GCSELesson | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    return onAuth(async user => {
      if (!user) return;
      setUid(user.uid);
      const [ls, prog] = await Promise.all([
        getPublishedLessons('science'),
        getLessonProgress(user.uid),
      ]);
      setLessons(ls);
      setProgress(prog);
      setLoading(false);
    });
  }, []);

  async function handleComplete(score: number, total: number) {
    if (!active || !uid) return;
    await saveLessonProgress(uid, active.id, score, total);
    setProgress(prev => ({ ...prev, [active.id]: { lessonId: active.id, completed: true, completedAt: null, score, totalCards: total } }));
  }

  if (loading) return <Screen accent={SCIENCE_ACCENT}><div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner color={SCIENCE_ACCENT} /></div></Screen>;

  if (active) return (
    <Screen accent={SCIENCE_ACCENT}>
      <LessonCardSwiper lesson={active} accentColor={SCIENCE_ACCENT} practiseRoute="/gcse/science/biology" onBack={() => setActive(null)} onComplete={handleComplete} quickCheck={active.quickCheck} />
    </Screen>
  );

  const sections: Record<string, GCSELesson[]> = {};
  lessons.forEach(l => {
    const s = getSectionScience(l.topic);
    if (!sections[s]) sections[s] = [];
    sections[s].push(l);
  });

  const completed = Object.values(progress).filter(p => p.completed).length;

  return (
    <Screen accent={SCIENCE_ACCENT}>
      <LessonListHeader title="Science" accent={SCIENCE_ACCENT} onBack={() => router.push('/gcse/science')} completed={completed} total={lessons.length} />
      <LessonList sections={sections} progress={progress} accent={SCIENCE_ACCENT} onSelect={setActive} empty="Science lessons are being created. Check back soon." />
    </Screen>
  );
}
