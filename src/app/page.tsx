'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle, onAuth } from '@/lib/auth';
import { saveUserProfile, getUserProfile } from '@/lib/firestore';
import {
  UserProfile, NativeLang, TargetLang,
  NATIVE_LANGUAGES, TARGET_LANGUAGES,
} from '@/lib/types';

const INTERESTS = [
  'Judo', 'Anime', 'Cooking', 'Gaming', 'Music',
  'Travel', 'Fashion', 'Architecture', 'Medicine',
  'Photography', 'Football', 'Cinema', 'Manga',
  'Tea ceremony', 'Calligraphy', 'Origami', 'Business',
  'Nature', 'Technology', 'Art',
];

type Level = 'beginner' | 'intermediate' | 'advanced';
type Step  = 'signin' | 'lang' | 'interests';

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep]               = useState<Step>('signin');
  const [uid, setUid]                 = useState('');
  const [email, setEmail]             = useState('');
  const [nativeLang, setNativeLang]   = useState<NativeLang>('en');
  const [targetLang, setTargetLang]   = useState<TargetLang>('ja');
  const [selected, setSelected]       = useState<string[]>([]);
  const [level, setLevel]             = useState<Level>('beginner');
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      const profile = await getUserProfile(user.uid);
      if (profile?.interests?.length) {
        router.replace('/dashboard');
      } else {
        setUid(user.uid);
        setEmail(user.email ?? '');
        setStep('lang');
        router.push('/onboarding');
      }
    });
  }, [router]);

  async function handleGoogleSignIn() {
    setError('');
    try { await signInWithGoogle(); }
    catch { setError('Sign-in failed. Please try again.'); }
  }

  function toggleInterest(i: string) {
    setSelected(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
    );
  }

  async function handleSave() {
    if (!selected.length) { setError('Pick at least one interest.'); return; }
    setSaving(true);
    setError('');
    try {
      const profile: UserProfile = {
        uid, email,
        interests: selected,
        nativeLang, targetLang, level,
        createdAt: Date.now(),
      };
      await saveUserProfile(profile);
      router.push('/dashboard');
    } catch {
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  }

  const sameLang = (nativeLang as string) === (targetLang as string);

  const targetInfo  = TARGET_LANGUAGES.find(l => l.code === targetLang);
  const nativeInfo  = NATIVE_LANGUAGES.find(l => l.code === nativeLang);

  // ── Shell ───────────────────────────────────────────
  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <main style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '3rem 1rem 4rem',
        background: 'var(--bg)',
      }}>
        <div style={{
          width: '100%', maxWidth: '680px',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: '2.5rem',
        }}>
          <span style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em' }}>
            言語道場
          </span>
          {step !== 'signin' && (
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{email}</span>
          )}
        </div>
        <div style={{
          width: '100%', maxWidth: '680px',
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '2.5rem',
        }}>
          {children}
        </div>
      </main>
    );
  }

  // ── Step indicator ──────────────────────────────────
  function StepDots({ current }: { current: number }) {
    return (
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem' }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{
            width: n <= current ? '20px' : '6px',
            height: '6px', borderRadius: '3px',
            background: n <= current ? 'var(--teal)' : 'var(--border)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>
    );
  }

  // ── Sign-in ─────────────────────────────────────────
  if (step === 'signin') {
    return (
      <Shell>
        <div style={{ maxWidth: '320px', margin: '2rem auto', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🗾</div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
            Welcome to 言語道場
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            AI-powered vocabulary shaped around your interests.
          </p>
          <button className="btn" style={{ width: '100%' }} onClick={handleGoogleSignIn}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>
          {error && (
            <p style={{ marginTop: '12px', fontSize: '13px', color: '#A32D2D' }}>{error}</p>
          )}
        </div>
      </Shell>
    );
  }

  // ── Language picker ─────────────────────────────────
  if (step === 'lang') {
    return (
      <Shell>
        <StepDots current={1} />
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>
          Choose your languages
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
          This personalises your lessons and translations.
        </p>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem', marginBottom: '1.5rem',
        }}>
          {/* Native language — I speak */}
          <div>
            <p style={{
              fontSize: '11px', textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--muted)',
              fontWeight: 500, marginBottom: '10px',
            }}>
              I speak
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {NATIVE_LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => setNativeLang(l.code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', borderRadius: '12px',
                    border: '1px solid',
                    borderColor: nativeLang === l.code ? 'var(--teal)' : 'var(--border)',
                    background:  nativeLang === l.code ? 'var(--teal-light)' : 'var(--surface)',
                    color:       nativeLang === l.code ? 'var(--teal-dark)' : 'var(--fg)',
                    fontWeight:  nativeLang === l.code ? 500 : 400,
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '14px', transition: 'all 0.15s',
                    textAlign: 'left', width: '100%',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{l.flag}</span>
                  <span style={{ flex: 1 }}>{l.label}</span>
                  {nativeLang === l.code && (
                    <span style={{ fontSize: '12px' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Target language — I want to learn */}
          <div>
            <p style={{
              fontSize: '11px', textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--muted)',
              fontWeight: 500, marginBottom: '10px',
            }}>
              I want to learn
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {TARGET_LANGUAGES.map(l => (
                <button
                  key={l.code}
                  onClick={() => setTargetLang(l.code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '10px 14px', borderRadius: '12px',
                    border: '1px solid',
                    borderColor: targetLang === l.code ? '#185FA5' : 'var(--border)',
                    background:  targetLang === l.code ? '#E6F1FB'  : 'var(--surface)',
                    color:       targetLang === l.code ? '#185FA5'  : 'var(--fg)',
                    fontWeight:  targetLang === l.code ? 500 : 400,
                    cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: '14px', transition: 'all 0.15s',
                    textAlign: 'left', width: '100%',
                    opacity: (l.code as string) === (nativeLang as string) ? 0.35 : 1,
                  }}
                  disabled={(l.code as string) === (nativeLang as string)}
                >
                  <span style={{ fontSize: '20px' }}>{l.flag}</span>
                  <div style={{ flex: 1 }}>
                    <div>{l.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '1px' }}>
                      {l.script}
                    </div>
                  </div>
                  {targetLang === l.code && (
                    <span style={{ fontSize: '12px', color: '#185FA5' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Same language warning */}
        {sameLang && (
          <p style={{
            fontSize: '13px', color: '#A32D2D', background: '#FCEBEB',
            padding: '10px 12px', borderRadius: '8px', marginBottom: '1rem',
          }}>
            Your native and target language can't be the same.
          </p>
        )}

        <button
          className="btn btn-primary"
          disabled={sameLang}
          onClick={() => setStep('interests')}
          style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
        >
          Continue →
        </button>
      </Shell>
    );
  }

  // ── Interests + level ───────────────────────────────
  return (
    <Shell>
      <StepDots current={2} />

      {/* Back */}
      <button
        onClick={() => setStep('lang')}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '13px', color: 'var(--muted)', fontFamily: 'inherit',
          padding: 0, marginBottom: '1rem',
        }}
      >
        ← Back
      </button>

      <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>
        Your interests
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
        We'll generate {targetInfo?.flag} {targetInfo?.label} vocabulary around these topics.
      </p>

      {/* Interests grid */}
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{
          fontSize: '11px', textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--muted)',
          fontWeight: 500, marginBottom: '10px',
        }}>
          Pick your interests
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {INTERESTS.map(i => (
            <span
              key={i}
              className={`tag ${selected.includes(i) ? 'selected' : ''}`}
              onClick={() => toggleInterest(i)}
            >
              {i}
            </span>
          ))}
        </div>
      </div>

      {/* Level */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontSize: '11px', textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--muted)',
          fontWeight: 500, marginBottom: '10px',
        }}>
          Level
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['beginner', 'intermediate', 'advanced'] as Level[]).map(l => (
            <span
              key={l}
              className={`tag ${level === l ? 'selected' : ''}`}
              onClick={() => setLevel(l)}
            >
              {l === 'beginner' ? '🌱 Beginner'
                : l === 'intermediate' ? '📈 Intermediate'
                : '🔥 Advanced'}
            </span>
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        flexWrap: 'wrap', padding: '12px 16px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '12px', marginBottom: '1.5rem',
        fontSize: '13px', color: 'var(--muted)',
      }}>
        <span>{nativeInfo?.flag} {nativeInfo?.label}</span>
        <span style={{ opacity: 0.4 }}>→</span>
        <span>{targetInfo?.flag} {targetInfo?.label}</span>
        <span style={{ opacity: 0.4 }}>·</span>
        <span>{level}</span>
        {selected.length > 0 && (
          <>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ color: 'var(--teal-dark)', fontWeight: 500 }}>
              {selected.length} topic{selected.length !== 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>

      {error && (
        <p style={{
          marginBottom: '1rem', fontSize: '13px',
          padding: '10px 12px', borderRadius: '8px',
          color: '#A32D2D', background: '#FCEBEB',
        }}>
          {error}
        </p>
      )}

      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving || !selected.length}
        style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
      >
        {saving ? 'Saving…' : 'Start learning →'}
      </button>
    </Shell>
  );
}
