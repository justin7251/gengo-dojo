'use client';
import { Spinner } from '@/components/Spinner';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, saveUserProfile } from '@/lib/firestore';

type Step = 'subjects' | 'year' | 'topics' | 'done';

const SUBJECTS = [
  { id: 'maths',   label: 'Maths',            emoji: '📐', color: 'var(--blue)',   bg: 'var(--blue-light)'   },
  { id: 'english', label: 'English Language',  emoji: '📖', color: 'var(--purple)', bg: 'var(--purple-light)' },
  { id: 'science', label: 'Combined Science',  emoji: '🔬', color: 'var(--green)',  bg: 'var(--green-light)'  },
  { id: 'japanese',label: 'Japanese',          emoji: '🇯🇵', color: 'var(--orange)', bg: 'var(--orange-light)' },
];

const YEAR_GROUPS = [
  { id: 'year7',  label: 'Year 7',  sub: 'Age 11–12 · KS3 start'   },
  { id: 'year8',  label: 'Year 8',  sub: 'Age 12–13 · KS3'          },
  { id: 'year9',  label: 'Year 9',  sub: 'Age 13–14 · KS3 end'     },
  { id: 'year10', label: 'Year 10', sub: 'Age 14–15 · GCSE start'   },
  { id: 'year11', label: 'Year 11', sub: 'Age 15–16 · Exam year 🎯' },
];

const WEAK_TOPICS: Record<string, { id: string; label: string }[]> = {
  maths:   [
    { id: 'algebra',       label: 'Algebra'             },
    { id: 'fractions',     label: 'Fractions'           },
    { id: 'percentages',   label: 'Percentages'         },
    { id: 'geometry',      label: 'Geometry'            },
    { id: 'probability',   label: 'Probability'         },
    { id: 'quadratics',    label: 'Quadratics'          },
    { id: 'pythagoras',    label: 'Pythagoras'          },
    { id: 'statistics',    label: 'Statistics'          },
  ],
  english: [
    { id: 'language',      label: 'Language techniques' },
    { id: 'structure',     label: 'Structure analysis'  },
    { id: 'creative',      label: 'Creative writing'    },
    { id: 'transactional', label: 'Transactional writing' },
    { id: 'reading',       label: 'Reading comprehension' },
    { id: 'vocabulary',    label: 'Vocabulary'          },
  ],
  science: [
    { id: 'biology',       label: 'Biology'             },
    { id: 'chemistry',     label: 'Chemistry'           },
    { id: 'physics',       label: 'Physics'             },
    { id: 'equations',     label: 'Equations'           },
    { id: 'practicals',    label: 'Practicals'          },
  ],
  japanese: [
    { id: 'hiragana',      label: 'Hiragana'            },
    { id: 'katakana',      label: 'Katakana'            },
    { id: 'vocabulary',    label: 'Vocabulary'          },
    { id: 'grammar',       label: 'Grammar'             },
    { id: 'kanji',         label: 'Kanji'               },
  ],
};

export default function OnboardingPage() {
  const router = useRouter();

  const [uid, setUid]                               = useState('');
  const [step, setStep]                             = useState<Step>('subjects');
  const [selectedSubjects, setSelectedSubjects]     = useState<string[]>([]);
  const [yearGroup, setYearGroup]                   = useState('');
  const [weakTopics, setWeakTopics]                 = useState<string[]>([]);
  const [saving, setSaving]                         = useState(false);
  const [loading, setLoading]                       = useState(true);

  useEffect(() => {
    return onAuth(async user => {
      if (!user) { router.push('/'); return; }
      const profile = await getUserProfile(user.uid);
      if (profile?.onboarded) { router.push('/dashboard'); return; }
      setUid(user.uid);
      setLoading(false);
    });
  }, [router]);

  function toggleSubject(id: string) {
    setSelectedSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }
  function toggleTopic(id: string) {
    setWeakTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  const allWeakTopics = selectedSubjects.flatMap(s => WEAK_TOPICS[s] ?? []);

  async function handleFinish() {
    if (!uid) return;
    setSaving(true);
    try {
      const existing = await getUserProfile(uid);
      await saveUserProfile({
        ...(existing ?? {
          uid,
          email:      '',
          targetLang: 'ja',
          nativeLang: 'en',
          level:      'beginner',
          interests:  [],
          createdAt:  Date.now(),
        }),
        uid,
        onboarded:        true,
        onboardedAt:      new Date().toISOString(),
        selectedSubjects,
        yearGroup,
        weakTopics,
      });
      setStep('done');
      setTimeout(() => router.push('/dashboard'), 1600);
    } catch {
      setSaving(false);
    }
  }

  const stepIndex  = ['subjects', 'year', 'topics'].indexOf(step);
  const totalSteps = 3;
  const pct        = Math.round(((stepIndex + 1) / totalSteps) * 100);

  if (loading) return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={36} color="var(--green)" />
      </div>
    </Shell>
  );

  return (
    <Shell>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
        <span style={{ fontSize: '28px' }}>🥋</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--fg)' }}>Gengo Dojo</span>
      </div>

      {/* Progress bar */}
      {step !== 'done' && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '6px' }}>
            <span>Step {stepIndex + 1} of {totalSteps}</span>
            <span>{pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%`, transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1)' }} />
          </div>
        </div>
      )}

      {/* ── Step 1: Subjects ── */}
      {step === 'subjects' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 900, color: 'var(--fg)', lineHeight: 1.2, marginBottom: '6px' }}>
              What do you want to study? 📚
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600, lineHeight: 1.5 }}>
              Pick everything you're working on. You can change this later.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem', flex: 1 }}>
            {SUBJECTS.map(s => {
              const sel = selectedSubjects.includes(s.id);
              return (
                <button key={s.id} onClick={() => toggleSubject(s.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 18px', borderRadius: '16px', cursor: 'pointer', border: `2.5px solid ${sel ? s.color : 'var(--border-dark)'}`, background: sel ? s.bg : '#fff', fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%', transition: 'all 0.12s', boxShadow: sel ? `0 5px 0 ${s.color}55` : '0 5px 0 var(--border-dark)' }}>
                  <span style={{ fontSize: '28px', lineHeight: 1 }}>{s.emoji}</span>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: sel ? 'var(--fg)' : 'var(--fg-secondary)', flex: 1 }}>{s.label}</span>
                  {sel && <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#fff', fontWeight: 800, flexShrink: 0 }}>✓</span>}
                </button>
              );
            })}
          </div>
          <button className="btn btn-primary" disabled={selectedSubjects.length === 0} onClick={() => setStep('year')} style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '15px', opacity: selectedSubjects.length === 0 ? 0.4 : 1 }}>
            Continue →
          </button>
        </div>
      )}

      {/* ── Step 2: Year group ── */}
      {step === 'year' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 900, color: 'var(--fg)', lineHeight: 1.2, marginBottom: '6px' }}>
              What year are you in? 🏫
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600, lineHeight: 1.5 }}>
              This helps us pitch content at exactly the right level.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginBottom: '1.5rem' }}>
            {YEAR_GROUPS.map(y => {
              const sel = yearGroup === y.id;
              return (
                <button key={y.id} onClick={() => setYearGroup(y.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderRadius: '14px', cursor: 'pointer', border: `2.5px solid ${sel ? 'var(--green)' : 'var(--border-dark)'}`, background: sel ? 'var(--green-light)' : '#fff', fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%', transition: 'all 0.12s', boxShadow: sel ? '0 4px 0 var(--green-dark)' : '0 4px 0 var(--border-dark)' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: sel ? '#2a7a00' : 'var(--fg)', marginBottom: '2px' }}>{y.label}</p>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>{y.sub}</p>
                  </div>
                  {sel && <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#fff', fontWeight: 800, flexShrink: 0 }}>✓</span>}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={() => setStep('subjects')}>← Back</button>
            <button className="btn btn-primary" disabled={!yearGroup} onClick={() => setStep('topics')} style={{ flex: 1, justifyContent: 'center', opacity: !yearGroup ? 0.4 : 1 }}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Weak topics ── */}
      {step === 'topics' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 900, color: 'var(--fg)', lineHeight: 1.2, marginBottom: '6px' }}>
              What feels hardest? 💪
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600, lineHeight: 1.5 }}>
              We'll focus here first. Pick as many as you like.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem', flex: 1, alignContent: 'flex-start' }}>
            {allWeakTopics.map(t => {
              const sel      = weakTopics.includes(t.id);
              const subjectId = selectedSubjects.find(s => WEAK_TOPICS[s]?.some(wt => wt.id === t.id));
              const subj      = SUBJECTS.find(s => s.id === subjectId);
              return (
                <button key={t.id} onClick={() => toggleTopic(t.id)}
                  style={{ padding: '8px 16px', borderRadius: '99px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, border: `2.5px solid ${sel ? subj?.color ?? 'var(--green)' : 'var(--border-dark)'}`, background: sel ? (subj?.bg ?? 'var(--green-light)') : '#fff', color: sel ? 'var(--fg)' : 'var(--muted)', transition: 'all 0.12s', boxShadow: sel ? `0 3px 0 ${subj?.color ?? 'var(--green)'}55` : '0 3px 0 var(--border-dark)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {sel && <span style={{ fontSize: '11px' }}>✓</span>}
                  {t.label}
                </button>
              );
            })}
          </div>
          {weakTopics.length === 0 && (
            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '1rem', textAlign: 'center', fontWeight: 600 }}>
              Skip if you want to explore everything first
            </p>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={() => setStep('year')}>← Back</button>
            <button className="btn btn-primary" disabled={saving} onClick={handleFinish} style={{ flex: 1, justifyContent: 'center' }}>
              {saving
                ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Spinner size={16} color="#fff" /> Setting up…</span>
                : "Let's go! 🚀"
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {step === 'done' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '1rem', animation: 'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--fg)', marginBottom: '8px' }}>You're all set!</h2>
          <p style={{ fontSize: '15px', color: 'var(--muted)', fontWeight: 600, lineHeight: 1.6 }}>Taking you to your dashboard…</p>
          <div style={{ marginTop: '1.5rem' }}><Spinner size={28} color="var(--green)" /></div>
        </div>
      )}

      <style>{`@keyframes bounceIn { 0%{opacity:0;transform:scale(0.5)} 60%{transform:scale(1.15)} 100%{opacity:1;transform:scale(1)} }`}</style>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem 2.5rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(88,204,2,0.07)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </main>
  );
}
