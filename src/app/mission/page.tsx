'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getProgress, getUserWords } from '@/lib/firestore';
import { getAgentProfile, createAgentProfile, getCoverColor, getSuspicionLabel } from '@/lib/agent';
import { AgentProfile, ENERGY_MODES } from '@/lib/types';
import { isDue } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function MissionPage() {
  return <AuthGuard><MissionMap /></AuthGuard>;
}

const MISSIONS = [
  {
    id:       'braindead',
    number:   1,
    label:    'Brain Dead',
    sublabel: 'Passive matching',
    emoji:    '🌙',
    color:    '#378ADD',
    route:    '/mission/braindead',
  },
  {
    id:       'scrap',
    number:   2,
    label:    'Scrap',
    sublabel: '30 sec blitz',
    emoji:    '⚡',
    color:    '#EF9F27',
    route:    '/mission/scrap',
  },
  {
    id:       'deepwork',
    number:   3,
    label:    'Deep Work',
    sublabel: '20 min immersion',
    emoji:    '🧠',
    color:    '#00e87a',
    route:    '/mission/deepwork',
  },
  {
    id:       'shadow',
    number:   4,
    label:    'Shadow',
    sublabel: 'Pronunciation',
    emoji:    '🎤',
    color:    '#7F77DD',
    route:    '/shadow',
  },
  {
    id:       'survival',
    number:   5,
    label:    'Survival',
    sublabel: '3 lives · timed',
    emoji:    '💀',
    color:    '#E24B4A',
    route:    '/survival',
  },
];

function MissionMap() {
  const router = useRouter();

  const [agent, setAgent]       = useState<AgentProfile | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [loading, setLoading]   = useState(true);

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
    });
  }, []);

  if (loading) return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Spinner />
      </div>
    </Screen>
  );

  if (!agent) return null;

  const coverColor = getCoverColor(agent.coverStatus);
  const canPlay    = totalWords >= 4;

  return (
    <Screen>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/dashboard')} style={GHOST_BTN}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
            🕵️
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>Agent {agent.codename}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>{agent.city}</p>
          </div>
        </div>
      </div>

      {/* Agent status strip */}
      <div style={{
        background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
        padding: '12px 16px', marginBottom: '1.5rem',
        border: `1px solid ${coverColor}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{agent.streakDays}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>streak</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{agent.chapter}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>chapter</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: dueCount > 0 ? '#EF9F27' : '#fff' }}>{dueCount}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>due</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{agent.totalMissions}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>missions</p>
          </div>
        </div>

        <div style={{
          padding: '5px 12px', borderRadius: '99px', fontSize: '11px', fontWeight: 600,
          background: `${coverColor}25`, color: coverColor, border: `1px solid ${coverColor}40`,
        }}>
          {agent.coverStatus === 'intact' ? '✓ Intact'
            : agent.coverStatus === 'compromised' ? '⚠ Compromised' : '✗ Blown'}
        </div>
      </div>

      {/* Suspicion bar */}
      {agent.suspicionLevel > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '10px 14px', background: 'rgba(226,75,74,0.1)', borderRadius: '10px', border: '1px solid rgba(226,75,74,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>SUSPICION LEVEL</span>
            <span style={{ fontSize: '11px', color: '#E24B4A' }}>{getSuspicionLabel(agent.suspicionLevel)}</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
            <div style={{
              height: '4px', borderRadius: '2px',
              width: `${(agent.suspicionLevel / 5) * 100}%`,
              background: '#E24B4A', boxShadow: '0 0 8px rgba(226,75,74,0.6)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          {agent.suspicionLevel >= 5 && (
            <button onClick={() => router.push('/interrogation')} style={{
              marginTop: '10px', width: '100%', padding: '10px',
              background: 'rgba(226,75,74,0.2)', border: '1px solid rgba(226,75,74,0.4)',
              borderRadius: '8px', color: '#E24B4A', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
            }}>
              ⚠ Enter interrogation
            </button>
          )}
        </div>
      )}

      {/* Title */}
      <p style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem', textAlign: 'center' }}>
        SELECT MISSION
      </p>

      {/* Mission path map — rendered bottom to top like the reference */}
      <div style={{ position: 'relative', padding: '0 24px', flex: 1 }}>

        {/* Central connecting line */}
        <div style={{
          position: 'absolute',
          left: '50%', transform: 'translateX(-50%)',
          top: '40px', bottom: '40px',
          width: '2px',
          background: 'linear-gradient(to bottom, rgba(0,232,122,0.6), rgba(0,232,122,0.05))',
        }} />

        {[...MISSIONS].reverse().map((mission, i) => {
          const isLeft   = i % 2 === 0;
          const active   = canPlay;
          const isFirst  = i === 0;

          return (
            <div key={mission.id} style={{
              display: 'flex',
              flexDirection: isLeft ? 'row-reverse' : 'row',
              alignItems: 'center',
              marginBottom: '20px',
              position: 'relative',
            }}>
              {/* Node */}
              <button
                disabled={!active}
                onClick={() => active && router.push(mission.route)}
                style={{
                  width: '60px', height: '60px', borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${active ? mission.color : 'rgba(255,255,255,0.15)'}`,
                  background: active ? `${mission.color}20` : 'rgba(255,255,255,0.05)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: active ? 'pointer' : 'default',
                  boxShadow: active ? `0 0 20px ${mission.color}50` : 'none',
                  animation: isFirst && active ? 'glow-node 2s ease-in-out infinite' : 'none',
                  transition: 'all 0.2s', zIndex: 2, position: 'relative',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                <span style={{ fontSize: '22px' }}>{active ? mission.emoji : '🔒'}</span>
                {!active && (
                  <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>locked</span>
                )}
              </button>

              {/* Connector line to center */}
              <div style={{
                flex: 1, height: '1px',
                background: active
                  ? `linear-gradient(${isLeft ? 'to left' : 'to right'}, transparent, ${mission.color}50)`
                  : 'rgba(255,255,255,0.08)',
              }} />

              {/* Label */}
              <div style={{
                background: active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? `${mission.color}30` : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '10px', padding: '8px 12px', minWidth: '110px',
                opacity: active ? 1 : 0.4,
              }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: active ? '#fff' : 'rgba(255,255,255,0.4)' }}>
                  Mission {mission.number}: {mission.label}
                </p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  {mission.sublabel}
                </p>
                {active && (
                  <p style={{ fontSize: '10px', color: mission.color, marginTop: '4px', fontWeight: 600 }}>
                    Available
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!canPlay && (
        <div style={{
          textAlign: 'center', padding: '12px 16px',
          background: 'rgba(255,255,255,0.05)', borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.1)', marginTop: '1rem',
        }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            Generate at least 4 words to unlock missions
          </p>
          <button onClick={() => router.push('/dashboard')} style={{ ...GHOST_BTN, marginTop: '8px', fontSize: '13px' }}>
            Go to dashboard →
          </button>
        </div>
      )}

      <style>{`
        @keyframes glow-node {
          0%,100% { box-shadow: 0 0 16px rgba(0,232,122,0.4); }
          50%      { box-shadow: 0 0 32px rgba(0,232,122,0.8); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#060d1f',
      backgroundImage: `
        radial-gradient(ellipse at 20% 50%, rgba(127,119,221,0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(0,232,122,0.05) 0%, transparent 40%),
        linear-gradient(rgba(0,232,122,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,232,122,0.02) 1px, transparent 1px)
      `,
      backgroundSize: 'auto, auto, 40px 40px, 40px 40px',
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1.25rem 2rem',
      fontFamily: 'var(--font-ui)',
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </main>
  );
}

const GHOST_BTN: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px', padding: '7px 14px',
  color: 'rgba(255,255,255,0.7)', fontSize: '13px',
  cursor: 'pointer', fontFamily: 'var(--font-ui)',
};

function Spinner() {
  return <div style={{ width: '28px', height: '28px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#00e87a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}
