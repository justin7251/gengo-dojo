'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle, onAuth } from '@/lib/auth';
import { saveUserProfile, getUserProfile } from '@/lib/firestore';
import { UserProfile, NativeLang, TargetLang, NATIVE_LANGUAGES, TARGET_LANGUAGES } from '@/lib/types';
import { Spinner } from '@/components/Spinner';

const INTERESTS = [
  'Judo','Anime','Cooking','Gaming','Music','Travel','Fashion',
  'Architecture','Medicine','Photography','Football','Cinema',
  'Manga','Tea ceremony','Calligraphy','Origami','Business','Nature','Technology','Art',
];

type Level = 'beginner' | 'intermediate' | 'advanced';
type Step  = 'signin' | 'lang' | 'interests';

export default function LandingPage() {
  const router = useRouter();

  const [step, setStep]             = useState<Step>('signin');
  const [uid, setUid]               = useState('');
  const [email, setEmail]           = useState('');
  const [nativeLang, setNativeLang] = useState<NativeLang>('en');
  const [targetLang, setTargetLang] = useState<TargetLang>('ja');
  const [selected, setSelected]     = useState<string[]>([]);
  const [level, setLevel]           = useState<Level>('beginner');
  const [saving, setSaving]         = useState(false);
  const [signingIn, setSigningIn]   = useState(false);
  const [error, setError]           = useState('');

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
      }
    });
  }, [router]);

  async function handleGoogleSignIn() {
    setError(''); setSigningIn(true);
    try { await signInWithGoogle(); }
    catch { setError('Sign-in failed. Please try again.'); setSigningIn(false); }
  }

  function toggleInterest(i: string) {
    setSelected(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  }

  async function handleSave() {
    if (!selected.length) { setError('Pick at least one interest!'); return; }
    setSaving(true); setError('');
    try {
      const profile: UserProfile = { uid, email, interests: selected, nativeLang, targetLang, level, createdAt: Date.now() };
      await saveUserProfile(profile);
      router.push('/dashboard');
    } catch {
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  }

  const sameLang   = (nativeLang as string) === (targetLang as string);
  const targetInfo = TARGET_LANGUAGES.find(l => l.code === targetLang);
  const nativeInfo = NATIVE_LANGUAGES.find(l => l.code === nativeLang);

  // ── Step dots ──────────────────────────────────────
  const steps = step === 'signin' ? 0 : step === 'lang' ? 1 : 2;

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '2rem 1rem 5rem', fontFamily: 'var(--font-ui)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background blobs */}
      <div style={{ position: 'fixed', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(88,204,2,0.07)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-80px', left: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(28,176,246,0.07)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      {/* Header */}
      <div style={{ width: '100%', maxWidth: '560px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>🥋</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: 'var(--fg)' }}>Gengo Dojo</span>
        </div>
        {step !== 'signin' && (
          <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>{email}</span>
        )}
      </div>

      {/* Step progress */}
      {step !== 'signin' && (
        <div style={{ width: '100%', maxWidth: '560px', display: 'flex', gap: '6px', marginBottom: '1.5rem' }}>
          {[0,1,2].map(n => (
            <div key={n} style={{
              height: '6px', borderRadius: '3px', flex: n <= steps ? 2 : 1,
              background: n <= steps ? 'var(--green)' : 'var(--border-dark)',
              transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
          ))}
        </div>
      )}

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '560px',
        background: '#fff', border: '2.5px solid var(--border-dark)',
        borderRadius: '24px', padding: '2rem',
        boxShadow: '0 8px 0 var(--border-dark)',
        animation: 'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
      }}>

        {/* ── Sign in ── */}
        {step === 'signin' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '1rem', animation: 'float 2s ease-in-out infinite' }}>🏯</div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--fg)', marginBottom: '8px' }}>
              Welcome to Gengo Dojo!
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '2.5rem', lineHeight: 1.6, fontWeight: 600 }}>
              AI-powered vocabulary shaped around your interests. Learn faster, remember longer. 🚀
            </p>
            <button
              className="btn"
              style={{ width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center', gap: '10px' }}
              onClick={handleGoogleSignIn}
              disabled={signingIn}
            >
              {signingIn ? <Spinner size={18} color="var(--green)" /> : (
                <svg width="20" height="20" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
              )}
              {signingIn ? 'Signing in…' : 'Continue with Google'}
            </button>
            {error && <p style={{ marginTop: '12px', fontSize: '13px', color: 'var(--red)', fontWeight: 700 }}>{error}</p>}
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '2rem' }}>
              {['🃏 Flashcards','🧩 Quizzes','💀 Survival','🎯 Missions'].map(f => (
                <span key={f} style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 700 }}>{f}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Language picker ── */}
        {step === 'lang' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, marginBottom: '4px', color: 'var(--fg)' }}>
              Pick your languages 🌍
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '1.5rem', fontWeight: 600 }}>
              We'll personalise your lessons and translations.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '8px' }}>I speak</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {NATIVE_LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => setNativeLang(l.code)} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px',
                      borderRadius: '12px', border: '2.5px solid',
                      borderColor: nativeLang === l.code ? 'var(--green)' : 'var(--border-dark)',
                      background: nativeLang === l.code ? 'var(--green-light)' : 'var(--bg-secondary)',
                      color: nativeLang === l.code ? '#2a7a00' : 'var(--fg)',
                      cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '13px',
                      fontWeight: 700, textAlign: 'left', width: '100%',
                      boxShadow: nativeLang === l.code ? '0 3px 0 var(--green-dark)' : '0 3px 0 var(--border-dark)',
                      transition: 'all 0.1s ease',
                    }}>
                      <span style={{ fontSize: '18px' }}>{l.flag}</span>
                      <span style={{ flex: 1 }}>{l.label}</span>
                      {nativeLang === l.code && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '8px' }}>I'm learning</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {TARGET_LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => setTargetLang(l.code)}
                      disabled={(l.code as string) === (nativeLang as string)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px',
                        borderRadius: '12px', border: '2.5px solid',
                        borderColor: targetLang === l.code ? 'var(--blue)' : 'var(--border-dark)',
                        background: targetLang === l.code ? 'var(--blue-light)' : 'var(--bg-secondary)',
                        color: targetLang === l.code ? 'var(--blue-dark)' : 'var(--fg)',
                        opacity: (l.code as string) === (nativeLang as string) ? 0.35 : 1,
                        cursor: (l.code as string) === (nativeLang as string) ? 'not-allowed' : 'pointer',
                        fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700,
                        textAlign: 'left', width: '100%',
                        boxShadow: targetLang === l.code ? '0 3px 0 var(--blue-dark)' : '0 3px 0 var(--border-dark)',
                        transition: 'all 0.1s ease',
                      }}>
                      <span style={{ fontSize: '18px' }}>{l.flag}</span>
                      <span style={{ flex: 1 }}>{l.label}</span>
                      {targetLang === l.code && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {sameLang && (
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--red-dark)', background: 'var(--red-light)', padding: '10px 14px', borderRadius: '12px', marginBottom: '1rem', border: '2px solid var(--red)' }}>
                ⚠️ Native and target language can't be the same.
              </div>
            )}
            <button className="btn btn-primary" disabled={sameLang} onClick={() => setStep('interests')} style={{ width: '100%', padding: '14px', justifyContent: 'center' }}>
              Continue →
            </button>
          </div>
        )}

        {/* ── Interests ── */}
        {step === 'interests' && (
          <div>
            <button onClick={() => setStep('lang')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--muted)', fontFamily: 'inherit', padding: 0, marginBottom: '1rem', fontWeight: 700 }}>← Back</button>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, marginBottom: '4px', color: 'var(--fg)' }}>
              What are you into? 🎯
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '1.5rem', fontWeight: 600 }}>
              We'll generate {targetInfo?.flag} {targetInfo?.label} vocab around these topics.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
              {INTERESTS.map(i => (
                <button key={i} onClick={() => toggleInterest(i)} style={{
                  padding: '7px 14px', borderRadius: '99px', border: '2.5px solid', fontSize: '13px',
                  borderColor: selected.includes(i) ? 'var(--green)' : 'var(--border-dark)',
                  background: selected.includes(i) ? 'var(--green-light)' : 'var(--bg-secondary)',
                  color: selected.includes(i) ? '#2a7a00' : 'var(--fg-secondary)',
                  cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 700,
                  boxShadow: selected.includes(i) ? '0 3px 0 var(--green-dark)' : '0 3px 0 var(--border-dark)',
                  transition: 'all 0.1s ease',
                }}>{i}</button>
              ))}
            </div>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '8px' }}>Level</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
              {(['beginner','intermediate','advanced'] as Level[]).map(l => (
                <button key={l} onClick={() => setLevel(l)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: '12px', border: '2.5px solid',
                  borderColor: level === l ? 'var(--purple)' : 'var(--border-dark)',
                  background: level === l ? 'var(--purple-light)' : 'var(--bg-secondary)',
                  color: level === l ? 'var(--purple-dark)' : 'var(--fg-secondary)',
                  cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700,
                  boxShadow: level === l ? '0 3px 0 var(--purple-dark)' : '0 3px 0 var(--border-dark)',
                  transition: 'all 0.1s ease',
                }}>
                  {l === 'beginner' ? '🌱 Beginner' : l === 'intermediate' ? '📈 Mid' : '🔥 Advanced'}
                </button>
              ))}
            </div>
            {selected.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '10px 14px', background: 'var(--bg-secondary)', border: '2px solid var(--border-dark)', borderRadius: '12px', marginBottom: '1rem', fontSize: '13px', fontWeight: 700, color: 'var(--muted-bright)' }}>
                <span>{nativeInfo?.flag}</span><span>→</span><span>{targetInfo?.flag} {targetInfo?.label}</span>
                <span>·</span><span>{level}</span><span>·</span>
                <span style={{ color: 'var(--green-dark)' }}>{selected.length} topic{selected.length !== 1 ? 's' : ''} selected</span>
              </div>
            )}
            {error && <p style={{ marginBottom: '1rem', fontSize: '13px', color: 'var(--red-dark)', fontWeight: 700, background: 'var(--red-light)', padding: '10px 12px', borderRadius: '10px', border: '2px solid var(--red)' }}>{error}</p>}
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || !selected.length} style={{ width: '100%', padding: '14px', justifyContent: 'center', fontSize: '15px' }}>
              {saving ? <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Spinner size={16} color="#fff" /> Saving…</span> : '🚀 Start Learning!'}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes bounceIn { 0%{opacity:0;transform:scale(0.85) translateY(20px)} 60%{transform:scale(1.03) translateY(-4px)} 100%{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </main>
  );
}
