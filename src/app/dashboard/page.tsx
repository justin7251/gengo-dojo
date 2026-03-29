'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getWords, getProgress } from '@/lib/firestore';
import { saveWords } from '@/lib/firestore';
import { getUserProfile } from '@/lib/firestore';
import { Word, Progress, UserProfile } from '@/lib/types';
import { isDue, isMastered } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}

function Dashboard() {
  const router = useRouter();
  const [uid, setUid]           = useState('');
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [words, setWords]       = useState<Word[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const [p, w, pr] = await Promise.all([
        getUserProfile(user.uid),
        getWords(user.uid),
        getProgress(user.uid),
      ]);
      setProfile(p);
      setWords(w);
      setProgress(pr);
      setLoading(false);
    });
  }, []);

  async function generateWords(interest: string) {
    if (!profile) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interest,
          lang: profile.lang,
          level: profile.level,
        }),
      });
      const data = await res.json();
      if (!data.words?.length) throw new Error('No words returned');

      const newWords: Word[] = data.words.map((w: Omit<Word, 'id' | 'topic' | 'lang' | 'level' | 'createdAt'>, i: number) => ({
        ...w,
        id: `${interest}-${Date.now()}-${i}`,
        topic: interest,
        lang: profile.lang,
        level: profile.level,
        createdAt: Date.now(),
      }));

      await saveWords(uid, newWords);
      const [w, pr] = await Promise.all([getWords(uid), getProgress(uid)]);
      setWords(w);
      setProgress(pr);
    } catch {
      setError('Failed to generate words. Check your GROQ API key.');
    } finally {
      setGenerating(false);
    }
  }

  // ── Derived stats ─────────────────────────────────────
  const totalWords  = words.length;
  const masteredCount = words.filter(w => progress[w.id] && isMastered(progress[w.id])).length;
  const dueWords    = words.filter(w => progress[w.id] && isDue(progress[w.id]));
  const dueCount    = dueWords.length;

  // Group words by topic
  const topics = Array.from(new Set(words.map(w => w.topic)));

  if (loading) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{
            width: '24px', height: '24px',
            border: '2px solid var(--border)',
            borderTopColor: 'var(--muted)',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            margin: '0 auto',
          }} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell uid={uid} email={profile?.email ?? ''}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>
          My dojo
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
          {profile?.lang === 'ja' ? 'Japanese' : 'Chinese'} · {profile?.level}
        </p>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '2rem',
      }}>
        {[
          { label: 'Total words', value: totalWords },
          { label: 'Mastered',    value: masteredCount },
          { label: 'Due today',   value: dueCount },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 600, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          disabled={!totalWords}
          onClick={() => router.push('/flashcards')}
        >
          Flashcards
        </button>
        <button
          className="btn"
          disabled={totalWords < 4}
          onClick={() => router.push('/quiz')}
        >
          Quiz
        </button>
        <button
          className="btn"
          disabled={!totalWords}
          onClick={() => router.push('/words')}
        >
          Word list
        </button>
      </div>

      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '2rem' }} />

      {/* Due for review */}
      {dueCount > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500, marginBottom: '12px' }}>
            Due for review · {dueCount} word{dueCount > 1 ? 's' : ''}
          </p>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {dueWords.slice(0, 5).map((w, i) => (
              <div key={w.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: i < Math.min(dueWords.length, 5) - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{ fontSize: '22px' }}>{w.kanji}</span>
                <span style={{ fontSize: '13px', color: 'var(--muted)', flex: 1, paddingLeft: '12px' }}>
                  {w.meaning}
                </span>
                <span className="pill pill-amber">review</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate new words per topic */}
      <div>
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500, marginBottom: '12px' }}>
          Generate vocabulary
        </p>

        {/* Existing topics */}
        {topics.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {topics.map(t => (
              <button
                key={t}
                className="btn"
                style={{ fontSize: '13px' }}
                disabled={generating}
                onClick={() => generateWords(t)}
              >
                {generating ? '…' : `+ More ${t}`}
              </button>
            ))}
          </div>
        )}

        {/* New interest buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {(profile?.interests ?? [])
            .filter(i => !topics.includes(i))
            .map(i => (
              <button
                key={i}
                className="btn"
                style={{ fontSize: '13px' }}
                disabled={generating}
                onClick={() => generateWords(i)}
              >
                {generating ? 'Generating…' : `Generate ${i} words`}
              </button>
            ))}
        </div>

        {generating && (
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '12px' }}>
            AI is crafting your word list…
          </p>
        )}
        {error && (
          <p style={{ fontSize: '13px', color: '#A32D2D', background: '#FCEBEB', padding: '10px 12px', borderRadius: '8px', marginTop: '12px' }}>
            {error}
          </p>
        )}
      </div>

    </Shell>
  );
}

// ── Shell (reusable layout) ───────────────────────────
function Shell({ children, uid, email }: {
  children: React.ReactNode;
  uid?: string;
  email?: string;
}) {
  const router = useRouter();
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem 4rem',
      background: 'var(--bg)',
    }}>
      {/* Nav */}
      <div style={{
        width: '100%',
        maxWidth: '680px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
      }}>
        <span
          style={{ fontSize: '18px', fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.02em' }}
          onClick={() => router.push('/dashboard')}
        >
          言語道場
        </span>
        {email && (
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{email}</span>
        )}
      </div>

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '680px',
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '2.5rem',
      }}>
        {children}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}