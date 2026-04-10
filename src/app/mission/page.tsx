'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getProgress, getUserWords } from '@/lib/firestore';
import { getAgentProfile, createAgentProfile, getCoverColor, getCoverBg, getSuspicionLabel } from '@/lib/agent';
import { AgentProfile, ENERGY_MODES, ModeConfig } from '@/lib/types';
import { isDue } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function MissionPage() {
  return <AuthGuard><MissionBriefing /></AuthGuard>;
}

function MissionBriefing() {
  const router = useRouter();

  const [agent, setAgent]       = useState<AgentProfile | null>(null);
  const [dueCount, setDueCount] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [uid, setUid]           = useState('');
  const [selectedMode, setSelectedMode] = useState<ModeConfig>(ENERGY_MODES[1]);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);

      const profile = await getUserProfile(user.uid);
      if (!profile) { router.push('/'); return; }

      let agentProfile = await getAgentProfile(user.uid);
      if (!agentProfile) {
        agentProfile = await createAgentProfile(user.uid, profile.targetLang);
      }
      setAgent(agentProfile);

      const [words, prog] = await Promise.all([
        getUserWords(user.uid, profile.targetLang, profile.nativeLang),
        getProgress(user.uid, profile.targetLang, profile.nativeLang),
      ]);
      setTotalWords(words.length);
      setDueCount(words.filter(w => prog[w.id] && isDue(prog[w.id])).length);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div>
      </Shell>
    );
  }

  if (!agent) return null;

  const coverColor = getCoverColor(agent.coverStatus);
  const coverBg    = getCoverBg(agent.coverStatus);

  return (
    <Shell onBack={() => router.push('/dashboard')}>

      {/* Agent status card */}
      <div style={{
        background: coverBg,
        borderWidth: '1px', borderStyle: 'solid', borderColor: coverColor,
        borderRadius: '16px', padding: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: coverColor, fontWeight: 500, marginBottom: '2px' }}>
              Agent
            </p>
            <p style={{ fontSize: '20px', fontWeight: 600, color: coverColor }}>
              {agent.codename}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: coverColor, fontWeight: 500, marginBottom: '2px' }}>
              Cover
            </p>
            <p style={{ fontSize: '16px', fontWeight: 600, color: coverColor }}>
              {agent.coverStatus === 'intact' ? '✓ Intact'
                : agent.coverStatus === 'compromised' ? '⚠ Compromised'
                : '✗ Blown'}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { label: 'City',      value: agent.city },
            { label: 'Chapter',   value: agent.chapter },
            { label: 'Streak',    value: `${agent.streakDays}d` },
            { label: 'Suspicion', value: getSuspicionLabel(agent.suspicionLevel) },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: coverColor }}>{s.value}</p>
              <p style={{ fontSize: '10px', color: coverColor, opacity: 0.7 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Suspicion bar */}
        <div style={{ marginTop: '10px' }}>
          <div style={{ height: '4px', background: 'rgba(0,0,0,0.1)', borderRadius: '2px' }}>
            <div style={{
              height: '4px', borderRadius: '2px',
              width: `${(agent.suspicionLevel / 5) * 100}%`,
              background: coverColor,
              transition: 'width 0.4s ease',
            }} />
          </div>
          <p style={{ fontSize: '10px', color: coverColor, marginTop: '3px', opacity: 0.7 }}>
            Suspicion: {agent.suspicionLevel}/5
          </p>
        </div>
      </div>

      {/* Mission stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px', marginBottom: '1.5rem',
      }}>
        {[
          { label: 'Words',    value: totalWords },
          { label: 'Due',      value: dueCount },
          { label: 'Missions', value: agent.totalMissions },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 600 }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1.5rem' }} />

      {/* Mode selector */}
      <p style={{
        fontSize: '11px', textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--muted)',
        fontWeight: 500, marginBottom: '10px',
      }}>
        Select mission type
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
        {ENERGY_MODES.map(mode => {
          const isSelected = selectedMode.id === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px', borderRadius: '14px',
                borderWidth: '1px', borderStyle: 'solid',
                borderColor: isSelected ? 'var(--teal)' : 'var(--border)',
                background:  isSelected ? 'var(--teal-light)' : 'var(--surface)',
                cursor: 'pointer', fontFamily: 'inherit',
                textAlign: 'left', width: '100%',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '28px' }}>{mode.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{
                    fontSize: '15px', fontWeight: 600,
                    color: isSelected ? 'var(--teal-dark)' : 'var(--fg)',
                  }}>
                    {mode.label}
                  </span>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                    background: isSelected ? 'var(--teal)' : 'var(--border)',
                    color: isSelected ? 'var(--teal-light)' : 'var(--muted)',
                  }}>
                    {mode.duration}
                  </span>
                  {mode.encounterChance > 0 && (
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                      background: '#FAEEDA', color: '#854F0B',
                    }}>
                      ⚡ encounters
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: '13px',
                  color: isSelected ? 'var(--teal-dark)' : 'var(--muted)',
                }}>
                  {mode.description}
                </span>
              </div>
              {isSelected && (
                <span style={{ color: 'var(--teal)', fontSize: '16px' }}>✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Blown cover warning */}
      {agent.coverStatus === 'blown' && (
        <div style={{
          background: '#FCEBEB', borderWidth: '1px', borderStyle: 'solid', borderColor: '#E24B4A',
          borderRadius: '12px', padding: '12px 16px',
          fontSize: '13px', color: '#A32D2D',
          marginBottom: '1.5rem', lineHeight: 1.6,
        }}>
          ✗ Your cover is blown. Complete a mission to restore it.
          Wrong answers raised your suspicion too high.
        </div>
      )}

      {/* Launch mission */}
      <button
        className="btn btn-primary"
        style={{ width: '100%', padding: '14px', fontSize: '16px' }}
        disabled={totalWords < 4}
        onClick={() => router.push(`/mission/${selectedMode.id}`)}
      >
        {totalWords < 4
          ? 'Need at least 4 words'
          : `Launch ${selectedMode.label} mission →`}
      </button>

    </Shell>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '2rem 1rem 4rem', background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: '680px',
        display: 'flex', alignItems: 'center', marginBottom: '1.5rem',
      }}>
        <button className="btn" style={{ fontSize: '13px' }} onClick={onBack}>← Back</button>
        <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '1rem', letterSpacing: '-0.02em' }}>
          🕵️ Mission Briefing
        </span>
      </div>
      <div style={{
        width: '100%', maxWidth: '680px', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem',
      }}>
        {children}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}

function Spinner() {
  return (
    <div style={{
      width: '24px', height: '24px',
      border: '2px solid var(--border)', borderTopColor: 'var(--muted)',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto',
    }} />
  );
}