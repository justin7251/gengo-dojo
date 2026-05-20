'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getPublishedLessons, getLessonProgress, saveLessonProgress, GCSELesson, LessonProgress } from '@/lib/gcse-lessons';
import { LessonCardSwiper } from '@/components/GCSELessonCard';
import { DueReviewsList } from '@/components/DueReviews';
import { LessonCompleteCelebration } from '@/components/LessonComplete';
import { scheduleLessonReview, recordLessonReview, LessonReview } from '@/lib/lesson-srs';
import { recordStudySession } from '@/lib/streak';
import AuthGuard from '@/components/AuthGuard';

// ── Shared types ──────────────────────────────────────
interface LearnPageProps {
  subject:       string;
  accent:        string;
  practiseRoute: string;
  hubRoute:      string;
  bgColor:       string;
  gridColor:     string;
  getSectionFn:  (topic: string) => string;
}

// ── Shared learn page component ───────────────────────
function LearnPage({
  subject, accent, practiseRoute, hubRoute, bgColor, gridColor, getSectionFn,
}: LearnPageProps) {
  const router = useRouter();

  const [uid, setUid]                 = useState('');
  const [lessons, setLessons]         = useState<GCSELesson[]>([]);
  const [progress, setProgress]       = useState<Record<string, LessonProgress>>({});
  const [active, setActive]           = useState<GCSELesson | null>(null);
  const [activeReview, setActiveReview] = useState<LessonReview | null>(null);
  const [loading, setLoading]         = useState(true);
  const [celebration, setCelebration] = useState<{ section: string; done: number; total: number } | null>(null);

  useEffect(() => {
    return onAuth(async user => {
      if (!user) return;
      setUid(user.uid);
      const [ls, prog] = await Promise.all([
        getPublishedLessons(subject),
        getLessonProgress(user.uid),
      ]);
      setLessons(ls);
      setProgress(prog);
      setLoading(false);
    });
  }, [subject]);

  async function handleComplete(score: number, total: number) {
    if (!active || !uid) return;

    await Promise.all([
      saveLessonProgress(uid, active.id, score, total),
      recordStudySession(uid),
      activeReview
        ? recordLessonReview(uid, active.id, score)
        : scheduleLessonReview(uid, active.id, active.topic, subject, score),
    ]);

    const newProgress = {
      ...progress,
      [active.id]: { lessonId: active.id, completed: true, completedAt: null, score, totalCards: total },
    };
    setProgress(newProgress);

    // Check section completion
    const section        = getSectionFn(active.topic);
    const sectionLessons = lessons.filter(l => getSectionFn(l.topic) === section);
    const allDone        = sectionLessons.every(l => newProgress[l.id]?.completed);
    if (allDone) {
      setCelebration({ section, done: sectionLessons.length, total: sectionLessons.length });
    }
  }

  // Group by section
  const sections: Record<string, GCSELesson[]> = {};
  lessons.forEach(l => {
    const s = getSectionFn(l.topic);
    if (!sections[s]) sections[s] = [];
    sections[s].push(l);
  });

  const completed = Object.values(progress).filter(p => p.completed).length;
  const subjectLabel = subject.charAt(0).toUpperCase() + subject.slice(1);

  if (loading) return (
    <Screen bg={bgColor} grid={gridColor}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner color={accent} />
      </div>
    </Screen>
  );

  if (active) return (
    <Screen bg={bgColor} grid={gridColor}>
      {celebration && (
        <LessonCompleteCelebration
          subject={subject}
          section={celebration.section}
          lessonsCompleted={celebration.done}
          totalLessons={celebration.total}
          onClose={() => { setCelebration(null); setActive(null); setActiveReview(null); }}
          nextRoute={practiseRoute}
        />
      )}
      <LessonCardSwiper
        lesson={active}
        accentColor={accent}
        practiseRoute={practiseRoute}
        onBack={() => { setActive(null); setActiveReview(null); }}
        onComplete={handleComplete}
        quickCheck={active.quickCheck}
      />
    </Screen>
  );

  return (
    <Screen bg={bgColor} grid={gridColor}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push(hubRoute)} style={GHOST_BTN}>Back</button>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: accent + '99' }}>
            {subjectLabel.toUpperCase()}
          </p>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>Learn</h1>
        </div>
        {lessons.length > 0 && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p style={{ fontSize: '18px', fontWeight: 700, color: accent, fontFamily: 'var(--font-mono)' }}>
              {completed}/{lessons.length}
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>DONE</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {lessons.length > 0 && (
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', marginBottom: '1.5rem', overflow: 'hidden' }}>
          <div style={{ height: '3px', background: accent, borderRadius: '2px', width: `${Math.round((completed / lessons.length) * 100)}%`, transition: 'width 0.4s', boxShadow: `0 0 6px ${accent}80` }} />
        </div>
      )}

      {/* Due reviews */}
      {uid && (
        <DueReviewsList
          uid={uid}
          onStartReview={(lesson, review) => { setActive(lesson); setActiveReview(review); }}
        />
      )}

      {/* No lessons state */}
      {lessons.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem 0' }}>
          <p style={{ fontSize: '36px', marginBottom: '1rem' }}>📚</p>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>No lessons yet</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
            Lessons are being created. Check back soon.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {Object.entries(sections).map(([section, sLessons]) => {
            const sectionDone  = sLessons.filter(l => progress[l.id]?.completed).length;
            const sectionTotal = sLessons.length;
            const sectionPct   = Math.round((sectionDone / sectionTotal) * 100);
            const allDone      = sectionDone === sectionTotal && sectionTotal > 0;

            return (
              <div key={section}>
                {/* Section header with mini progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: accent + 'aa', fontWeight: 600, flexShrink: 0 }}>
                    {section.toUpperCase()}
                  </p>
                  <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.06)', borderRadius: '1px', overflow: 'hidden' }}>
                    <div style={{ height: '2px', background: allDone ? '#00e87a' : accent, borderRadius: '1px', width: `${sectionPct}%`, transition: 'width 0.5s' }} />
                  </div>
                  <p style={{ fontSize: '11px', color: allDone ? '#00e87a' : 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                    {allDone ? '\u2713 done' : `${sectionDone}/${sectionTotal}`}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {sLessons.map(l => {
                    const done  = progress[l.id]?.completed;
                    const score = progress[l.id]?.score;
                    const tot   = progress[l.id]?.totalCards;
                    return (
                      <button key={l.id} onClick={() => { setActive(l); setActiveReview(null); }} style={{
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
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </Screen>
  );
}

// ── Screen wrapper ─────────────────────────────────────
function Screen({ children, bg, grid }: { children: React.ReactNode; bg: string; grid: string }) {
  return (
    <main style={{ minHeight: '100vh', background: bg, display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 2.5rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${grid} 1px,transparent 1px),linear-gradient(90deg,${grid} 1px,transparent 1px)`, backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </main>
  );
}

const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
function Spinner({ color }: { color: string }) { return <div style={{ width: '28px', height: '28px', border: `2px solid ${color}20`, borderTopColor: color, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />; }

// ── Section helpers ────────────────────────────────────
function getSectionEnglish(topic: string): string {
  const t = topic.toLowerCase();
  if (['metaphor', 'simile', 'personif', 'alliter', 'sibilance', 'pathetic', 'semantic', 'hyperbole', 'juxtapos', 'repetition'].some(k => t.includes(k))) return 'Language Techniques';
  if (['retrieval', 'inferr', 'language analysis', 'structure', 'evaluat', 'compar', 'summar'].some(k => t.includes(k))) return 'Reading Skills';
  if (['persuade', 'describ', 'creative', 'argument', 'letter', 'newspaper', 'speech', 'sentence'].some(k => t.includes(k))) return 'Writing Skills';
  return 'Grammar & Punctuation';
}

function getSectionScience(topic: string): string {
  const t = topic.toLowerCase();
  if (['cell', 'osmosis', 'diffusion', 'mitosis', 'photosyn', 'respirat', 'pathogen', 'vaccine', 'homeosta', 'insulin', 'dna', 'gene', 'inherit', 'evolut', 'ecosys'].some(k => t.includes(k))) return 'Biology';
  if (['atom', 'ionic', 'covalent', 'metallic', 'mole', 'concentrat', 'yield', 'reactiv', 'electrol', 'acid', 'alkali', 'exotherm', 'endotherm', 'rate', 'equilib', 'alkane', 'alkene', 'polymer'].some(k => t.includes(k))) return 'Chemistry';
  return 'Physics';
}

// ── English learn page ─────────────────────────────────
// src/app/gcse/english/learn/page.tsx
export function EnglishLearnPage() {
  return (
    <AuthGuard>
      <LearnPage
        subject="english"
        accent="#7F77DD"
        practiseRoute="/gcse/english/reading"
        hubRoute="/gcse/english"
        bgColor="#080614"
        gridColor="rgba(127,119,221,0.025)"
        getSectionFn={getSectionEnglish}
      />
    </AuthGuard>
  );
}

// ── Science learn page ─────────────────────────────────
// src/app/gcse/science/learn/page.tsx
export function ScienceLearnPage() {
  return (
    <AuthGuard>
      <LearnPage
        subject="science"
        accent="#00e87a"
        practiseRoute="/gcse/science/biology"
        hubRoute="/gcse/science"
        bgColor="#040e08"
        gridColor="rgba(0,232,122,0.02)"
        getSectionFn={getSectionScience}
      />
    </AuthGuard>
  );
}
