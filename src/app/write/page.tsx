'use client';
import { Spinner } from '@/components/Spinner';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { Word, Progress, Rating, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import { isDue } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function WritePage() {
  return <AuthGuard><VocabWrite /></AuthGuard>;
}

const ACCENT = '#D4537E';

function speak(text: string, targetLang: TargetLang) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utter    = new SpeechSynthesisUtterance(text);
  utter.lang     = VOICE_LANG[targetLang] ?? 'ja-JP';
  utter.rate     = 0.8;
  const voices   = window.speechSynthesis.getVoices();
  const langCode = VOICE_LANG[targetLang].split('-')[0];
  const native   = voices.find(v => v.lang.startsWith(langCode));
  if (native) utter.voice = native;
  window.speechSynthesis.speak(utter);
}

function VocabWrite() {
  const router    = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [uid, setUid]                 = useState('');
  const [targetLang, setTargetLang]   = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang]   = useState<NativeLang>('en');
  const [queue, setQueue]             = useState<Word[]>([]);
  const [progress, setProgress]       = useState<Record<string, Progress>>({});
  const [idx, setIdx]                 = useState(0);
  const [drawing, setDrawing]         = useState(false);
  const [hasStrokes, setHasStrokes]   = useState(false);
  const [showGuide, setShowGuide]     = useState(false);
  const [showHint, setShowHint]       = useState(false);
  const [loading, setLoading]         = useState(true);
  const [rating, setRating]           = useState(false);
  const [stats, setStats]             = useState({ correct: 0, wrong: 0 });
  const [done, setDone]               = useState(false);
  const lastPos                       = useRef({ x: 0, y: 0 });

  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      setTargetLang(profile.targetLang);
      setNativeLang(profile.nativeLang);
      const [words, prog] = await Promise.all([
        getUserWords(user.uid, profile.targetLang, profile.nativeLang),
        getProgress(user.uid, profile.targetLang, profile.nativeLang),
      ]);
      setProgress(prog);
      const due  = words.filter(w => prog[w.id] && isDue(prog[w.id]));
      const rest = words.filter(w => !prog[w.id] || !isDue(prog[w.id]));
      setQueue([...due, ...rest].sort(() => Math.random() - 0.5));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (queue.length && idx < queue.length) {
      clearCanvas();
      setHasStrokes(false);
      setShowGuide(false);
      setShowHint(false);
    }
  }, [idx, queue.length]);

  const current = queue[idx];
  const pct     = queue.length ? Math.round((idx / queue.length) * 100) : 0;

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    setDrawing(true); setHasStrokes(true);
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
    const ctx    = canvas.getContext('2d')!;
    const pos    = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.stroke();
    lastPos.current = pos;
  }

  function endDraw(e: React.MouseEvent | React.TouchEvent) { e.preventDefault(); setDrawing(false); }

  function clearCanvas() {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx    = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw subtle grid lines
    ctx.strokeStyle = 'var(--bg-secondary)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.moveTo(0, canvas.height / 2); ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    setHasStrokes(false);
  }

  async function handleRate(r: Rating) {
    if (!current || rating) return;
    setRating(true);
    const prev = progress[current.id];
    if (prev) {
      await rateWord(uid, current.id, r, prev, targetLang, nativeLang);
      setStats(s => ({
        correct: r !== 'wrong' ? s.correct + 1 : s.correct,
        wrong:   r === 'wrong' ? s.wrong + 1   : s.wrong,
      }));
    }
    const next = idx + 1;
    if (next >= queue.length) { setDone(true); }
    else { setIdx(next); }
    setRating(false);
  }

  if (loading) return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><Spinner /></div>
    </Shell>
  );

  if (!queue.length) return (
    <Shell>
      <TopBar onBack={() => router.push('/dashboard')} />
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p style={{ fontSize: '40px', marginBottom: '1rem' }}>📭</p>
        <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--fg)', marginBottom: '8px' }}>No words yet</p>
        <p style={{ fontSize: '14px', color: 'var(--fg-secondary)', marginBottom: '2rem' }}>Generate vocabulary from the dashboard.</p>
        <button onClick={() => router.push('/dashboard')} style={WHITE_BTN}>← Dashboard</button>
      </div>
    </Shell>
  );

  if (done) {
    const total = stats.correct + stats.wrong;
    const pctC  = total ? Math.round(stats.correct / total * 100) : 0;
    return (
      <Shell>
        <TopBar onBack={() => router.push('/dashboard')} />
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '60px', marginBottom: '1rem' }}>✍️</div>
          <h2 style={{ fontSize: '26px', fontWeight: 700, color: 'var(--fg)', marginBottom: '6px' }}>Writing done</h2>
          <p style={{ fontSize: '14px', color: 'var(--fg-secondary)', marginBottom: '2rem' }}>
            {stats.correct} good · {stats.wrong} needs work · {pctC}% accuracy
          </p>
          <div style={{ background: '#fff', borderRadius: '3px', height: '4px', marginBottom: '2rem' }}>
            <div style={{ height: '4px', borderRadius: '3px', width: `${pctC}%`, background: '#fff', transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button onClick={() => { setIdx(0); setDone(false); setStats({ correct: 0, wrong: 0 }); clearCanvas(); }} style={WHITE_BTN}>
              Practice again
            </button>
            <button onClick={() => router.push('/dashboard')} className="btn">Dashboard</button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <TopBar onBack={() => router.push('/dashboard')} />

      {/* Progress */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--fg-secondary)', marginBottom: '5px', fontFamily: 'var(--font-mono)' }}>
          <span>{idx + 1} / {queue.length}</span><span>{pct}%</span>
        </div>
        <div style={{ height: '2px', background: '#fff', borderRadius: '1px' }}>
          <div style={{ height: '2px', background: '#fff', borderRadius: '1px', width: `${pct}%`, transition: 'width 0.4s ease' }} />
        </div>
      </div>

      {/* Prompt */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'var(--fg-secondary)', marginBottom: '6px' }}>WRITE THIS WORD</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '22px', fontWeight: 600, color: 'var(--fg)' }}>{current.meaning}</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,255,255,0.1)', color: 'var(--fg-secondary)' }}>
                {current.topic}
              </span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,255,255,0.1)', color: 'var(--fg-secondary)' }}>
                {current.type}
              </span>
            </div>

            {!showHint ? (
              <button onClick={() => { setShowHint(true); speak(current.kanji, targetLang); }}
                style={{ fontSize: '12px', color: 'var(--fg-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', padding: 0, textDecoration: 'underline' }}>
                Show reading hint
              </button>
            ) : (
              <p style={{ fontSize: '14px', color: 'var(--fg-secondary)', fontFamily: '"Noto Sans JP","Noto Sans SC",serif' }}>
                {current.reading}
                {current.romanization && <span style={{ fontSize: '12px', marginLeft: '6px', opacity: 0.6 }}>· {current.romanization}</span>}
              </p>
            )}
          </div>

          <button onClick={() => speak(current.kanji, targetLang)} style={{
            width: '44px', height: '44px', borderRadius: '50%',
            border: '2px solid var(--border-dark)',
            background: 'rgba(255,255,255,0.1)',
            cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--fg)',
          }}>🔊</button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <canvas ref={canvasRef} width={600} height={260}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw}
          style={{
            width: '100%', height: '260px', borderRadius: '16px',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid #fff',
            cursor: 'crosshair', touchAction: 'none', display: 'block',
          }}
        />

        {/* Ghost guide overlay */}
        {showGuide && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', animation: 'fadeIn 0.3s ease',
          }}>
            <span style={{
              fontSize: '180px', lineHeight: 1,
              fontFamily: '"Noto Sans JP","Noto Sans SC",serif',
              color: `${ACCENT}30`,
              userSelect: 'none',
            }}>
              {current.kanji}
            </span>
          </div>
        )}
      </div>

      {/* Canvas controls */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <button onClick={clearCanvas} style={{ ...GHOST_BTN, flex: 1, fontSize: '13px' }}>Clear ✕</button>
        <button onClick={() => setShowGuide(g => !g)} style={{
          ...GHOST_BTN, flex: 1, fontSize: '13px',
          borderColor: showGuide ? 'rgba(255,255,255,0.5)' : '#fff',
          background: showGuide ? '#fff' : 'var(--bg-secondary)',
        }}>
          {showGuide ? 'Hide guide' : 'Show guide'}
        </button>
      </div>

      {/* Example sentence */}
      {current.example && (
        <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', border: '1px solid var(--bg-secondary)', fontSize: '13px', lineHeight: 1.7, marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <span style={{ color: 'var(--fg-secondary)' }}>💬</span>
            <span style={{ flex: 1, color: 'var(--fg-secondary)', fontFamily: '"Noto Sans JP","Noto Sans SC",serif' }}>{current.example}</span>
          </div>
          {current.example_translation && (
            <div style={{ borderTop: '1px solid var(--bg-secondary)', marginTop: '6px', paddingTop: '6px', fontSize: '12px', color: 'var(--fg-secondary)', fontStyle: 'italic' }}>
              {current.example_translation}
            </div>
          )}
        </div>
      )}

      {/* Self-rate buttons — appear after first stroke */}
      {hasStrokes && (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'var(--fg-secondary)', textAlign: 'center', marginBottom: '10px' }}>
            HOW DID IT LOOK?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
            {([
              { r: 'wrong', label: 'Needs work', bg: 'rgba(226,75,74,0.2)', border: 'rgba(226,75,74,0.4)' },
              { r: 'good',  label: 'Pretty good', bg: 'rgba(0,232,122,0.15)', border: 'rgba(0,232,122,0.35)' },
              { r: 'easy',  label: 'Nailed it', bg: 'rgba(55,138,221,0.2)', border: 'rgba(55,138,221,0.4)' },
            ] as { r: Rating; label: string; bg: string; border: string }[]).map(({ r, label, bg, border }) => (
              <button key={r} disabled={rating} onClick={() => handleRate(r)} style={{
                padding: '12px 0', borderRadius: '10px', border: `1px solid ${border}`,
                background: bg, color: 'var(--fg)', fontSize: '13px', fontWeight: 500,
                cursor: rating ? 'not-allowed' : 'pointer', opacity: rating ? 0.5 : 1,
                transition: 'opacity 0.15s', fontFamily: 'var(--font-ui)',
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

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#2d0a1a',
      backgroundImage: `radial-gradient(ellipse at top right, #6b1a3a 0%, #2d0a1a 50%, #1a0510 100%)`,
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1.25rem 2rem',
      fontFamily: 'var(--font-ui)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(212,83,126,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(212,83,126,0.03) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </main>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <button onClick={onBack} className="btn">← Back</button>
      <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.01em' }}>✍️ Writing</span>
      <div style={{ width: '60px' }} />
    </div>
  );
}

const WHITE_BTN: React.CSSProperties = {
  background: '#fff', border: 'none', borderRadius: '10px',
  padding: '11px 24px', color: '#2d0a1a', fontSize: '14px',
  fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)',
};



function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 3rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(88,204,2,0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </main>
  );
}

const GHOST_BTN: React.CSSProperties = {
  background: '#fff', border: '2.5px solid var(--border-dark)', borderRadius: '10px',
  padding: '7px 14px', color: 'var(--fg-secondary)', fontSize: '13px',
  cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: '0 3px 0 var(--border-dark)',
};
