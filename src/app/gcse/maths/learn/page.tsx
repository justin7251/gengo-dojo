'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getPublishedLessons, getLessonProgress, saveLessonProgress, GCSELesson, LessonProgress } from '@/lib/gcse-lessons';
import { LessonCardSwiper } from '@/components/GCSELessonCard';
import AuthGuard from '@/components/AuthGuard';
import { Spinner } from '@/components/Spinner';

export default function GCSEMathsLearnPage() { return <AuthGuard><MathsLearn /></AuthGuard>; }

const ACCENT = 'var(--blue)';

function getSectionForTopic(topic: string): string {
  const t = topic.toLowerCase();
  if (['linear','simultaneous','quadratic','sequence','inequalit','function','factoris','rearrang'].some(k => t.includes(k))) return 'Algebra';
  if (['pythagoras','trigonometry','circle','vector','area','volume','angle','transform','congruence'].some(k => t.includes(k))) return 'Geometry';
  if (['probability','average','mean','median','cumulative','box plot','histogram','scatter','venn'].some(k => t.includes(k))) return 'Statistics';
  return 'Number';
}

function MathsLearn() {
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
        getPublishedLessons('maths'),
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
    setProgress(prev => ({
      ...prev,
      [active.id]: { lessonId: active.id, completed: true, completedAt: null, score, totalCards: total },
    }));
  }

  if (loading) return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={36} color="var(--blue)" />
      </div>
    </Shell>
  );

  // Active lesson
  if (active) return (
    <Shell>
      <LessonCardSwiper
        lesson={active}
        accentColor={ACCENT}
        practiseRoute="/gcse/maths/algebra"
        onBack={() => setActive(null)}
        onComplete={handleComplete}
        quickCheck={active.quickCheck}
      />
    </Shell>
  );

  // Group by section
  const sections: Record<string, GCSELesson[]> = {};
  lessons.forEach(l => {
    const s = getSectionForTopic(l.topic);
    if (!sections[s]) sections[s] = [];
    sections[s].push(l);
  });

  const completed = Object.values(progress).filter(p => p.completed).length;
  const pct       = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;

  return (
    <Shell>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button className="btn" style={{ fontSize: '13px', padding: '8px 14px' }} onClick={() => router.push('/gcse/maths')}>← Back</button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 800, color: 'var(--fg)' }}>📐 Maths Lessons</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--green-light)', border: '2px solid var(--green)', borderRadius: '99px', padding: '5px 11px', boxShadow: '0 2px 0 var(--green-dark)' }}>
          <span style={{ fontSize: '12px' }}>⭐</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 800, color: 'var(--green-dark)' }}>{completed}/{lessons.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      {lessons.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '5px' }}>
            <span>{completed} completed</span>
            <span>{pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Lesson list */}
      {lessons.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ fontSize: '40px', marginBottom: '1rem' }}>📐</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 800, color: 'var(--fg)', marginBottom: '6px' }}>No lessons yet</p>
          <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600 }}>Maths lessons are being created. Check back soon.</p>
        </div>
      ) : (
        Object.entries(sections).map(([section, sectionLessons]) => (
          <div key={section} style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
              {section}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sectionLessons.map(lesson => {
                const prog  = progress[lesson.id];
                const done  = prog?.completed ?? false;
                const score = prog ? `${prog.score}/${prog.totalCards}` : null;
                return (
                  <button key={lesson.id} onClick={() => setActive(lesson)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 16px', borderRadius: '14px', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-ui)', border: `2.5px solid ${done ? 'var(--green)55' : 'var(--border-dark)'}`, background: '#fff', boxShadow: done ? '0 4px 0 var(--green-dark)55' : '0 4px 0 var(--border-dark)', transition: 'all 0.1s', width: '100%' }}
                    className="lesson-row-btn">
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0, background: done ? 'var(--green-light)' : 'var(--blue-light)', border: `2px solid ${done ? 'var(--green)55' : 'var(--blue)55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                      {done ? '✅' : '📖'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--fg)', marginBottom: '2px' }}>{lesson.topic}</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{lesson.cards.length} cards{score ? ` · ${score} last time` : ''}</p>
                    </div>
                    {done
                      ? <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '99px', background: 'var(--green-light)', color: 'var(--green-dark)', border: '2px solid var(--green)55', fontWeight: 800 }}>Done</span>
                      : <span style={{ fontSize: '18px', color: 'var(--blue)', fontWeight: 900 }}>›</span>
                    }
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}

      <style>{`
        .lesson-row-btn:hover  { transform: translateY(-2px); }
        .lesson-row-btn:active { transform: translateY(3px); box-shadow: none !important; }
      `}</style>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 3rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(28,176,246,0.07)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </main>
  );
}
