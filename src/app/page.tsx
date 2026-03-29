'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle, onAuth } from '@/lib/auth';
import { saveUserProfile, getUserProfile } from '@/lib/firestore';
import { UserProfile } from '@/lib/types';

const INTERESTS = [
  'Judo', 'Anime', 'Cooking', 'Gaming', 'Music',
  'Travel', 'Fashion', 'Architecture', 'Medicine',
  'Photography', 'Football', 'Cinema', 'Manga',
  'Tea ceremony', 'Calligraphy', 'Origami', 'Business',
  'Nature', 'Technology', 'Art',
];

type Lang  = 'ja' | 'zh';
type Level = 'beginner' | 'intermediate' | 'advanced';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]         = useState<'signin' | 'interests'>('signin');
  const [uid, setUid]           = useState('');
  const [email, setEmail]       = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [lang, setLang]         = useState<Lang>('ja');
  const [level, setLevel]       = useState<Level>('beginner');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      const profile = await getUserProfile(user.uid);
      if (profile?.interests?.length) {
        router.replace('/dashboard');
      } else {
        setUid(user.uid);
        setEmail(user.email ?? '');
        setStep('interests');
      }
    });
  }, [router]);

  async function handleGoogleSignIn() {
    setError('');
    try {
      await signInWithGoogle();
    } catch {
      setError('Sign-in failed. Please try again.');
    }
  }

  function toggleInterest(i: string) {
    setSelected((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }

  async function handleSave() {
    if (!selected.length) { setError('Pick at least one interest.'); return; }
    setSaving(true);
    setError('');
    try {
      const profile: UserProfile = {
        uid, email, interests: selected,
        lang, level, createdAt: Date.now(),
      };
      await saveUserProfile(profile);
      router.push('/dashboard');
    } catch {
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  }

  // ── Shared page shell ─────────────────────────────────
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-12"
      style={{ background: 'var(--bg)' }}>
      {/* Top nav bar */}
      <div style={{
        width: '100%',
        maxWidth: '680px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '3rem',
      }}>
        <span style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.02em' }}>
          言語道場
        </span>
        {step === 'interests' && (
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {email}
          </span>
        )}
      </div>

      {/* Centered content card */}
      <div style={{
        width: '100%',
        maxWidth: '680px',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '2.5rem',
      }}>
        {children}
      </div>
    </main>
  );

  // ── Sign-in screen ────────────────────────────────────
  if (step === 'signin') {
    return (
      <Shell>
        <div style={{ maxWidth: '320px', margin: '2rem auto', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '1rem' }}>🗾</div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>
            Welcome to 言語道場
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Vocabulary shaped around your interests. Sign in to get started.
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

  // ── Interests screen ──────────────────────────────────
  return (
    <Shell>
      <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>
        Your interests
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
        We'll generate vocabulary around these topics using AI.
      </p>

      {/* Interests */}
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500, marginBottom: '10px' }}>
          Pick your interests
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {INTERESTS.map((i) => (
            <span key={i} className={`tag ${selected.includes(i) ? 'selected' : ''}`} onClick={() => toggleInterest(i)}>
              {i}
            </span>
          ))}
        </div>
      </div>

      {/* Language */}
      <div style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500, marginBottom: '10px' }}>
          Language
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ja', 'zh'] as Lang[]).map((l) => (
            <span key={l} className={`tag ${lang === l ? 'selected' : ''}`} onClick={() => setLang(l)}>
              {l === 'ja' ? '🇯🇵 Japanese' : '🇨🇳 Chinese'}
            </span>
          ))}
        </div>
      </div>

      {/* Level */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500, marginBottom: '10px' }}>
          Level
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['beginner', 'intermediate', 'advanced'] as Level[]).map((l) => (
            <span key={l} className={`tag ${level === l ? 'selected' : ''}`} onClick={() => setLevel(l)}>
              {l === 'beginner' ? '🌱 Beginner' : l === 'intermediate' ? '📈 Intermediate' : '🔥 Advanced'}
            </span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', margin: '0 0 1.5rem' }} />

      {/* Selected summary */}
      {selected.length > 0 && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '14px 16px',
          borderRadius: '12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500, marginBottom: '8px' }}>
            Your selection · {selected.length} topic{selected.length > 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {selected.map((i) => (
              <span key={i} className="pill pill-teal">{i}</span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p style={{ marginBottom: '1rem', fontSize: '13px', padding: '10px 12px', borderRadius: '8px', color: '#A32D2D', background: '#FCEBEB' }}>
          {error}
        </p>
      )}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}
        style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
        {saving ? 'Saving…' : 'Start learning →'}
      </button>
    </Shell>
  );
}