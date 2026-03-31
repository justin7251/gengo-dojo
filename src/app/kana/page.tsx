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

  const [uid, setUid]             = useState('');
  const [progress, setProgress]   = useState<Record<string, Progress>>({});
  const [script, setScript]       = useState<Script>('hiragana');
  const [loading, setLoading]     = useState(true);
  const [speakingChar, setSpeakingChar] = useState('');

  const chars = script === 'hiragana' ? HIRAGANA : KATAKANA;

  // Pre-load voices
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);

      const prog      = await getKanaProgress(user.uid);
      const allChars  = [...HIRAGANA, ...KATAKANA].map(c => c.char);
      const missing   = allChars.filter(c => !prog[c]);
      if (missing.length) await initKanaProgress(user.uid, missing);

      const updated = await getKanaProgress(user.uid);
      setProgress(updated);
      setLoading(false);
    });
  }, []);

  function speakKana(char: string) {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    const utter   = new SpeechSynthesisUtterance(char);
    utter.lang    = 'ja-JP';
    utter.rate    = 0.75;
    const voices  = window.speechSynthesis.getVoices();
    const native  = voices.find(v => v.lang.startsWith('ja'));
    if (native) utter.voice = native;
    utter.onstart = () => setSpeakingChar(char);
    utter.onend   = () => setSpeakingChar('');
    window.speechSynthesis.speak(utter);
  }

  // ── Derived stats ─────────────────────────────────────
  const mastered = chars.filter(c => progress[c.char] && isMastered(progress[c.char])).length;
  const due      = chars.filter(c => progress[c.char] && isDue(progress[c.char])).length;
  const total    = chars.length;
  const pct      = total ? Math.round((mastered / total) * 100) : 0;

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
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginBottom: '1.5rem',
      }}>
        {[
          { label: 'Total',    value: total },
          { label: 'Mastered', value: mastered },
          { label: 'Due',      value: due },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '14px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 600 }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: '12px', color: 'var(--muted)', marginBottom: '6px',
        }}>
          <span>Overall mastery</span>
          <span>{pct}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Practice buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          onClick={() => router.push(`/kana/flashcard?script=${script}`)}
        >
          Flashcards
        </button>
        <button
          className="btn"
          onClick={() => router.push(`/kana/listen?script=${script}`)}
        >
          🎧 Listen
        </button>
        <button
          className="btn"
          onClick={() => router.push(`/kana/write?script=${script}`)}
        >
          ✍️ Write
        </button>
      </div>

      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1.5rem' }} />

      {/* Tap hint */}
      <p style={{
        fontSize: '12px', color: 'var(--muted)',
        marginBottom: '1rem',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <span>🔊</span>
        Tap any {script === 'hiragana' ? 'hiragana' : 'katakana'} character to hear it
      </p>

      {/* Legend */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '1.25rem',
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'Not started', bg: 'var(--surface)',    border: 'var(--border)',  color: 'var(--muted)' },
          { label: 'Due',         bg: '#FAEEDA',           border: '#BA7517',        color: '#854F0B' },
          { label: 'Mastered',    bg: 'var(--teal-light)', border: 'var(--teal)',    color: 'var(--teal-dark)' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '14px', height: '14px',
              borderRadius: '4px',
              background: l.bg,
              border: `1px solid ${l.border}`,
            }} />
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{l.label}</span>
          </div>
        ))}
        {speakingChar && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '14px', height: '14px',
              borderRadius: '4px',
              background: '#E6F1FB',
              border: '1px solid #185FA5',
            }} />
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Playing</span>
          </div>
        )}
      </div>

      {/* Character grid by row */}
      {ROW_ORDER.map(row => {
        const rowChars = byRow[row];
        if (!rowChars?.length) return null;

        const rowMastered = rowChars.filter(c => progress[c.char] && isMastered(progress[c.char])).length;

        return (
          <div key={row} style={{ marginBottom: '1.25rem' }}>
            {/* Row header */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: '8px',
            }}>
              <p style={{
                fontSize: '11px', textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500,
              }}>
                {ROW_LABELS[row]}
              </p>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {rowMastered}/{rowChars.length}
              </span>
            </div>

            {/* Characters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {rowChars.map(c => {
                const p        = progress[c.char];
                const mastered = p && isMastered(p);
                const due      = p && isDue(p);
                const playing  = speakingChar === c.char;

                return (
                  <button
                    key={c.char}
                    onClick={() => speakKana(c.char)}
                    title={`${c.char} · ${c.romaji} — tap to hear`}
                    style={{
                      width: '52px',
                      height: '52px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid',
                      borderRadius: '10px',
                      borderColor: playing  ? '#185FA5'
                        : mastered ? 'var(--teal)'
                        : due      ? '#BA7517'
                        : 'var(--border)',
                      background: playing  ? '#E6F1FB'
                        : mastered ? 'var(--teal-light)'
                        : due      ? '#FAEEDA'
                        : 'var(--surface)',
                      cursor: 'pointer',
                      gap: '2px',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                      padding: 0,
                      outline: 'none',
                      transform: playing ? 'scale(1.08)' : 'scale(1)',
                    }}
                  >
                    <span style={{
                      fontSize: '22px',
                      fontFamily: 'var(--font-noto-jp), "Noto Sans JP", serif',
                      color: playing  ? '#185FA5'
                        : mastered ? 'var(--teal-dark)'
                        : due      ? '#854F0B'
                        : 'var(--fg)',
                      lineHeight: 1,
                    }}>
                      {c.char}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      color: playing  ? '#185FA5'
                        : mastered ? 'var(--teal-dark)'
                        : due      ? '#854F0B'
                        : 'var(--muted)',
                    }}>
                      {c.romaji}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

    </Shell>
  );
}

// ── Shell ─────────────────────────────────────────────
function Shell({ children, onBack }: {
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem 1rem 4rem',
      background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '680px',
        display: 'flex',
        alignItems: 'center',
        marginBottom: '1.5rem',
      }}>
        <button className="btn" style={{ fontSize: '13px' }} onClick={onBack}>
          ← Back
        </button>
        <span style={{
          fontSize: '18px',
          fontWeight: 600,
          marginLeft: '1rem',
          letterSpacing: '-0.02em',
        }}>
          言語道場
        </span>
      </div>

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
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </main>
  );
}

function Spinner() {
  return (
    <div style={{
      width: '24px',
      height: '24px',
      border: '2px solid var(--border)',
      borderTopColor: 'var(--muted)',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      margin: '0 auto',
    }} />
  );
}