'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getLeaderboard, LeaderboardEntry, getCoverColor } from '@/lib/agent';
import AuthGuard from '@/components/AuthGuard';

export default function LeaderboardPage() {
  return <AuthGuard><Leaderboard /></AuthGuard>;
}

function Leaderboard() {
  const router = useRouter();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myUid, setMyUid]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setMyUid(user.uid);
      const data = await getLeaderboard(20);
      setEntries(data);
      setLoading(false);
    });
  }, []);

  const myRank = entries.findIndex(e => e.uid === myUid) + 1;

  if (loading) {
    return (
      <Shell onBack={() => router.push('/mission')}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div>
      </Shell>
    );
  }

  return (
    <Shell onBack={() => router.push('/mission')}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>
          Global Agents
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
          Ranked by score · streak × 10 + missions × 3
          {myRank > 0 && ` · You are #${myRank}`}
        </p>
      </div>

      {/* My rank card */}
      {myRank > 0 && (
        <div style={{
          background: 'var(--teal-light)',
          borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--teal)',
          borderRadius: '12px', padding: '12px 16px',
          marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--teal-dark)', minWidth: '36px' }}>
            #{myRank}
          </span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--teal-dark)' }}>
              {entries[myRank - 1]?.codename} — Your rank
            </p>
            <p style={{ fontSize: '12px', color: 'var(--teal-dark)', opacity: 0.8 }}>
              Score: {entries[myRank - 1]?.score} · {entries[myRank - 1]?.streakDays}d streak
            </p>
          </div>
        </div>
      )}

      {/* Entries */}
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--muted)', fontSize: '14px' }}>
          No agents yet. Complete a mission to appear here.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {entries.map((entry, i) => {
            const isMe       = entry.uid === myUid;
            const rank       = i + 1;
            const medal      = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
            const coverColor = getCoverColor(entry.coverStatus as 'intact' | 'compromised' | 'blown');

            return (
              <div key={entry.uid} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 16px',
                borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                background: isMe ? 'var(--teal-light)' : 'transparent',
              }}>
                {/* Rank */}
                <div style={{ minWidth: '36px', textAlign: 'center' }}>
                  {medal
                    ? <span style={{ fontSize: '20px' }}>{medal}</span>
                    : <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--muted)' }}>
                        {rank}
                      </span>
                  }
                </div>

                {/* Agent info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <p style={{
                      fontSize: '14px', fontWeight: 600,
                      color: isMe ? 'var(--teal-dark)' : 'var(--fg)',
                    }}>
                      {entry.codename}
                    </p>
                    {isMe && (
                      <span style={{
                        fontSize: '10px', padding: '1px 6px', borderRadius: '99px',
                        background: 'var(--teal)', color: '#fff',
                      }}>
                        you
                      </span>
                    )}
                    <span style={{
                      fontSize: '11px',
                      color: coverColor,
                    }}>
                      {entry.coverStatus === 'intact' ? '✓'
                        : entry.coverStatus === 'compromised' ? '⚠'
                        : '✗'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {entry.city} · {entry.streakDays}d streak · {entry.totalMissions} missions
                  </p>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'right' }}>
                  <p style={{
                    fontSize: '16px', fontWeight: 700,
                    color: isMe ? 'var(--teal-dark)' : 'var(--fg)',
                  }}>
                    {entry.score}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--muted)' }}>pts</p>
                </div>
              </div>
            );
          })}
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
          🏆 Leaderboard
        </span>
      </div>
      <div style={{
        width: '100%', maxWidth: '680px', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem',
      }}>
        {children}
      </div>
      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </main>
  );
}

function Spinner() {
  return <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--muted)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />;
}