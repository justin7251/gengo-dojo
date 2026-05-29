'use client';
import { Spinner } from '@/components/Spinner';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { getAgentProfile, updateAgentAfterMission } from '@/lib/agent';
import { Word, Progress, Rating, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import { rollEncounter, Encounter } from '@/lib/encounter';
import { isDue } from '@/lib/srs';
import EncounterOverlay from '@/components/EncounterOverlay';
import AuthGuard from '@/components/AuthGuard';

export default function DeepWorkPage() { return <AuthGuard><DeepWorkMission /></AuthGuard>; }

type Phase      = 'playing' | 'done';
type RevealStep = 'word' | 'meaning' | 'example';

function speak(text: string, targetLang: TargetLang) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = VOICE_LANG[targetLang] ?? 'ja-JP'; u.rate = 0.75;
  const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith(VOICE_LANG[targetLang].split('-')[0]));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

function DeepWorkMission() {
  const router = useRouter();
  const [uid, setUid]               = useState('');
  const [targetLang, setTargetLang] = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang] = useState<NativeLang>('en');
  const [allWords, setAllWords]     = useState<Word[]>([]);
  const [progress, setProgress]     = useState<Record<string, Progress>>({});
  const [queue, setQueue]           = useState<Word[]>([]);
  const [phase, setPhase]           = useState<Phase>('playing');
  const [idx, setIdx]               = useState(0);
  const [reveal, setReveal]         = useState<RevealStep>('word');
  const [stats, setStats]           = useState({ correct: 0, wrong: 0 });
  const [score, setScore]           = useState(0);
  const [combo, setCombo]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [encounter, setEncounter]   = useState<Encounter | null>(null);

  useEffect(() => { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices(); }, []);
  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return; setUid(user.uid);
      const p = await getUserProfile(user.uid); if (!p) return;
      setTargetLang(p.targetLang); setNativeLang(p.nativeLang);
      const [ws, prog] = await Promise.all([getUserWords(user.uid, p.targetLang, p.nativeLang), getProgress(user.uid, p.targetLang, p.nativeLang)]);
      setAllWords(ws); setProgress(prog);
      const due  = ws.filter(w => prog[w.id] && isDue(prog[w.id]));
      const rest = ws.filter(w => !prog[w.id] || !isDue(prog[w.id]));
      setQueue([...due, ...rest.sort(() => Math.random() - 0.5)].slice(0, 20));
      setLoading(false);
    });
  }, []);

  const current = queue[idx];
  const pct     = queue.length ? Math.round((idx / queue.length) * 100) : 0;

  async function handleRate(rating: Rating) {
    if (!current) return;
    const prev = progress[current.id];
    if (prev) await rateWord(uid, current.id, rating, prev, targetLang, nativeLang);
    const isCorrect = rating !== 'wrong';
    const newCombo  = isCorrect ? combo + 1 : 0;
    const xp        = isCorrect ? (newCombo >= 5 ? 30 : newCombo >= 3 ? 20 : 10) : 0;
    setCombo(newCombo);
    setScore(s => s + xp);
    setStats(s => ({ correct: isCorrect ? s.correct + 1 : s.correct, wrong: !isCorrect ? s.wrong + 1 : s.wrong }));
    const enc = rollEncounter(0.15, allWords, targetLang);
    if (enc) { setEncounter(enc); return; }
    advance();
  }

  function advance() {
    const next = idx + 1;
    if (next >= queue.length) { setPhase('done'); endMission(); return; }
    setIdx(next); setReveal('word');
  }

  async function endMission() {
    try {
      const ag = await getAgentProfile(uid);
      if (ag) {
        const params = new URLSearchParams({ correct: String(stats.correct), wrong: String(stats.wrong), mode: 'deepwork', prevSuspicion: String(ag.suspicionLevel), prevChapter: String(ag.chapter), prevStreak: String(ag.streakDays) });
        const debrief = await updateAgentAfterMission(uid, stats.correct, stats.wrong, 'deepwork');
        if (debrief.newFragment) params.set('fragment', debrief.newFragment);
        router.push(`/debrief?${params.toString()}`);
      }
    } catch { router.push('/mission'); }
  }

  function handleEncounterWin()  { setEncounter(null); setStats(s => ({ ...s, correct: s.correct + 2 })); advance(); }
  function handleEncounterLose() {
    setEncounter(null); setStats(s => ({ ...s, wrong: s.wrong + 1 }));
    const prev = progress[current?.id];
    if (prev && uid) rateWord(uid, current.id, 'wrong', prev, targetLang, nativeLang);
    advance();
  }

  if (loading) return <Shell><div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center' }}><Spinner size={40} color="var(--green)" /></div></Shell>;

  if (phase === 'done') return (
    <Shell>
      <TopBar onBack={() => router.push('/mission')} />
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
        <div style={{ fontSize:'80px', marginBottom:'1rem', animation:'bounceIn 0.5s ease' }}>🧠</div>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'26px', fontWeight:900, color:'var(--fg)', marginBottom:'4px' }}>Deep Work Complete!</h2>
        <p style={{ fontSize:'15px', color:'var(--muted)', fontWeight:600, marginBottom:'1.5rem' }}>{stats.correct} correct · {stats.wrong} wrong</p>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px', marginBottom:'2rem', width:'100%', maxWidth:'280px' }}>
          <ScoreCard emoji="⭐" label="Score" value={String(score)} accent="var(--yellow)" />
          <ScoreCard emoji="📚" label="Reviewed" value={`${queue.length}`} accent="var(--green)" />
        </div>
        <Spinner size={24} color="var(--green)" />
        <p style={{ fontSize:'13px', color:'var(--muted)', marginTop:'8px', fontWeight:600 }}>Going to debrief…</p>
      </div>
    </Shell>
  );

  return (
    <>
      {encounter && <EncounterOverlay encounter={encounter} allWords={allWords} onWin={handleEncounterWin} onLose={handleEncounterLose} />}
      <Shell>
        <TopBar onBack={() => router.push('/mission')} />

        {/* Progress row */}
        <div style={{ marginBottom:'1.25rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', fontWeight:700, color:'var(--muted)', marginBottom:'6px' }}>
            <span>{idx + 1} / {queue.length}</span>
            <div style={{ display:'flex', gap:'8px' }}>
              {combo >= 2 && <span style={{ color:'var(--orange)', animation:'pulse 0.8s ease-in-out infinite' }}>🔥 x{combo}</span>}
              <span style={{ color:'var(--green-dark)' }}>⭐ {score}</span>
            </div>
          </div>
          <div className="progress-track"><div className="progress-fill" style={{ width:`${pct}%` }} /></div>
        </div>

        {/* Pills */}
        <div style={{ display:'flex', gap:'6px', marginBottom:'1rem', flexWrap:'wrap' }}>
          <span className="pill pill-teal">{current?.topic}</span>
          <span className="pill pill-gray">{current?.type}</span>
          <span className="pill pill-orange" style={{ background:'var(--orange-light)', color:'#a05600', border:'2px solid #ffbe5a', fontSize:'10px' }}>⚡ 15% encounter</span>
        </div>

        {/* Voice button */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'8px' }}>
          <button onClick={() => speak(current?.kanji ?? '', targetLang)} style={{ width:'40px', height:'40px', borderRadius:'50%', border:'2.5px solid var(--border-dark)', background:'#fff', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 3px 0 var(--border-dark)', transition:'all 0.1s' }}>🔊</button>
        </div>

        {/* Card */}
        <div style={{ background:'#fff', border:'2.5px solid var(--border-dark)', borderRadius:'24px', boxShadow:'0 8px 0 var(--border-dark)', padding:'2rem', textAlign:'center', marginBottom:'1.5rem', position:'relative', overflow:'hidden', minHeight:'260px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', animation:'fadeIn 0.2s ease' }}>
          <div style={{ position:'absolute', fontSize:'180px', lineHeight:1, fontFamily:'"Noto Sans JP","Noto Sans SC",serif', color:'var(--bg-secondary)', top:'50%', left:'50%', transform:'translate(-50%,-50%)', pointerEvents:'none', userSelect:'none', zIndex:0 }}>{current?.kanji}</div>
          <div style={{ position:'relative', zIndex:1, width:'100%' }}>
            <div style={{ fontSize:'80px', lineHeight:1, marginBottom:'12px', fontFamily:'"Noto Sans JP","Noto Sans SC",serif', color:'var(--fg)' }}>{current?.kanji}</div>
            <p style={{ fontSize:'16px', color:'var(--muted-bright)', fontWeight:600, marginBottom:'1.25rem' }}>
              {current?.reading}{current?.romanization ? ` · ${current.romanization}` : ''}
            </p>
            {reveal === 'word' && (
              <button className="btn btn-primary" onClick={() => { setReveal('meaning'); speak(current.kanji, targetLang); }} style={{ padding:'12px 28px' }}>
                Reveal Meaning 👁
              </button>
            )}
            {reveal !== 'word' && (
              <div style={{ animation:'bounceIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
                <div style={{ fontSize:'24px', fontWeight:800, color:'var(--fg)', marginBottom:'14px', padding:'12px 20px', background:'var(--green-light)', borderRadius:'14px', border:'2.5px solid var(--green)', display:'inline-block', boxShadow:'0 4px 0 var(--green-dark)', fontFamily:'var(--font-display)' }}>
                  {current?.meaning}
                </div>
                {reveal === 'meaning' && <div><button className="btn" style={{ fontSize:'13px' }} onClick={() => setReveal('example')}>Show example →</button></div>}
                {reveal === 'example' && current?.example && (
                  <div style={{ animation:'fadeIn 0.2s ease', background:'var(--bg-secondary)', borderRadius:'14px', padding:'14px 16px', textAlign:'left', border:'2px solid var(--border-dark)', marginTop:'10px' }}>
                    <p style={{ fontSize:'14px', lineHeight:1.7, color:'var(--fg)', fontFamily:'"Noto Sans JP","Noto Sans SC",serif', marginBottom:current.example_translation ? '8px' : 0 }}>{current.example}</p>
                    {current.example_translation && <p style={{ fontSize:'13px', color:'var(--muted)', fontStyle:'italic', borderTop:'2px solid var(--border-dark)', paddingTop:'8px' }}>{current.example_translation}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SRS buttons */}
        {reveal !== 'word' && (
          <div style={{ animation:'fadeUp 0.25s ease' }}>
            <p style={{ fontSize:'11px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--muted)', textAlign:'center', marginBottom:'10px' }}>How did you do?</p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'8px' }}>
              {([
                { r:'wrong', label:'Again', sub:'1d',  bg:'var(--red-light)',    border:'var(--red)',    shadow:'var(--red-dark)',    color:'var(--red-dark)' },
                { r:'hard',  label:'Hard',  sub:'3d',  bg:'var(--orange-light)', border:'var(--orange)', shadow:'var(--orange-dark)', color:'var(--orange-dark)' },
                { r:'good',  label:'Good',  sub:'7d',  bg:'var(--blue-light)',   border:'var(--blue)',   shadow:'var(--blue-dark)',   color:'var(--blue-dark)' },
                { r:'easy',  label:'Easy',  sub:'30d', bg:'var(--green-light)',  border:'var(--green)',  shadow:'var(--green-dark)',  color:'var(--green-dark)' },
              ] as { r:Rating; label:string; sub:string; bg:string; border:string; shadow:string; color:string }[]).map(({ r, label, sub, bg, border, shadow, color }) => (
                <button key={r} onClick={() => handleRate(r)} style={{ padding:'12px 4px', borderRadius:'14px', border:`2.5px solid ${border}`, background:bg, color, fontSize:'13px', fontWeight:800, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'2px', boxShadow:`0 4px 0 ${shadow}`, fontFamily:'var(--font-ui)', transition:'all 0.1s ease' }}>
                  <span>{label}</span><span style={{ fontSize:'10px', opacity:0.7, fontWeight:700 }}>{sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <style>{`
          @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
          @keyframes bounceIn{0%{opacity:0;transform:scale(0.7)}60%{transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
          @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
        `}</style>
      </Shell>
    </>
  );
}

function ScoreCard({ emoji, label, value, accent='var(--blue)' }: { emoji:string; label:string; value:string; accent?:string }) {
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
      <div style={{ position:'fixed', top:'-80px', right:'-80px', width:'280px', height:'280px', borderRadius:'50%', background:'rgba(88,204,2,0.08)', filter:'blur(50px)', pointerEvents:'none' }} />
      <div style={{ maxWidth:'520px', margin:'0 auto', width:'100%', flex:1, display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>{children}</div>
    </main>
  );
}
function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
      <button className="btn" style={{ fontSize:'13px', padding:'8px 14px' }} onClick={onBack}>← Back</button>
      <span style={{ fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:800, color:'var(--fg)' }}>🧠 Deep Work</span>
      <div style={{ width:'70px' }} />
    </div>
  );
}
