'use client';
import { Spinner } from '@/components/Spinner';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getKanaProgress, rateKana } from '@/lib/firestore';
import { HIRAGANA, KATAKANA, KanaChar, Script } from '@/lib/kana';
import { Progress, Rating } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';
import { Suspense } from 'react';

export default function KanaListenPage() {
  return <AuthGuard><Suspense><KanaListen /></Suspense></AuthGuard>;
}

function speak(text: string) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ja-JP'; utter.rate = 0.75;
  const voices = window.speechSynthesis.getVoices();
  const native = voices.find(v => v.lang.startsWith('ja'));
  if (native) utter.voice = native;
  window.speechSynthesis.speak(utter);
}

type AnswerState = 'unanswered' | 'correct' | 'wrong';

function KanaListen() {
  const router  = useRouter();
  const params  = useSearchParams();
  const script  = (params.get('script') ?? 'hiragana') as Script;
  const chars   = script === 'hiragana' ? HIRAGANA : KATAKANA;

  const [uid, setUid]             = useState('');
  const [progress, setProgress]   = useState<Record<string, Progress>>({});
  const [queue, setQueue]         = useState<KanaChar[]>([]);
  const [idx, setIdx]             = useState(0);
  const [choices, setChoices]     = useState<KanaChar[]>([]);
  const [selected, setSelected]   = useState('');
  const [answerState, setAnswerState] = useState<AnswerState>('unanswered');
  const [loading, setLoading]     = useState(true);
  const [stats, setStats]         = useState({ correct: 0, wrong: 0 });
  const [done, setDone]           = useState(false);

  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  const buildChoices = useCallback((correct: KanaChar) => {
    const distractors = chars
      .filter(c => c.char !== correct.char)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
    return [...distractors, correct].sort(() => Math.random() - 0.5);
  }, [chars]);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const prog = await getKanaProgress(user.uid);
      setProgress(prog);
      const shuffled = [...chars].sort(() => Math.random() - 0.5).slice(0, 20);
      setQueue(shuffled);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (queue.length && idx < queue.length) {
      const current = queue[idx];
      setChoices(buildChoices(current));
      // Auto-play sound when question loads
      setTimeout(() => speak(current.char), 300);
    }
  }, [queue, idx, buildChoices]);

  const current = queue[idx];
  const pct     = queue.length ? Math.round((idx / queue.length) * 100) : 0;

  async function handleAnswer(choice: KanaChar) {
    if (answerState !== 'unanswered') return;
    const isCorrect = choice.char === current.char;
    setSelected(choice.char);
    setAnswerState(isCorrect ? 'correct' : 'wrong');
    setStats(s => ({
      correct: isCorrect ? s.correct + 1 : s.correct,
      wrong:   !isCorrect ? s.wrong + 1  : s.wrong,
    }));
    const prev = progress[current.char] ?? {
      wordId: current.char, correct: 0, wrong: 0,
      nextReview: Date.now(), interval: 'new', lastReviewed: Date.now(),
    };
    const rating: Rating = isCorrect ? 'good' : 'wrong';
    await rateKana(uid, current.char, rating, prev as Progress);
  }

  function handleNext() {
    const next = idx + 1;
    if (next >= queue.length) { setDone(true); return; }
    setIdx(next);
    setSelected('');
    setAnswerState('unanswered');
  }

  function choiceBg(c: KanaChar) {
    if (answerState === 'unanswered') return 'var(--surface)';
    if (c.char === current.char) return '#E1F5EE';
    if (c.char === selected)     return '#FCEBEB';
    return 'var(--surface)';
  }
  function choiceBorder(c: KanaChar) {
    if (answerState === 'unanswered') return 'var(--border)';
    if (c.char === current.char) return '#1D9E75';
    if (c.char === selected)     return '#E24B4A';
    return 'var(--border)';
  }
  function choiceOpacity(c: KanaChar) {
    if (answerState === 'unanswered') return 1;
    if (c.char === current.char || c.char === selected) return 1;
    return 0.35;
  }

  if (loading) return <Shell script={script} onBack={() => router.push('/kana')}><div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div></Shell>;

  if (done) {
    const total = stats.correct + stats.wrong;
    const pctC  = total ? Math.round(stats.correct / total * 100) : 0;
    return (
      <Shell script={script} onBack={() => router.push('/kana')}>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>{pctC >= 80 ? '🎧' : '💪'}</div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Listening done!</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
            {stats.correct} correct · {stats.wrong} wrong · {pctC}% accuracy
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setIdx(0); setSelected(''); setAnswerState('unanswered'); setDone(false); setStats({ correct: 0, wrong: 0 }); }}>
              Try again
            </button>
            <button className="btn" onClick={() => router.push('/kana')}>Back to kana</button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell script={script} onBack={() => router.push('/kana')}>

      {/* Progress */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
          <span>{idx + 1} / {queue.length}</span>
          <span style={{ color: '#0F6E56', fontWeight: 500 }}>{stats.correct} correct</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      {/* Sound prompt */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem',
      }}>
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500, marginBottom: '1.25rem' }}>
          Which character makes this sound?
        </p>
        <button
          onClick={() => speak(current.char)}
          style={{
            width: '72px', height: '72px', borderRadius: '50%',
            border: '2px solid #444', background: '#2a2a2a',
            cursor: 'pointer', fontSize: '28px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto', transition: 'all 0.15s',
          }}
        >
          🔊
        </button>
        <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '12px' }}>
          Tap to replay the sound
        </p>
        {/* Show romaji after answering */}
        {answerState !== 'unanswered' && (
          <div style={{ marginTop: '12px', animation: 'fadeIn 0.2s ease' }}>
            <span style={{
              fontSize: '18px', fontWeight: 600,
              padding: '6px 16px', background: 'var(--bg)',
              borderRadius: '8px', border: '1px solid var(--border)',
            }}>
              {current.romaji}
            </span>
          </div>
        )}
      </div>

      {/* Character choices — 2x3 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
        {choices.map(c => (
          <button
            key={c.char}
            onClick={() => handleAnswer(c)}
            style={{
              padding: '16px 8px',
              border: `1px solid ${choiceBorder(c)}`,
              borderRadius: '14px',
              background: choiceBg(c),
              cursor: answerState === 'unanswered' ? 'pointer' : 'default',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '4px',
              opacity: choiceOpacity(c),
              transition: 'all 0.15s',
              fontFamily: 'inherit',
            }}
          >
            <span style={{
              fontSize: '36px', lineHeight: 1,
              fontFamily: 'var(--font-noto-jp), "Noto Sans JP", serif',
            }}>
              {c.char}
            </span>
            {answerState !== 'unanswered' && (
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{c.romaji}</span>
            )}
          </button>
        ))}
      </div>

      {/* Next button after answering */}
      {answerState !== 'unanswered' && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          {/* Mnemonic hint */}
          <div style={{
            padding: '10px 14px', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: '10px',
            fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6,
            marginBottom: '12px',
          }}>
            💡 {current.mnemonic}
          </div>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleNext}>
            {idx + 1 >= queue.length ? 'See results' : 'Next →'}
          </button>
        </div>
      )}

    </Shell>
  );
}

function Shell({ children, onBack, script }: { children: React.ReactNode; onBack: () => void; script: Script }) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem 4rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '680px', display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn" style={{ fontSize: '13px' }} onClick={onBack}>← Back</button>
        <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '1rem', letterSpacing: '-0.02em' }}>
          {script === 'hiragana' ? 'Listen · Hiragana' : 'Listen · Katakana'}
        </span>
      </div>
      <div style={{ width: '100%', maxWidth: '680px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem' }}>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </main>
  );
}
