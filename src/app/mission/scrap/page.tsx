'use client';
import { Spinner } from '@/components/Spinner';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { getAgentProfile, updateAgentAfterMission } from '@/lib/agent';
import { markDailyTask } from '@/lib/firestore';
import { Word, Progress, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import { isDue } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function ScrapPage() { return <AuthGuard><ScrapMission /></AuthGuard>; }

type Phase = 'countdown' | 'playing' | 'done';

function speak(text: string, targetLang: TargetLang) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = VOICE_LANG[targetLang] ?? 'ja-JP'; u.rate = 1.0;
  const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith(VOICE_LANG[targetLang].split('-')[0]));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

function ScrapMission() {
  const router = useRouter();
  const [uid, setUid]               = useState('');
  const [targetLang, setTargetLang] = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang] = useState<NativeLang>('en');
  const [words, setWords]           = useState<Word[]>([]);
  const [progress, setProgress]     = useState<Record<string, Progress>>({});
  const [queue, setQueue]           = useState<Word[]>([]);
  const [phase, setPhase]           = useState<Phase>('countdown');
  const [countdown, setCountdown]   = useState(3);
  const [timeLeft, setTimeLeft]     = useState(30);
  const [idx, setIdx]               = useState(0);
  const [choices, setChoices]       = useState<string[]>([]);
  const [selected, setSelected]     = useState('');
  const [answered, setAnswered]     = useState(false);
  const [stats, setStats]           = useState({ correct: 0, wrong: 0 });
  const [combo, setCombo]           = useState(0);
  const [score, setScore]           = useState(0);
  const [xpPops, setXpPops]         = useState<{ id: number; text: string }[]>([]);
  const [loading, setLoading]       = useState(true);
  const timerRef                    = useRef<NodeJS.Timeout | null>(null);
  const popId                       = useRef(0);

  useEffect(() => { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices(); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, []);
  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return; setUid(user.uid);
      const p = await getUserProfile(user.uid); if (!p) return;
      setTargetLang(p.targetLang); setNativeLang(p.nativeLang);
      const [ws, prog] = await Promise.all([getUserWords(user.uid, p.targetLang, p.nativeLang), getProgress(user.uid, p.targetLang, p.nativeLang)]);
      setWords(ws); setProgress(prog);
      const due = ws.filter(w => prog[w.id] && isDue(prog[w.id]));
      const rest = ws.filter(w => !prog[w.id] || !isDue(prog[w.id]));
      const q = [...due, ...rest.sort(() => Math.random() - 0.5)].slice(0, 5);
      setQueue(q); buildChoices(q, 0, ws); setLoading(false);
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

  const endSession = useCallback(async () => {
    setPhase('done');
    try {
      const ag = await getAgentProfile(uid);
      if (ag) {
        const params = new URLSearchParams({ correct: String(stats.correct), wrong: String(stats.wrong), mode: 'scrap', prevSuspicion: String(ag.suspicionLevel), prevChapter: String(ag.chapter), prevStreak: String(ag.streakDays) });
        const debrief = await updateAgentAfterMission(uid, stats.correct, stats.wrong, 'scrap');
        if (debrief.newFragment) params.set('fragment', debrief.newFragment);
        router.push(`/debrief?${params.toString()}`);
      }
    } catch { /* ignore */ }
  }, [uid, stats, router]);

  async function handleAnswer(choice: string) {
    if (answered || phase !== 'playing') return;
    if (idx === 0) markDailyTask(uid, 'mission').catch(() => {});
    setSelected(choice); setAnswered(true);
    const word = queue[idx];
    const isCorrect = choice === word.meaning;
    const newStats = { correct: isCorrect ? stats.correct + 1 : stats.correct, wrong: !isCorrect ? stats.wrong + 1 : stats.wrong };
    setStats(newStats);
    if (isCorrect) {
      const newCombo = combo + 1; setCombo(newCombo);
      const xp = newCombo >= 5 ? 30 : newCombo >= 3 ? 20 : 10;
      setScore(s => s + xp);
      const id = popId.current++;
      setXpPops(ps => [...ps, { id, text: newCombo >= 3 ? `+${xp} 🔥x${newCombo}` : `+${xp}` }]);
      setTimeout(() => setXpPops(ps => ps.filter(p => p.id !== id)), 800);
    } else { setCombo(0); }
    const prev = progress[word.id];
    if (prev) rateWord(uid, word.id, isCorrect ? 'good' : 'wrong', prev, targetLang, nativeLang);
    speak(word.kanji, targetLang);
    setTimeout(() => {
      const next = idx + 1;
      if (next >= queue.length) { if (timerRef.current) clearInterval(timerRef.current); endSession(); return; }
      setIdx(next); setSelected(''); setAnswered(false); buildChoices(queue, next, words);
    }, 500);
  }

  if (loading) return <Shell><div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center' }}><Spinner size={40} color="var(--orange)" /></div></Shell>;

  // Countdown
  if (phase === 'countdown') return (
    <Shell>
      <button className="btn" style={{ alignSelf:'flex-start', marginBottom:'auto' }} onClick={() => router.push('/mission')}>← Back</button>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
        <p style={{ fontSize:'12px', fontWeight:800, letterSpacing:'0.2em', color:'var(--muted)', marginBottom:'1.5rem', textTransform:'uppercase' }}>⚡ Scrap Mode · 30 Seconds</p>
        <div style={{
          fontFamily:'var(--font-display)', fontSize:'140px', fontWeight:900, lineHeight:1,
          color: countdown === 0 ? 'var(--green)' : 'var(--orange)',
          textShadow: countdown === 0 ? '0 0 40px rgba(88,204,2,0.6)' : '0 0 40px rgba(255,150,0,0.6)',
          animation:'bounceIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          transition:'color 0.2s',
        }}>{countdown === 0 ? 'GO!' : countdown}</div>
      </div>
    </Shell>
  );

  if (phase === 'done') {
    const total = stats.correct + stats.wrong;
    const pct   = total ? Math.round(stats.correct / total * 100) : 0;
    return (
      <Shell>
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
          <div style={{ fontSize:'80px', marginBottom:'1rem', animation:'bounceIn 0.5s ease' }}>{pct >= 80 ? '⚡' : pct >= 50 ? '💪' : '📖'}</div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'28px', fontWeight:900, color:'var(--fg)', marginBottom:'4px' }}>Time's Up!</h2>
          <p style={{ fontSize:'15px', color:'var(--muted)', fontWeight:600, marginBottom:'1.5rem' }}>{stats.correct} correct · {stats.wrong} wrong · {pct}%</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px', marginBottom:'1.5rem', width:'100%', maxWidth:'280px' }}>
            <ScoreCard emoji="⭐" label="Score" value={String(score)} accent="var(--yellow)" />
            <ScoreCard emoji="🔥" label="Accuracy" value={`${pct}%`} accent="var(--orange)" />
          </div>
          <div style={{ display:'flex', gap:'10px' }}>
            <button className="btn btn-orange" onClick={() => { setPhase('countdown'); setCountdown(3); setTimeLeft(30); setIdx(0); setStats({ correct:0, wrong:0 }); setCombo(0); setScore(0); setAnswered(false); setSelected(''); buildChoices(queue, 0, words); }}>
              Again ⚡
            </button>
            <button className="btn" onClick={() => router.push('/mission')}>Mission Hub</button>
          </div>
        </div>
        <style>{`@keyframes bounceIn{0%{opacity:0;transform:scale(0.6)}60%{transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}`}</style>
      </Shell>
    );
  }

  const current  = queue[idx];
  const timerPct = (timeLeft / 30) * 100;

  return (
    <Shell>
      {/* Top: timer + score */}
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'1rem' }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'38px', fontWeight:900, color: timeLeft > 15 ? 'var(--green)' : timeLeft > 8 ? 'var(--orange)' : 'var(--red)', minWidth:'52px', transition:'color 0.3s' }}>{timeLeft}</span>
        <div style={{ flex:1 }}>
          <div className="progress-track" style={{ height:'10px' }}>
            <div className="progress-fill" style={{ width:`${timerPct}%`, background: timerPct > 50 ? 'linear-gradient(90deg,var(--green),#7ee800)' : timerPct > 25 ? 'linear-gradient(90deg,var(--orange),#ffc800)' : 'linear-gradient(90deg,var(--red),#ff8080)', transition:'width 1s linear, background 0.3s' }} />
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <p style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:800, color:'var(--fg)', lineHeight:1 }}>{score}</p>
          {combo >= 2 && <p style={{ fontSize:'11px', fontWeight:800, color:'var(--orange)' }}>🔥 x{combo}</p>}
        </div>
      </div>

      {/* XP pop */}
      <div style={{ position:'relative', height:0, overflow:'visible' }}>
        {xpPops.map(p => (
          <div key={p.id} style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', fontFamily:'var(--font-display)', fontSize:'15px', fontWeight:800, color:'var(--green-dark)', pointerEvents:'none', zIndex:10, animation:'xpPop 0.8s ease forwards', whiteSpace:'nowrap' }}>{p.text}</div>
        ))}
      </div>

      {/* Word card */}
      <div style={{ background:'#fff', border:`2.5px solid ${answered && selected !== current?.meaning ? 'var(--red)' : answered ? 'var(--green)' : 'var(--border-dark)'}`, borderRadius:'24px', boxShadow: answered && selected !== current?.meaning ? '0 6px 0 var(--red-dark)' : answered ? '0 6px 0 var(--green-dark)' : '0 8px 0 var(--border-dark)', padding:'2rem', textAlign:'center', marginBottom:'1.25rem', transition:'border-color 0.15s, box-shadow 0.15s', animation: answered && selected !== current?.meaning ? 'wrongShake 0.4s ease' : 'fadeIn 0.2s ease' }}>
        <p style={{ fontSize:'11px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--muted)', marginBottom:'1rem' }}>{idx+1}/{queue.length} · {current?.topic}</p>
        <div style={{ fontSize:'76px', lineHeight:1, fontFamily:'"Noto Sans JP","Noto Sans SC",serif', color:'var(--fg)', marginBottom:'8px' }}>{current?.kanji}</div>
        <p style={{ fontSize:'16px', color:'var(--muted-bright)', fontWeight:600 }}>{current?.reading}</p>
      </div>

      {/* 2×2 choices */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
        {choices.map(choice => {
          const isCorrect  = choice === current?.meaning;
          const isSelected = choice === selected;
          let bg = '#fff', border = 'var(--border-dark)', shadow = 'var(--border-dark)', color = 'var(--fg)', opacity = 1;
          if (answered) {
            if (isCorrect)      { bg = 'var(--green-light)'; border = 'var(--green)'; shadow = 'var(--green-dark)'; color = '#2a7a00'; }
            else if (isSelected){ bg = 'var(--red-light)';   border = 'var(--red)';   shadow = 'var(--red-dark)';   color = 'var(--red-dark)'; }
            else                { opacity = 0.35; }
          }
          return (
            <button key={choice} onClick={() => handleAnswer(choice)} disabled={answered} style={{ padding:'13px 10px', borderRadius:'14px', border:`2.5px solid ${border}`, background:bg, color, fontSize:'13px', fontWeight:700, cursor:answered ? 'default' : 'pointer', fontFamily:'var(--font-ui)', boxShadow:`0 4px 0 ${shadow}`, opacity, lineHeight:1.3, transition:'all 0.1s ease' }}>
              {answered && isCorrect && '✅ '}{answered && isSelected && !isCorrect && '❌ '}{choice}
            </button>
          );
        })}
      </div>
      <style>{`
        @keyframes xpPop{0%{opacity:0;transform:translateX(-50%) translateY(0) scale(0.6)}40%{opacity:1;transform:translateX(-50%) translateY(-22px) scale(1.2)}100%{opacity:0;transform:translateX(-50%) translateY(-42px) scale(1)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        @keyframes wrongShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
        @keyframes bounceIn{0%{opacity:0;transform:scale(0.6)}60%{transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}
      `}</style>
    </Shell>
  );
}

function ScoreCard({ emoji, label, value, accent = 'var(--blue)' }: { emoji:string;label:string;value:string;accent?:string }) {
  return (
    <div style={{ background:'#fff', border:`2.5px solid ${accent}55`, borderRadius:'14px', padding:'12px 8px', textAlign:'center', boxShadow:`0 4px 0 ${accent}55` }}>
      <div style={{ fontSize:'20px', marginBottom:'4px' }}>{emoji}</div>
      <p style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:800, color:'var(--fg)', lineHeight:1 }}>{value}</p>
      <p style={{ fontSize:'10px', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginTop:'3px' }}>{label}</p>
    </div>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', padding:'1.5rem 1.25rem 3rem', fontFamily:'var(--font-ui)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', top:'-80px', right:'-80px', width:'280px', height:'280px', borderRadius:'50%', background:'rgba(255,150,0,0.08)', filter:'blur(50px)', pointerEvents:'none' }} />
      <div style={{ maxWidth:'480px', margin:'0 auto', width:'100%', flex:1, display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>{children}</div>
    </main>
  );
}
