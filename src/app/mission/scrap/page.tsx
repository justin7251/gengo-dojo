'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { updateAgentAfterMission, getAgentProfile } from '@/lib/agent';
import { Word, Progress, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import { isDue } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function ScrapPage() {
  return <AuthGuard><ScrapMission /></AuthGuard>;
}

type Phase = 'countdown' | 'playing' | 'done';

function ScrapMission() {
  const router = useRouter();

  const [uid, setUid]             = useState('');
  const [targetLang, setTargetLang] = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang] = useState<NativeLang>('en');
  const [words, setWords]         = useState<Word[]>([]);
  const [progress, setProgress]   = useState<Record<string, Progress>>({});
  const [queue, setQueue]         = useState<Word[]>([]);
  const [phase, setPhase]         = useState<Phase>('countdown');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft]   = useState(30);
  const [idx, setIdx]             = useState(0);
  const [choices, setChoices]     = useState<string[]>([]);
  const [selected, setSelected]   = useState('');
  const [answered, setAnswered]   = useState(false);
  const [stats, setStats]         = useState({ correct: 0, wrong: 0 });
  const [loading, setLoading]     = useState(true);
  const timerRef                  = useRef<NodeJS.Timeout | null>(null);

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
      const due  = ws.filter(w => prog[w.id] && isDue(prog[w.id]));
      const rest = ws.filter(w => !prog[w.id] || !isDue(prog[w.id]));
      const q    = [...due, ...rest.sort(() => Math.random() - 0.5)].slice(0, 5);
      setQueue(q);
      buildChoices(q, 0, ws);
      setLoading(false);
    });
  }, []);

  function buildChoices(q: Word[], i: number, allWords: Word[]) {
    const word        = q[i];
    if (!word) return;
    const distractors = allWords
      .filter(w => w.id !== word.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.meaning);
    setChoices([...distractors, word.meaning].sort(() => Math.random() - 0.5));
  }

  // Countdown
  useEffect(() => {
    if (loading || phase !== 'countdown') return;
    if (countdown <= 0) { setPhase('playing'); startTimer(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase, loading]);

  function startTimer() {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          endSession();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

    // After mission ends, instead of setPhase('done'):
    async function endSession() {
        const agentBefore = await getAgentProfile(uid);
        const debrief = await updateAgentAfterMission(uid, stats.correct, stats.wrong, 'scrap');
        
        const params = new URLSearchParams({
        correct:       String(stats.correct),
        wrong:         String(stats.wrong),
        mode:          'scrap',             // or 'deepwork' / 'braindead'
        prevSuspicion: String(agentBefore?.suspicionLevel ?? 0),
        prevChapter:   String(agentBefore?.chapter ?? 1),
        prevStreak:    String(agentBefore?.streakDays ?? 0),
        ...(debrief.newFragment ? { fragment: debrief.newFragment } : {}),
        });
        router.push(`/debrief?${params.toString()}`);
    }

  async function handleAnswer(choice: string) {
    if (answered || phase !== 'playing') return;
    setSelected(choice);
    setAnswered(true);
    const word      = queue[idx];
    const isCorrect = choice === word.meaning;

    setStats(s => ({
      correct: isCorrect ? s.correct + 1 : s.correct,
      wrong:   !isCorrect ? s.wrong + 1  : s.wrong,
    }));

    const prev = progress[word.id];
    if (prev) rateWord(uid, word.id, isCorrect ? 'good' : 'wrong', prev, targetLang, nativeLang);

    setTimeout(() => {
      const next = idx + 1;
      if (next >= queue.length) { endSession(); return; }
      setIdx(next);
      setSelected('');
      setAnswered(false);
      buildChoices(queue, next, words);
    }, 500);
  }

  if (loading) return <Shell onBack={() => router.push('/mission')}><div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div></Shell>;

  if (phase === 'countdown') {
    return (
      <Shell onBack={() => router.push('/mission')}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            ⚡ Scrap Mode — 30 seconds
          </p>
          <div style={{ fontSize: '96px', fontWeight: 700, lineHeight: 1, color: '#E24B4A' }}>
            {countdown === 0 ? 'GO' : countdown}
          </div>
        </div>
      </Shell>
    );
  }

  if (phase === 'done') {
    const total = stats.correct + stats.wrong;
    const pct   = total ? Math.round(stats.correct / total * 100) : 0;
    return (
      <Shell onBack={() => router.push('/mission')}>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '52px', marginBottom: '1rem' }}>
            {pct >= 80 ? '⚡' : pct >= 50 ? '💪' : '💀'}
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Mission complete</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
            {stats.correct} correct · {stats.wrong} wrong · {pct}% accuracy
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setPhase('countdown'); setCountdown(3); setTimeLeft(30); setIdx(0); setStats({ correct: 0, wrong: 0 }); setAnswered(false); setSelected(''); buildChoices(queue, 0, words); }}>
              Again
            </button>
            <button className="btn" onClick={() => router.push('/mission')}>Debrief</button>
          </div>
        </div>
      </Shell>
    );
  }

  const current   = queue[idx];
  const timerPct  = (timeLeft / 30) * 100;
  const timerColor = timeLeft > 15 ? '#1D9E75' : timeLeft > 7 ? '#EF9F27' : '#E24B4A';

  return (
    <Shell onBack={() => { if (timerRef.current) clearInterval(timerRef.current); router.push('/mission'); }}>

      {/* Timer + progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
        <span style={{ fontSize: '28px', fontWeight: 700, color: timerColor, minWidth: '40px', fontVariantNumeric: 'tabular-nums' }}>
          {timeLeft}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ height: '6px', background: 'var(--surface)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ height: '6px', background: timerColor, borderRadius: '3px', width: `${timerPct}%`, transition: 'width 1s linear, background 0.3s' }} />
          </div>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{idx + 1}/{queue.length}</span>
      </div>

      {/* Word */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '2rem', textAlign: 'center', marginBottom: '1rem',
      }}>
        <div style={{ fontSize: '72px', lineHeight: 1, marginBottom: '10px', fontFamily: '"Noto Sans JP","Noto Sans SC",serif' }}>
          {current?.kanji}
        </div>
        <p style={{ fontSize: '15px', color: 'var(--muted)' }}>{current?.reading}</p>
      </div>

      {/* Choices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {choices.map(choice => {
          const isCorrect  = choice === current?.meaning;
          const isSelected = choice === selected;
          let bg = 'var(--bg)', borderColor = 'var(--border)', color = 'var(--fg)';
          if (answered) {
            if (isCorrect)               { bg = '#E1F5EE'; borderColor = '#1D9E75'; color = '#0F6E56'; }
            else if (isSelected)         { bg = '#FCEBEB'; borderColor = '#E24B4A'; color = '#A32D2D'; }
            else                         { opacity: 0.3; }
          }
          return (
            <button key={choice} onClick={() => handleAnswer(choice)} disabled={answered}
              style={{
                padding: '14px', borderWidth: '1px', borderStyle: 'solid', borderColor,
                borderRadius: '10px', background: bg, color,
                fontSize: '13px', cursor: answered ? 'default' : 'pointer',
                fontFamily: 'inherit', transition: 'all 0.1s',
              }}>
              {choice}
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem 4rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '680px', display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn" style={{ fontSize: '13px' }} onClick={onBack}>← Back</button>
        <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '1rem' }}>⚡ Scrap</span>
      </div>
      <div style={{ width: '100%', maxWidth: '680px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem' }}>
        {children}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
function Spinner() {
  return <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--muted)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />;
}