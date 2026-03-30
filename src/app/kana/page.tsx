'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getKanaProgress, initKanaProgress } from '@/lib/firestore';
import { HIRAGANA, KATAKANA, ROW_ORDER, ROW_LABELS, Script } from '@/lib/kana';
import { Progress } from '@/lib/types';
import { isDue, isMastered } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function KanaPage() {
  return <AuthGuard><KanaHub /></AuthGuard>;
}

function KanaHub() {
  const router = useRouter();
  const [uid, setUid]           = useState('');
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [script, setScript]     = useState<Script>('hiragana');
  const [loading, setLoading]   = useState(true);

  const chars = script === 'hiragana' ? HIRAGANA : KATAKANA;

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const prog = await getKanaProgress(user.uid);
      // Init any missing chars
      const allChars = [...HIRAGANA, ...KATAKANA].map(c => c.char);
      const missing  = allChars.filter(c => !prog[c]);
      if (missing.length) await initKanaProgress(user.uid, missing);
      const updated = await getKanaProgress(user.uid);
      setProgress(updated);
      setLoading(false);
    });
  }, []);

  const mastered = chars.filter(c => progress[c.char] && isMastered(progress[c.char])).length;
  const due      = chars.filter(c => progress[c.char] && isDue(progress[c.char])).length;
  const total    = chars.length;

  const byRow = ROW_ORDER.reduce<Record<string, typeof chars>>((acc, row) => {
    acc[row] = chars.filter(c => c.row === row);
    return acc;
  }, {});

  if (loading) {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div>
      </Shell>
    );
  }

  return (
    <Shell onBack={() => router.push('/dashboard')}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>
          Kana dojo
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
          Learn hiragana and katakana from scratch
        </p>
      </div>

      {/* Script toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {(['hiragana', 'katakana'] as Script[]).map(s => (
          <button
            key={s}
            onClick={() => setScript(s)}
            style={{
              padding: '8px 20px',
              borderRadius: '99px',
              border: '1px solid',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              borderColor: script === s ? 'var(--teal)' : 'var(--border)',
              background:  script === s ? 'var(--teal-light)' : 'var(--surface)',
              color:       script === s ? 'var(--teal-dark)'  : 'var(--muted)',
            }}
          >
            {s === 'hiragana' ? 'Hiragana あ' : 'Katakana ア'}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px', marginBottom: '1.5rem',
      }}>
        {[
          { label: 'Total',    value: total },
          { label: 'Mastered', value: mastered },
          { label: 'Due',      value: due },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 600 }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Practice buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary"
          onClick={() => router.push(`/kana/flashcard?script=${script}`)}>
          Flashcards
        </button>
        <button className="btn"
          onClick={() => router.push(`/kana/listen?script=${script}`)}>
          Listen
        </button>
        <button className="btn"
          onClick={() => router.push(`/kana/write?script=${script}`)}>
          Write
        </button>
      </div>

      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1.5rem' }} />

      {/* Character grid by row */}
      {ROW_ORDER.map(row => {
        const rowChars = byRow[row];
        if (!rowChars?.length) return null;
        return (
          <div key={row} style={{ marginBottom: '1.25rem' }}>
            <p style={{
              fontSize: '11px', textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--muted)',
              fontWeight: 500, marginBottom: '8px',
            }}>
              {ROW_LABELS[row]}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {rowChars.map(c => {
                const p = progress[c.char];
                const mastered = p && isMastered(p);
                const due      = p && isDue(p);
                return (
                  <div key={c.char} style={{
                    width: '52px', height: '52px',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    border: '1px solid',
                    borderRadius: '10px',
                    borderColor: mastered ? 'var(--teal)' : due ? '#BA7517' : 'var(--border)',
                    background: mastered ? 'var(--teal-light)' : due ? '#FAEEDA' : 'var(--surface)',
                    cursor: 'default',
                    gap: '2px',
                  }}>
                    <span style={{
                      fontSize: '22px',
                      fontFamily: 'var(--font-noto-jp), "Noto Sans JP", serif',
                      color: mastered ? 'var(--teal-dark)' : due ? '#854F0B' : 'var(--fg)',
                    }}>
                      {c.char}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                      {c.romaji}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

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
          言語道場
        </span>
      </div>
      <div style={{
        width: '100%', maxWidth: '680px', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem',
      }}>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
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