'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getKanaProgress, rateKana } from '@/lib/firestore';
import { HIRAGANA, KATAKANA, KanaChar, Script } from '@/lib/kana';
import { Progress, Rating } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';
import { Suspense } from 'react';

export default function KanaWritePage() {
  return <AuthGuard><Suspense><KanaWrite /></Suspense></AuthGuard>;
}

function speak(text: string) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'ja-JP'; utter.rate = 0.8;
  const voices = window.speechSynthesis.getVoices();
  const native = voices.find(v => v.lang.startsWith('ja'));
  if (native) utter.voice = native;
  window.speechSynthesis.speak(utter);
}

function KanaWrite() {
  const router  = useRouter();
  const params  = useSearchParams();
  const script  = (params.get('script') ?? 'hiragana') as Script;
  const chars   = script === 'hiragana' ? HIRAGANA : KATAKANA;

  const canvasRef                 = useRef<HTMLCanvasElement>(null);
  const [uid, setUid]             = useState('');
  const [progress, setProgress]   = useState<Record<string, Progress>>({});
  const [queue, setQueue]         = useState<KanaChar[]>([]);
  const [idx, setIdx]             = useState(0);
  const [drawing, setDrawing]     = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [revealed, setRevealed]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const [rating, setRating]       = useState(false);
  const [stats, setStats]         = useState({ correct: 0, wrong: 0 });
  const [done, setDone]           = useState(false);
  const lastPos                   = useRef({ x: 0, y: 0 });

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
      setQueue([...chars].sort(() => Math.random() - 0.5));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (queue.length && idx < queue.length) {
      clearCanvas();
      setHasStrokes(false);
      setRevealed(false);
      setTimeout(() => speak(queue[idx].char), 200);
    }
  }, [queue, idx]);

  // ── Canvas helpers ────────────────────────────────────
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    setDrawing(true);
    setHasStrokes(true);
    const pos = getPos(e, canvas);
    lastPos.current = pos;
    const ctx = canvas.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 4;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();
    lastPos.current = pos;
  }

  function endDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    setDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw subtle grid guide
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    setHasStrokes(false);
  }

  async function handleRate(r: Rating) {
    if (!queue[idx] || rating) return;
    setRating(true);
    const current = queue[idx];
    const prev    = progress[current.char] ?? {
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
    else { setIdx(next); }
    setRating(false);
  }

  const current = queue[idx];
  const pct     = queue.length ? Math.round((idx / queue.length) * 100) : 0;

  if (loading) return <Shell script={script} onBack={() => router.push('/kana')}><div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div></Shell>;

  if (done) {
    const total = stats.correct + stats.wrong;
    const pctC  = total ? Math.round(stats.correct / total * 100) : 0;
    return (
      <Shell script={script} onBack={() => router.push('/kana')}>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>✍️</div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Writing done!</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
            {stats.correct} correct · {stats.wrong} wrong · {pctC}% accuracy
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => { setIdx(0); setDone(false); setStats({ correct: 0, wrong: 0 }); clearCanvas(); }}>
              Practice again
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

      {/* Prompt */}
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500, marginBottom: '8px' }}>
          Write this character
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <span style={{ fontSize: '28px', fontWeight: 600 }}>{current?.romaji}</span>
          <button onClick={() => speak(current?.char ?? '')} style={{
            width: '36px', height: '36px', borderRadius: '50%',
            border: '1px solid #444', background: '#2a2a2a',
            cursor: 'pointer', fontSize: '16px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>🔊</button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          style={{
            width: '100%',
            aspectRatio: '1',
            borderRadius: '16px',
            background: '#1a1a1a',
            border: '1px solid var(--border)',
            cursor: 'crosshair',
            touchAction: 'none',
            display: 'block',
          }}
        />

        {/* Ghost character overlay — shown when revealed */}
        {revealed && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
            animation: 'fadeIn 0.3s ease',
          }}>
            <span style={{
              fontSize: '200px',
              fontFamily: 'var(--font-noto-jp), "Noto Sans JP", serif',
              color: 'rgba(29,158,117,0.25)',
              userSelect: 'none',
              lineHeight: 1,
            }}>
              {current?.char}
            </span>
          </div>
        )}
      </div>

      {/* Canvas controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        <button className="btn" style={{ flex: 1, fontSize: '13px' }} onClick={clearCanvas}>
          Clear ✕
        </button>
        <button
          className="btn"
          style={{ flex: 1, fontSize: '13px' }}
          onClick={() => setRevealed(r => !r)}
        >
          {revealed ? 'Hide guide' : 'Show guide'}
        </button>
      </div>

      {/* Mnemonic */}
      <div style={{
        padding: '10px 14px', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: '10px',
        fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6,
        marginBottom: '1.5rem',
      }}>
        💡 {current?.mnemonic}
      </div>

      {/* Self-rate */}
      {hasStrokes && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500, textAlign: 'center', marginBottom: '10px' }}>
            How did it look?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {([
              { r: 'wrong', label: 'Needs work', color: '#E24B4A', bg: '#FCEBEB' },
              { r: 'good',  label: 'Pretty good', color: '#0F6E56', bg: '#E1F5EE' },
              { r: 'easy',  label: 'Nailed it',  color: '#185FA5', bg: '#E6F1FB' },
            ] as { r: Rating; label: string; color: string; bg: string }[]).map(({ r, label, color, bg }) => (
              <button key={r} disabled={rating} onClick={() => handleRate(r)} style={{
                padding: '12px 0', border: `1px solid ${color}`,
                borderRadius: '10px', background: bg, color,
                fontSize: '13px', fontWeight: 500,
                cursor: rating ? 'not-allowed' : 'pointer',
                opacity: rating ? 0.5 : 1,
                transition: 'opacity 0.15s', fontFamily: 'inherit',
              }}>
                {label}
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
          {script === 'hiragana' ? 'Write · Hiragana' : 'Write · Katakana'}
        </span>
      </div>
      <div style={{ width: '100%', maxWidth: '680px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem' }}>
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
  return <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--muted)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />;
}