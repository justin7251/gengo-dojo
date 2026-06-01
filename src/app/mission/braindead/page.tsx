'use client';
import { Spinner } from '@/components/Spinner';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { getAgentProfile, updateAgentAfterMission } from '@/lib/agent';
import { markDailyTask } from '@/lib/firestore';
import { Word, Progress, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';

export default function BrainDeadPage() { return <AuthGuard><BrainDeadMission /></AuthGuard>; }

interface MatchPair { wordId: string; kanji: string; meaning: string; matched: boolean; }

function speak(text: string, targetLang: TargetLang) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = VOICE_LANG[targetLang] ?? 'ja-JP'; u.rate = 0.7;
  const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith(VOICE_LANG[targetLang].split('-')[0]));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

function BrainDeadMission() {
  const router = useRouter();
  const [uid, setUid]               = useState('');
  const [targetLang, setTargetLang] = useState<TargetLang>('ja');
  const [progress, setProgress]     = useState<Record<string, Progress>>({});
  const [pairs, setPairs]           = useState<MatchPair[]>([]);
  const [meanings, setMeanings]     = useState<{ wordId: string; meaning: string }[]>([]);
  const [selectedKanji, setSelectedKanji] = useState<string | null>(null);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [correctFlash, setCorrectFlash] = useState<string | null>(null);
  const [done, setDone]             = useState(false);
  const [stats, setStats]           = useState({ correct: 0, wrong: 0 });
  const [loading, setLoading]       = useState(true);

  useEffect(() => { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices(); }, []);
  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return; setUid(user.uid);
      const p = await getUserProfile(user.uid); if (!p) return;
      setTargetLang(p.targetLang);
      const [ws, prog] = await Promise.all([getUserWords(user.uid, p.targetLang, p.nativeLang), getProgress(user.uid, p.targetLang, p.nativeLang)]);
      setProgress(prog);
      const sel = ws.sort(() => Math.random() - 0.5).slice(0, 8);
      const pp: MatchPair[] = sel.map(w => ({ wordId: w.id, kanji: w.kanji, meaning: w.meaning, matched: false }));
      setPairs(pp);
      setMeanings(pp.map(p => ({ wordId: p.wordId, meaning: p.meaning })).sort(() => Math.random() - 0.5));
      setLoading(false);
    });
  }, []);

  function handleSelectKanji(wordId: string, kanji: string) {
    if (pairs.find(p => p.wordId === wordId)?.matched) return;
    setSelectedKanji(wordId);
    speak(kanji, targetLang);
  }

  async function handleSelectMeaning(wordId: string) {
    if (!selectedKanji) return;
    const pair = pairs.find(p => p.wordId === wordId);
    if (pair?.matched) return;

    if (selectedKanji === wordId) {
      if (pairs.filter(p => p.matched).length === 0) markDailyTask(uid, 'mission').catch(() => {});
      const newPairs = pairs.map(p => p.wordId === wordId ? { ...p, matched: true } : p);
      setPairs(newPairs);
      setCorrectFlash(wordId); setTimeout(() => setCorrectFlash(null), 500);
      setStats(s => ({ ...s, correct: s.correct + 1 }));
      const prev = progress[wordId];
      if (prev) rateWord(uid, wordId, 'good', prev, targetLang, 'en');
      if (newPairs.every(p => p.matched)) {
        setDone(true);
        try {
          const ag = await getAgentProfile(uid);
          if (ag) {
            const newCorrect = stats.correct + 1;
            const params = new URLSearchParams({ correct: String(newCorrect), wrong: String(stats.wrong), mode: 'braindead', prevSuspicion: String(ag.suspicionLevel), prevChapter: String(ag.chapter), prevStreak: String(ag.streakDays) });
            const debrief = await updateAgentAfterMission(uid, newCorrect, stats.wrong, 'braindead');
            if (debrief.newFragment) params.set('fragment', debrief.newFragment);
            setTimeout(() => router.push(`/debrief?${params.toString()}`), 1000);
          }
        } catch { /* ignore */ }
      }
    } else {
      setWrongFlash(selectedKanji);
      setStats(s => ({ ...s, wrong: s.wrong + 1 }));
      const prev = progress[selectedKanji];
      if (prev) rateWord(uid, selectedKanji, 'hard', prev, targetLang, 'en');
      setTimeout(() => setWrongFlash(null), 600);
    }
    setSelectedKanji(null);
  }

  const matched = pairs.filter(p => p.matched).length;
  const pct     = pairs.length ? (matched / pairs.length) * 100 : 0;

  if (loading) return <Shell><div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center' }}><Spinner size={40} color="var(--blue)" /></div></Shell>;

  if (done) return (
    <Shell>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
        <div style={{ fontSize:'80px', marginBottom:'1rem', animation:'bounceIn 0.5s ease' }}>🌙</div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:900, color:'var(--fg)', marginBottom:'4px' }}>All matched! 🎉</h2>
        <p style={{ fontSize:'15px', color:'var(--muted)', fontWeight:600, marginBottom:'1.5rem' }}>{stats.correct} correct · {stats.wrong} wrong</p>
        <Spinner size={24} color="var(--blue)" />
        <p style={{ fontSize:'13px', color:'var(--muted)', marginTop:'8px', fontWeight:600 }}>Going to debrief…</p>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
        <button className="btn" style={{ fontSize:'13px', padding:'8px 14px' }} onClick={() => router.push('/mission')}>← Back</button>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:800, color:'var(--fg)' }}>🌙 Brain Dead</span>
        <div style={{ width:'70px' }} />
      </div>

      {/* Progress */}
      <div style={{ marginBottom:'1.25rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight:700, color:'var(--muted)', marginBottom:'6px' }}>
          <span>{matched} / {pairs.length} matched</span>
          <span style={{ color:'var(--muted-bright)', fontStyle:'italic', fontWeight:600, fontSize:'11px' }}>Tap kanji → tap meaning</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width:`${pct}%`, background:'linear-gradient(90deg,var(--blue),var(--purple))' }} />
        </div>
      </div>

      {/* Match grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', flex:1 }}>
        {/* Kanji column */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          <p style={{ fontSize:'10px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--muted)', textAlign:'center', marginBottom:'2px' }}>Word</p>
          {pairs.map(p => {
            const isSelected = selectedKanji === p.wordId;
            const isWrong    = wrongFlash === p.wordId;
            const isCorrect  = correctFlash === p.wordId;
            return (
              <button key={p.wordId} onClick={() => handleSelectKanji(p.wordId, p.kanji)} disabled={p.matched}
                style={{
                  padding:'14px', borderRadius:'14px', cursor:p.matched ? 'default' : 'pointer',
                  fontFamily:'"Noto Sans JP","Noto Sans SC",serif', fontSize:'28px',
                  display:'flex', alignItems:'center', justifyContent:'center', minHeight:'64px',
                  border:`2.5px solid ${p.matched ? 'var(--green)' : isSelected ? 'var(--blue)' : isWrong ? 'var(--red)' : isCorrect ? 'var(--green)' : 'var(--border-dark)'}`,
                  background:`${p.matched ? 'var(--green-light)' : isSelected ? 'var(--blue-light)' : isWrong ? 'var(--red-light)' : isCorrect ? 'var(--green-light)' : '#fff'}`,
                  boxShadow: p.matched ? '0 3px 0 var(--green-dark)' : isSelected ? '0 4px 0 var(--blue-dark)' : '0 4px 0 var(--border-dark)',
                  color: p.matched ? 'var(--green-dark)' : isSelected ? 'var(--blue-dark)' : 'var(--fg)',
                  opacity: p.matched ? 0.5 : 1,
                  transition:'all 0.12s ease',
                  animation: isWrong ? 'wrongShake 0.4s ease' : isCorrect ? 'correctPop 0.3s ease' : 'none',
                }}>
                {p.matched ? '✓' : p.kanji}
              </button>
            );
          })}
        </div>

        {/* Meaning column */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
          <p style={{ fontSize:'10px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--muted)', textAlign:'center', marginBottom:'2px' }}>Meaning</p>
          {meanings.map(m => {
            const pair = pairs.find(p => p.wordId === m.wordId);
            return (
              <button key={m.wordId} onClick={() => handleSelectMeaning(m.wordId)} disabled={pair?.matched}
                style={{
                  padding:'10px', borderRadius:'14px', cursor:pair?.matched ? 'default' : 'pointer',
                  fontSize:'12px', fontFamily:'var(--font-ui)', fontWeight:700, lineHeight:1.3,
                  display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', minHeight:'64px',
                  border:`2.5px solid ${pair?.matched ? 'var(--green)' : 'var(--border-dark)'}`,
                  background: pair?.matched ? 'var(--green-light)' : '#fff',
                  boxShadow: pair?.matched ? '0 3px 0 var(--green-dark)' : '0 4px 0 var(--border-dark)',
                  color: pair?.matched ? 'var(--green-dark)' : 'var(--fg)',
                  opacity: pair?.matched ? 0.5 : 1,
                  transition:'all 0.12s ease',
                }}>
                {pair?.matched ? '✓' : m.meaning}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes wrongShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        @keyframes correctPop{0%{transform:scale(1)}30%{transform:scale(1.08)}100%{transform:scale(1)}}
        @keyframes bounceIn{0%{opacity:0;transform:scale(0.6)}60%{transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}
      `}</style>
    </Shell>
  );
}
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', padding:'1.5rem 1.25rem 3rem', fontFamily:'var(--font-ui)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', top:'-80px', right:'-80px', width:'280px', height:'280px', borderRadius:'50%', background:'rgba(28,176,246,0.08)', filter:'blur(50px)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-80px', left:'-80px', width:'240px', height:'240px', borderRadius:'50%', background:'rgba(206,130,255,0.07)', filter:'blur(40px)', pointerEvents:'none' }} />
      <div style={{ maxWidth:'480px', margin:'0 auto', width:'100%', flex:1, display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>{children}</div>
    </main>
  );
}
