'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { getAgentProfile, updateAgentAfterMission } from '@/lib/agent';
import { Word, Progress, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import { isDue } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function ScrapPage() {
  return <AuthGuard><ScrapMission /></AuthGuard>;
}

type Phase = 'countdown' | 'playing' | 'done';

function speak(text: string, targetLang: TargetLang) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang  = VOICE_LANG[targetLang] ?? 'ja-JP';
  utter.rate  = 1.0;
  const voices   = window.speechSynthesis.getVoices();
  const langCode = VOICE_LANG[targetLang].split('-')[0];
  const native   = voices.find(v => v.lang.startsWith(langCode));
  if (native) utter.voice = native;
  window.speechSynthesis.speak(utter);
}

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
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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
      const due  = ws.filter(w => prog[w.id] && isDue(prog[w.id]));
      const rest = ws.filter(w => !prog[w.id] || !isDue(prog[w.id]));
      const q    = [...due, ...rest.sort(() => Math.random() - 0.5)].slice(0, 5);
      setQueue(q);
      buildChoices(q, 0, ws);
      setLoading(false);
    });
  }, []);

  function buildChoices(q: Word[], i: number, allWords: Word[]) {
    const word = q[i]; if (!word) return;
    const dist = allWords.filter(w => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3).map(w => w.meaning);
    setChoices([...dist, word.meaning].sort(() => Math.random() - 0.5));
  }

  useEffect(() => {
    if (loading || phase !== 'countdown') return;
    if (countdown <= 0) { setPhase('playing'); startTimer(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase, loading]);

  function startTimer() {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { if (timerRef.current) clearInterval(timerRef.current); endSession(); return 0; } return t - 1; });
    }, 1000);
  }

  async function endSession() {
    setPhase('done');
    try {
      const ag = await getAgentProfile(uid);
      if (ag) {
        const params = new URLSearchParams({
          correct: String(stats.correct), wrong: String(stats.wrong), mode: 'scrap',
          prevSuspicion: String(ag.suspicionLevel), prevChapter: String(ag.chapter), prevStreak: String(ag.streakDays),
        });
        const debrief = await updateAgentAfterMission(uid, stats.correct, stats.wrong, 'scrap');
        if (debrief.newFragment) params.set('fragment', debrief.newFragment);
        router.push(`/debrief?${params.toString()}`);
      }
    } catch { /* ignore */ }
  }

  async function handleAnswer(choice: string) {
    if (answered || phase !== 'playing') return;
    setSelected(choice); setAnswered(true);
    const word = queue[idx];
    const isCorrect = choice === word.meaning;
    const newStats = { correct: isCorrect ? stats.correct + 1 : stats.correct, wrong: !isCorrect ? stats.wrong + 1 : stats.wrong };
    setStats(newStats);
    const prev = progress[word.id];
    if (prev) rateWord(uid, word.id, isCorrect ? 'good' : 'wrong', prev, targetLang, nativeLang);
    setTimeout(() => {
      const next = idx + 1;
      if (next >= queue.length) { if (timerRef.current) clearInterval(timerRef.current); endSession(); return; }
      setIdx(next); setSelected(''); setAnswered(false); buildChoices(queue, next, words);
    }, 500);
  }

  if (loading) return <Screen><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><Spinner /></div></Screen>;

  // Countdown
  if (phase === 'countdown') return (
    <Screen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>⚡ SCRAP MODE · 30 SECONDS</p>
        <div style={{ fontSize: '120px', fontWeight: 700, lineHeight: 1, color: countdown === 0 ? '#00e87a' : '#EF9F27', fontFamily: 'var(--font-mono)', textShadow: `0 0 40px ${countdown === 0 ? 'rgba(0,232,122,0.6)' : 'rgba(239,159,39,0.6)'}`, transition: 'color 0.2s' }}>
          {countdown === 0 ? 'GO' : countdown}
        </div>
      </div>
    </Screen>
  );

  // Done
  if (phase === 'done') {
    const total = stats.correct + stats.wrong;
    const pct   = total ? Math.round(stats.correct / total * 100) : 0;
    return (
      <Screen>
        <TopBar onBack={() => router.push('/mission')} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '1rem' }}>{pct >= 80 ? '⚡' : pct >= 50 ? '💪' : '💀'}</div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Mission complete</h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>{stats.correct} correct · {stats.wrong} wrong · {pct}%</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setPhase('countdown'); setCountdown(3); setTimeLeft(30); setIdx(0); setStats({ correct: 0, wrong: 0 }); setAnswered(false); setSelected(''); buildChoices(queue, 0, words); }} style={WHITE_BTN}>Again</button>
            <button onClick={() => router.push('/mission')} style={GHOST_BTN}>Debrief</button>
          </div>
        </div>
      </Screen>
    );
  }

  const current    = queue[idx];
  const timerPct   = (timeLeft / 30) * 100;
  const timerColor = timeLeft > 15 ? '#00e87a' : timeLeft > 7 ? '#EF9F27' : '#E24B4A';

  return (
    <Screen>
      <TopBar onBack={() => { if (timerRef.current) clearInterval(timerRef.current); router.push('/mission'); }} />

      {/* Timer row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
        <span style={{ fontSize: '36px', fontWeight: 700, color: timerColor, minWidth: '50px', fontFamily: 'var(--font-mono)', textShadow: `0 0 16px ${timerColor}80`, transition: 'color 0.3s' }}>
          {timeLeft}
        </span>
        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '6px', background: timerColor, borderRadius: '3px', width: `${timerPct}%`, transition: 'width 1s linear, background 0.3s', boxShadow: `0 0 10px ${timerColor}` }} />
        </div>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>{idx + 1}/{queue.length}</span>
      </div>

      {/* Word card */}
      <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '20px', padding: '2rem', textAlign: 'center', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
        {/* Ghost background */}
        <div style={{ position: 'absolute', fontSize: '160px', lineHeight: 1, fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: 'rgba(255,255,255,0.04)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', userSelect: 'none' }}>
          {current?.kanji}
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '72px', lineHeight: 1, marginBottom: '10px', fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: '#fff', textShadow: '0 0 30px rgba(255,255,255,0.15)' }}>
            {current?.kanji}
          </div>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.5)' }}>{current?.reading}</p>
        </div>
      </div>

      {/* 2x2 grid choices */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {choices.map(choice => {
          const isCorrect  = choice === current?.meaning;
          const isSelected = choice === selected;
          let bg = 'rgba(255,255,255,0.06)', borderColor = 'rgba(255,255,255,0.12)', color = 'rgba(255,255,255,0.85)';
          if (answered) {
            if (isCorrect)       { bg = 'rgba(0,232,122,0.15)'; borderColor = 'rgba(0,232,122,0.5)'; color = '#00e87a'; }
            else if (isSelected) { bg = 'rgba(226,75,74,0.15)'; borderColor = 'rgba(226,75,74,0.5)'; color = '#ff8080'; }
            else { bg = 'transparent'; color = 'rgba(255,255,255,0.2)'; }
          }
          return (
            <button key={choice} onClick={() => handleAnswer(choice)} disabled={answered} style={{
              padding: '14px 10px', borderWidth: '1px', borderStyle: 'solid', borderColor, borderRadius: '12px',
              background: bg, color, fontSize: '13px', cursor: answered ? 'default' : 'pointer',
              fontFamily: 'var(--font-ui)', transition: 'all 0.1s', lineHeight: 1.3,
            }}>
              {choice}
            </button>
          );
        })}
      </div>

      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a1200',
      backgroundImage: 'radial-gradient(ellipse at top, #1a2e00 0%, #0a1200 60%, #050800 100%)',
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1.25rem 2rem', fontFamily: 'var(--font-ui)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,232,122,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,232,122,0.04) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
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
      <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>⚡ Scrap</span>
      <div style={{ width: '60px' }} />
    </div>
  );
}

const WHITE_BTN: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', color: '#0a1200', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' };
const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
function Spinner() { return <div style={{ width: '28px', height: '28px', border: '2px solid rgba(0,232,122,0.15)', borderTopColor: '#00e87a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />; }
