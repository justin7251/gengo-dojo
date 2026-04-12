'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { Word, Progress, Rating, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import { isDue } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function FlashcardsPage() {
  return <AuthGuard><Flashcards /></AuthGuard>;
}

type RevealStep = 'kanji' | 'meaning' | 'example';

// Screen accent color
const ACCENT = '#00e87a';

function speak(text: string, targetLang: TargetLang) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utter    = new SpeechSynthesisUtterance(text);
  utter.lang     = VOICE_LANG[targetLang] ?? 'ja-JP';
  utter.rate     = 0.85;
  const voices   = window.speechSynthesis.getVoices();
  const langCode = VOICE_LANG[targetLang].split('-')[0];
  const native   = voices.find(v => v.lang.startsWith(langCode));
  if (native) utter.voice = native;
  window.speechSynthesis.speak(utter);
}

function Flashcards() {
  const router = useRouter();

  const [uid, setUid]                   = useState('');
  const [targetLang, setTargetLang]     = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang]     = useState<NativeLang>('en');
  const [queue, setQueue]               = useState<Word[]>([]);
  const [progress, setProgress]         = useState<Record<string, Progress>>({});
  const [idx, setIdx]                   = useState(0);
  const [reveal, setReveal]             = useState<RevealStep>('kanji');
  const [loading, setLoading]           = useState(true);
  const [rating, setRating]             = useState(false);
  const [speaking, setSpeaking]         = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
  const [done, setDone]                 = useState(false);

  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      setTargetLang(profile.targetLang);
      setNativeLang(profile.nativeLang);
      const [words, prog] = await Promise.all([
        getUserWords(user.uid, profile.targetLang, profile.nativeLang),
        getProgress(user.uid, profile.targetLang, profile.nativeLang),
      ]);
      setProgress(prog);
      const due  = words.filter(w => prog[w.id] && isDue(prog[w.id]));
      const rest = words.filter(w => !prog[w.id] || !isDue(prog[w.id]));
      setQueue([...due, ...rest].sort(() => Math.random() - 0.5));
      setLoading(false);
    });
  }, []);

  const current = queue[idx];
  const pct     = queue.length ? Math.round((idx / queue.length) * 100) : 0;

  function handleSpeak(text?: string) {
    if (!current) return;
    setSpeaking(true);
    speak(text ?? current.kanji, targetLang);
    setTimeout(() => setSpeaking(false), 1200);
  }

  function handleRevealMeaning() {
    setReveal('meaning');
    speak(current.kanji, targetLang);
  }

  async function handleRate(r: Rating) {
    if (!current || rating) return;
    setRating(true);
    const prev = progress[current.id];
    if (prev) {
      await rateWord(uid, current.id, r, prev, targetLang, nativeLang);
      setSessionStats(s => ({
        correct: r !== 'wrong' ? s.correct + 1 : s.correct,
        wrong:   r === 'wrong' ? s.wrong + 1   : s.wrong,
      }));
    }
    const next = idx + 1;
    if (next >= queue.length) { setDone(true); }
    else { setIdx(next); setReveal('kanji'); }
    setRating(false);
  }

  if (loading) return <Screen><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><Spinner /></div></Screen>;

  if (!queue.length) return (
    <Screen>
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p style={{ fontSize: '40px', marginBottom: '1rem' }}>📭</p>
        <p style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>No words yet</p>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>Generate vocabulary from the dashboard first.</p>
        <button onClick={() => router.push('/dashboard')} style={BACK_BTN_STYLE}>← Dashboard</button>
      </div>
    </Screen>
  );

  if (done) {
    const total = sessionStats.correct + sessionStats.wrong;
    const pctC  = total ? Math.round(sessionStats.correct / total * 100) : 0;
    return (
      <Screen>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>
            {pctC >= 80 ? '🏆' : pctC >= 50 ? '💪' : '📖'}
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Session complete</h2>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>
            {sessionStats.correct} correct · {sessionStats.wrong} again
          </p>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '6px', marginBottom: '8px' }}>
            <div style={{ height: '6px', borderRadius: '4px', width: `${pctC}%`, background: '#fff' }} />
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>{pctC}% accuracy</p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button onClick={() => { setIdx(0); setReveal('kanji'); setDone(false); setSessionStats({ correct: 0, wrong: 0 }); }}
              style={{ ...BTN_WHITE_STYLE }}>
              Study again
            </button>
            <button onClick={() => router.push('/dashboard')} style={BTN_GHOST_STYLE}>Dashboard</button>
          </div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button onClick={() => router.push('/dashboard')} style={BACK_BTN_STYLE}>← Back</button>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>
          {idx + 1} / {queue.length}
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{
            fontSize: '11px', padding: '3px 8px', borderRadius: '99px',
            background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)',
          }}>
            {current.topic}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '2px', background: 'rgba(255,255,255,0.15)', borderRadius: '1px', marginBottom: '2rem' }}>
        <div style={{ height: '2px', borderRadius: '1px', width: `${pct}%`, background: '#fff', transition: 'width 0.4s ease' }} />
      </div>

      {/* Kanji hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {/* Ghost kanji background */}
        <div style={{
          position: 'absolute', fontSize: '220px', lineHeight: 1,
          fontFamily: '"Noto Sans JP","Noto Sans SC",serif',
          color: 'rgba(255,255,255,0.05)', userSelect: 'none', pointerEvents: 'none',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          zIndex: 0,
        }}>
          {current.kanji}
        </div>

        <div style={{ position: 'relative', zIndex: 1, width: '100%', textAlign: 'center' }}>
          {/* Voice button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button onClick={() => handleSpeak()} style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: `1px solid rgba(255,255,255,${speaking ? '0.6' : '0.2'})`,
              background: speaking ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
              cursor: 'pointer', fontSize: '18px', display: 'flex',
              alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              color: '#fff',
            }}>🔊</button>
          </div>

          {/* Main kanji */}
          <div style={{
            fontSize: '96px', lineHeight: 1,
            fontFamily: '"Noto Sans JP","Noto Sans SC",serif',
            color: '#fff', marginBottom: '12px',
            textShadow: '0 0 40px rgba(255,255,255,0.2)',
          }}>
            {current.kanji}
          </div>

          {/* Reading */}
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', letterSpacing: '0.05em' }}>
            {current.reading}
            {current.romanization && (
              <span style={{ fontSize: '14px', marginLeft: '8px', opacity: 0.7 }}>· {current.romanization}</span>
            )}
          </p>

          {/* Reveal step 1 */}
          {reveal === 'kanji' && (
            <button onClick={handleRevealMeaning} style={BTN_WHITE_STYLE}>
              Reveal meaning
            </button>
          )}

          {/* Meaning */}
          {reveal !== 'kanji' && (
            <div style={{ animation: 'fadeIn 0.25s ease' }}>
              <div style={{
                fontSize: '28px', fontWeight: 600, color: '#fff',
                marginBottom: '16px',
                padding: '14px 24px', background: 'rgba(255,255,255,0.12)',
                borderRadius: '12px', display: 'inline-block',
                border: '1px solid rgba(255,255,255,0.2)',
              }}>
                {current.meaning}
              </div>

              {reveal === 'meaning' && (
                <div>
                  <button onClick={() => setReveal('example')} style={BTN_GHOST_STYLE}>
                    Show example →
                  </button>
                </div>
              )}

              {reveal === 'example' && current.example && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                  <div style={{
                    background: 'rgba(0,0,0,0.25)', borderRadius: '12px',
                    padding: '14px 16px', textAlign: 'left', marginTop: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: current.example_translation ? '8px' : '0' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>💬</span>
                      <span style={{
                        flex: 1, fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.9)',
                        fontFamily: '"Noto Sans JP","Noto Sans SC",serif',
                      }}>
                        {current.example}
                      </span>
                      <button onClick={() => handleSpeak(current.example)} style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)',
                        cursor: 'pointer', fontSize: '12px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff',
                      }}>🔊</button>
                    </div>
                    {current.example_translation && (
                      <p style={{
                        fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic',
                        borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px', paddingLeft: '20px',
                      }}>
                        {current.example_translation}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SRS buttons */}
      {reveal !== 'kanji' && (
        <div style={{ marginTop: '2rem', animation: 'fadeIn 0.3s ease' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: '10px' }}>
            HOW DID YOU DO?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
            {([
              { r: 'wrong', label: 'Again', sub: '1d',  bg: 'rgba(226,75,74,0.25)',  border: 'rgba(226,75,74,0.5)' },
              { r: 'hard',  label: 'Hard',  sub: '3d',  bg: 'rgba(239,159,39,0.25)', border: 'rgba(239,159,39,0.5)' },
              { r: 'good',  label: 'Good',  sub: '7d',  bg: 'rgba(255,255,255,0.15)',border: 'rgba(255,255,255,0.4)' },
              { r: 'easy',  label: 'Easy',  sub: '30d', bg: 'rgba(0,232,122,0.25)',  border: 'rgba(0,232,122,0.5)' },
            ] as { r: Rating; label: string; sub: string; bg: string; border: string }[]).map(({ r, label, sub, bg, border }) => (
              <button key={r} disabled={rating} onClick={() => handleRate(r)} style={{
                padding: '12px 0', borderRadius: '10px',
                border: `1px solid ${border}`,
                background: bg, color: '#fff',
                fontSize: '13px', fontWeight: 500,
                cursor: rating ? 'not-allowed' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                opacity: rating ? 0.5 : 1, transition: 'opacity 0.15s', fontFamily: 'inherit',
              }}>
                <span>{label}</span>
                <span style={{ fontSize: '11px', opacity: 0.6 }}>{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Screen>
  );
}

// ── Full-bleed teal screen ────────────────────────────
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      minHeight: '100vh', background: '#0a6e4a',
      backgroundImage: 'radial-gradient(ellipse at top, #0d9060 0%, #064d33 60%, #031f15 100%)',
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1.25rem 2rem',
      fontFamily: 'var(--font-ui)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </main>
  );
}

const BACK_BTN_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '8px', padding: '7px 14px', color: '#fff', fontSize: '13px',
  cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all 0.15s',
};

const BTN_WHITE_STYLE: React.CSSProperties = {
  background: '#fff', border: 'none', borderRadius: '10px',
  padding: '12px 28px', color: '#032010', fontSize: '15px',
  fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
  transition: 'all 0.15s',
};

const BTN_GHOST_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: '10px', padding: '10px 22px', color: '#fff',
  fontSize: '14px', cursor: 'pointer', fontFamily: 'var(--font-ui)',
  transition: 'all 0.15s',
};

function Spinner() {
  return <div style={{ width: '28px', height: '28px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}
