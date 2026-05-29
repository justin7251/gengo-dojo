'use client';
import { Spinner } from '@/components/Spinner';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAgentProfile, STORY_FRAGMENTS } from '@/lib/agent';
import { onAuth } from '@/lib/auth';
import { AgentProfile } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';
import { Suspense } from 'react';

export default function DebriefPage() { return <AuthGuard><Suspense><Debrief /></Suspense></AuthGuard>; }

function useCountUp(target: number, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const start = performance.now();
      function tick(now: number) {
        const p = Math.min((now - start) / 700, 1);
        setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, delay]);
  return val;
}

function Debrief() {
  const router  = useRouter();
  const params  = useSearchParams();
  const correct     = Number(params.get('correct') ?? 0);
  const wrong       = Number(params.get('wrong') ?? 0);
  const mode        = params.get('mode') ?? 'mission';
  const newFragment = params.get('fragment') ?? null;
  const [agent, setAgent]         = useState<AgentProfile | null>(null);
  const [prevAgent, setPrevAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [revealed, setRevealed]   = useState(false);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      const current = await getAgentProfile(user.uid);
      setAgent(current);
      if (current) {
        setPrevAgent({ ...current, suspicionLevel: Number(params.get('prevSuspicion') ?? current.suspicionLevel), chapter: Number(params.get('prevChapter') ?? current.chapter), streakDays: Number(params.get('prevStreak') ?? current.streakDays) });
      }
      setLoading(false);
      setTimeout(() => setRevealed(true), 350);
    });
  }, []);

  const scoreDisplayed = useCountUp(correct * 10, 400);
  const total    = correct + wrong;
  const pct      = total > 0 ? Math.round((correct / total) * 100) : 0;
  const xpGained = correct * 10;

  const coverColor = agent?.coverStatus === 'intact' ? 'var(--green)' : agent?.coverStatus === 'compromised' ? 'var(--orange)' : 'var(--red)';
  const coverBg    = agent?.coverStatus === 'intact' ? 'var(--green-light)' : agent?.coverStatus === 'compromised' ? 'var(--orange-light)' : 'var(--red-light)';

  if (loading || !agent || !prevAgent) return (
    <Shell onBack={() => router.push('/mission')}>
      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
        <Spinner size={36} />
      </div>
    </Shell>
  );

  const interrogationTriggered = agent.suspicionLevel >= 5;

  return (
    <Shell onBack={() => router.push('/mission')}>
      {/* Header */}
      <div style={{ textAlign:'center', marginBottom:'1.5rem', animation:'fadeDown 0.4s ease both' }}>
        <p style={{ fontSize:'12px', fontWeight:800, letterSpacing:'0.12em', color:'var(--muted)', textTransform:'uppercase', marginBottom:'4px' }}>
          Mission Debrief · {mode}
        </p>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'24px', fontWeight:900, color:'var(--fg)', marginBottom:'2px' }}>Agent {agent.codename}</h2>
        <p style={{ fontSize:'13px', color:'var(--muted)', fontWeight:600 }}>{agent.city}</p>
      </div>

      {/* Score summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'1.5rem' }}>
        {[
          { emoji:'✅', label:'Correct', value:correct, accent:'var(--green)', delay:100 },
          { emoji:'❌', label:'Wrong',   value:wrong,   accent:'var(--red)',   delay:180 },
          { emoji:'📊', label:'Score',   value:pct,     accent:'var(--blue)',  delay:260, suffix:'%' },
        ].map(s => (
          <div key={s.label} style={{ background:'#fff', border:`2.5px solid ${s.accent}55`, borderRadius:'16px', padding:'14px 8px', textAlign:'center', boxShadow:`0 5px 0 ${s.accent}55`, animation:`bounceIn 0.45s cubic-bezier(0.34,1.56,0.64,1) ${s.delay}ms both` }}>
            <div style={{ fontSize:'22px', marginBottom:'4px' }}>{s.emoji}</div>
            <p style={{ fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:800, color:s.accent, lineHeight:1 }}>{s.value}{s.suffix ?? ''}</p>
            <p style={{ fontSize:'10px', fontWeight:700, color:'var(--muted)', marginTop:'2px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* XP gained banner */}
      {xpGained > 0 && (
        <div style={{ background:'#fff3d0', border:'2.5px solid #ffd966', borderRadius:'16px', padding:'12px 16px', marginBottom:'1.25rem', display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 4px 0 #ffd966', animation:'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ fontSize:'24px' }}>⭐</span>
            <div>
              <p style={{ fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:800, color:'#5a3800' }}>+{scoreDisplayed} XP earned!</p>
              <p style={{ fontSize:'12px', fontWeight:600, color:'#a05600' }}>{correct} correct answers</p>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:'12px', fontWeight:700, color:'#a05600' }}>Total XP</p>
            <p style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:800, color:'#5a3800' }}>{(agent.totalMissions * 30 + xpGained)}</p>
          </div>
        </div>
      )}

      {/* Agent status changes */}
      {revealed && (
        <div style={{ background:'#fff', border:'2.5px solid var(--border-dark)', borderRadius:'16px', padding:'16px', marginBottom:'1.25rem', boxShadow:'0 5px 0 var(--border-dark)', animation:'fadeUp 0.4s ease 0.1s both' }}>
          <p style={{ fontSize:'11px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.1em', color:'var(--muted)', marginBottom:'12px' }}>Agent Status</p>
          {[
            { label:'🔥 Streak', before:`${prevAgent.streakDays}d`, after:`${agent.streakDays}d`, improved: agent.streakDays >= prevAgent.streakDays },
            { label:'🕵️ Chapter', before:`Ch.${prevAgent.chapter}`, after:`Ch.${agent.chapter}`, improved: agent.chapter >= prevAgent.chapter },
          ].map(row => (
            <div key={row.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1.5px solid var(--border)' }}>
              <span style={{ fontSize:'13px', fontWeight:700, color:'var(--fg-secondary)' }}>{row.label}</span>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <span style={{ fontSize:'13px', color:'var(--muted)', fontWeight:600 }}>{row.before}</span>
                <span style={{ fontSize:'13px', color: row.improved ? 'var(--green-dark)' : 'var(--red-dark)', fontWeight:800 }}>{row.before === row.after ? '→' : row.improved ? '↑' : '↓'}</span>
                <span style={{ fontSize:'14px', fontWeight:800, color: row.improved ? 'var(--green-dark)' : 'var(--orange-dark)' }}>{row.after}</span>
              </div>
            </div>
          ))}
          {/* Cover status */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:'8px' }}>
            <span style={{ fontSize:'13px', fontWeight:700, color:'var(--fg-secondary)' }}>🛡 Cover</span>
            <span style={{ fontSize:'13px', fontWeight:800, padding:'4px 12px', borderRadius:'99px', background:coverBg, color:coverColor, border:`2px solid ${coverColor}55`, boxShadow:`0 2px 0 ${coverColor}55` }}>
              {agent.coverStatus === 'intact' ? '✓ Intact' : agent.coverStatus === 'compromised' ? '⚠ Compromised' : '✗ Blown'}
            </span>
          </div>
          {/* Suspicion bar */}
          {agent.suspicionLevel > 0 && (
            <div style={{ marginTop:'10px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                <span style={{ fontSize:'11px', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Suspicion</span>
                <span style={{ fontSize:'11px', fontWeight:800, color:'var(--red-dark)' }}>{agent.suspicionLevel}/5</span>
              </div>
              <div className="progress-track" style={{ height:'8px' }}>
                <div style={{ height:'8px', borderRadius:'99px', background:'linear-gradient(90deg,var(--orange),var(--red))', width:`${(agent.suspicionLevel/5)*100}%`, transition:'width 0.6s cubic-bezier(0.34,1.56,0.64,1)', boxShadow:'0 0 8px rgba(255,75,75,0.4)' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Story fragment */}
      {newFragment && revealed && (
        <div style={{ background:'var(--purple-light)', border:'2.5px solid var(--purple)', borderRadius:'16px', padding:'1.25rem', marginBottom:'1.25rem', boxShadow:'0 5px 0 var(--purple-dark)', animation:'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.4s both' }}>
          <p style={{ fontSize:'11px', fontWeight:800, letterSpacing:'0.12em', color:'var(--purple-dark)', textTransform:'uppercase', marginBottom:'10px' }}>
            📄 Classified Document Unlocked — Chapter {agent.chapter}
          </p>
          <p style={{ fontSize:'15px', lineHeight:1.8, color:'var(--fg)', fontStyle:'italic', fontWeight:600 }}>"{newFragment}"</p>
        </div>
      )}

      {/* Interrogation warning */}
      {interrogationTriggered && (
        <div style={{ background:'var(--red-light)', border:'2.5px solid var(--red)', borderRadius:'16px', padding:'1.25rem', marginBottom:'1.25rem', boxShadow:'0 5px 0 var(--red-dark)', animation:'bounceIn 0.5s ease 0.5s both' }}>
          <p style={{ fontSize:'14px', fontWeight:800, color:'var(--red-dark)', marginBottom:'6px' }}>⚠️ Interrogation Triggered!</p>
          <p style={{ fontSize:'13px', color:'var(--red-dark)', lineHeight:1.6, fontWeight:600 }}>Your cover is blown. 5 questions, no hints, no mercy.</p>
          <button className="btn btn-red" style={{ marginTop:'12px', width:'100%', padding:'12px' }} onClick={() => router.push('/interrogation')}>
            Enter Interrogation →
          </button>
        </div>
      )}

      {!interrogationTriggered && (
        <div style={{ display:'flex', gap:'10px', animation:'fadeUp 0.4s ease 0.5s both' }}>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={() => router.push('/mission')}>New Mission 🎯</button>
          <button className="btn" onClick={() => router.push('/leaderboard')}>🏆 Leaderboard</button>
        </div>
      )}

      <style>{`
        @keyframes fadeDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bounceIn{0%{opacity:0;transform:scale(0.8)}60%{transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
      `}</style>
    </Shell>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <main style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', padding:'1.5rem 1rem 4rem', fontFamily:'var(--font-ui)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', top:'-80px', right:'-80px', width:'280px', height:'280px', borderRadius:'50%', background:'rgba(88,204,2,0.07)', filter:'blur(50px)', pointerEvents:'none' }} />
      <div style={{ width:'100%', maxWidth:'560px', display:'flex', alignItems:'center', marginBottom:'1.5rem' }}>
        <button className="btn" style={{ fontSize:'13px', padding:'8px 14px' }} onClick={onBack}>← Back</button>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:800, marginLeft:'1rem', color:'var(--fg)' }}>📋 Debrief</span>
      </div>
      <div style={{ width:'100%', maxWidth:'560px', flex:1, display:'flex', flexDirection:'column' }}>{children}</div>
    </main>
  );
}
