'use client';
import { Spinner } from '@/components/Spinner';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getProgress, getUserWords } from '@/lib/firestore';
import { getAgentProfile, createAgentProfile, getSuspicionLabel } from '@/lib/agent';
import { AgentProfile } from '@/lib/types';
import { isDue } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function MissionPage() { return <AuthGuard><MissionMap /></AuthGuard>; }

const MISSIONS = [
  { id: 'braindead', label: 'Brain Dead',  sublabel: 'Passive matching',  emoji: '🌙', color: 'var(--blue)',   bg: 'var(--blue-light)',   shadow: 'var(--blue-dark)',   route: '/mission/braindead', minWords: 4 },
  { id: 'scrap',     label: 'Scrap',        sublabel: '30-second blitz',   emoji: '⚡', color: 'var(--orange)', bg: 'var(--orange-light)', shadow: 'var(--orange-dark)', route: '/mission/scrap',     minWords: 4 },
  { id: 'deepwork',  label: 'Deep Work',    sublabel: '20-min immersion',  emoji: '🧠', color: 'var(--green)',  bg: 'var(--green-light)',  shadow: 'var(--green-dark)',  route: '/mission/deepwork',  minWords: 4 },
  { id: 'shadow',    label: 'Shadow',       sublabel: 'Pronunciation drills', emoji: '🎤', color: 'var(--purple)', bg: 'var(--purple-light)', shadow: 'var(--purple-dark)', route: '/shadow',          minWords: 4 },
  { id: 'survival',  label: 'Survival',     sublabel: '3 lives · timed',   emoji: '💀', color: 'var(--red)',    bg: 'var(--red-light)',    shadow: 'var(--red-dark)',    route: '/survival',          minWords: 4 },
];

function MissionMap() {
  const router = useRouter();
  const [agent, setAgent]           = useState<AgentProfile | null>(null);
  const [dueCount, setDueCount]     = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [ready, setReady]           = useState(false);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      const profile = await getUserProfile(user.uid);
      if (!profile) { router.push('/'); return; }
      let ag = await getAgentProfile(user.uid);
      if (!ag) ag = await createAgentProfile(user.uid, profile.targetLang);
      setAgent(ag);
      const [words, prog] = await Promise.all([
        getUserWords(user.uid, profile.targetLang, profile.nativeLang),
        getProgress(user.uid, profile.targetLang, profile.nativeLang),
      ]);
      setTotalWords(words.length);
      setDueCount(words.filter(w => prog[w.id] && isDue(prog[w.id])).length);
      setLoading(false);
      setTimeout(() => setReady(true), 80);
    });
  }, []);

  if (loading || !agent) return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={40} color="var(--purple)" />
      </div>
    </Shell>
  );

  const canPlay    = totalWords >= 4;
  const coverColor = agent.coverStatus === 'intact' ? 'var(--green)' : agent.coverStatus === 'compromised' ? 'var(--orange)' : 'var(--red)';
  const coverBg    = agent.coverStatus === 'intact' ? 'var(--green-light)' : agent.coverStatus === 'compromised' ? 'var(--orange-light)' : 'var(--red-light)';
  const xp         = agent.totalMissions * 30;

  return (
    <Shell>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', animation: ready ? 'fadeDown 0.4s ease both' : 'none' }}>
        <button className="btn" style={{ fontSize: '13px', padding: '8px 14px' }} onClick={() => router.push('/dashboard')}>← Back</button>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '17px', fontWeight: 800, color: 'var(--fg)' }}>🗺️ Mission Hub</span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <div style={{ background: '#fff3d0', border: '2.5px solid #ffd966', borderRadius: '99px', padding: '5px 10px', boxShadow: '0 3px 0 #ffd966', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '14px' }}>🔥</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 800, color: '#a05600' }}>{agent.streakDays}</span>
          </div>
        </div>
      </div>

      {/* Agent card */}
      <div style={{ background: '#fff', border: `2.5px solid ${coverColor}55`, borderRadius: '20px', padding: '1.25rem', marginBottom: '1.25rem', boxShadow: `0 6px 0 ${coverColor}55`, position: 'relative', overflow: 'hidden', animation: ready ? 'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.05s both' : 'none' }}>
        {/* Glow orb */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: `${coverColor}12`, filter: 'blur(30px)', pointerEvents: 'none', animation: 'orbDrift 6s ease-in-out infinite' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '2px' }}>Agent Status</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 900, color: 'var(--fg)' }}>🕵️ {agent.codename}</p>
              <p style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>{agent.city} · Chapter {agent.chapter}</p>
            </div>
            <span style={{ fontSize: '13px', fontWeight: 800, padding: '5px 12px', borderRadius: '99px', background: coverBg, color: coverColor, border: `2px solid ${coverColor}55`, boxShadow: `0 3px 0 ${coverColor}55` }}>
              {agent.coverStatus === 'intact' ? '✓ Intact' : agent.coverStatus === 'compromised' ? '⚠ Compromised' : '✗ Blown'}
            </span>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: agent.suspicionLevel > 0 ? '1rem' : 0 }}>
            {[
              { emoji: '🎯', label: 'Missions', value: agent.totalMissions, color: 'var(--purple)' },
              { emoji: '⭐', label: 'XP',       value: xp,                 color: 'var(--yellow)' },
              { emoji: '⏰', label: 'Due',       value: dueCount,           color: dueCount > 0 ? 'var(--orange)' : 'var(--muted)' },
              { emoji: '📚', label: 'Words',     value: totalWords,         color: 'var(--blue)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '8px 4px', textAlign: 'center', border: '2px solid var(--border-dark)' }}>
                <div style={{ fontSize: '16px' }}>{s.emoji}</div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Suspicion bar */}
          {agent.suspicionLevel > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Suspicion</span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--red-dark)' }}>{getSuspicionLabel(agent.suspicionLevel)} · {agent.suspicionLevel}/5</span>
              </div>
              <div className="progress-track" style={{ height: '8px' }}>
                <div style={{ height: '8px', borderRadius: '99px', background: 'linear-gradient(90deg,var(--orange),var(--red))', width: `${(agent.suspicionLevel / 5) * 100}%`, transition: 'width 0.6s ease', boxShadow: '0 0 8px rgba(255,75,75,0.4)' }} />
              </div>
              {agent.suspicionLevel >= 5 && (
                <button className="btn btn-red" style={{ marginTop: '10px', width: '100%' }} onClick={() => router.push('/interrogation')}>
                  ⚠️ Enter Interrogation
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Not enough words warning */}
      {!canPlay && (
        <div style={{ background: 'var(--orange-light)', border: '2.5px solid var(--orange)', borderRadius: '16px', padding: '14px 16px', marginBottom: '1.25rem', boxShadow: '0 4px 0 var(--orange-dark)', animation: ready ? 'bounceIn 0.45s ease 0.1s both' : 'none' }}>
          <p style={{ fontSize: '14px', fontWeight: 800, color: '#a05600', marginBottom: '6px' }}>📚 Not enough words yet</p>
          <p style={{ fontSize: '13px', color: '#a05600', fontWeight: 600, marginBottom: '10px' }}>You need at least 4 words to unlock missions. Generate some from the dashboard.</p>
          <button className="btn btn-orange" style={{ fontSize: '13px' }} onClick={() => router.push('/dashboard')}>Generate Vocabulary →</button>
        </div>
      )}

      {/* Due words reminder */}
      {dueCount > 0 && canPlay && (
        <div style={{ background: 'var(--orange-light)', border: '2.5px solid var(--orange)', borderRadius: '14px', padding: '12px 14px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 3px 0 var(--orange-dark)', animation: ready ? 'bounceIn 0.45s ease 0.12s both' : 'none' }}>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 800, color: '#a05600' }}>⏰ {dueCount} words due for review</p>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#c07000' }}>Review them in flashcards first!</p>
          </div>
          <button className="btn btn-orange" style={{ fontSize: '12px', padding: '7px 12px' }} onClick={() => router.push('/flashcards')}>Review</button>
        </div>
      )}

      {/* Mission list */}
      <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px', animation: ready ? 'fadeUp 0.4s ease 0.1s both' : 'none' }}>
        Select Mission
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {MISSIONS.map((m, i) => {
          const active = canPlay;
          return (
            <button key={m.id} onClick={() => active && router.push(m.route)} disabled={!active}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
                borderRadius: '18px', border: `2.5px solid ${active ? m.color + '55' : 'var(--border-dark)'}`,
                background: active ? '#fff' : 'var(--bg-secondary)',
                boxShadow: active ? `0 6px 0 ${m.color}55` : '0 6px 0 var(--border-dark)',
                cursor: active ? 'pointer' : 'default', fontFamily: 'var(--font-ui)',
                opacity: active ? 1 : 0.5, textAlign: 'left',
                transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                animation: ready ? `bounceIn 0.45s cubic-bezier(0.34,1.56,0.64,1) ${0.15 + i * 0.06}s both` : 'none',
                position: 'relative', overflow: 'hidden',
              }}
              className={active ? 'mission-hub-btn' : ''}
            >
              {/* Icon */}
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: active ? m.bg : 'var(--bg-secondary)', border: `2.5px solid ${active ? m.color + '55' : 'var(--border-dark)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0, transition: 'transform 0.15s ease' }} className="mission-icon">
                {active ? m.emoji : '🔒'}
              </div>

              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--fg)', marginBottom: '2px', fontFamily: 'var(--font-display)' }}>{m.label}</p>
                <p style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>{m.sublabel}</p>
              </div>

              {active && (
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: m.bg, border: `2px solid ${m.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900, color: m.color, flexShrink: 0 }}>›</div>
              )}
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes fadeDown  { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(8px)}  to{opacity:1;transform:translateY(0)} }
        @keyframes bounceIn  { 0%{opacity:0;transform:scale(0.85)} 60%{transform:scale(1.03)} 100%{opacity:1;transform:scale(1)} }
        @keyframes orbDrift  { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-10px,8px)} 66%{transform:translate(6px,-8px)} }
        .mission-hub-btn:hover  { transform: translateY(-2px) !important; }
        .mission-hub-btn:active { transform: translateY(4px) !important; box-shadow: none !important; }
        .mission-hub-btn:hover .mission-icon { transform: scale(1.1) rotate(-5deg); }
      `}</style>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 3rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(206,130,255,0.08)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(88,204,2,0.06)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </main>
  );
}
