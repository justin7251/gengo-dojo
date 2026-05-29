/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { Spinner } from '@/components/Spinner';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { Word, Progress, Rating, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';

export default function ShadowPage() {
  return <AuthGuard><Shadow /></AuthGuard>;
}

type Phase       = 'intro' | 'playing' | 'results';
type RecordState = 'idle' | 'listening' | 'scoring' | 'done';

interface RoundResult {
  word:   Word;
  score:  number;
  heard:  string;
  rating: Rating;
}

// ── Speech helpers ────────────────────────────────────

function getSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition
      || (window as any).webkitSpeechRecognition
      || null;
}

function speakText(text: string, targetLang: TargetLang, rate = 0.75): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(); return; }
    window.speechSynthesis.cancel();
    const utter    = new SpeechSynthesisUtterance(text);
    utter.lang     = VOICE_LANG[targetLang] ?? 'ja-JP';
    utter.rate     = rate;
    const voices   = window.speechSynthesis.getVoices();
    const langCode = VOICE_LANG[targetLang].split('-')[0];
    const native   = voices.find(v => v.lang.startsWith(langCode));
    if (native) utter.voice = native;
    utter.onend  = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

// ── Scoring ───────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function scoreAttempt(expected: string, heard: string): number {
  if (!heard.trim()) return 0;
  const normalise = (s: string) =>
    s.toLowerCase()
     .replace(/[。、！？,.!?「」『』【】\s]+/g, ' ')
     .trim();
  const exp = normalise(expected).split(' ').filter(Boolean);
  const got = normalise(heard).split(' ').filter(Boolean);
  if (!exp.length) return 0;
  let matched = 0;
  const gotCopy = [...got];
  for (const word of exp) {
    const idx = gotCopy.findIndex(g =>
      g === word || g.includes(word) || word.includes(g) || levenshtein(g, word) <= 1
    );
    if (idx !== -1) { matched++; gotCopy.splice(idx, 1); }
  }
  return Math.round((matched / exp.length) * 100);
}

function scoreToRating(score: number): Rating {
  if (score >= 90) return 'easy';
  if (score >= 70) return 'good';
  if (score >= 50) return 'hard';
  return 'wrong';
}

function scoreColor(score: number): string {
  if (score >= 80) return '#0F6E56';
  if (score >= 60) return '#854F0B';
  return '#A32D2D';
}

function scoreBg(score: number): string {
  if (score >= 80) return '#E1F5EE';
  if (score >= 60) return '#FAEEDA';
  return '#FCEBEB';
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Perfect! 🎯';
  if (score >= 80) return 'Excellent! ✨';
  if (score >= 70) return 'Good 👍';
  if (score >= 50) return 'Getting there 💪';
  return 'Try again 🔄';
}

// ── Main component ────────────────────────────────────

function Shadow() {
  const router = useRouter();

  const [uid, setUid]                   = useState('');
  const [targetLang, setTargetLang]     = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang]     = useState<NativeLang>('en');
  const [words, setWords]               = useState<Word[]>([]);
  const [progress, setProgress]         = useState<Record<string, Progress>>({});
  const [queue, setQueue]               = useState<Word[]>([]);
  const [phase, setPhase]               = useState<Phase>('intro');
  const [idx, setIdx]                   = useState(0);
  const [recordState, setRecordState]   = useState<RecordState>('idle');
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [heardText, setHeardText]       = useState('');
  const [results, setResults]           = useState<RoundResult[]>([]);
  const [loading, setLoading]           = useState(true);
  const [micSupported, setMicSupported] = useState(true);
  const [playing, setPlaying]           = useState(false);
  const recognitionRef                  = useRef<any>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    if (!getSpeechRecognition()) setMicSupported(false);
    return () => {
      window.speechSynthesis.cancel();
      recognitionRef.current?.abort();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      setTargetLang(profile.targetLang);
      setNativeLang(profile.nativeLang);
      const [ws, prog] = await Promise.all([
        getUserWords(user.uid, profile.targetLang, profile.nativeLang),
        getProgress(user.uid, profile.targetLang, profile.nativeLang),
      ]);
      setWords(ws);
      setProgress(prog);
      const withExamples = ws
        .filter(w => w.example?.trim())
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);
      setQueue(withExamples);
      setLoading(false);
    });
  }, []);

  const current = queue[idx];
  const pct     = queue.length ? Math.round((idx / queue.length) * 100) : 0;

  async function handlePlay() {
    if (!current || playing) return;
    setPlaying(true);
    setCurrentScore(null);
    setHeardText('');
    setRecordState('idle');
    await speakText(current.example, targetLang, 0.7);
    setPlaying(false);
  }

  async function handleRecord() {
    if (!current || recordState === 'listening' || playing) return;
    const SpeechRecognitionCtor = getSpeechRecognition();
    if (!SpeechRecognitionCtor) return;

    setRecordState('listening');
    setRecordSeconds(5);
    setCurrentScore(null);
    setHeardText('');

    const recognition = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;

    recognition.lang             = VOICE_LANG[targetLang];
    recognition.continuous       = false;
    recognition.interimResults   = false;
    recognition.maxAlternatives  = 1;

    let resultReceived = false;

    recognition.onresult = (event: any) => {
      resultReceived = true;
      // Stop everything immediately on result
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recognition.stop();

      const transcript = event.results[0][0].transcript;
      setHeardText(transcript);
      setRecordState('scoring');
      const score  = scoreAttempt(current.example, transcript);
      const rating = scoreToRating(score);
      setCurrentScore(score);
      setRecordState('done');
      setResults(prev => [...prev, { word: current, score, heard: transcript, rating }]);
      const prev = progress[current.id];
      if (prev && uid) {
        rateWord(uid, current.id, rating, prev, targetLang, nativeLang);
      }
    };

    recognition.onerror = (event: any) => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recognitionRef.current = null;
      if (event.error === 'no-speech') {
        setHeardText('No speech detected — try again');
      } else if (event.error === 'not-allowed') {
        setHeardText('Microphone access denied');
        setMicSupported(false);
      } else if (event.error === 'aborted') {
        // User manually stopped — ignore
        return;
      } else {
        setHeardText(`Error: ${event.error}`);
      }
      setRecordState('idle');
      setRecordSeconds(0);
    };

    recognition.onend = () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recognitionRef.current = null;
      if (!resultReceived) {
        setRecordState('idle');
        setRecordSeconds(0);
        if (!heardText) setHeardText('No speech detected — try again');
      }
    };

    recognition.start();

    // Countdown timer — force stop at 0
    setRecordSeconds(5);
    recordTimerRef.current = setInterval(() => {
      setRecordSeconds(s => {
        if (s <= 1) {
          // Force stop recognition
          if (recordTimerRef.current) clearInterval(recordTimerRef.current);
          try { recognition.stop(); } catch {}
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function handleNext() {
    const next = idx + 1;
    if (next >= queue.length) { setPhase('results'); return; }
    setIdx(next);
    setRecordState('idle');
    setCurrentScore(null);
    setHeardText('');
  }

  function restart() {
    const withExamples = words
      .filter(w => w.example?.trim())
      .sort(() => Math.random() - 0.5)
      .slice(0, 10);
    setQueue(withExamples);
    setIdx(0);
    setResults([]);
    setRecordState('idle');
    setCurrentScore(null);
    setHeardText('');
    setPhase('playing');
  }

  // ── Loading ───────────────────────────────────────────
  if (loading) {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div>
      </Shell>
    );
  }

  // ── No words ──────────────────────────────────────────
  if (!queue.length) {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '1rem' }}>🎤</div>
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

  // ── Intro ─────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: '52px', marginBottom: '1rem' }}>🎤</div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Shadow mode</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.7 }}>
            Listen to an example sentence.<br />
            Then repeat it out loud.<br />
            Your pronunciation is scored instantly.
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px', marginBottom: '2rem',
          }}>
            {[
              { label: 'Sentences', value: queue.length },
              { label: 'Score ≥90', value: '30d boost' },
              { label: 'Score <50', value: 'Reset' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '14px',
              }}>
                <div style={{ fontSize: '18px', fontWeight: 600 }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {!micSupported && (
            <div style={{
              background: '#FAEEDA', border: '1px solid #BA7517',
              borderRadius: '12px', padding: '12px 16px',
              fontSize: '13px', color: '#854F0B',
              marginBottom: '1.5rem', lineHeight: 1.6,
            }}>
              ⚠️ Your browser may not support speech recognition.<br />
              Works best in Chrome or Edge on desktop.
            </div>
          )}

          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '14px 16px',
            fontSize: '13px', color: 'var(--muted)',
            marginBottom: '2rem', lineHeight: 1.7, textAlign: 'left',
          }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
              <span>1.</span><span>Tap <strong>▶ Play</strong> to hear the sentence</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
              <span>2.</span><span>Tap <strong>🎤 Record</strong> and repeat it aloud</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span>3.</span><span>See your score and move to the next sentence</span>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            onClick={() => setPhase('playing')}
          >
            Start shadowing →
          </button>
        </div>
      </Shell>
    );
  }

  // ── Results ───────────────────────────────────────────
  if (phase === 'results') {
    const avg   = results.length
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
      : 0;
    const emoji = avg >= 80 ? '🏆' : avg >= 60 ? '💪' : '📖';

    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: '52px', marginBottom: '1rem' }}>{emoji}</div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>
            Session complete
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
            Average score: {avg}%
          </p>

          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              height: '8px', background: 'var(--surface)',
              borderRadius: '4px', overflow: 'hidden',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                height: '100%', width: `${avg}%`, borderRadius: '4px',
                background: avg >= 80 ? 'var(--teal)' : avg >= 60 ? '#EF9F27' : '#E24B4A',
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>

          <div style={{
            textAlign: 'left',
            border: '1px solid var(--border)', borderRadius: '12px',
            overflow: 'hidden', marginBottom: '2rem',
          }}>
            <div style={{
              padding: '10px 16px', background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              fontSize: '11px', textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500,
            }}>
              Results
            </div>
            {results.map((r, i) => (
              <div key={`${r.word.id}-${i}`} style={{
                padding: '12px 16px',
                borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                borderLeft: `3px solid ${scoreColor(r.score)}`,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: '6px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '20px',
                      fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
                      color: 'var(--fg)',
                    }}>
                      {r.word.kanji}
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      {r.word.meaning}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '13px', fontWeight: 600,
                    padding: '3px 10px', borderRadius: '99px',
                    background: scoreBg(r.score),
                    color: scoreColor(r.score),
                  }}>
                    {r.score}%
                  </span>
                </div>
                <p style={{
                  fontSize: '12px', color: 'var(--muted)', marginBottom: '2px',
                  fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
                }}>
                  Expected: {r.word.example}
                </p>
                <p style={{
                  fontSize: '12px',
                  color: r.score >= 70 ? '#0F6E56' : '#A32D2D',
                  fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
                }}>
                  Heard: {r.heard || '—'}
                </p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={restart}>Practice again</button>
            <button className="btn" onClick={() => router.push('/dashboard')}>Dashboard</button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Playing ───────────────────────────────────────────
  if (!current) return null;

  return (
    <Shell onBack={() => { recognitionRef.current?.abort(); router.push('/dashboard'); }}>

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

      {/* Word */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{
            fontSize: '28px', fontWeight: 600,
            fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
            color: 'var(--fg)',
          }}>
            {current.kanji}
          </span>
          <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
            {current.reading} · {current.meaning}
          </span>
        </div>
        <span className="pill pill-gray">{current.topic}</span>
      </div>

      {/* Sentence card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '1.5rem',
        marginBottom: '1.5rem', textAlign: 'center',
      }}>
        <p style={{
          fontSize: '18px', lineHeight: 1.8, color: 'var(--fg)', marginBottom: '12px',
          fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", "Noto Sans SC", serif',
        }}>
          {current.example}
        </p>
        {current.example_translation && (
          <p style={{
            fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic',
            paddingTop: '10px', borderTop: '1px solid var(--border)',
          }}>
            {current.example_translation}
          </p>
        )}
      </div>

      {/* Play button */}
      <button
        onClick={handlePlay}
        disabled={playing || recordState === 'listening'}
        style={{
          width: '100%', padding: '14px',
          borderWidth: '1px', borderStyle: 'solid',
          borderColor: playing ? 'var(--teal)' : 'var(--border)',
          borderRadius: '12px',
          background: playing ? 'var(--teal-light)' : 'var(--surface)',
          color: playing ? 'var(--teal-dark)' : 'var(--fg)',
          fontSize: '15px', fontWeight: 500,
          cursor: playing ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', transition: 'all 0.15s',
          marginBottom: '10px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        {playing ? <><SoundWave /> Playing…</> : <>▶ Play sentence</>}
      </button>

      {/* Record button */}
      <button
        onClick={handleRecord}
        disabled={playing || recordState === 'listening' || recordState === 'scoring'}
        style={{
          width: '100%', padding: '14px',
          borderWidth: '1px', borderStyle: 'solid',
          borderColor: recordState === 'listening' ? '#E24B4A' : 'var(--border)',
          borderRadius: '12px',
          background: recordState === 'listening' ? '#FCEBEB' : 'var(--bg)',
          color: recordState === 'listening' ? '#A32D2D' : 'var(--fg)',
          fontSize: '15px', fontWeight: 500,
          cursor: (playing || recordState === 'listening' || recordState === 'scoring')
            ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', transition: 'all 0.15s',
          marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}
      >
        {recordState === 'listening' ? (
          <>
            <RecordDot />
            Listening… {recordSeconds > 0 && (
              <span style={{
                marginLeft: '6px',
                fontSize: '13px',
                fontVariantNumeric: 'tabular-nums',
                opacity: 0.7,
              }}>
                {recordSeconds}s
              </span>
            )}
          </>
        ) : recordState === 'scoring' ? (
          <>⏳ Scoring…</>
        ) : (
          <>🎤 Record your attempt</>
        )}
      </button>

      globals{/* Manual stop — important for mobile */}
      {recordState === 'listening' && (
        <button
          onClick={() => {
            if (recordTimerRef.current) clearInterval(recordTimerRef.current);
            try { recognitionRef.current?.stop(); } catch {}
            setRecordState('idle');
            setRecordSeconds(0);
          }}
          style={{
            width: '100%', padding: '10px',
            borderWidth: '1px', borderStyle: 'solid', borderColor: '#E24B4A',
            borderRadius: '10px', background: 'transparent',
            color: '#A32D2D', fontSize: '13px', cursor: 'pointer',
            fontFamily: 'inherit', marginBottom: '1rem',
            transition: 'all 0.15s',
          }}
        >
          ■ Stop recording
        </button>
      )}

      {/* Score result */}
      {currentScore !== null && (
        <div style={{ animation: 'fadeIn 0.3s ease', marginBottom: '1.5rem' }}>
          <div style={{
            padding: '16px', borderRadius: '14px',
            background: scoreBg(currentScore),
            borderWidth: '1px', borderStyle: 'solid',
            borderColor: currentScore >= 80 ? '#1D9E75'
              : currentScore >= 60 ? '#BA7517' : '#E24B4A',
            textAlign: 'center', marginBottom: '12px',
          }}>
            <div style={{
              fontSize: '36px', fontWeight: 600,
              color: scoreColor(currentScore), marginBottom: '4px',
            }}>
              {currentScore}%
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: scoreColor(currentScore) }}>
              {scoreLabel(currentScore)}
            </div>
          </div>

          {heardText && (
            <div style={{
              padding: '12px 16px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '10px', marginBottom: '12px',
            }}>
              <p style={{
                fontSize: '11px', textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--muted)',
                fontWeight: 500, marginBottom: '6px',
              }}>
                I heard
              </p>
              <p style={{
                fontSize: '14px', color: 'var(--fg)',
                fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
              }}>
                {heardText}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            {currentScore < 70 && (
              <button
                className="btn"
                style={{ flex: 1, fontSize: '13px' }}
                onClick={() => { setCurrentScore(null); setHeardText(''); setRecordState('idle'); }}
              >
                Try again
              </button>
            )}
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleNext}>
              {idx + 1 >= queue.length ? 'See results' : 'Next →'}
            </button>
          </div>
        </div>
      )}

    </Shell>
  );
}

// ── Animated indicators ───────────────────────────────

function SoundWave() {
  return (
    <span style={{ display: 'inline-flex', gap: '2px', alignItems: 'center', height: '16px' }}>
      {[1, 2, 3, 4].map(i => (
        <span key={i} style={{
          display: 'inline-block', width: '3px',
          background: 'var(--teal-dark)', borderRadius: '2px',
          animation: 'wave 0.8s ease-in-out infinite',
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
      <style>{`@keyframes wave { 0%,100%{height:4px} 50%{height:14px} }`}</style>
    </span>
  );
}

function RecordDot() {
  return (
    <span style={{
      display: 'inline-block', width: '10px', height: '10px',
      borderRadius: '50%', background: '#E24B4A',
      animation: 'pulse 1s ease-in-out infinite',
    }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }`}</style>
    </span>
  );
}

// ── Shell ─────────────────────────────────────────────
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
          🎤 Shadow
        </span>
      </div>
      <div style={{
        width: '100%', maxWidth: '680px', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem',
      }}>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </main>
  );
}

