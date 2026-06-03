'use client';
import { Spinner } from '@/components/Spinner';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getKanaProgress, rateKana } from '@/lib/firestore';
import { HIRAGANA, KATAKANA, KanaChar, Script } from '@/lib/kana';
import { Progress, Rating } from '@/lib/types';
import { isDue } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';
import { Suspense } from 'react';

export default function KanaFlashcardPage() {
  return <AuthGuard><Suspense><KanaFlashcard /></Suspense></AuthGuard>;
}

function speak(text: string) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ja-JP';
  utter.rate = 0.8;
  const voices = window.speechSynthesis.getVoices();
  const native = voices.find(v => v.lang.startsWith('ja'));
  if (native) utter.voice = native;
  window.speechSynthesis.speak(utter);
}

function KanaFlashcard() {
  const router      = useRouter();
  const params      = useSearchParams();
  const script      = (params.get('script') ?? 'hiragana') as Script;
  const chars       = script === 'hiragana' ? HIRAGANA : KATAKANA;

  const [uid, setUid]           = useState('');
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [queue, setQueue]       = useState<KanaChar[]>([]);
  const [idx, setIdx]           = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [rating, setRating]     = useState(false);
  const [stats, setStats]       = useState({ correct: 0, wrong: 0 });
  const [done, setDone]         = useState(false);

  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const prog = await getKanaProgress(user.uid);
      setProgress(prog);
      const due  = chars.filter(c => prog[c.char] && isDue(prog[c.char]));
      const rest = chars.filter(c => !prog[c.char] || !isDue(prog[c.char]));
      setQueue([...due, ...rest].sort(() => Math.random() - 0.5));
      setLoading(false);
    });
  }, []);

  const current = queue[idx];
  const pct     = queue.length ? Math.round((idx / queue.length) * 100) : 0;

  function handleSpeak() {
    if (!current) return;
    setSpeaking(true);
    speak(current.char);
    setTimeout(() => setSpeaking(false), 900);
  }

  function handleReveal() {
    setRevealed(true);
    speak(current.char);
  }

  async function handleRate(r: Rating) {
    if (!current || rating) return;
    setRating(true);
    const prev = progress[current.char] ?? {
      wordId: current.char, correct: 0, wrong: 0,
      nextReview: Date.now(), interval: 'new', lastReviewed: Date.now(),
    };
    await rateKana(uid, current.char, r, prev as Progress);
    setStats(s => ({
      correct: r !== 'wrong' ? s.correct + 1 : s.correct,
      wrong:   r === 'wrong' ? s.wrong + 1   : s.wrong,
    }));
    const next = idx + 1;
    if (next >= queue.length) { setDone(true); }
    else { setIdx(next); setRevealed(false); }
    setRating(false);
  }

  if (loading) return <Shell script={script} onBack={() => router.push('/kana')}><div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div></Shell>;

  if (done) {
    const total = stats.correct + stats.wrong;
    const pctC  = total ? Math.round(stats.correct / total * 100) : 0;
    return (
      <Shell script={script} onBack={() => router.push('/kana')}>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>{pctC >= 80 ? '🏆' : '💪'}</div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Session complete</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
            {stats.correct} correct · {stats.wrong} again · {pctC}% accuracy
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setIdx(0); setRevealed(false); setDone(false); setStats({ correct: 0, wrong: 0 }); }}>
              Study again
            </button>
            <button className="btn" onClick={() => router.push('/kana')}>Back to kana</button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell script={script} onBack={() => router.push('/kana')}>

      {/* Progress */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
          <span>{idx + 1} / {queue.length}</span><span>{pct}%</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      {/* Voice button row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
        <button onClick={handleSpeak} style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '1px solid #444', background: speaking ? '#0F6E56' : '#2a2a2a',
          cursor: 'pointer', fontSize: '18px', display: 'flex',
          alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
        }}>🔊</button>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--bg-secondary)', border: '2px solid var(--border-dark)',
        borderRadius: '20px', padding: '2.5rem 2rem', textAlign: 'center',
        minHeight: '260px', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
      }}>
        {/* Big character */}
        <div style={{
          fontSize: '100px', lineHeight: 1, marginBottom: '16px',
          fontFamily: 'var(--font-noto-jp), "Noto Sans JP", serif',
        }}>
          {current?.char}
        </div>

        {!revealed ? (
          <button className="btn btn-primary" onClick={handleReveal}>
            Reveal reading
          </button>
        ) : (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            {/* Romaji */}
            <div style={{
              fontSize: '32px', fontWeight: 600, marginBottom: '12px',
              padding: '10px 24px', background: 'var(--bg)',
              borderRadius: '12px', border: '2px solid var(--border-dark)',
              display: 'inline-block', letterSpacing: '0.05em',
            }}>
              {current?.romaji}
            </div>
            {/* Mnemonic */}
            <div style={{
              fontSize: '13px', color: 'var(--muted)', marginTop: '8px',
              padding: '10px 16px', background: 'var(--bg)',
              borderRadius: '10px', border: '2px solid var(--border-dark)',
              maxWidth: '320px', lineHeight: 1.6,
            }}>
              💡 {current?.mnemonic}
            </div>
          </div>
        )}
      </div>

      {/* SRS buttons */}
      {revealed && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500, textAlign: 'center', marginBottom: '10px' }}>
            How did you do?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            {([
              { r: 'wrong', label: 'Again', sub: '1d',  color: '#E24B4A', bg: '#FCEBEB' },
              { r: 'hard',  label: 'Hard',  sub: '3d',  color: '#BA7517', bg: '#FAEEDA' },
              { r: 'good',  label: 'Good',  sub: '7d',  color: '#0F6E56', bg: '#E1F5EE' },
              { r: 'easy',  label: 'Easy',  sub: '30d', color: '#185FA5', bg: '#E6F1FB' },
            ] as { r: Rating; label: string; sub: string; color: string; bg: string }[]).map(({ r, label, sub, color, bg }) => (
              <button key={r} disabled={rating} onClick={() => handleRate(r)} style={{
                padding: '10px 0', border: `1px solid ${color}`, borderRadius: '10px',
                background: bg, color, fontSize: '13px', fontWeight: 500,
                cursor: rating ? 'not-allowed' : 'pointer', display: 'flex',
                flexDirection: 'column', alignItems: 'center', gap: '2px',
                opacity: rating ? 0.5 : 1, transition: 'opacity 0.15s', fontFamily: 'inherit',
              }}>
                <span>{label}</span>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, onBack, script }: { children: React.ReactNode; onBack: () => void; script: Script }) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem 4rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '680px', display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn" style={{ fontSize: '13px' }} onClick={onBack}>← Back</button>
        <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '1rem', letterSpacing: '-0.02em' }}>
          {script === 'hiragana' ? 'Hiragana あ' : 'Katakana ア'}
        </span>
      </div>
      <div style={{ width: '100%', maxWidth: '680px', background: 'var(--bg)', border: '2px solid var(--border-dark)', borderRadius: '20px', padding: '2.5rem' }}>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </main>
  );
}
