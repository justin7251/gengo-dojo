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
type Question = { word: Word; choices: string[]; correct: string; };

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
  const choices = [...distractors, word.meaning].sort(() => Math.random() - 0.5);
  return { word, choices, correct: word.meaning };
}

function Survival() {
  const router = useRouter();

  const [uid, setUid]                 = useState('');
  const [targetLang, setTargetLang]   = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang]   = useState<NativeLang>('en');
  const [allWords, setAllWords]       = useState<Word[]>([]);
  const [progress, setProgress]       = useState<Record<string, Progress>>({});
  const [queue, setQueue]             = useState<Word[]>([]);
  const [phase, setPhase]             = useState<Phase>('intro');
  const [idx, setIdx]                 = useState(0);
  const [question, setQuestion]       = useState<Question | null>(null);
  const [lives, setLives]             = useState(MAX_LIVES);
  const [timeLeft, setTimeLeft]       = useState(TIME_PER_Q);
  const [selected, setSelected]       = useState('');
  const [answered, setAnswered]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [stats, setStats]             = useState({ correct: 0, wrong: 0 });
  const [wrongWords, setWrongWords]   = useState<Word[]>([]);
  const timerRef                      = useRef<NodeJS.Timeout | null>(null);
  const advancingRef                  = useRef(false);
  const livesRef                      = useRef(MAX_LIVES);

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

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  const advanceToNext = useCallback((
    currentIdx: number,
    currentQueue: Word[],
    currentWrongWords: Word[]
  ) => {
    advancingRef.current = false;
    const next = currentIdx + 1;
    if (next >= currentQueue.length) {
      setPhase('cleared');
      return;
    }
    const nextWord = currentQueue[next];
    setIdx(next);
    setQuestion(buildQuestion(nextWord, allWords));
    setAnswered(false);
    setSelected('');
    speak(nextWord.kanji, targetLang);
    // restart timer
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_Q);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [allWords, targetLang]);

  function startGame() {
    const q = buildQueue(allWords, progress);
    const freshLives = MAX_LIVES;
    setQueue(q);
    setIdx(0);
    setLives(freshLives);
    livesRef.current = freshLives;
    setStats({ correct: 0, wrong: 0 });
    setWrongWords([]);
    setPhase('playing');
    const firstQ = buildQuestion(q[0], allWords);
    setQuestion(firstQ);
    setAnswered(false);
    setSelected('');
    speak(q[0].kanji, targetLang);

    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(TIME_PER_Q);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  // Handle timeout via useEffect watching timeLeft
  useEffect(() => {
    if (phase !== 'playing' || timeLeft !== 0 || answered || advancingRef.current) return;
    advancingRef.current = true;
    setAnswered(true);
    setSelected('__timeout__');

    const currentWord = queue[idx];
    const newLives = livesRef.current - 1;
    setLives(newLives);
    livesRef.current = newLives;
    setStats(s => ({ ...s, wrong: s.wrong + 1 }));
    setWrongWords(w => [...w, currentWord]);

    const prev = progress[currentWord?.id];
    if (prev && uid) {
      rateWord(uid, currentWord.id, 'wrong', prev, targetLang, nativeLang);
    }

    if (newLives <= 0) {
      setTimeout(() => setPhase('dead'), 1400);
    } else {
      setTimeout(() => {
        setWrongWords(ww => {
          advanceToNext(idx, queue, ww);
          return ww;
        });
      }, 1400);
    }
  }, [timeLeft, phase, answered]);

  async function handleAnswer(choice: string) {
    if (answered || advancingRef.current || phase !== 'playing') return;
    stopTimer();
    advancingRef.current = true;
    setAnswered(true);
    setSelected(choice);

    const isCorrect   = question && choice === question.correct;
    const currentWord = queue[idx];

    if (isCorrect) {
      setStats(s => ({ ...s, correct: s.correct + 1 }));
      setTimeout(() => advanceToNext(idx, queue, wrongWords), 1200);
    } else {
      const newLives = livesRef.current - 1;
      setLives(newLives);
      livesRef.current = newLives;
      setStats(s => ({ ...s, wrong: s.wrong + 1 }));
      setWrongWords(ww => {
        const updated = [...ww, currentWord];
        const prev = progress[currentWord?.id];
        if (prev && uid) {
          rateWord(uid, currentWord.id, 'wrong', prev, targetLang, nativeLang);
        }
        if (newLives <= 0) {
          setTimeout(() => setPhase('dead'), 1400);
        } else {
          setTimeout(() => advanceToNext(idx, queue, updated), 1400);
        }
        return updated;
      });
    }
  }

  // Rate cleared words as easy
  useEffect(() => {
    if (phase !== 'cleared') return;
    queue.forEach(w => {
      const prev = progress[w.id];
      if (prev && uid && !wrongWords.find(ww => ww.id === w.id)) {
        rateWord(uid, w.id, 'easy', prev, targetLang, nativeLang);
      }
    });
  }, [phase]);

  const pct      = queue.length ? Math.round((idx / queue.length) * 100) : 0;
  const timerPct = (timeLeft / TIME_PER_Q) * 100;
  const timerColor = timeLeft > 5 ? '#1D9E75' : timeLeft > 2 ? '#EF9F27' : '#E24B4A';

  // ── Loading ───────────────────────────────────────────
  if (loading) {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div>
      </Shell>
    );
  }

  // ── Not enough words ──────────────────────────────────
  if (allWords.length < 4) {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '1rem' }}>📚</div>
          <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>Not enough words</p>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '1.5rem' }}>
            You need at least 4 words to enter survival mode.
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
    const dueCount = allWords.filter(w => progress[w.id] && isDue(progress[w.id])).length;
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: '52px', marginBottom: '1rem' }}>💀</div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>Survival mode</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.7 }}>
            Answer before the timer runs out.<br />
            Three wrong answers and it's over.<br />
            Fail a word — it resets. Clear all — every word gets boosted.
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '10px', marginBottom: '2rem',
          }}>
            {[
              { label: 'Words',   value: Math.min(allWords.length, MAX_WORDS) },
              { label: 'Due',     value: dueCount },
              { label: 'Seconds', value: TIME_PER_Q },
            ].map(s => (
              <div key={s.label} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '16px',
              }}>
                <div style={{ fontSize: '28px', fontWeight: 600 }}>{s.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '28px', marginBottom: '2rem', letterSpacing: '4px' }}>
            {'❤️'.repeat(MAX_LIVES)}
          </div>

          <div style={{
            background: '#FCEBEB', border: '1px solid #E24B4A',
            borderRadius: '12px', padding: '12px 16px',
            fontSize: '13px', color: '#A32D2D',
            marginBottom: '2rem', lineHeight: 1.6,
          }}>
            ⚠️ Wrong answers immediately reset that word's SRS to 1 day. There is no undo.
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            onClick={startGame}
          >
            Enter survival →
          </button>
        </div>
      </Shell>
    );
  }

  // ── Dead ──────────────────────────────────────────────
  if (phase === 'dead') {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>💀</div>
          <h2 style={{ fontSize: '26px', fontWeight: 600, marginBottom: '8px' }}>You died</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
            {stats.correct} survived · {stats.wrong} killed you
          </p>

          {wrongWords.length > 0 && (
            <div style={{
              textAlign: 'left', marginBottom: '2rem',
              border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 16px', background: '#FCEBEB',
                borderBottom: '1px solid #E24B4A',
                fontSize: '11px', textTransform: 'uppercase',
                letterSpacing: '0.08em', color: '#A32D2D', fontWeight: 500,
              }}>
                Words that killed you — reset to 1 day
              </div>
              {wrongWords.map((w, i) => (
                <div key={w.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px',
                  borderBottom: i < wrongWords.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{
                    fontSize: '22px',
                    fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
                  }}>
                    {w.kanji}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 500 }}>{w.meaning}</p>
                    <p style={{ fontSize: '12px', color: 'var(--muted)' }}>{w.reading}</p>
                  </div>
                  <span style={{
                    background: '#FCEBEB', color: '#A32D2D',
                    borderWidth: '1px', borderStyle: 'solid', borderColor: '#E24B4A',
                    fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                  }}>
                    reset
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={startGame}>Try again</button>
            <button className="btn" onClick={() => router.push('/dashboard')}>Dashboard</button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Cleared ───────────────────────────────────────────
  if (phase === 'cleared') {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🏆</div>
          <h2 style={{ fontSize: '26px', fontWeight: 600, marginBottom: '8px' }}>
            Survival cleared!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px' }}>
            {stats.correct} words survived
          </p>
          <p style={{ fontSize: '13px', color: '#0F6E56', marginBottom: '2rem' }}>
            All surviving words boosted to 30 day review
          </p>
          <div style={{ fontSize: '28px', marginBottom: '2rem', letterSpacing: '4px' }}>
            {'❤️'.repeat(lives)}{'🖤'.repeat(MAX_LIVES - lives)}
          </div>
          <div style={{
            background: '#E1F5EE', border: '1px solid #1D9E75',
            borderRadius: '12px', padding: '14px 16px',
            fontSize: '13px', color: '#0F6E56', marginBottom: '2rem',
          }}>
            ✓ {queue.length - wrongWords.length} words marked as easy — next review in 30 days
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={startGame}>Run again</button>
            <button className="btn" onClick={() => router.push('/dashboard')}>Dashboard</button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Playing ───────────────────────────────────────────
  if (!question) return null;

  return (
    <Shell onBack={() => { stopTimer(); router.push('/dashboard'); }}>

      {/* Lives + counter */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: '1rem',
      }}>
        <div style={{ fontSize: '22px', letterSpacing: '2px' }}>
          {'❤️'.repeat(lives)}{'🖤'.repeat(MAX_LIVES - lives)}
        </div>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
          {idx + 1} / {queue.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-track" style={{ marginBottom: '6px' }}>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      {/* Timer bar */}
      <div style={{
        height: '4px', background: 'var(--surface)',
        borderRadius: '2px', marginBottom: '1rem', overflow: 'hidden',
      }}>
        <div style={{
          height: '4px', borderRadius: '2px',
          width: `${timerPct}%`,
          background: timerColor,
          transition: 'width 1s linear, background 0.3s',
        }} />
      </div>

      {/* Timer number */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <span style={{
          fontSize: '32px', fontWeight: 600,
          color: timerColor, transition: 'color 0.3s',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {timeLeft}
        </span>
      </div>

      {/* Question card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '20px', padding: '2rem', textAlign: 'center',
        marginBottom: '1.5rem', position: 'relative',
      }}>
        <button
          onClick={() => speak(question.word.kanji, targetLang)}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            width: '34px', height: '34px', borderRadius: '50%',
            border: '1px solid #444', background: '#2a2a2a',
            cursor: 'pointer', fontSize: '15px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          🔊
        </button>

        <p style={{
          fontSize: '11px', textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--muted)',
          fontWeight: 500, marginBottom: '1rem',
        }}>
          What does this mean?
        </p>

        <div style={{
          fontSize: '64px', lineHeight: 1, marginBottom: '12px',
          fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", "Noto Sans SC", serif',
        }}>
          {question.word.kanji}
        </div>

        <p style={{ fontSize: '15px', color: 'var(--muted)' }}>
          {question.word.reading}
          {question.word.romanization && (
            <span style={{ fontSize: '13px', marginLeft: '6px' }}>
              · {question.word.romanization}
            </span>
          )}
        </p>
      </div>

      {/* Choices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {question.choices.map(choice => {
          const isCorrect  = choice === question.correct;
          const isSelected = choice === selected;
          const isTimeout  = selected === '__timeout__';

          let bg          = 'var(--bg)';
          let borderColor = 'var(--border)';
          let color       = 'var(--fg)';
          let opacity     = 1;

          if (answered) {
            if (isCorrect) {
              bg = '#E1F5EE'; borderColor = '#1D9E75'; color = '#0F6E56';
            } else if (isSelected && !isCorrect) {
              bg = '#FCEBEB'; borderColor = '#E24B4A'; color = '#A32D2D';
            } else {
              opacity = 0.35;
            }
          }

          return (
            <button
              key={choice}
              disabled={answered}
              onClick={() => handleAnswer(choice)}
              style={{
                width: '100%', textAlign: 'left',
                padding: '14px 16px',
                borderWidth: '1px', borderStyle: 'solid', borderColor,
                borderRadius: '12px', background: bg, color,
                fontSize: '14px',
                cursor: answered ? 'default' : 'pointer',
                transition: 'all 0.15s', fontFamily: 'inherit',
                lineHeight: 1.4, opacity,
                display: 'flex', alignItems: 'center', gap: '10px',
              }}
            >
              {answered && isCorrect && <span>✓</span>}
              {answered && isSelected && !isCorrect && <span>✗</span>}
              {choice}
            </button>
          );
        })}
      </div>

      {/* Timeout message */}
      {answered && selected === '__timeout__' && (
        <div style={{
          textAlign: 'center', marginTop: '1rem',
          fontSize: '14px', color: '#A32D2D',
          animation: 'fadeIn 0.2s ease',
        }}>
          ⏱ Time's up — {question.word.meaning}
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
          💀 Survival
        </span>
      </div>
      <div style={{
        width: '100%', maxWidth: '680px', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem',
      }}>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
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
