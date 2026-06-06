'use client';
import { Spinner } from '@/components/Spinner';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { saveLessonProgress, getLessonProgress } from '@/lib/gcse-lessons';
import { onAuth } from '@/lib/auth';
import { LessonCardSwiper, Lesson } from '@/components/GCSELessonCard';

export default function GCSEEnglishLearnPage() {
  return <AuthGuard><EnglishLearn /></AuthGuard>;
}

const TOPICS = [
  {
    section: 'Language Techniques',
    items: ['Metaphor & simile', 'Personification', 'Alliteration & sibilance', 'Pathetic fallacy', 'Semantic field', 'Hyperbole & understatement', 'Juxtaposition & contrast', 'Repetition & rule of three'],
  },
  {
    section: 'Reading Skills',
    items: ['Retrieval (AO1)', 'Inferring meaning', 'Language analysis (AO2)', 'Structure analysis (AO3)', 'Evaluation (AO4)', 'Comparing perspectives', 'Summarising two texts'],
  },
  {
    section: 'Writing Skills',
    items: ['Writing to persuade', 'Writing to describe', 'Creative story openings', 'Structuring an argument', 'Formal letter writing', 'Newspaper article writing', 'Speech writing', 'Varying sentence structure'],
  },
  {
    section: 'Grammar & Punctuation',
    items: ['Semicolons & colons', 'Dashes & parenthesis', 'Sentence types (simple, compound, complex)', 'Paragraphing', 'Dialogue punctuation'],
  },
];

const ACCENT = 'var(--purple)';

type Phase = 'pick' | 'loading' | 'lesson';

function EnglishLearn() {
  const router = useRouter();
  const [uid, setUid]               = useState('');
  const [lessonProgress, setLessonProgress] = useState<Record<string, {score:number;total:number}>>({});
  const [phase, setPhase]       = useState<Phase>('pick');
  const [lesson, setLesson]     = useState<Lesson | null>(null);
  const [activeTopic, setActiveTopic] = useState('');
  const [error, setError]       = useState('');

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

  async function loadLesson(topic: string) {
    setActiveTopic(topic);
    setPhase('loading');
    setError('');
    try {
      const res  = await fetch('/api/gcse/learn', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subject: 'english', topic }),
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
        practiseRoute="/gcse/english/reading"
        onComplete={async (score, total) => {
          if (!uid || !lesson) return;
          const id = `${lesson.subject ?? 'english'}-${lesson.topic}`;
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
        <button onClick={() => router.push('/gcse/english')} className="btn">← Back</button>
        <div>
          <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'var(--fg-secondary)' }}>ENGLISH · LEARN</p>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg)', lineHeight: 1 }}>Choose a topic</h1>
        </div>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Each lesson teaches one skill through 7 swipeable cards — definition, annotated example, framework, weak vs strong responses, memory trick, practice, and summary.
      </p>

      {error && (
        <p style={{ fontSize: '13px', color: '#ff8080', marginBottom: '1rem', padding: '8px 12px', background: 'rgba(226,75,74,0.1)', borderRadius: '8px' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {TOPICS.map(group => (
          <div key={group.section}>
            <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'var(--muted)', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
              {group.section.toUpperCase()}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {group.items.map(topic => {
                const progKey = `english-${topic}`;
                const done    = !!lessonProgress[progKey];
                return (
                  <button key={topic} onClick={() => loadLesson(topic)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: '12px', cursor: 'pointer',
                    border: `2.5px solid ${done ? 'var(--green)55' : 'var(--border-dark)'}`,
                    background: done ? 'var(--green-light)' : '#fff',
                    fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
                    transition: 'all 0.12s', boxShadow: done ? '0 3px 0 var(--green-dark)55' : '0 3px 0 var(--border-dark)',
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: done ? '#2a7a00' : 'var(--fg-secondary)' }}>{topic}</span>
                    <span style={{ fontSize: done ? '16px' : '18px', color: done ? 'var(--green)' : 'var(--purple)' }}>
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
