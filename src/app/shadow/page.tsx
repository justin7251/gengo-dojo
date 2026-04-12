/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

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

interface RoundResult { word: Word; score: number; heard: string; rating: Rating; }

function getSpeechRecognition(): any | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

function speakText(text: string, targetLang: TargetLang, rate = 0.75): Promise<void> {
  return new Promise(resolve => {
    if (typeof window === 'undefined') { resolve(); return; }
    window.speechSynthesis.cancel();
    const utter    = new SpeechSynthesisUtterance(text);
    utter.lang     = VOICE_LANG[targetLang] ?? 'ja-JP';
    utter.rate     = rate;
    const voices   = window.speechSynthesis.getVoices();
    const langCode = VOICE_LANG[targetLang].split('-')[0];
    const native   = voices.find(v => v.lang.startsWith(langCode));
    if (native) utter.voice = native;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
  });
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function scoreAttempt(expected: string, heard: string): number {
  if (!heard.trim()) return 0;
  const normalise = (s: string) => s.toLowerCase().replace(/[。、！？,.!?「」『』【】\s]+/g, ' ').trim();
  const exp = normalise(expected).split(' ').filter(Boolean);
  const got = normalise(heard).split(' ').filter(Boolean);
  if (!exp.length) return 0;
  let matched = 0;
  const copy = [...got];
  for (const w of exp) {
    const idx = copy.findIndex(g => g === w || g.includes(w) || w.includes(g) || levenshtein(g, w) <= 1);
    if (idx !== -1) { matched++; copy.splice(idx, 1); }
  }
  return Math.round((matched / exp.length) * 100);
}

function scoreToRating(s: number): Rating { return s >= 90 ? 'easy' : s >= 70 ? 'good' : s >= 50 ? 'hard' : 'wrong'; }
function scoreColor(s: number) { return s >= 80 ? '#00e87a' : s >= 60 ? '#EF9F27' : '#E24B4A'; }
function scoreBorderColor(s: number) { return s >= 80 ? 'rgba(0,232,122,0.4)' : s >= 60 ? 'rgba(239,159,39,0.4)' : 'rgba(226,75,74,0.4)'; }
function scoreLabel(s: number) { return s >= 90 ? 'Perfect! 🎯' : s >= 80 ? 'Excellent! ✨' : s >= 70 ? 'Good 👍' : s >= 50 ? 'Getting there 💪' : 'Try again 🔄'; }

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
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recognitionRef  = useRef<any>(null);
  const recordTimerRef  = useRef<NodeJS.Timeout | null>(null);

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
      setQueue(ws.filter(w => w.example?.trim()).sort(() => Math.random() - 0.5).slice(0, 10));
      setLoading(false);
    });
  }, []);

  const current = queue[idx];
  const pct     = queue.length ? Math.round((idx / queue.length) * 100) : 0;

  async function handlePlay() {
    if (!current || playing) return;
    setPlaying(true); setCurrentScore(null); setHeardText(''); setRecordState('idle');
    await speakText(current.example, targetLang, 0.7);
    setPlaying(false);
  }

  async function handleRecord() {
    if (!current || recordState === 'listening' || playing) return;
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    setRecordState('listening'); setCurrentScore(null); setHeardText(''); setRecordSeconds(5);

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.lang = VOICE_LANG[targetLang];
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    let resultReceived = false;

    recognition.onresult = (event: any) => {
      resultReceived = true;
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
      if (prev && uid) rateWord(uid, current.id, rating, prev, targetLang, nativeLang);
    };

    recognition.onerror = (event: any) => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recognitionRef.current = null;
      if (event.error === 'not-allowed') { setHeardText('Microphone access denied'); setMicSupported(false); }
      else if (event.error !== 'aborted') setHeardText('No speech detected — try again');
      setRecordState('idle'); setRecordSeconds(0);
    };

    recognition.onend = () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recognitionRef.current = null;
      if (!resultReceived) { setRecordState('idle'); setRecordSeconds(0); if (!heardText) setHeardText('No speech detected — try again'); }
    };

    recognition.start();
    recordTimerRef.current = setInterval(() => {
      setRecordSeconds(s => {
        if (s <= 1) { if (recordTimerRef.current) clearInterval(recordTimerRef.current); try { recognition.stop(); } catch {} return 0; }
        return s - 1;
      });
    }, 1000);
  }

  function handleNext() {
    const next = idx + 1;
    if (next >= queue.length) { setPhase('results'); return; }
    setIdx(next); setRecordState('idle'); setCurrentScore(null); setHeardText('');
  }

  function restart() {
    setQueue(words.filter(w => w.example?.trim()).sort(() => Math.random() - 0.5).slice(0, 10));
    setIdx(0); setResults([]); setRecordState('idle'); setCurrentScore(null); setHeardText(''); setPhase('playing');
  }

  if (loading) return <Screen><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><Spinner /></div></Screen>;

  if (!queue.length) return (
    <Screen>
      <TopBar onBack={() => router.push('/dashboard')} />
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p style={{ fontSize: '40px', marginBottom: '1rem' }}>🎤</p>
        <p style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>No words yet</p>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>Generate vocabulary from the dashboard.</p>
        <button onClick={() => router.push('/dashboard')} style={WHITE_BTN}>Go to dashboard</button>
      </div>
    </Screen>
  );

  if (phase === 'intro') return (
    <Screen>
      <TopBar onBack={() => router.push('/dashboard')} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: '80px', marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(239,159,39,0.5))' }}>🎤</div>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Shadow Mode</h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', lineHeight: 1.7 }}>
          Listen to an example sentence.<br />Repeat it out loud.<br />Your pronunciation is scored instantly.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '2rem', width: '100%' }}>
          {[{ label: 'Sentences', value: queue.length }, { label: 'Score ≥90', value: '30d boost' }, { label: 'Score <50', value: 'Reset' }].map(s => (
            <div key={s.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px', border: '1px solid rgba(239,159,39,0.15)' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', letterSpacing: '0.06em' }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
        {!micSupported && (
          <div style={{ background: 'rgba(239,159,39,0.1)', border: '1px solid rgba(239,159,39,0.3)', borderRadius: '12px', padding: '12px', fontSize: '13px', color: 'rgba(255,200,100,0.8)', marginBottom: '1.5rem', lineHeight: 1.6, width: '100%' }}>
            ⚠️ Works best in Chrome or Edge on desktop.
          </div>
        )}
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px 16px', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', lineHeight: 1.9, textAlign: 'left', width: '100%', border: '1px solid rgba(239,159,39,0.1)' }}>
          <div>1. Tap <strong style={{ color: '#fff' }}>▶ Play</strong> to hear the sentence</div>
          <div>2. Tap <strong style={{ color: '#fff' }}>🎤 Record</strong> and repeat aloud</div>
          <div>3. See your score and move on</div>
        </div>
        <button onClick={() => setPhase('playing')} style={{ ...WHITE_BTN, width: '100%', padding: '16px', fontSize: '16px' }}>
          Start shadowing →
        </button>
      </div>
    </Screen>
  );

  if (phase === 'results') {
    const avg = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
    return (
      <Screen>
        <TopBar onBack={() => router.push('/dashboard')} />
        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>{avg >= 80 ? '🏆' : avg >= 60 ? '💪' : '📖'}</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Session complete</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>Average score: {avg}%</p>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', width: '100%', marginBottom: '2rem', overflow: 'hidden' }}>
            <div style={{ height: '4px', borderRadius: '2px', width: `${avg}%`, background: scoreColor(avg), transition: 'width 0.6s ease', boxShadow: `0 0 8px ${scoreColor(avg)}` }} />
          </div>
          <div style={{ width: '100%', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '2rem' }}>
            {results.map((r, i) => (
              <div key={`${r.word.id}-${i}`} style={{ padding: '12px 14px', borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', borderLeft: `3px solid ${scoreColor(r.score)}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px', fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: '#fff' }}>{r.word.kanji}</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{r.word.meaning}</span>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: scoreColor(r.score), fontFamily: 'var(--font-mono)' }}>{r.score}%</span>
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontFamily: '"Noto Sans JP","Noto Sans SC",serif' }}>Expected: {r.word.example}</p>
                <p style={{ fontSize: '11px', color: r.score >= 70 ? '#00e87a' : '#ff8080', fontFamily: '"Noto Sans JP","Noto Sans SC",serif' }}>Heard: {r.heard || '—'}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={restart} style={WHITE_BTN}>Practice again</button>
            <button onClick={() => router.push('/dashboard')} style={GHOST_BTN}>Dashboard</button>
          </div>
        </div>
      </Screen>
    );
  }

  if (!current) return null;

  return (
    <Screen>
      <TopBar onBack={() => { recognitionRef.current?.abort(); router.push('/dashboard'); }} />

      {/* Progress */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px', fontFamily: 'var(--font-mono)' }}>
          <span>{idx + 1} / {queue.length}</span><span>{pct}%</span>
        </div>
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.12)', borderRadius: '1px' }}>
          <div style={{ height: '2px', background: '#EF9F27', borderRadius: '1px', width: `${pct}%`, transition: 'width 0.4s', boxShadow: '0 0 6px rgba(239,159,39,0.5)' }} />
        </div>
      </div>

      {/* Word */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{ fontSize: '28px', fontWeight: 600, fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: '#fff' }}>{current.kanji}</span>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{current.reading} · {current.meaning}</span>
        </div>
        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(239,159,39,0.12)', color: '#EF9F27', border: '1px solid rgba(239,159,39,0.25)' }}>{current.topic}</span>
      </div>

      {/* Sentence card */}
      <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ fontSize: '18px', lineHeight: 1.8, color: '#fff', marginBottom: '10px', fontFamily: '"Noto Sans JP","Noto Sans SC",serif' }}>
          {current.example}
        </p>
        {current.example_translation && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            {current.example_translation}
          </p>
        )}
      </div>

      {/* Play button */}
      <button onClick={handlePlay} disabled={playing || recordState === 'listening'} style={{
        width: '100%', padding: '14px', borderRadius: '12px',
        borderWidth: '1px', borderStyle: 'solid',
        borderColor: playing ? 'rgba(239,159,39,0.6)' : 'rgba(255,255,255,0.15)',
        background: playing ? 'rgba(239,159,39,0.15)' : 'rgba(255,255,255,0.06)',
        color: playing ? '#EF9F27' : '#fff',
        fontSize: '15px', fontWeight: 500, cursor: playing ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-ui)', marginBottom: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        transition: 'all 0.15s',
      }}>
        {playing ? <><SoundWave />Playing…</> : <>▶ Play sentence</>}
      </button>

      {/* Record button */}
      <button onClick={handleRecord} disabled={playing || recordState === 'listening' || recordState === 'scoring'} style={{
        width: '100%', padding: '14px', borderRadius: '12px',
        borderWidth: '1px', borderStyle: 'solid',
        borderColor: recordState === 'listening' ? 'rgba(226,75,74,0.6)' : 'rgba(255,255,255,0.15)',
        background: recordState === 'listening' ? 'rgba(226,75,74,0.15)' : 'rgba(255,255,255,0.06)',
        color: recordState === 'listening' ? '#ff8080' : '#fff',
        fontSize: '15px', fontWeight: 500,
        cursor: (playing || recordState === 'listening' || recordState === 'scoring') ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font-ui)', marginBottom: recordState === 'listening' ? '8px' : '1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        transition: 'all 0.15s',
      }}>
        {recordState === 'listening'
          ? <><RecordDot />Listening… <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', opacity: 0.7 }}>{recordSeconds}s</span></>
          : recordState === 'scoring' ? <>⏳ Scoring…</>
          : <>🎤 Record your attempt</>}
      </button>

      {/* Manual stop */}
      {recordState === 'listening' && (
        <button onClick={() => { if (recordTimerRef.current) clearInterval(recordTimerRef.current); try { recognitionRef.current?.stop(); } catch {} setRecordState('idle'); setRecordSeconds(0); }}
          style={{ width: '100%', padding: '8px', borderWidth: '1px', borderStyle: 'solid', borderColor: 'rgba(226,75,74,0.3)', borderRadius: '8px', background: 'transparent', color: '#ff8080', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-ui)', marginBottom: '1.5rem' }}>
          ■ Stop recording
        </button>
      )}

      {/* Score */}
      {currentScore !== null && (
        <div style={{ animation: 'fadeIn 0.3s ease', marginBottom: '1.5rem' }}>
          <div style={{ padding: '16px', borderRadius: '14px', background: `${scoreColor(currentScore)}15`, borderWidth: '1px', borderStyle: 'solid', borderColor: scoreBorderColor(currentScore), textAlign: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '40px', fontWeight: 700, color: scoreColor(currentScore), marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>{currentScore}%</div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: scoreColor(currentScore) }}>{scoreLabel(currentScore)}</div>
          </div>
          {heardText && (
            <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '10px' }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>I HEARD</p>
              <p style={{ fontSize: '14px', color: '#fff', fontFamily: '"Noto Sans JP","Noto Sans SC",serif' }}>{heardText}</p>
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentScore < 70 && (
              <button className="btn" style={{ flex: 1, fontSize: '13px', color: '#fff', borderColor: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)' }}
                onClick={() => { setCurrentScore(null); setHeardText(''); setRecordState('idle'); }}>
                Try again
              </button>
            )}
            <button onClick={handleNext} style={{ ...WHITE_BTN, flex: 1 }}>
              {idx + 1 >= queue.length ? 'See results' : 'Next →'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes wave { 0%,100%{height:4px} 50%{height:14px} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
      `}</style>
    </Screen>
  );
}

function SoundWave() {
  return (
    <span style={{ display: 'inline-flex', gap: '2px', alignItems: 'center', height: '16px' }}>
      {[1,2,3,4].map(i => (
        <span key={i} style={{ display: 'inline-block', width: '3px', background: '#EF9F27', borderRadius: '2px', animation: `wave 0.8s ease-in-out infinite`, animationDelay: `${i * 0.1}s` }} />
      ))}
    </span>
  );
}

function RecordDot() {
  return <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#E24B4A', animation: 'pulse 1s ease-in-out infinite' }} />;
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#1a1000',
      backgroundImage: 'radial-gradient(ellipse at top, #3d2800 0%, #1a1000 50%, #0d0800 100%)',
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1.25rem 2rem', fontFamily: 'var(--font-ui)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(239,159,39,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(239,159,39,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </main>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <button onClick={onBack} style={GHOST_BTN}>← Back</button>
      <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>🎤 Shadow</span>
      <div style={{ width: '60px' }} />
    </div>
  );
}

const WHITE_BTN: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', color: '#1a1000', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' };
const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };

function Spinner() {
  return <div style={{ width: '28px', height: '28px', border: '2px solid rgba(239,159,39,0.2)', borderTopColor: '#EF9F27', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}
