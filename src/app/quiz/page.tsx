'use client';
import { Spinner } from '@/components/Spinner';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { Word, Progress, Rating, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';

export default function QuizPage() { return <AuthGuard><Quiz /></AuthGuard>; }

type QuizQuestion = { word: Word; choices: string[]; correct: string; };
type AnswerState  = 'unanswered' | 'correct' | 'wrong';

function speak(text: string, lang: TargetLang) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = VOICE_LANG[lang] ?? 'ja-JP'; u.rate = 0.85;
  const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith(VOICE_LANG[lang].split('-')[0]));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

function buildQuestions(words: Word[]): QuizQuestion[] {
  const pool = [...words].sort(() => Math.random() - 0.5).slice(0, Math.min(10, words.length));
  return pool.map(word => {
    const distractors = words.filter(w => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3).map(w => w.meaning);
    return { word, choices: [...distractors, word.meaning].sort(() => Math.random() - 0.5), correct: word.meaning };
  });
}

function Quiz() {
  const router = useRouter();
  const [uid, setUid]                   = useState('');
  const [targetLang, setTargetLang]     = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang]     = useState<NativeLang>('en');
  const [questions, setQuestions]       = useState<QuizQuestion[]>([]);
  const [progress, setProgress]         = useState<Record<string, Progress>>({});
  const [idx, setIdx]                   = useState(0);
  const [answerState, setAnswerState]   = useState<AnswerState>('unanswered');
  const [selected, setSelected]         = useState('');
  const [loading, setLoading]           = useState(true);
  const [speaking, setSpeaking]         = useState(false);
  const [score, setScore]               = useState({ correct: 0, wrong: 0 });
  const [done, setDone]                 = useState(false);
  const [advancing, setAdvancing]       = useState(false);

  useEffect(() => { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices(); }, []);
  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      setTargetLang(profile.targetLang); setNativeLang(profile.nativeLang);
      const [words, prog] = await Promise.all([getUserWords(user.uid, profile.targetLang, profile.nativeLang), getProgress(user.uid, profile.targetLang, profile.nativeLang)]);
      setProgress(prog); setQuestions(buildQuestions(words)); setLoading(false);
    });
  }, []);

  const current = questions[idx];
  const pct     = questions.length ? Math.round((idx / questions.length) * 100) : 0;

  function handleSpeak() {
    if (!current) return;
    setSpeaking(true); speak(current.word.kanji, targetLang);
    setTimeout(() => setSpeaking(false), 1200);
  }

  async function handleAnswer(choice: string) {
    if (answerState !== 'unanswered' || advancing) return;
    const isCorrect = choice === current.correct;
    setSelected(choice); setAnswerState(isCorrect ? 'correct' : 'wrong');
    setScore(s => ({ correct: isCorrect ? s.correct + 1 : s.correct, wrong: !isCorrect ? s.wrong + 1 : s.wrong }));
    const prev: Progress | undefined = progress[current.word.id];
    if (prev) await rateWord(uid, current.word.id, isCorrect ? 'good' : 'wrong', prev, targetLang, nativeLang);
  }

  async function handleNext() {
    if (advancing) return;
    setAdvancing(true);
    const next = idx + 1;
    if (next >= questions.length) { setDone(true); } else { setIdx(next); setAnswerState('unanswered'); setSelected(''); }
    setAdvancing(false);
  }

  function restart() {
    setIdx(0); setAnswerState('unanswered'); setSelected(''); setDone(false); setScore({ correct: 0, wrong: 0 });
    setQuestions(qs => buildQuestions(qs.map(q => q.word)));
  }

  if (loading) return <Shell accent="var(--blue)"><div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={40} color="var(--blue)" /></div></Shell>;

  if (!loading && questions.length < 2) return (
    <Shell accent="var(--blue)">
      <TopBar onBack={() => router.push('/dashboard')} title="🧩 Quiz" accent="var(--blue)" />
      <EmptyState emoji="📚" title="Not enough words" sub="You need at least 4 words. Generate more from the dashboard." onBack={() => router.push('/dashboard')} />
    </Shell>
  );

  if (done) {
    const total = score.correct + score.wrong;
    const pctC  = total ? Math.round(score.correct / total * 100) : 0;
    return (
      <Shell accent="var(--blue)">
        <TopBar onBack={() => router.push('/dashboard')} title="🧩 Quiz" accent="var(--blue)" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '80px', marginBottom: '1rem', animation: 'bounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            {pctC === 100 ? '🏆' : pctC >= 80 ? '🎯' : pctC >= 50 ? '💪' : '📖'}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 900, color: 'var(--fg)', marginBottom: '6px' }}>
            {pctC === 100 ? 'Perfect!' : pctC >= 80 ? 'Great work!' : pctC >= 50 ? 'Keep it up!' : "You'll get there!"}
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '1.5rem', fontWeight: 600 }}>{score.correct} correct · {score.wrong} wrong</p>
          <div style={{ width: '100%', maxWidth: '320px', marginBottom: '6px' }}>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${pctC}%` }} /></div>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--muted-bright)', marginBottom: '1.5rem', fontWeight: 700 }}>{pctC}% accuracy</p>
          {/* Review list */}
          <div style={{ width: '100%', background: '#fff', border: '2.5px solid var(--border-dark)', borderRadius: '16px', boxShadow: '0 5px 0 var(--border-dark)', overflow: 'hidden', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div style={{ padding: '10px 16px', background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-dark)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 800 }}>Review</div>
            {questions.map((q, i) => (
              <div key={q.word.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', borderBottom: i < questions.length - 1 ? '1.5px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: '22px', minWidth: '30px', fontFamily: '"Noto Sans JP","Noto Sans SC",serif' }}>{q.word.kanji}</span>
                <div style={{ flex: 1 }}><p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fg)' }}>{q.word.meaning}</p><p style={{ fontSize: '11px', color: 'var(--muted)' }}>{q.word.reading}</p></div>
                <span className="pill pill-teal">{q.word.topic}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-blue" onClick={restart}>Try Again 🔄</button>
            <button className="btn" onClick={() => router.push('/dashboard')}>Dashboard</button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell accent="var(--blue)">
      <TopBar onBack={() => router.push('/dashboard')} title="🧩 Quiz" accent="var(--blue)" />

      {/* Progress */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '6px' }}>
          <span>Question {idx + 1} of {questions.length}</span>
          <span style={{ color: 'var(--green-dark)' }}>{score.correct} ✓</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      {/* Question card */}
      <div style={{ background: '#fff', border: '2.5px solid var(--border-dark)', borderRadius: '24px', boxShadow: '0 8px 0 var(--border-dark)', padding: '2rem', textAlign: 'center', marginBottom: '1.25rem', position: 'relative', animation: 'fadeIn 0.25s ease' }}>
        <button onClick={handleSpeak} style={{ position: 'absolute', top: '14px', right: '14px', width: '38px', height: '38px', borderRadius: '50%', border: `2.5px solid ${speaking ? 'var(--blue)' : 'var(--border-dark)'}`, background: speaking ? 'var(--blue-light)' : 'var(--bg-secondary)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: speaking ? '0 3px 0 var(--blue-dark)' : '0 3px 0 var(--border-dark)', transition: 'all 0.15s' }}>🔊</button>
        <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)', marginBottom: '1rem' }}>What does this mean?</p>
        <div style={{ fontSize: '72px', lineHeight: 1, marginBottom: '10px', fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: 'var(--fg)' }}>{current.word.kanji}</div>
        <p style={{ fontSize: '16px', color: 'var(--muted-bright)', fontWeight: 600 }}>
          {current.word.reading}{current.word.romanization && <span style={{ fontSize: '13px', marginLeft: '6px' }}>· {current.word.romanization}</span>}
        </p>
      </div>

      {/* Choices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.25rem' }}>
        {current.choices.map(choice => {
          const isCorrect = choice === current.correct;
          const isWrong   = choice === selected && !isCorrect;
          const isAnswered = answerState !== 'unanswered';
          let bg = '#fff', border = 'var(--border-dark)', shadow = 'var(--border-dark)', color = 'var(--fg)', opacity = 1;
          if (isAnswered) {
            if (isCorrect)      { bg = 'var(--green-light)'; border = 'var(--green)'; shadow = 'var(--green-dark)'; color = '#2a7a00'; }
            else if (isWrong)   { bg = 'var(--red-light)';   border = 'var(--red)';   shadow = 'var(--red-dark)';   color = 'var(--red-dark)'; }
            else                { opacity = 0.4; }
          }
          return (
            <button key={choice} onClick={() => handleAnswer(choice)} disabled={isAnswered} style={{
              padding: '14px 16px', borderRadius: '14px', border: `2.5px solid ${border}`,
              background: bg, color, fontSize: '14px', fontWeight: 700,
              cursor: isAnswered ? 'default' : 'pointer',
              fontFamily: 'var(--font-ui)', textAlign: 'left',
              boxShadow: `0 4px 0 ${shadow}`, opacity,
              display: 'flex', alignItems: 'center', gap: '10px',
              transition: 'all 0.1s ease',
              animation: isAnswered && isCorrect ? 'correctPop 0.4s ease' : isAnswered && isWrong ? 'wrongShake 0.4s ease' : 'none',
            }}>
              {isAnswered && isCorrect && <span style={{ fontSize: '18px' }}>✅</span>}
              {isAnswered && isWrong   && <span style={{ fontSize: '18px' }}>❌</span>}
              {choice}
            </button>
          );
        })}
      </div>

      {answerState !== 'unanswered' && (
        <div style={{ animation: 'fadeUp 0.2s ease' }}>
          {current.word.example && (
            <div style={{ background: '#fff', border: '2.5px solid var(--border-dark)', borderRadius: '14px', padding: '14px 16px', marginBottom: '10px', boxShadow: '0 4px 0 var(--border-dark)' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '6px' }}>Example</p>
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--fg)', fontFamily: '"Noto Sans JP","Noto Sans SC",serif', marginBottom: current.word.example_translation ? '6px' : '0' }}>{current.word.example}</p>
              {current.word.example_translation && <p style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic', borderTop: '1.5px solid var(--border)', paddingTop: '6px' }}>{current.word.example_translation}</p>}
            </div>
          )}
          <button className="btn btn-blue" style={{ width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center' }} onClick={handleNext} disabled={advancing}>
            {idx + 1 >= questions.length ? '🎉 See Results' : 'Next →'}
          </button>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, accent = 'var(--blue)' }: { children: React.ReactNode; accent?: string }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 3rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: `${accent}12`, filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounceIn { 0%{opacity:0;transform:scale(0.7)} 60%{transform:scale(1.08)} 100%{opacity:1;transform:scale(1)} }
        @keyframes correctPop { 0%{transform:scale(1)} 30%{transform:scale(1.04)} 100%{transform:scale(1)} }
        @keyframes wrongShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
      `}</style>
    </main>
  );
}
function TopBar({ onBack, title, accent }: { onBack: () => void; title: string; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
      <button onClick={onBack} className="btn" style={{ fontSize: '13px', padding: '8px 14px' }}>← Back</button>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, color: 'var(--fg)' }}>{title}</span>
      <div style={{ width: '70px' }} />
    </div>
  );
}
function EmptyState({ emoji, title, sub, onBack }: { emoji: string; title: string; sub: string; onBack: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 0', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '56px', marginBottom: '1rem' }}>{emoji}</p>
      <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--fg)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>{title}</p>
      <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem', fontWeight: 600 }}>{sub}</p>
      <button className="btn btn-primary" onClick={onBack}>← Dashboard</button>
    </div>
  );
}
