'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAgentProfile, STORY_FRAGMENTS, getCoverColor, getCoverBg, getSuspicionLabel } from '@/lib/agent';
import { onAuth } from '@/lib/auth';
import { AgentProfile } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';
import { Suspense } from 'react';

export default function DebriefPage() {
  return <AuthGuard><Suspense><Debrief /></Suspense></AuthGuard>;
}

function StatRow({
  label, before, after, format = (v: number) => String(v), higherIsBetter = true,
}: {
  label: string;
  before: number;
  after: number;
  format?: (v: number) => string;
  higherIsBetter?: boolean;
}) {
  const changed  = before !== after;
  const improved = higherIsBetter ? after > before : after < before;
  const color    = !changed ? 'var(--muted)' : improved ? '#0F6E56' : '#A32D2D';
  const arrow    = !changed ? '→' : after > before ? '↑' : '↓';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{format(before)}</span>
        <span style={{ fontSize: '13px', color, fontWeight: 600 }}>{arrow}</span>
        <span style={{ fontSize: '14px', fontWeight: 600, color }}>{format(after)}</span>
      </div>
    </div>
  );
}

function Debrief() {
  const router  = useRouter();
  const params  = useSearchParams();

  const correct      = Number(params.get('correct') ?? 0);
  const wrong        = Number(params.get('wrong') ?? 0);
  const mode         = params.get('mode') ?? 'mission';
  const newFragment  = params.get('fragment') ?? null;

  const [agent, setAgent]         = useState<AgentProfile | null>(null);
  const [prevAgent, setPrevAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading]     = useState(true);
  const [revealed, setRevealed]   = useState(false);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      const current = await getAgentProfile(user.uid);
      setAgent(current);

      // Reconstruct "before" from URL params
      if (current) {
        const beforeSuspicion = Number(params.get('prevSuspicion') ?? current.suspicionLevel);
        const beforeChapter   = Number(params.get('prevChapter') ?? current.chapter);
        const beforeStreak    = Number(params.get('prevStreak') ?? current.streakDays);
        setPrevAgent({
          ...current,
          suspicionLevel: beforeSuspicion,
          chapter:        beforeChapter,
          streakDays:     beforeStreak,
        });
      }
      setLoading(false);

      // Auto-reveal after short delay
      setTimeout(() => setRevealed(true), 400);
    });
  }, []);

  if (loading || !agent || !prevAgent) {
    return (
      <Shell onBack={() => router.push('/mission')}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div>
      </Shell>
    );
  }

  const coverColor = getCoverColor(agent.coverStatus);
  const coverBg    = getCoverBg(agent.coverStatus);
  const pctCorrect = (correct + wrong) > 0
    ? Math.round((correct / (correct + wrong)) * 100) : 0;

  // Check if interrogation should trigger
  const interrogationTriggered = agent.suspicionLevel >= 5;

  return (
    <Shell onBack={() => router.push('/mission')}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{
          fontSize: '11px', textTransform: 'uppercase',
          letterSpacing: '0.15em', color: 'var(--muted)',
          fontWeight: 500, marginBottom: '6px',
        }}>
          Mission debrief · {mode}
        </p>
        <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '4px' }}>
          Agent {agent.codename}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{agent.city}</p>
      </div>

      {/* Score summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px', marginBottom: '1.5rem',
      }}>
        {[
          { label: 'Correct', value: correct, color: '#0F6E56', bg: '#E1F5EE' },
          { label: 'Wrong',   value: wrong,   color: '#A32D2D', bg: '#FCEBEB' },
          { label: 'Score',   value: `${pctCorrect}%`, color: 'var(--fg)', bg: 'var(--surface)' },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: '12px', padding: '14px', textAlign: 'center',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 600, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: s.color, opacity: 0.8, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Stat changes */}
      {revealed && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '16px', marginBottom: '1.5rem',
          animation: 'fadeIn 0.4s ease',
        }}>
          <p style={{
            fontSize: '11px', textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--muted)',
            fontWeight: 500, marginBottom: '10px',
          }}>
            Agent status changes
          </p>

          <StatRow
            label="Streak"
            before={prevAgent.streakDays}
            after={agent.streakDays}
            format={v => `${v} days`}
          />
          <StatRow
            label="Suspicion"
            before={prevAgent.suspicionLevel}
            after={agent.suspicionLevel}
            format={v => `${v}/5 — ${getSuspicionLabel(v)}`}
            higherIsBetter={false}
          />
          <StatRow
            label="Chapter"
            before={prevAgent.chapter}
            after={agent.chapter}
            format={v => `Chapter ${v}`}
          />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 0',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Cover</span>
            <span style={{
              fontSize: '13px', fontWeight: 600,
              padding: '3px 12px', borderRadius: '99px',
              background: coverBg, color: coverColor,
            }}>
              {agent.coverStatus === 'intact' ? '✓ Intact'
                : agent.coverStatus === 'compromised' ? '⚠ Compromised'
                : '✗ Blown'}
            </span>
          </div>
        </div>
      )}

      {/* Story fragment unlocked */}
      {newFragment && revealed && (
        <div style={{
          background: '#0f0f1a',
          borderWidth: '1px', borderStyle: 'solid', borderColor: '#534AB7',
          borderRadius: '14px', padding: '1.25rem',
          marginBottom: '1.5rem',
          animation: 'fadeIn 0.6s ease',
        }}>
          <p style={{
            fontSize: '11px', textTransform: 'uppercase',
            letterSpacing: '0.15em', color: '#7F77DD',
            fontWeight: 600, marginBottom: '10px',
          }}>
            📄 Classified document unlocked — Chapter {agent.chapter}
          </p>
          <p style={{
            fontSize: '15px', lineHeight: 1.8,
            color: 'rgba(255,255,255,0.85)',
            fontStyle: 'italic',
          }}>
            "{newFragment}"
          </p>
        </div>
      )}

      {/* Interrogation warning */}
      {interrogationTriggered && (
        <div style={{
          background: '#1a0000',
          borderWidth: '1px', borderStyle: 'solid', borderColor: '#E24B4A',
          borderRadius: '14px', padding: '1.25rem',
          marginBottom: '1.5rem',
          animation: 'fadeIn 0.8s ease',
        }}>
          <p style={{
            fontSize: '13px', color: '#E24B4A',
            fontWeight: 600, marginBottom: '6px',
          }}>
            ⚠ INTERROGATION TRIGGERED
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            Your cover is blown. You must pass interrogation to continue.
            5 questions. No hints. No mercy.
          </p>
          <button
            style={{
              marginTop: '12px', width: '100%', padding: '12px',
              background: '#E24B4A', border: 'none', borderRadius: '10px',
              color: '#fff', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onClick={() => router.push('/interrogation')}
          >
            Enter interrogation →
          </button>
        </div>
      )}

      {/* Actions */}
      {!interrogationTriggered && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" style={{ flex: 1 }}
            onClick={() => router.push('/mission')}>
            New mission
          </button>
          <button className="btn" onClick={() => router.push('/leaderboard')}>
            Leaderboard
          </button>
        </div>
      )}

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
          📋 Debrief
        </span>
      </div>
      <div style={{
        width: '100%', maxWidth: '680px', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem',
      }}>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </main>
  );
}

function Spinner() {
  return <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--muted)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />;
}