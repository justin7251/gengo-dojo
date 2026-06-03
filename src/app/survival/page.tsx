'use client';
import { Spinner } from '@/components/Spinner';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { Word, Progress, Rating, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import { isDue } from '@/lib/srs';
import { markDailyTask } from '@/lib/firestore';
import AuthGuard from '@/components/AuthGuard';

export default function SurvivalPage() { return <AuthGuard><Survival /></AuthGuard>; }

const MAX_LIVES  = 3;
const TIME_PER_Q = 8;
const MAX_WORDS  = 15;

function speak(text: string, targetLang: TargetLang) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = VOICE_LANG[targetLang] ?? 'ja-JP'; u.rate = 0.9;
  const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith(VOICE_LANG[targetLang].split('-')[0]));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

type Phase    = 'intro' | 'playing' | 'dead' | 'cleared';
type Question = { word: Word; choices: string[]; correct: string };

function buildQueue(words: Word[], progress: Record<string, Progress>): Word[] {
  const due  = words.filter(w => progress[w.id] && isDue(progress[w.id]));
  const rest = words.filter(w => !progress[w.id] || !isDue(progress[w.id]));
  return [...due, ...rest.sort(() => Math.random() - 0.5)].slice(0, MAX_WORDS);
}

function buildQuestion(word: Word, allWords: Word[]): Question {
  const distractors = allWords.filter(w => w.id !== word.id).sort(() => Math.random() - 0.5).slice(0, 3).map(w => w.meaning);
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
  const [qIdx, setQIdx]             = useState(0);
  const [question, setQuestion]     = useState<Question | null>(null);
  const [selected, setSelected]     = useState('');
  const [answered, setAnswered]     = useState(false);
  const [lives, setLives]           = useState(MAX_LIVES);
  const [timeLeft, setTimeLeft]     = useState(TIME_PER_Q);
  const [score, setScore]           = useState(0);
  const [combo, setCombo]           = useState(0);
  const [maxCombo, setMaxCombo]     = useState(0);
  const [xpPops, setXpPops]         = useState<{ id: number; x: number; text: string }[]>();
  const [shakingCard, setShakingCard] = useState(false);
  const [loading, setLoading]       = useState(true);
  const timerRef                    = useRef<NodeJS.Timeout | null>(null);
  const popId                       = useRef(0);

  useEffect(() => { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices(); }, []);
  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return; setUid(user.uid);
      const p = await getUserProfile(user.uid); if (!p) return;
      setTargetLang(p.targetLang); setNativeLang(p.nativeLang);
      const [ws, prog] = await Promise.all([getUserWords(user.uid, p.targetLang, p.nativeLang), getProgress(user.uid, p.targetLang, p.nativeLang)]);
      setAllWords(ws); setProgress(prog); setLoading(false);
    });
  }, []);

  function startGame() {
    const q = buildQueue(allWords, progress);
    setQueue(q); setQIdx(0); setLives(MAX_LIVES); setScore(0); setCombo(0); setMaxCombo(0);
    setQuestion(buildQuestion(q[0], allWords)); setAnswered(false); setSelected('');
    setPhase('playing'); startTimer(TIME_PER_Q);
  }

  function startTimer(t: number) {
    setTimeLeft(t);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); handleTimeout(); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  const handleTimeout = useCallback(() => {
    setAnswered(true); setSelected('__timeout__');
    setCombo(0);
    setLives(prev => {
      const next = prev - 1;
      if (next <= 0) { setTimeout(() => setPhase('dead'), 900); }
      return next;
    });
    setShakingCard(true); setTimeout(() => setShakingCard(false), 500);
    setTimeout(advance, 1200);
  }, []);

  async function handleAnswer(choice: string) {
    if (answered || phase !== 'playing') return;
    if (qIdx === 0) markDailyTask(uid, 'survival').catch(() => {});
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(choice); setAnswered(true);
    const isCorrect = choice === question!.correct;
    const word = question!.word;
    const prev = progress[word.id];
    if (prev) rateWord(uid, word.id, isCorrect ? 'good' : 'wrong', prev, targetLang, nativeLang);
    speak(word.kanji, targetLang);

    if (isCorrect) {
      const newCombo = combo + 1;
      setCombo(newCombo); setMaxCombo(m => Math.max(m, newCombo));
      const xp = newCombo >= 5 ? 30 : newCombo >= 3 ? 20 : 10;
      setScore(s => s + xp);
      // XP pop
      const id = popId.current++;
      setXpPops(ps => [...(ps ?? []), { id, x: Math.random() * 60 + 20, text: newCombo >= 3 ? `+${xp} 🔥x${newCombo}` : `+${xp}` }]);
      setTimeout(() => setXpPops(ps => ps?.filter(p => p.id !== id)), 900);
    } else {
      setCombo(0);
      setLives(prev => {
        const next = prev - 1;
        if (next <= 0) { setTimeout(() => setPhase('dead'), 900); }
        return next;
      });
      setShakingCard(true); setTimeout(() => setShakingCard(false), 500);
    }
    setTimeout(advance, isCorrect ? 700 : 1000);
  }

  function advance() {
    const nextIdx = qIdx + 1;
    if (nextIdx >= queue.length) { setPhase('cleared'); return; }
    setQIdx(nextIdx); setQuestion(buildQuestion(queue[nextIdx], allWords));
    setSelected(''); setAnswered(false); startTimer(TIME_PER_Q);
  }

  const canPlay = allWords.length >= 4;
  const timerPct = (timeLeft / TIME_PER_Q) * 100;
  const timerColor = timeLeft > 5 ? 'var(--green)' : timeLeft > 2 ? 'var(--orange)' : 'var(--red)';

  if (loading) return <Shell><div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}><Spinner size={40} /></div></Shell>;

  // ── INTRO ──────────────────────────────────────────────
  if (phase === 'intro') return (
    <Shell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
        <div style={{ fontSize:'80px', marginBottom:'1rem', animation:'float 2s ease-in-out infinite' }}>💀</div>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'32px', fontWeight:900, color:'var(--fg)', marginBottom:'8px' }}>Survival Mode</h1>
        <p style={{ fontSize:'15px', color:'var(--muted)', fontWeight:600, maxWidth:'280px', lineHeight:1.6, marginBottom:'2rem' }}>
          3 lives. {TIME_PER_Q} seconds per question. Build combos for bonus XP.
        </p>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'2rem', width:'100%', maxWidth:'340px' }}>
          {[
            { emoji:'❤️', label:'3 Lives',        sub:'Lose one per miss' },
            { emoji:'⏱',  label:'8 Sec/Q',        sub:'Timer pressure' },
            { emoji:'🔥', label:'Combo Bonus',    sub:'3x = +20, 5x = +30' },
          ].map(s => (
            <div key={s.label} style={{ background:'#fff', border:'2.5px solid var(--border-dark)', borderRadius:'14px', padding:'12px 8px', textAlign:'center', boxShadow:'0 4px 0 var(--border-dark)' }}>
              <div style={{ fontSize:'22px', marginBottom:'4px' }}>{s.emoji}</div>
              <p style={{ fontSize:'12px', fontWeight:800, color:'var(--fg)' }}>{s.label}</p>
              <p style={{ fontSize:'10px', color:'var(--muted)', fontWeight:600 }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {canPlay
          ? <button className="btn btn-red" style={{ padding:'14px 40px', fontSize:'16px' }} onClick={startGame}>Start 💀</button>
          : <div style={{ background:'var(--red-light)', border:'2.5px solid var(--red)', borderRadius:'14px', padding:'14px 20px', maxWidth:'280px' }}>
              <p style={{ fontSize:'14px', fontWeight:700, color:'var(--red-dark)' }}>Need at least 4 words</p>
              <button className="btn btn-primary" style={{ marginTop:'10px', width:'100%' }} onClick={() => router.push('/dashboard')}>Generate words first</button>
            </div>
        }
        <button className="btn" style={{ marginTop:'12px' }} onClick={() => router.push('/dashboard')}>← Dashboard</button>
      </div>
    </Shell>
  );

  // ── DEAD ──────────────────────────────────────────────
  if (phase === 'dead') return (
    <Shell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
        <div style={{ fontSize:'80px', marginBottom:'1rem', animation:'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>💔</div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'28px', fontWeight:900, color:'var(--fg)', marginBottom:'4px' }}>You died!</h2>
        <p style={{ fontSize:'15px', color:'var(--muted)', fontWeight:600, marginBottom:'1.5rem' }}>
          Survived {qIdx} / {queue.length} questions
        </p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'2rem', width:'100%', maxWidth:'340px' }}>
          <ScoreCard emoji="⭐" label="Score"     value={String(score)} />
          <ScoreCard emoji="🔥" label="Best Combo" value={`x${maxCombo}`} />
          <ScoreCard emoji="💀" label="Survived"   value={`${qIdx}/${queue.length}`} />
        </div>
        <button className="btn btn-red" style={{ padding:'13px 32px', fontSize:'15px', marginBottom:'10px' }} onClick={startGame}>Try Again 💀</button>
        <button className="btn" onClick={() => router.push('/dashboard')}>← Dashboard</button>
      </div>
    </Shell>
  );

  // ── CLEARED ───────────────────────────────────────────
  if (phase === 'cleared') return (
    <Shell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
        <div style={{ fontSize:'80px', marginBottom:'1rem', animation:'bounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}>🏆</div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'28px', fontWeight:900, color:'var(--fg)', marginBottom:'4px' }}>You cleared it!</h2>
        <p style={{ fontSize:'15px', color:'var(--muted)', fontWeight:600, marginBottom:'1.5rem' }}>All {queue.length} questions!</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'2rem', width:'100%', maxWidth:'340px' }}>
          <ScoreCard emoji="⭐" label="Score"      value={String(score)} accent="var(--yellow)" />
          <ScoreCard emoji="🔥" label="Best Combo"  value={`x${maxCombo}`} accent="var(--orange)" />
          <ScoreCard emoji="❤️" label="Lives Left"  value={Array(lives).fill('❤️').join('')} />
        </div>
        <button className="btn btn-primary" style={{ padding:'13px 32px', fontSize:'15px', marginBottom:'10px' }} onClick={startGame}>Play Again 🔄</button>
        <button className="btn" onClick={() => router.push('/dashboard')}>← Dashboard</button>
      </div>
    </Shell>
  );

  // ── PLAYING ───────────────────────────────────────────
  return (
    <Shell>
      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
        <button className="btn" style={{ fontSize:'12px', padding:'6px 12px' }} onClick={() => { clearInterval(timerRef.current!); setPhase('intro'); }}>✕</button>
        {/* Lives */}
        <div style={{ display:'flex', gap:'4px', fontSize:'22px' }}>
          {Array(MAX_LIVES).fill(0).map((_,i) => (
            <span key={i} style={{ opacity: i < lives ? 1 : 0.2, animation: i === lives && answered && !selected.includes(question!.correct) ? 'heartBeat 0.3s ease' : 'none' }}>❤️</span>
          ))}
        </div>
        {/* Score + combo */}
        <div style={{ textAlign:'right' }}>
          <p style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:800, color:'var(--fg)', lineHeight:1 }}>{score}</p>
          {combo >= 2 && <p style={{ fontSize:'11px', fontWeight:800, color:'var(--orange)', animation:'pulse 0.6s ease-in-out infinite' }}>🔥 x{combo}</p>}
        </div>
      </div>

      {/* Timer */}
      <div style={{ marginBottom:'1rem' }}>
        <div className="progress-track" style={{ height:'10px' }}>
          <div className="progress-fill" style={{ width:`${timerPct}%`, background: timerPct > 60 ? 'linear-gradient(90deg,var(--green),#7ee800)' : timerPct > 25 ? 'linear-gradient(90deg,var(--orange),#ffc800)' : 'linear-gradient(90deg,var(--red),#ff8080)', transition:'width 1s linear, background 0.3s' }} />
        </div>
        <p style={{ textAlign:'right', fontSize:'11px', fontWeight:800, color:timerColor, marginTop:'3px' }}>{timeLeft}s</p>
      </div>

      {/* Word card */}
      <div style={{ position:'relative', marginBottom:'1rem' }}>
        {/* XP pop-ups */}
        {xpPops?.map(p => (
          <div key={p.id} style={{ position:'absolute', left:`${p.x}%`, top:'-10px', fontFamily:'var(--font-display)', fontSize:'14px', fontWeight:800, color:'var(--green-dark)', pointerEvents:'none', zIndex:10, animation:'xpPop 0.8s ease forwards', whiteSpace:'nowrap' }}>
            {p.text}
          </div>
        ))}
        <div style={{
          background:'#fff', border:`2.5px solid ${answered && selected !== question?.correct ? 'var(--red)' : answered ? 'var(--green)' : 'var(--border-dark)'}`,
          borderRadius:'24px', padding:'2rem', textAlign:'center',
          boxShadow: answered && selected !== question?.correct ? '0 6px 0 var(--red-dark)' : answered ? '0 6px 0 var(--green-dark)' : '0 8px 0 var(--border-dark)',
          animation: shakingCard ? 'wrongShake 0.4s ease' : 'fadeIn 0.2s ease',
          transition:'border-color 0.15s, box-shadow 0.15s',
        }}>
          <div style={{ fontSize:'11px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--muted)', marginBottom:'1rem' }}>{question?.word.topic}</div>
          <div style={{ fontSize:'72px', lineHeight:1, fontFamily:'"Noto Sans JP","Noto Sans SC",serif', color:'var(--fg)', marginBottom:'8px' }}>{question?.word.kanji}</div>
          <p style={{ fontSize:'16px', color:'var(--muted-bright)', fontWeight:600 }}>{question?.word.reading}</p>
        </div>
      </div>

      {/* Choices 2x2 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
        {question?.choices.map(choice => {
          const isCorrect  = choice === question.correct;
          const isSelected = choice === selected;
          let bg = '#fff', border = 'var(--border-dark)', shadow = 'var(--border-dark)', color = 'var(--fg)', opacity = 1;
          if (answered) {
            if (isCorrect)      { bg = 'var(--green-light)'; border = 'var(--green)'; shadow = 'var(--green-dark)'; color = '#2a7a00'; }
            else if (isSelected){ bg = 'var(--red-light)';   border = 'var(--red)';   shadow = 'var(--red-dark)';   color = 'var(--red-dark)'; }
            else                { opacity = 0.35; }
          }
          return (
            <button key={choice} onClick={() => handleAnswer(choice)} disabled={answered} style={{
              padding:'13px 10px', borderRadius:'14px', border:`2.5px solid ${border}`,
              background:bg, color, fontSize:'13px', fontWeight:700,
              cursor:answered ? 'default' : 'pointer', fontFamily:'var(--font-ui)',
              boxShadow:`0 4px 0 ${shadow}`, opacity, lineHeight:1.3,
              transition:'all 0.1s ease',
              animation: answered && isSelected && !isCorrect ? 'wrongShake 0.35s ease' : answered && isCorrect && isSelected ? 'correctPop 0.35s ease' : 'none',
            }}>
              {answered && isCorrect && '✅ '}{answered && isSelected && !isCorrect && '❌ '}{choice}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes heartBeat { 0%{transform:scale(1)} 40%{transform:scale(1.4)} 100%{transform:scale(1)} }
        @keyframes xpPop { 0%{opacity:0;transform:translateY(0) scale(0.6)} 40%{opacity:1;transform:translateY(-22px) scale(1.2)} 100%{opacity:0;transform:translateY(-42px) scale(1)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes bounceIn { 0%{opacity:0;transform:scale(0.6)} 60%{transform:scale(1.12)} 100%{opacity:1;transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes wrongShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-7px)} 40%{transform:translateX(7px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        @keyframes correctPop { 0%{transform:scale(1)} 30%{transform:scale(1.06)} 100%{transform:scale(1)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
      `}</style>
    </Shell>
  );
}

function ScoreCard({ emoji, label, value, accent = 'var(--blue)' }: { emoji:string; label:string; value:string; accent?:string }) {
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
      <div style={{ position:'fixed', top:'-80px', right:'-80px', width:'280px', height:'280px', borderRadius:'50%', background:'rgba(255,75,75,0.08)', filter:'blur(50px)', pointerEvents:'none' }} />
      <div style={{ maxWidth:'480px', margin:'0 auto', width:'100%', flex:1, display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>{children}</div>
    </main>
  );
}
