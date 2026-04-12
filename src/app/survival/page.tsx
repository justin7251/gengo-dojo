'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { Word, Progress, Rating, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import { isDue } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function SurvivalPage() {
  return <AuthGuard><Survival /></AuthGuard>;
}

const MAX_LIVES  = 3;
const TIME_PER_Q = 8;
const MAX_WORDS  = 15;

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

type Phase    = 'intro' | 'playing' | 'dead' | 'cleared';
type Question = { word: Word; choices: string[]; correct: string };

function buildQueue(words: Word[], progress: Record<string, Progress>): Word[] {
  const due  = words.filter(w => progress[w.id] && isDue(progress[w.id]));
  const rest = words.filter(w => !progress[w.id] || !isDue(progress[w.id]));
  return [...due, ...rest.sort(() => Math.random() - 0.5)].slice(0, MAX_WORDS);
}

function buildQuestion(word: Word, allWords: Word[]): Question {
  const distractors = allWords
    .filter(w => w.id !== word.id)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map(w => w.meaning);
  return { word, choices: [...distractors, word.meaning].sort(() => Math.random() - 0.5), correct: word.meaning };
}

function Survival() {
  const router = useRouter();

  const [uid, setUid]               = useState('');
  const [targetLang, setTargetLang] = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang] = useState<NativeLang>('en');
  const [allWords, setAllWords]     = useState<Word[]>([]);
  const [progress, setProgress]     = useState<Record<string, Progress>>({});
  const [queue, setQueue]           = useState<Word[]>([]);
  const [phase, setPhase]           = useState<Phase>('intro');
  const [idx, setIdx]               = useState(0);
  const [question, setQuestion]     = useState<Question | null>(null);
  const [lives, setLives]           = useState(MAX_LIVES);
  const [timeLeft, setTimeLeft]     = useState(TIME_PER_Q);
  const [selected, setSelected]     = useState('');
  const [answered, setAnswered]     = useState(false);
  const [loading, setLoading]       = useState(true);
  const [stats, setStats]           = useState({ correct: 0, wrong: 0 });
  const [wrongWords, setWrongWords] = useState<Word[]>([]);
  const timerRef                    = useRef<NodeJS.Timeout | null>(null);
  const advancingRef                = useRef(false);
  const livesRef                    = useRef(MAX_LIVES);

  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => { livesRef.current = lives; }, [lives]);

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
      setAllWords(words);
      setProgress(prog);
      setLoading(false);
    });
  }, []);

  function stopTimer() { if (timerRef.current) clearInterval(timerRef.current); }

  const advanceToNext = useCallback((currentIdx: number, currentQueue: Word[], currentWrongWords: Word[]) => {
    advancingRef.current = false;
    const next = currentIdx + 1;
    if (next >= currentQueue.length) { setPhase('cleared'); return; }
    const nextWord = currentQueue[next];
    setIdx(next);
    setQuestion(buildQuestion(nextWord, allWords));
    setAnswered(false);
    setSelected('');
    speak(nextWord.kanji, targetLang);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_Q);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; } return t - 1; });
    }, 1000);
  }, [allWords, targetLang]);

  function startGame() {
    const q = buildQueue(allWords, progress);
    setQueue(q); setIdx(0); setLives(MAX_LIVES); livesRef.current = MAX_LIVES;
    setStats({ correct: 0, wrong: 0 }); setWrongWords([]);
    setPhase('playing');
    setQuestion(buildQuestion(q[0], allWords));
    setAnswered(false); setSelected('');
    speak(q[0].kanji, targetLang);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_Q);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; } return t - 1; });
    }, 1000);
  }

  useEffect(() => {
    if (phase !== 'playing' || timeLeft !== 0 || answered || advancingRef.current) return;
    advancingRef.current = true;
    setAnswered(true); setSelected('__timeout__');
    const currentWord = queue[idx];
    const newLives = livesRef.current - 1;
    setLives(newLives); livesRef.current = newLives;
    setStats(s => ({ ...s, wrong: s.wrong + 1 }));
    setWrongWords(w => [...w, currentWord]);
    const prev = progress[currentWord?.id];
    if (prev && uid) rateWord(uid, currentWord.id, 'wrong', prev, targetLang, nativeLang);
    if (newLives <= 0) { setTimeout(() => setPhase('dead'), 1400); }
    else { setTimeout(() => { setWrongWords(ww => { advanceToNext(idx, queue, ww); return ww; }); }, 1400); }
  }, [timeLeft, phase, answered]);

  async function handleAnswer(choice: string) {
    if (answered || advancingRef.current || phase !== 'playing') return;
    stopTimer(); advancingRef.current = true;
    setAnswered(true); setSelected(choice);
    const isCorrect = question && choice === question.correct;
    const currentWord = queue[idx];
    if (isCorrect) {
      setStats(s => ({ ...s, correct: s.correct + 1 }));
      setTimeout(() => advanceToNext(idx, queue, wrongWords), 1200);
    } else {
      const newLives = livesRef.current - 1;
      setLives(newLives); livesRef.current = newLives;
      setStats(s => ({ ...s, wrong: s.wrong + 1 }));
      setWrongWords(ww => {
        const updated = [...ww, currentWord];
        const prev = progress[currentWord?.id];
        if (prev && uid) rateWord(uid, currentWord.id, 'wrong', prev, targetLang, nativeLang);
        if (newLives <= 0) { setTimeout(() => setPhase('dead'), 1400); }
        else { setTimeout(() => advanceToNext(idx, queue, updated), 1400); }
        return updated;
      });
    }
  }

  useEffect(() => {
    if (phase !== 'cleared') return;
    queue.forEach(w => {
      const prev = progress[w.id];
      if (prev && uid && !wrongWords.find(ww => ww.id === w.id)) {
        rateWord(uid, w.id, 'easy', prev, targetLang, nativeLang);
      }
    });
  }, [phase]);

  const pct       = queue.length ? Math.round((idx / queue.length) * 100) : 0;
  const timerPct  = (timeLeft / TIME_PER_Q) * 100;
  const timerColor = timeLeft > 5 ? '#00e87a' : timeLeft > 2 ? '#EF9F27' : '#E24B4A';

  if (loading) return <Screen><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><Spinner /></div></Screen>;

  if (allWords.length < 4) return (
    <Screen>
      <TopBar onBack={() => router.push('/dashboard')} />
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p style={{ fontSize: '40px', marginBottom: '1rem' }}>📚</p>
        <p style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>Not enough words</p>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>You need at least 4 words.</p>
        <button onClick={() => router.push('/dashboard')} style={WHITE_BTN}>Go to dashboard</button>
      </div>
    </Screen>
  );

  if (phase === 'intro') {
    const dueCount = allWords.filter(w => progress[w.id] && isDue(progress[w.id])).length;
    return (
      <Screen>
        <TopBar onBack={() => router.push('/dashboard')} />
        <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(226,75,74,0.5))' }}>💀</div>
          <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Survival Mode</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', lineHeight: 1.7 }}>
            Answer before the timer runs out.<br />Three wrong answers and it's over.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '2rem', width: '100%' }}>
            {[
              { label: 'Words',   value: Math.min(allWords.length, MAX_WORDS) },
              { label: 'Due',     value: dueCount },
              { label: 'Seconds', value: TIME_PER_Q },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(226,75,74,0.2)' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', letterSpacing: '0.06em' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '32px', marginBottom: '1.5rem', letterSpacing: '8px', filter: 'drop-shadow(0 0 8px rgba(226,75,74,0.5))' }}>
            {'❤️'.repeat(MAX_LIVES)}
          </div>

          <div style={{ background: 'rgba(226,75,74,0.12)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: 'rgba(255,150,150,0.8)', marginBottom: '2rem', lineHeight: 1.6, width: '100%' }}>
            ⚠️ Wrong answers immediately reset that word's SRS to 1 day. There is no undo.
          </div>

          <button onClick={startGame} style={{ ...WHITE_BTN, width: '100%', padding: '16px', fontSize: '16px' }}>
            Enter survival →
          </button>
        </div>
      </Screen>
    );
  }

  if (phase === 'dead') return (
    <Screen>
      <TopBar onBack={() => router.push('/dashboard')} />
      <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '80px', marginBottom: '1rem' }}>💀</div>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>You died</h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
          {stats.correct} survived · {stats.wrong} killed you
        </p>
        {wrongWords.length > 0 && (
          <div style={{ width: '100%', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(226,75,74,0.2)', marginBottom: '2rem' }}>
            <div style={{ padding: '8px 14px', background: 'rgba(226,75,74,0.15)', borderBottom: '1px solid rgba(226,75,74,0.2)', fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(255,150,150,0.8)' }}>
              WORDS THAT KILLED YOU — RESET TO 1 DAY
            </div>
            {wrongWords.map((w, i) => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderBottom: i < wrongWords.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <span style={{ fontSize: '20px', fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: '#fff' }}>{w.kanji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>{w.meaning}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{w.reading}</p>
                </div>
                <span style={{ fontSize: '11px', color: '#E24B4A', background: 'rgba(226,75,74,0.15)', padding: '2px 8px', borderRadius: '99px', border: '1px solid rgba(226,75,74,0.3)' }}>reset</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={startGame} style={WHITE_BTN}>Try again</button>
          <button onClick={() => router.push('/dashboard')} style={GHOST_BTN}>Dashboard</button>
        </div>
      </div>
    </Screen>
  );

  if (phase === 'cleared') return (
    <Screen>
      <TopBar onBack={() => router.push('/dashboard')} />
      <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '80px', marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(0,232,122,0.5))' }}>🏆</div>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Survival Cleared!</h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>{stats.correct} words survived</p>
        <div style={{ fontSize: '28px', marginBottom: '1.5rem', letterSpacing: '8px' }}>
          {'❤️'.repeat(lives)}{'🖤'.repeat(MAX_LIVES - lives)}
        </div>
        <div style={{ background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.25)', borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#00e87a', marginBottom: '2rem', width: '100%' }}>
          ✓ {queue.length - wrongWords.length} words boosted to 30 day review
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={startGame} style={WHITE_BTN}>Run again</button>
          <button onClick={() => router.push('/dashboard')} style={GHOST_BTN}>Dashboard</button>
        </div>
      </div>
    </Screen>
  );

  if (!question) return null;

  return (
    <Screen>
      <TopBar onBack={() => { stopTimer(); router.push('/dashboard'); }} />

      {/* Lives + counter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '24px', letterSpacing: '4px', filter: 'drop-shadow(0 0 6px rgba(226,75,74,0.5))' }}>
          {'❤️'.repeat(lives)}{'🖤'.repeat(MAX_LIVES - lives)}
        </div>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
          {idx + 1}/{queue.length}
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px', marginBottom: '6px' }}>
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px', width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>

      {/* Timer bar */}
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginBottom: '1rem', overflow: 'hidden' }}>
        <div style={{ height: '4px', borderRadius: '2px', width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background 0.3s', boxShadow: `0 0 8px ${timerColor}` }} />
      </div>

      {/* Timer number */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '48px', fontWeight: 700, color: timerColor, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono)', textShadow: `0 0 20px ${timerColor}60`, transition: 'color 0.3s' }}>
          {timeLeft}
        </span>
      </div>

      {/* Question card */}
      <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: '20px', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
        <button onClick={() => speak(question.word.kanji, targetLang)} style={{ position: 'absolute', top: '12px', right: '12px', width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>🔊</button>
        <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>WHAT DOES THIS MEAN?</p>
        <div style={{ fontSize: '72px', lineHeight: 1, marginBottom: '12px', fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: '#fff', textShadow: '0 0 30px rgba(255,255,255,0.15)' }}>
          {question.word.kanji}
        </div>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)' }}>
          {question.word.reading}
          {question.word.romanization && <span style={{ fontSize: '13px', marginLeft: '6px', opacity: 0.7 }}>· {question.word.romanization}</span>}
        </p>
      </div>

      {/* Choices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {question.choices.map(choice => {
          const isCorrect  = choice === question.correct;
          const isSelected = choice === selected;
          let bg = 'rgba(255,255,255,0.06)', borderColor = 'rgba(255,255,255,0.12)', color = 'rgba(255,255,255,0.85)', opacity = 1;
          if (answered) {
            if (isCorrect)               { bg = 'rgba(0,232,122,0.15)';  borderColor = 'rgba(0,232,122,0.5)';  color = '#00e87a'; }
            else if (isSelected)         { bg = 'rgba(226,75,74,0.15)';  borderColor = 'rgba(226,75,74,0.5)';  color = '#ff8080'; }
            else                         { opacity = 0.3; }
          }
          return (
            <button key={choice} disabled={answered} onClick={() => handleAnswer(choice)} style={{
              padding: '14px 16px', borderRadius: '12px', borderWidth: '1px', borderStyle: 'solid', borderColor,
              background: bg, color, fontSize: '14px', cursor: answered ? 'default' : 'pointer',
              fontFamily: 'var(--font-ui)', textAlign: 'left', transition: 'all 0.15s', opacity,
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              {answered && isCorrect  && <span style={{ fontSize: '16px' }}>✓</span>}
              {answered && isSelected && !isCorrect && <span style={{ fontSize: '16px' }}>✗</span>}
              {choice}
            </button>
          );
        })}
      </div>

      {answered && selected === '__timeout__' && (
        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '14px', color: '#ff8080', animation: 'fadeIn 0.2s ease' }}>
          ⏱ Time's up — {question.word.meaning}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#1a0505',
      backgroundImage: 'radial-gradient(ellipse at top, #3d0a0a 0%, #1a0505 50%, #0d0202 100%)',
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1.25rem 2rem', fontFamily: 'var(--font-ui)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(226,75,74,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(226,75,74,0.03) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
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
      <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>💀 Survival</span>
      <div style={{ width: '60px' }} />
    </div>
  );
}

const WHITE_BTN: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', color: '#1a0505', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' };
const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };

function Spinner() {
  return <div style={{ width: '28px', height: '28px', border: '2px solid rgba(226,75,74,0.2)', borderTopColor: '#E24B4A', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}
