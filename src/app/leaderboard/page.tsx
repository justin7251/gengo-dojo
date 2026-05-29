'use client';
import { Spinner } from '@/components/Spinner';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getLeaderboard, LeaderboardEntry } from '@/lib/agent';
import AuthGuard from '@/components/AuthGuard';

export default function LeaderboardPage() { return <AuthGuard><Leaderboard /></AuthGuard>; }

function Leaderboard() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myUid, setMyUid]     = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setMyUid(user.uid);
      setEntries(await getLeaderboard(20));
      setLoading(false);
    });
  }, []);

  const myRank = entries.findIndex(e => e.uid === myUid) + 1;
  const myEntry = entries.find(e => e.uid === myUid);

  return (
    <main style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', flexDirection:'column', alignItems:'center', padding:'1.5rem 1rem 4rem', fontFamily:'var(--font-ui)', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'fixed', top:'-80px', right:'-80px', width:'300px', height:'300px', borderRadius:'50%', background:'rgba(255,200,0,0.07)', filter:'blur(60px)', pointerEvents:'none' }} />
      <div style={{ width:'100%', maxWidth:'560px', display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <button className="btn" style={{ fontSize:'13px', padding:'8px 14px' }} onClick={() => router.push('/mission')}>← Back</button>
        <span style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:800, color:'var(--fg)' }}>🏆 Leaderboard</span>
        <div style={{ width:'70px' }} />
      </div>
      <div style={{ width:'100%', maxWidth:'560px' }}>

        {/* My rank card */}
        {myRank > 0 && myEntry && (
          <div style={{ background:'#fff3d0', border:'2.5px solid #ffd966', borderRadius:'18px', padding:'14px 18px', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'14px', boxShadow:'0 5px 0 #ffd966', animation:'bounceIn 0.5s ease both' }}>
            <span style={{ fontFamily:'var(--font-display)', fontSize:'28px', fontWeight:900, color:'#a05600', minWidth:'44px', textAlign:'center' }}>#{myRank}</span>
            <div style={{ flex:1 }}>
              <p style={{ fontFamily:'var(--font-display)', fontSize:'16px', fontWeight:800, color:'#5a3800' }}>🕵️ {myEntry.codename}</p>
              <p style={{ fontSize:'12px', color:'#a05600', fontWeight:600 }}>{myEntry.city} · {myEntry.streakDays}🔥 · {myEntry.totalMissions} missions</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontFamily:'var(--font-display)', fontSize:'22px', fontWeight:800, color:'#5a3800' }}>{myEntry.score}</p>
              <p style={{ fontSize:'10px', fontWeight:700, color:'#a05600', textTransform:'uppercase' }}>pts</p>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display:'flex', justifyContent:'center', padding:'3rem 0' }}><Spinner size={36} color="var(--yellow)" /></div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign:'center', padding:'3rem 0' }}>
            <p style={{ fontSize:'48px', marginBottom:'1rem' }}>🏜️</p>
            <p style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:800, color:'var(--fg)', marginBottom:'8px' }}>No agents yet!</p>
            <p style={{ fontSize:'14px', color:'var(--muted)', fontWeight:600 }}>Complete a mission to appear here.</p>
          </div>
        ) : (
          <div style={{ background:'#fff', border:'2.5px solid var(--border-dark)', borderRadius:'18px', overflow:'hidden', boxShadow:'0 5px 0 var(--border-dark)' }}>
            {entries.map((entry, i) => {
              const isMe    = entry.uid === myUid;
              const rank    = i + 1;
              const medal   = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
              const coverColor = entry.coverStatus === 'intact' ? 'var(--green)' : entry.coverStatus === 'compromised' ? 'var(--orange)' : 'var(--red)';
              return (
                <div key={entry.uid} style={{
                  display:'flex', alignItems:'center', gap:'12px', padding:'13px 16px',
                  borderBottom: i < entries.length - 1 ? '1.5px solid var(--border)' : 'none',
                  background: isMe ? '#fff3d0' : rank <= 3 ? `${rank === 1 ? '#fffbea' : rank === 2 ? '#f8f8f8' : '#fff8f4'}` : '#fff',
                  animation:`fadeUp 0.35s ease ${i * 0.04}s both`,
                  borderLeft: isMe ? '4px solid #ffd966' : rank === 1 ? '4px solid #ffd700' : 'none',
                }}>
                  <div style={{ minWidth:'40px', textAlign:'center' }}>
                    {medal
                      ? <span style={{ fontSize:'24px' }}>{medal}</span>
                      : <span style={{ fontFamily:'var(--font-display)', fontSize:'15px', fontWeight:800, color:isMe ? '#a05600' : 'var(--muted)' }}>#{rank}</span>
                    }
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                      <p style={{ fontSize:'14px', fontWeight:800, color:isMe ? '#5a3800' : 'var(--fg)' }}>🕵️ {entry.codename}</p>
                      {isMe && <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'99px', background:'#ffd966', color:'#5a3800', fontWeight:800 }}>YOU</span>}
                      <span style={{ fontSize:'12px', color:coverColor, fontWeight:700 }}>
                        {entry.coverStatus === 'intact' ? '✓' : entry.coverStatus === 'compromised' ? '⚠' : '✗'}
                      </span>
                    </div>
                    <p style={{ fontSize:'12px', color:'var(--muted)', fontWeight:600 }}>
                      {entry.city} · {entry.streakDays}🔥 · {entry.totalMissions} missions
                    </p>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:800, color:isMe ? '#5a3800' : rank <= 3 ? 'var(--fg)' : 'var(--fg-secondary)' }}>{entry.score}</p>
                    <p style={{ fontSize:'10px', fontWeight:700, color:'var(--muted)', textTransform:'uppercase' }}>pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display:'flex', gap:'10px', marginTop:'1.5rem' }}>
          <button className="btn btn-primary" style={{ flex:1 }} onClick={() => router.push('/mission')}>Play a Mission 🎯</button>
          <button className="btn" onClick={() => router.push('/dashboard')}>Dashboard</button>
        </div>
      </div>
      <style>{`
        @keyframes bounceIn{0%{opacity:0;transform:scale(0.8)}60%{transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </main>
  );
}
