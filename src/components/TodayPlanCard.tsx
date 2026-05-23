'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPublishedLessons, getLessonProgress } from '@/lib/gcse-lessons';
import { getUserWords, getProgress } from '@/lib/firestore';
import { isDue } from '@/lib/srs';

interface Props {
  uid:             string;
  selectedSubjects: string[];
  weakTopics:      string[];
  targetLang:      string;
  nativeLang:      string;
}

interface TodayPlan {
  lesson:      { id: string; topic: string; subject: string; route: string } | null;
  dueWords:    number;
  practise:    { label: string; route: string; subject: string } | null;
  streakDays:  number;
}

const SUBJECT_COLOR: Record<string, string> = {
  maths:   '#378ADD',
  english: '#7F77DD',
  science: '#00e87a',
};

const PRACTISE_ROUTES: Record<string, { label: string; route: string }> = {
  maths:   { label: 'Maths practice questions', route: '/gcse/maths/algebra'    },
  english: { label: 'English reading practice',  route: '/gcse/english/reading'  },
  science: { label: 'Science questions',          route: '/gcse/science/biology'  },
};

export function TodayPlanCard({ uid, selectedSubjects, weakTopics, targetLang, nativeLang }: Props) {
  const router = useRouter();
  const [plan, setPlan]       = useState<TodayPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    buildPlan();
  }, [uid]);

  async function buildPlan() {
    try {
      // Find next unfinished lesson across selected subjects
      let nextLesson: TodayPlan['lesson'] = null;
      for (const subject of selectedSubjects) {
        const lessons  = await getPublishedLessons(subject);
        const progress = await getLessonProgress(uid);
        const unfinished = lessons.find(l => !progress[l.id]?.completed);
        if (unfinished) {
          nextLesson = {
            id:      unfinished.id,
            topic:   unfinished.topic,
            subject,
            route:   `/gcse/${subject}/learn`,
          };
          break;
        }
      }

      // Count due vocabulary words
      let dueWords = 0;
      try {
        const words = await getUserWords(uid, targetLang as any, nativeLang as any);
        const prog  = await getProgress(uid, targetLang as any, nativeLang as any);
        dueWords = words.filter(w => prog[w.id] && isDue(prog[w.id])).length;
      } catch { /* no vocab yet */ }

      // Pick a practise subject (rotate or pick weakest)
      const practiseSubject = selectedSubjects[0] ?? 'maths';
      const practise = PRACTISE_ROUTES[practiseSubject]
        ? { ...PRACTISE_ROUTES[practiseSubject], subject: practiseSubject }
        : null;

      // Streak from localStorage (simple version)
      const streak = getStreak(uid);

      setPlan({ lesson: nextLesson, dueWords, practise, streakDays: streak });
    } finally {
      setLoading(false);
    }
  }

  function getStreak(uid: string): number {
    try {
      const key  = `streak_${uid}`;
      const data = JSON.parse(localStorage.getItem(key) ?? '{}');
      const today = new Date().toDateString();
      if (data.lastDate === today) return data.count ?? 1;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      if (data.lastDate === yesterday) return data.count ?? 1;
      return 1;
    } catch { return 1; }
  }

  function updateStreak(uid: string) {
    try {
      const key   = `streak_${uid}`;
      const data  = JSON.parse(localStorage.getItem(key) ?? '{}');
      const today = new Date().toDateString();
      if (data.lastDate === today) return;
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const count = data.lastDate === yesterday ? (data.count ?? 0) + 1 : 1;
      localStorage.setItem(key, JSON.stringify({ lastDate: today, count }));
    } catch {}
  }

  if (loading) return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.5rem', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  );

  if (!plan) return null;

  const hasAnything = plan.lesson || plan.dueWords > 0 || plan.practise;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Streak banner */}
      {plan.streakDays > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', padding: '8px 14px', background: 'rgba(239,159,39,0.1)', borderRadius: '10px', border: '1px solid rgba(239,159,39,0.2)' }}>
          <span style={{ fontSize: '18px' }}>&#128293;</span>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#EF9F27' }}>
            {plan.streakDays} day streak — keep it going!
          </p>
        </div>
      )}

      {/* Today card */}
      <div style={{ background: 'rgba(0,232,122,0.06)', borderRadius: '18px', border: '1px solid rgba(0,232,122,0.18)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(0,232,122,0.7)' }}>
            TODAY
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>

          {/* Next lesson */}
          {plan.lesson ? (
            <button onClick={() => { updateStreak(uid); router.push(plan.lesson!.route); }} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px', background: 'rgba(0,0,0,0.2)',
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              transition: 'background 0.15s',
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, background: SUBJECT_COLOR[plan.lesson.subject] + '20', border: `1px solid ${SUBJECT_COLOR[plan.lesson.subject]}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                📚
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
                  {plan.lesson.topic}
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                  Learn · {plan.lesson.subject}
                </p>
              </div>
              <span style={{ fontSize: '16px', color: SUBJECT_COLOR[plan.lesson.subject] + '80', flexShrink: 0 }}>&#8250;</span>
            </button>
          ) : (
            <div style={{ padding: '14px 16px', background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>&#127881;</span>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>All lessons complete for now!</p>
            </div>
          )}

          {/* Due vocabulary */}
          {plan.dueWords > 0 && (
            <button onClick={() => { updateStreak(uid); router.push('/flashcards'); }} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px', background: 'rgba(0,0,0,0.15)',
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              transition: 'background 0.15s',
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, background: 'rgba(239,159,39,0.15)', border: '1px solid rgba(239,159,39,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                &#128272;
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
                  {plan.dueWords} word{plan.dueWords !== 1 ? 's' : ''} to review
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Flashcards · vocabulary</p>
              </div>
              <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '99px', background: 'rgba(239,159,39,0.2)', color: '#EF9F27', border: '1px solid rgba(239,159,39,0.3)', fontWeight: 600, flexShrink: 0 }}>
                Due
              </span>
            </button>
          )}

          {/* Practice */}
          {plan.practise && (
            <button onClick={() => { updateStreak(uid); router.push(plan.practise!.route); }} style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '14px 16px', background: 'rgba(0,0,0,0.1)',
              border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
              transition: 'background 0.15s',
            }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0, background: SUBJECT_COLOR[plan.practise.subject] + '15', border: `1px solid ${SUBJECT_COLOR[plan.practise.subject]}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                &#9998;
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
                  {plan.practise.label}
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Exam practice · {plan.practise.subject}</p>
              </div>
              <span style={{ fontSize: '16px', color: SUBJECT_COLOR[plan.practise.subject] + '80', flexShrink: 0 }}>&#8250;</span>
            </button>
          )}

          {!hasAnything && (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>Nothing due today — great work! Come back tomorrow.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: '24px', height: '24px', border: '2px solid rgba(0,232,122,0.15)', borderTopColor: '#00e87a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}
