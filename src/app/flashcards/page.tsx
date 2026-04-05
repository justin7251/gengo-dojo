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
    if (next >= queue.length) {
      setDone(true);
    } else {
      setIdx(next);
      setReveal('kanji');
    }
    setRating(false);
  }

  if (loading) {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div>
      </Shell>
    );
  }

  if (!queue.length) {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '1rem' }}>📭</div>
          <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>No words yet</p>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '1.5rem' }}>
            Generate vocabulary from the dashboard first.
          </p>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
            Go to dashboard
          </button>
        </div>
      </Shell>
    );
  }

  if (done) {
    const total      = sessionStats.correct + sessionStats.wrong;
    const pctCorrect = total ? Math.round((sessionStats.correct / total) * 100) : 0;
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>
            {pctCorrect >= 80 ? '🏆' : pctCorrect >= 50 ? '💪' : '📖'}
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>
            Session complete
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
            {sessionStats.correct} correct · {sessionStats.wrong} again
          </p>
          <div style={{ marginBottom: '2rem' }}>
            <div className="progress-track" style={{ height: '8px', borderRadius: '4px' }}>
              <div className="progress-fill" style={{
                width: `${pctCorrect}%`, height: '8px', borderRadius: '4px',
                background: pctCorrect >= 80 ? 'var(--teal)'
                  : pctCorrect >= 50 ? '#EF9F27' : '#E24B4A',
              }} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '8px' }}>
              {pctCorrect}% accuracy
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => {
              setIdx(0); setReveal('kanji');
              setDone(false); setSessionStats({ correct: 0, wrong: 0 });
            }}>
              Study again
            </button>
            <button className="btn" onClick={() => router.push('/dashboard')}>
              Dashboard
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onBack={() => router.push('/dashboard')}>

      {/* Progress */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '12px', color: 'var(--muted)', marginBottom: '6px',
        }}>
          <span>{idx + 1} / {queue.length}</span>
          <span>{pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Pills */}
      <div style={{ marginBottom: '1.25rem' }}>
        <span className="pill pill-gray">{current.topic}</span>
        <span className="pill pill-blue" style={{ marginLeft: '6px' }}>{current.type}</span>
      </div>

      {/* Voice button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button
          onClick={() => handleSpeak()}
          title="Play pronunciation"
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '1px solid #444', background: speaking ? '#0F6E56' : '#2a2a2a',
            cursor: 'pointer', fontSize: '18px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
          }}
        >
          🔊
        </button>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '20px', padding: '2.5rem 2rem', textAlign: 'center',
        minHeight: '280px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
      }}>
        {current.kanji ? (
          <div style={{
            fontSize: '80px', lineHeight: 1, marginBottom: '12px',
            fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", "Noto Sans SC", serif',
          }}>
            {current.kanji}
          </div>
        ) : (
          <div style={{
            fontSize: '14px', color: '#A32D2D', marginBottom: '12px',
            padding: '8px 12px', background: '#FCEBEB', borderRadius: '8px',
          }}>
            ⚠️ Regenerate this word from the dashboard
          </div>
        )}

        <p style={{ fontSize: '16px', color: 'var(--muted)', marginBottom: '20px' }}>
          {current.reading}
          {current.romanization && (
            <span style={{ fontSize: '13px', marginLeft: '8px' }}>
              · {current.romanization}
            </span>
          )}
        </p>

        {reveal === 'kanji' && (
          <button className="btn btn-primary" onClick={handleRevealMeaning}
            style={{ marginTop: '4px' }}>
            Reveal meaning
          </button>
        )}

        {reveal !== 'kanji' && (
          <div style={{ animation: 'fadeIn 0.2s ease', width: '100%' }}>
            <div style={{
              fontSize: '24px', fontWeight: 600, marginBottom: '16px',
              padding: '12px 20px', background: 'var(--bg)',
              borderRadius: '12px', border: '1px solid var(--border)',
              display: 'inline-block',
            }}>
              {current.meaning}
            </div>

            {reveal === 'meaning' && (
              <div>
                <button className="btn" style={{ fontSize: '13px' }}
                  onClick={() => setReveal('example')}>
                  Show example sentence →
                </button>
              </div>
            )}

            {reveal === 'example' && (
              <div style={{ animation: 'fadeIn 0.2s ease' }}>
                <div style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '12px 16px',
                  fontSize: '14px', lineHeight: 1.7, textAlign: 'left',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                    marginBottom: current.example_translation ? '8px' : '0',
                  }}>
                    <span style={{ fontSize: '16px', marginTop: '2px' }}>💬</span>
                    <span style={{
                      flex: 1, color: 'var(--fg)',
                      fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", "Noto Sans SC", serif',
                    }}>
                      {current.example}
                    </span>
                    <button
                      onClick={() => handleSpeak(current.example)}
                      title="Play example sentence"
                      style={{
                        flexShrink: 0, width: '32px', height: '32px',
                        borderRadius: '50%', border: '1px solid #444',
                        background: speaking ? '#0F6E56' : '#2a2a2a',
                        cursor: 'pointer', fontSize: '14px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      🔊
                    </button>
                  </div>

                  {current.example_translation && (
                    <div style={{
                      borderTop: '1px solid var(--border)', paddingTop: '8px',
                      fontSize: '13px', color: 'var(--muted)',
                      fontStyle: 'italic', paddingLeft: '24px',
                    }}>
                      {current.example_translation}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SRS buttons */}
      {reveal !== 'kanji' && (
        <div style={{ animation: 'fadeIn 0.25s ease' }}>
          <p style={{
            fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--muted)', fontWeight: 500, textAlign: 'center', marginBottom: '10px',
          }}>
            How did you do?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {([
              { r: 'wrong', label: 'Again', sub: '1d',  color: '#E24B4A', bg: '#FCEBEB' },
              { r: 'hard',  label: 'Hard',  sub: '3d',  color: '#BA7517', bg: '#FAEEDA' },
              { r: 'good',  label: 'Good',  sub: '7d',  color: '#0F6E56', bg: '#E1F5EE' },
              { r: 'easy',  label: 'Easy',  sub: '30d', color: '#185FA5', bg: '#E6F1FB' },
            ] as { r: Rating; label: string; sub: string; color: string; bg: string }[])
              .map(({ r, label, sub, color, bg }) => (
                <button key={r} disabled={rating} onClick={() => handleRate(r)}
                  style={{
                    padding: '10px 0', border: `1px solid ${color}`,
                    borderRadius: '10px', background: bg, color,
                    fontSize: '13px', fontWeight: 500,
                    cursor: rating ? 'not-allowed' : 'pointer',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '2px',
                    opacity: rating ? 0.5 : 1,
                    transition: 'opacity 0.15s', fontFamily: 'inherit',
                  }}>
                  <span>{label}</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>{sub}</span>
                </button>
              ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '2rem 1rem 4rem', background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: '680px',
        display: 'flex', alignItems: 'center', marginBottom: '1.5rem',
      }}>
        <button className="btn" style={{ fontSize: '13px' }} onClick={onBack}>← Back</button>
        <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '1rem', letterSpacing: '-0.02em' }}>
          言語道場
        </span>
      </div>
      <div style={{
        width: '100%', maxWidth: '680px', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem',
      }}>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}

function Spinner() {
  return (
    <div style={{
      width: '24px', height: '24px',
      border: '2px solid var(--border)', borderTopColor: 'var(--muted)',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto',
    }} />
  );
}
