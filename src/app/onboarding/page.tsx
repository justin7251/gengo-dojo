'use client';
import { Spinner } from '@/components/Spinner';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, saveUserProfile } from '@/lib/firestore';

// ── Types ──────────────────────────────────────────────
type Step = 'subjects' | 'year' | 'topics' | 'done';

const SUBJECTS = [
  { id: 'maths',   label: 'Maths',           emoji: '📐', color: '#378ADD' },
  { id: 'english', label: 'English Language', emoji: '📖', color: '#7F77DD' },
  { id: 'science', label: 'Science',          emoji: '🔬', color: '#00e87a' },
  { id: 'japanese',label: 'Japanese',         emoji: '🇯🇵', color: '#EF9F27' },
];

const YEAR_GROUPS = [
  { id: 'year7',  label: 'Year 7',  sub: 'Age 11-12 · KS3 start' },
  { id: 'year8',  label: 'Year 8',  sub: 'Age 12-13 · KS3'       },
  { id: 'year9',  label: 'Year 9',  sub: 'Age 13-14 · KS3 end'   },
  { id: 'year10', label: 'Year 10', sub: 'Age 14-15 · GCSE start' },
  { id: 'year11', label: 'Year 11', sub: 'Age 15-16 · Exam year'  },
];

const WEAK_TOPICS: Record<string, { id: string; label: string }[]> = {
  maths: [
    { id: 'algebra',      label: 'Algebra'            },
    { id: 'fractions',    label: 'Fractions'           },
    { id: 'percentages',  label: 'Percentages'         },
    { id: 'geometry',     label: 'Geometry'            },
    { id: 'probability',  label: 'Probability'         },
    { id: 'quadratics',   label: 'Quadratics'          },
    { id: 'pythagoras',   label: 'Pythagoras'          },
    { id: 'statistics',   label: 'Statistics'          },
  ],
  english: [
    { id: 'language',     label: 'Language techniques' },
    { id: 'structure',    label: 'Structure analysis'  },
    { id: 'creative',     label: 'Creative writing'    },
    { id: 'transactional',label: 'Transactional writing'},
    { id: 'reading',      label: 'Reading comprehension'},
    { id: 'vocabulary',   label: 'Vocabulary'          },
  ],
  science: [
    { id: 'biology',      label: 'Biology'             },
    { id: 'chemistry',    label: 'Chemistry'           },
    { id: 'physics',      label: 'Physics'             },
    { id: 'equations',    label: 'Equations'           },
    { id: 'practicals',   label: 'Practicals'          },
  ],
  japanese: [
    { id: 'hiragana',     label: 'Hiragana'            },
    { id: 'katakana',     label: 'Katakana'            },
    { id: 'vocabulary',   label: 'Vocabulary'          },
    { id: 'grammar',      label: 'Grammar'             },
    { id: 'kanji',        label: 'Kanji'               },
  ],
};

export default function OnboardingPage() {
  const router = useRouter();

  const [uid, setUid]                   = useState('');
  const [step, setStep]                 = useState<Step>('subjects');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [yearGroup, setYearGroup]       = useState('');
  const [weakTopics, setWeakTopics]     = useState<string[]>([]);
  const [saving, setSaving]             = useState(false);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    return onAuth(async user => {
      if (!user) { router.push('/'); return; }
      // If already onboarded, skip
      const profile = await getUserProfile(user.uid);
      if (profile?.onboarded) { router.push('/dashboard'); return; }
      setUid(user.uid);
      setLoading(false);
    });
  }, []);

  function toggleSubject(id: string) {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  function toggleTopic(id: string) {
    setWeakTopics(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  }

  // All topics from all selected subjects
  const allWeakTopics = selectedSubjects.flatMap(s => WEAK_TOPICS[s] ?? []);

  async function handleFinish() {
    if (!uid) return;
    setSaving(true);
    try {
      const existing = await getUserProfile(uid);
      await saveUserProfile({
        ...(existing ?? {
          uid,
          targetLang:  'ja',
          nativeLang:  'en',
          level:       'beginner',
          interests:   [],
          displayName: '',
          photoURL:    '',
        }),
        uid,
        onboarded:        true,
        yearGroup,
        selectedSubjects,
        weakTopics,
        onboardedAt:      new Date().toISOString(),
      } as any);
      setStep('done');
      setTimeout(() => router.push('/dashboard'), 1800);
    } catch {
      setSaving(false);
    }
  }

  const stepIndex = ['subjects', 'year', 'topics', 'done'].indexOf(step);
  const totalSteps = 3;

  if (loading) return (
    <Screen>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    </Screen>
  );

  return (
    <Screen>
      {/* Progress bar */}
      {step !== 'done' && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
            <span>Step {stepIndex + 1} of {totalSteps}</span>
            <span>{Math.round(((stepIndex + 1) / totalSteps) * 100)}%</span>
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '3px', background: '#00e87a', borderRadius: '2px', width: `${((stepIndex + 1) / totalSteps) * 100}%`, transition: 'width 0.4s ease', boxShadow: '0 0 6px rgba(0,232,122,0.6)' }} />
          </div>
        </div>
      )}

      {/* ── Step 1: Subjects ── */}
      {step === 'subjects' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '2rem' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>Welcome!</p>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '8px', letterSpacing: '-0.02em' }}>
              What do you want to learn?
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              Pick everything you study. You can change this later.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2rem', flex: 1 }}>
            {SUBJECTS.map(s => {
              const selected = selectedSubjects.includes(s.id);
              return (
                <button key={s.id} onClick={() => toggleSubject(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px 18px', borderRadius: '16px', cursor: 'pointer',
                  border: `2px solid ${selected ? s.color + '60' : 'rgba(255,255,255,0.08)'}`,
                  background: selected ? s.color + '12' : 'rgba(255,255,255,0.03)',
                  fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}>
                  <span style={{ fontSize: '28px', lineHeight: 1 }}>{s.emoji}</span>
                  <span style={{ fontSize: '17px', fontWeight: 600, color: selected ? '#fff' : 'rgba(255,255,255,0.65)' }}>
                    {s.label}
                  </span>
                  {selected && (
                    <span style={{ marginLeft: 'auto', width: '22px', height: '22px', borderRadius: '50%', background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#03080a', fontWeight: 800 }}>
                      &#10003;
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setStep('year')}
            disabled={selectedSubjects.length === 0}
            style={nextBtn(selectedSubjects.length > 0)}
          >
            Continue &#8594;
          </button>
        </div>
      )}

      {/* ── Step 2: Year group ── */}
      {step === 'year' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '8px', letterSpacing: '-0.02em' }}>
              What year are you in?
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              This helps us pick the right level for you.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginBottom: '2rem' }}>
            {YEAR_GROUPS.map(y => {
              const selected = yearGroup === y.id;
              return (
                <button key={y.id} onClick={() => setYearGroup(y.id)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', borderRadius: '14px', cursor: 'pointer',
                  border: `2px solid ${selected ? 'rgba(0,232,122,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  background: selected ? 'rgba(0,232,122,0.1)' : 'rgba(255,255,255,0.03)',
                  fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
                  transition: 'all 0.15s',
                }}>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 600, color: selected ? '#fff' : 'rgba(255,255,255,0.7)', marginBottom: '2px' }}>
                      {y.label}
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{y.sub}</p>
                  </div>
                  {selected && (
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#00e87a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#03080a', fontWeight: 800, flexShrink: 0 }}>
                      &#10003;
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setStep('subjects')} style={GHOST_BTN}>Back</button>
            <button onClick={() => setStep('topics')} disabled={!yearGroup} style={{ ...nextBtn(!!yearGroup), flex: 1 }}>
              Continue &#8594;
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Weak topics ── */}
      {step === 'topics' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: '8px', letterSpacing: '-0.02em' }}>
              What feels hardest?
            </h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
              Pick the topics you find most difficult. We will focus on these first.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '2rem', flex: 1, alignContent: 'flex-start' }}>
            {allWeakTopics.map(t => {
              const selected = weakTopics.includes(t.id);
              // Find which subject this topic belongs to
              const subjectId = selectedSubjects.find(s => WEAK_TOPICS[s]?.some(wt => wt.id === t.id));
              const subjectColor = SUBJECTS.find(s => s.id === subjectId)?.color ?? '#fff';
              return (
                <button key={t.id} onClick={() => toggleTopic(t.id)} style={{
                  padding: '10px 16px', borderRadius: '99px', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', fontSize: '14px',
                  border: `2px solid ${selected ? subjectColor + '60' : 'rgba(255,255,255,0.1)'}`,
                  background: selected ? subjectColor + '15' : 'rgba(255,255,255,0.04)',
                  color: selected ? '#fff' : 'rgba(255,255,255,0.55)',
                  fontWeight: selected ? 600 : 400,
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  {selected && <span style={{ color: subjectColor, fontSize: '12px' }}>&#10003;</span>}
                  {t.label}
                </button>
              );
            })}
          </div>

          {weakTopics.length === 0 && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginBottom: '1rem', textAlign: 'center' }}>
              Pick at least one — or skip if you want to explore everything
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setStep('year')} style={GHOST_BTN}>Back</button>
            <button onClick={handleFinish} disabled={saving} style={{ ...nextBtn(true), flex: 1 }}>
              {saving ? 'Setting up...' : "Let's go! &#8594;"}
            </button>
          </div>
        </div>
      )}

      {/* ── Done ── */}
      {step === 'done' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '72px', marginBottom: '1rem', animation: 'popIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
            &#127881;
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            You are all set!
          </h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Taking you to your dashboard...
          </p>
        </div>
      )}

      <style>{`
        @keyframes popIn  { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </Screen>
  );
}

function nextBtn(enabled: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
    background: enabled ? '#00e87a' : 'rgba(255,255,255,0.1)',
    color: enabled ? '#03080a' : 'rgba(255,255,255,0.3)',
    fontSize: '15px', fontWeight: 800, cursor: enabled ? 'pointer' : 'not-allowed',
    fontFamily: 'var(--font-ui)', transition: 'all 0.2s',
    boxShadow: enabled ? '0 0 20px rgba(0,232,122,0.3)' : 'none',
  };
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#06080f', backgroundImage: 'radial-gradient(ellipse at top, #0d1a0f 0%, #06080f 60%)', display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem 2.5rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,232,122,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,232,122,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </main>
  );
}

const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px 20px', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
