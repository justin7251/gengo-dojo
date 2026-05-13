'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getPublishedLessons, getLessonProgress, saveLessonProgress, GCSELesson, LessonProgress } from '@/lib/gcse-lessons';
import { LessonCardSwiper } from '@/components/GCSELessonCard';
import AuthGuard from '@/components/AuthGuard';

export default function GCSEMathsLearnPage() {
  return <AuthGuard><MathsLearn /></AuthGuard>;
}

const ACCENT = '#378ADD';

function getSectionForTopic(topic: string): string {
  const t = topic.toLowerCase();
  if (['linear', 'simultaneous', 'quadratic', 'sequence', 'inequalit', 'function', 'factoris', 'rearrang'].some(k => t.includes(k))) return 'Algebra';
  if (['pythagoras', 'trigonometry', 'circle', 'vector', 'area', 'volume', 'angle', 'transform', 'congruence'].some(k => t.includes(k))) return 'Geometry';
  if (['probability', 'average', 'mean', 'median', 'cumulative', 'box plot', 'histogram', 'scatter', 'venn'].some(k => t.includes(k))) return 'Statistics';
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
    setProgress(prev => ({ ...prev, [active.id]: { lessonId: active.id, completed: true, completedAt: null, score, totalCards: total } }));
  }

  if (loading) return <Screen accent={ACCENT}><div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner color={ACCENT} /></div></Screen>;

  if (active) return (
    <Screen accent={ACCENT}>
      <LessonCardSwiper lesson={active} accentColor={ACCENT} practiseRoute="/gcse/maths/algebra" onBack={() => setActive(null)} onComplete={handleComplete} quickCheck={active.quickCheck} />
    </Screen>
  );

  const sections: Record<string, GCSELesson[]> = {};
  lessons.forEach(l => {
    const s = getSectionForTopic(l.topic);
    if (!sections[s]) sections[s] = [];
    sections[s].push(l);
  });

  const completed = Object.values(progress).filter(p => p.completed).length;

  return (
    <Screen accent={ACCENT}>
      <LessonListHeader title="Maths" accent={ACCENT} onBack={() => router.push('/gcse/maths')} completed={completed} total={lessons.length} />
      <LessonList sections={sections} progress={progress} accent={ACCENT} onSelect={setActive} empty="Maths lessons are being created. Check back soon." />
    </Screen>
  );
}
