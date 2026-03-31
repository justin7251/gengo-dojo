'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getWords, getProgress, rateWord, getUserProfile } from '@/lib/firestore';
import { Word, Progress, Rating } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';

export default function QuizPage() {
  return (
    <AuthGuard>
      <Quiz />
    </AuthGuard>
  );
}

type QuizQuestion = {
  word: Word;
  choices: string[];
  correct: string;
};

type AnswerState = 'unanswered' | 'correct' | 'wrong';

function buildQuestions(words: Word[]): QuizQuestion[] {
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  const pool     = shuffled.slice(0, Math.min(10, shuffled.length));
  return pool.map((word) => {
    const distractors = words
      .filter((w) => w.id !== word.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((w) => w.meaning);
    const choices = [...distractors, word.meaning].sort(() => Math.random() - 0.5);
    return { word, choices, correct: word.meaning };
  });
}

function Quiz() {
  const router = useRouter();
  const [uid, setUid]               = useState('');
  const [questions, setQuestions]   = useState<QuizQuestion[]>([]);
  const [progress, setProgress]     = useState<Record<string, Progress>>({});
  const [idx, setIdx]               = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [loading, setLoading]       = useState(true);
  const [sessionScore, setSessionScore] = useState({ correct: 0, wrong: 0 });
  const [done, setDone]             = useState(false);
  const [advancing, setAdvancing]   = useState(false);
  const [lang, setLang] = useState<'ja' | 'zh'>('ja');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const [profile, words, prog] = await Promise.all([
        getUserProfile(user.uid),
        getWords(user.uid),
        getProgress(user.uid),
      ]);
      setLang(profile?.lang ?? 'ja');
      setProgress(prog);
      setQuestions(buildQuestions(words));
      setLoading(false);
    });
  }, []);

  const current = questions[idx];
  const pct     = questions.length ? Math.round((idx / questions.length) * 100) : 0;

  async function handleAnswer(choice: string) {
    if (answerState !== 'unanswered' || advancing) return;
    const isCorrect = choice === current.correct;
    setSelectedAnswer(choice);
    setAnswerState(isCorrect ? 'correct' : 'wrong');
    setSessionScore(s => ({
      correct: isCorrect ? s.correct + 1 : s.correct,
      wrong:   !isCorrect ? s.wrong + 1  : s.wrong,
    }));

    // Write SRS rating to Firestore
    const prev = progress[current.word.id];
    if (prev) {
      const rating: Rating = isCorrect ? 'good' : 'wrong';
      await rateWord(uid, current.word.id, rating, prev);
    }
  }

  async function handleNext() {
    if (advancing) return;
    setAdvancing(true);
    const next = idx + 1;
    if (next >= questions.length) {
      setDone(true);
    } else {
      setIdx(next);
      setAnswerState('unanswered');
      setSelectedAnswer('');
    }
    setAdvancing(false);
  }

  function restart() {
    setIdx(0);
    setAnswerState('unanswered');
    setSelectedAnswer('');
    setDone(false);
    setSessionScore({ correct: 0, wrong: 0 });
    setQuestions(qs => buildQuestions(qs.map(q => q.word)));
  }

  function handleSpeak() {
    if (!current) return;
    setSpeaking(true);
    speak(current.word.kanji, lang);
    setTimeout(() => setSpeaking(false), 1200);
  }

  function choiceStyle(choice: string): React.CSSProperties {
    const base: React.CSSProperties = {
      width: '100%',
      textAlign: 'left',
      padding: '14px 16px',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      background: 'var(--bg)',
      color: 'var(--fg)',
      fontSize: '14px',
      cursor: answerState === 'unanswered' ? 'pointer' : 'default',
      transition: 'all 0.15s',
      fontFamily: 'inherit',
      lineHeight: 1.4,
    };

    if (answerState === 'unanswered') return base;

    if (choice === current.correct) {
      return { ...base, background: '#E1F5EE', borderColor: 'var(--teal)', color: 'var(--teal-dark)' };
    }
    if (choice === selectedAnswer && choice !== current.correct) {
      return { ...base, background: '#FCEBEB', borderColor: '#E24B4A', color: '#A32D2D' };
    }
    return { ...base, opacity: 0.4 };
  }

  // ── Loading ───────────────────────────────────────────
  if (loading) {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Spinner />
        </div>
      </Shell>
    );
  }

  // ── Not enough words ──────────────────────────────────
  if (!loading && questions.length < 2) {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '1rem' }}>📚</div>
          <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
            Not enough words
          </p>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '1.5rem' }}>
            You need at least 4 words to take a quiz. Generate more from the dashboard.
          </p>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
            Go to dashboard
          </button>
        </div>
      </Shell>
    );
  }

  // ── Session complete ──────────────────────────────────
  if (done) {
    const total      = sessionScore.correct + sessionScore.wrong;
    const pctCorrect = total ? Math.round((sessionScore.correct / total) * 100) : 0;
    const emoji      = pctCorrect === 100 ? '🏆' : pctCorrect >= 80 ? '🎯' : pctCorrect >= 50 ? '💪' : '📖';
    const message    = pctCorrect === 100 ? 'Perfect score!'
      : pctCorrect >= 80 ? 'Great work!'
      : pctCorrect >= 50 ? 'Keep practising!'
      : 'Keep going — you\'ll get there!';

    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '52px', marginBottom: '1rem' }}>{emoji}</div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>
            {message}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
            {sessionScore.correct} correct · {sessionScore.wrong} wrong · {total} questions
          </p>

          {/* Score bar */}
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{
              height: '10px',
              background: 'var(--surface)',
              borderRadius: '5px',
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                height: '100%',
                width: `${pctCorrect}%`,
                borderRadius: '5px',
                background: pctCorrect === 100 ? 'var(--teal)'
                  : pctCorrect >= 80 ? 'var(--teal)'
                  : pctCorrect >= 50 ? '#EF9F27'
                  : '#E24B4A',
                transition: 'width 0.6s ease',
              }} />
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '6px' }}>
              {pctCorrect}% accuracy
            </p>
          </div>

          {/* Per-question review */}
          <div style={{
            textAlign: 'left',
            margin: '2rem 0',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '10px 16px',
              background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--muted)',
              fontWeight: 500,
            }}>
              Review
            </div>
            {questions.map((q, i) => {
              const wasCorrect = sessionScore.correct > 0; // simplified — see note
              return (
                <div key={q.word.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderBottom: i < questions.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ fontSize: '22px', minWidth: '32px' }}>{q.word.kanji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px' }}>
                      {q.word.meaning}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {q.word.reading}
                      {q.word.romanization ? ` · ${q.word.romanization}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={restart}>
              Try again
            </button>
            <button className="btn" onClick={() => router.push('/dashboard')}>
              Dashboard
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Question ──────────────────────────────────────────
  return (
    <Shell onBack={() => router.push('/dashboard')}>

      {/* Progress */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--muted)',
          marginBottom: '6px',
        }}>
          <span>Question {idx + 1} of {questions.length}</span>
          <span style={{ color: 'var(--teal-dark)', fontWeight: 500 }}>
            {sessionScore.correct} correct
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Question card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        padding: '2rem',
        textAlign: 'center',
        marginBottom: '1.5rem',
        position: 'relative',    // ← add
      }}>

        {/* 🔊 inside card top-right */}
        <button
          onClick={handleSpeak}
          title="Play pronunciation"
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            border: '1px solid #444',
            background: speaking ? '#0F6E56' : '#2a2a2a',
            cursor: 'pointer',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            zIndex: 2,
          }}
        >
          🔊
        </button>

        <p style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          fontWeight: 500,
          marginBottom: '1rem',
        }}>
          What does this mean?
        </p>
        <div style={{
          fontSize: '64px',
          lineHeight: 1,
          marginBottom: '12px',
          fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
        }}>
          {current.word.kanji}
        </div>
        <p style={{ fontSize: '16px', color: 'var(--muted)' }}>
          {current.word.reading}
          {current.word.romanization && (
            <span style={{ fontSize: '13px', marginLeft: '6px' }}>
              · {current.word.romanization}
            </span>
          )}
        </p>
      </div>

      {/* Choices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
        {current.choices.map((choice) => (
          <button
            key={choice}
            style={choiceStyle(choice)}
            onClick={() => handleAnswer(choice)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {answerState !== 'unanswered' && choice === current.correct && (
                <span style={{ fontSize: '16px' }}>✓</span>
              )}
              {answerState !== 'unanswered' && choice === selectedAnswer && choice !== current.correct && (
                <span style={{ fontSize: '16px' }}>✗</span>
              )}
              {choice}
            </span>
          </button>
        ))}
      </div>

      {/* Example sentence + next button — shown after answering */}
      {answerState !== 'unanswered' && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '1rem',
          }}>
            <p style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--muted)',
              fontWeight: 500,
              marginBottom: '6px',
            }}>
              Example
            </p>
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--fg)' }}>
              {current.word.example}
            </p>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleNext}
            disabled={advancing}
          >
            {idx + 1 >= questions.length ? 'See results' : 'Next →'}
          </button>
        </div>
      )}

    </Shell>
  );
}

function speak(text: string, lang: string) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utter  = new SpeechSynthesisUtterance(text);
  utter.lang   = lang === 'ja' ? 'ja-JP' : 'zh-CN';
  utter.rate   = 0.85;
  const voices = window.speechSynthesis.getVoices();
  const native = voices.find(v => v.lang.startsWith(lang === 'ja' ? 'ja' : 'zh'));
  if (native) utter.voice = native;
  window.speechSynthesis.speak(utter);
}

// ── Shell ─────────────────────────────────────────────
function Shell({ children, onBack }: {
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem 4rem',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '680px',
        display: 'flex',
        alignItems: 'center',
        marginBottom: '1.5rem',
      }}>
        <button className="btn" style={{ fontSize: '13px' }} onClick={onBack}>
          ← Back
        </button>
        <span style={{
          fontSize: '18px',
          fontWeight: 600,
          marginLeft: '1rem',
          letterSpacing: '-0.02em',
        }}>
          言語道場
        </span>
      </div>

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
      width: '24px',
      height: '24px',
      border: '2px solid var(--border)',
      borderTopColor: 'var(--muted)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      margin: '0 auto',
    }} />
  );
}