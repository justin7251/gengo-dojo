'use client';
import { Spinner } from '@/components/Spinner';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { Word, Progress, Rating, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import { isDue } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function FlashcardsPage() { return <AuthGuard><Flashcards /></AuthGuard>; }

type RevealStep = 'kanji' | 'meaning' | 'example';

function speak(text: string, targetLang: TargetLang) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang  = VOICE_LANG[targetLang] ?? 'ja-JP'; utter.rate = 0.85;
  const voices = window.speechSynthesis.getVoices();
  const native = voices.find(v => v.lang.startsWith(VOICE_LANG[targetLang].split('-')[0]));
  if (native) utter.voice = native;
  window.speechSynthesis.speak(utter);
}

function Flashcards() {
  const router = useRouter();
  const [uid, setUid]                   = useState('');
  const [targetLang, setTargetLang]     = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang]     = useState<NativeLang>('en');
  const [queue, setQueue]               = useState<Word[]>([]);
  const [progress, setProgress]         = useState<Record<string, Progress>>({});
  const [idx, setIdx]                   = useState(0);
  const [reveal, setReveal]             = useState<RevealStep>('kanji');
  const [loading, setLoading]           = useState(true);
  const [rating, setRating]             = useState(false);
  const [speaking, setSpeaking]         = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, wrong: 0 });
  const [done, setDone]                 = useState(false);

  useEffect(() => { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices(); }, []);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      setTargetLang(profile.targetLang); setNativeLang(profile.nativeLang);
      const [words, prog] = await Promise.all([getUserWords(user.uid, profile.targetLang, profile.nativeLang), getProgress(user.uid, profile.targetLang, profile.nativeLang)]);
      setProgress(prog);
      const due = words.filter(w => prog[w.id] && isDue(prog[w.id]));
      const rest = words.filter(w => !prog[w.id] || !isDue(prog[w.id]));
      setQueue([...due, ...rest].sort(() => Math.random() - 0.5));
      setLoading(false);
    });
  }, []);

  const current = queue[idx];
  const pct     = queue.length ? Math.round((idx / queue.length) * 100) : 0;

  function handleSpeak(text?: string) {
    if (!current) return;
    setSpeaking(true); speak(text ?? current.kanji, targetLang);
    setTimeout(() => setSpeaking(false), 1200);
  }
  function handleRevealMeaning() { setReveal('meaning'); speak(current.kanji, targetLang); }

  async function handleRate(r: Rating) {
    if (!current || rating) return;
    setRating(true);
    const prev = progress[current.id];
    if (prev) {
      await rateWord(uid, current.id, r, prev, targetLang, nativeLang);
      setSessionStats(s => ({ correct: r !== 'wrong' ? s.correct + 1 : s.correct, wrong: r === 'wrong' ? s.wrong + 1 : s.wrong }));
    }
    const next = idx + 1;
    if (next >= queue.length) { setDone(true); } else { setIdx(next); setReveal('kanji'); }
    setRating(false);
  }

  if (loading) return <Shell accent="var(--green)"><div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner size={40} color="var(--green)" /></div></Shell>;

  if (!queue.length) return (
    <Shell accent="var(--green)">
      <TopBar onBack={() => router.push('/dashboard')} title="🃏 Flashcards" accent="var(--green)" />
      <EmptyState emoji="📭" title="No words yet" sub="Generate vocabulary from the dashboard first." onBack={() => router.push('/dashboard')} />
    </Shell>
  );

  if (done) {
    const total = sessionStats.correct + sessionStats.wrong;
    const pctC  = total ? Math.round(sessionStats.correct / total * 100) : 0;
    return (
      <Shell accent="var(--green)">
        <TopBar onBack={() => router.push('/dashboard')} title="🃏 Flashcards" accent="var(--green)" />
        <ResultCard emoji={pctC >= 80 ? '🏆' : pctC >= 50 ? '💪' : '📖'}
          title={pctC >= 80 ? 'Amazing work!' : pctC >= 50 ? 'Good effort!' : 'Keep going!'}
          correct={sessionStats.correct} wrong={sessionStats.wrong} pct={pctC}
          onRetry={() => { setIdx(0); setReveal('kanji'); setDone(false); setSessionStats({ correct: 0, wrong: 0 }); }}
          onDashboard={() => router.push('/dashboard')} />
      </Shell>
    );
  }

  return (
    <Shell accent="var(--green)">
      <TopBar onBack={() => router.push('/dashboard')} title="🃏 Flashcards" accent="var(--green)" />

      {/* Progress */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '6px' }}>
          <span>Card {idx + 1} of {queue.length}</span>
          <span style={{ color: 'var(--green-dark)' }}>{sessionStats.correct} ✓</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      {/* Card */}
      <div style={{
        background: '#fff', border: '2.5px solid var(--border-dark)', borderRadius: '24px',
        boxShadow: '0 8px 0 var(--border-dark)', padding: '2rem', textAlign: 'center',
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden', minHeight: '320px',
        animation: 'fadeIn 0.25s ease',
      }}>
        {/* Ghost kanji bg */}
        <div style={{ position: 'absolute', fontSize: '180px', lineHeight: 1, fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: 'var(--bg-secondary)', userSelect: 'none', pointerEvents: 'none', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 0 }}>
          {current.kanji}
        </div>
        <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
          {/* Topic pill + speaker */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span className="pill pill-teal">{current.topic}</span>
            <button onClick={() => handleSpeak()} style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: `2.5px solid ${speaking ? 'var(--green)' : 'var(--border-dark)'}`,
              background: speaking ? 'var(--green-light)' : 'var(--bg-secondary)',
              cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: speaking ? '0 3px 0 var(--green-dark)' : '0 3px 0 var(--border-dark)',
              transition: 'all 0.15s',
            }}>🔊</button>
          </div>
          {/* Kanji */}
          <div style={{ fontSize: '88px', lineHeight: 1, fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: 'var(--fg)', marginBottom: '10px' }}>
            {current.kanji}
          </div>
          {/* Reading */}
          <p style={{ fontSize: '18px', color: 'var(--muted-bright)', marginBottom: '1.5rem', fontWeight: 600 }}>
            {current.reading}{current.romanization && <span style={{ fontSize: '14px', marginLeft: '8px', opacity: 0.7 }}>· {current.romanization}</span>}
          </p>

          {reveal === 'kanji' && (
            <button onClick={handleRevealMeaning} className="btn btn-primary" style={{ padding: '12px 32px', fontSize: '15px' }}>
              Reveal Meaning 👁
            </button>
          )}

          {reveal !== 'kanji' && (
            <div style={{ animation: 'bounceIn 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--fg)', marginBottom: '14px', padding: '12px 20px', background: 'var(--green-light)', borderRadius: '14px', border: '2.5px solid var(--green)', display: 'inline-block', boxShadow: '0 4px 0 var(--green-dark)', fontFamily: 'var(--font-display)' }}>
                {current.meaning}
              </div>
              {reveal === 'meaning' && (
                <div>
                  <button onClick={() => setReveal('example')} className="btn" style={{ fontSize: '14px' }}>Show example →</button>
                </div>
              )}
              {reveal === 'example' && current.example && (
                <div style={{ animation: 'fadeIn 0.2s ease', background: 'var(--bg-secondary)', borderRadius: '14px', padding: '14px 16px', textAlign: 'left', border: '2px solid var(--border-dark)', marginTop: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: current.example_translation ? '8px' : '0' }}>
                    <span style={{ color: 'var(--muted)' }}>💬</span>
                    <span style={{ flex: 1, fontSize: '15px', lineHeight: 1.7, color: 'var(--fg)', fontFamily: '"Noto Sans JP","Noto Sans SC",serif' }}>{current.example}</span>
                    <button onClick={() => handleSpeak(current.example)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid var(--border-dark)', background: 'var(--bg-secondary)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🔊</button>
                  </div>
                  {current.example_translation && (
                    <p style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic', borderTop: '2px solid var(--border-dark)', paddingTop: '8px', paddingLeft: '20px' }}>{current.example_translation}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SRS buttons */}
      {reveal !== 'kanji' && (
        <div style={{ marginTop: '1.25rem', animation: 'fadeUp 0.3s ease' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--muted)', textAlign: 'center', marginBottom: '10px', textTransform: 'uppercase' }}>How did you do?</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
            {([
              { r: 'wrong', label: 'Again', sub: '1d',  bg: 'var(--red-light)',    border: 'var(--red)',    shadow: 'var(--red-dark)',    color: 'var(--red-dark)' },
              { r: 'hard',  label: 'Hard',  sub: '3d',  bg: 'var(--orange-light)', border: 'var(--orange)', shadow: 'var(--orange-dark)', color: 'var(--orange-dark)' },
              { r: 'good',  label: 'Good',  sub: '7d',  bg: 'var(--blue-light)',   border: 'var(--blue)',   shadow: 'var(--blue-dark)',   color: 'var(--blue-dark)' },
              { r: 'easy',  label: 'Easy',  sub: '30d', bg: 'var(--green-light)',  border: 'var(--green)',  shadow: 'var(--green-dark)',  color: 'var(--green-dark)' },
            ] as { r: Rating; label: string; sub: string; bg: string; border: string; shadow: string; color: string }[]).map(({ r, label, sub, bg, border, shadow, color }) => (
              <button key={r} disabled={rating} onClick={() => handleRate(r)} style={{
                padding: '12px 4px', borderRadius: '14px', border: `2.5px solid ${border}`,
                background: bg, color, fontSize: '13px', fontWeight: 800,
                cursor: rating ? 'not-allowed' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                opacity: rating ? 0.5 : 1, transition: 'all 0.1s ease',
                boxShadow: `0 4px 0 ${shadow}`, fontFamily: 'var(--font-ui)',
              }}>
                <span>{label}</span>
                <span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 700 }}>{sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

// ── Shared sub-components ─────────────────────────────

function Shell({ children, accent = 'var(--green)' }: { children: React.ReactNode; accent?: string }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 3rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: `${accent}12`, filter: 'blur(50px)', pointerEvents: 'none', animation: 'orbDrift 7s ease-in-out infinite' }} />
      <div style={{ maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
      <style>{`
        @keyframes orbDrift { 0%,100%{transform:translate(0,0)} 33%{transform:translate(-12px,8px)} 66%{transform:translate(6px,-10px)} }
        @keyframes fadeIn   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounceIn { 0%{opacity:0;transform:scale(0.7)} 60%{transform:scale(1.05)} 100%{opacity:1;transform:scale(1)} }
      `}</style>
    </main>
  );
}

function TopBar({ onBack, title, accent }: { onBack: () => void; title: string; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
      <button onClick={onBack} className="btn" style={{ fontSize: '13px', padding: '8px 14px' }}>← Back</button>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, color: 'var(--fg)' }}>{title}</span>
      <div style={{ width: '70px' }} />
    </div>
  );
}

function EmptyState({ emoji, title, sub, onBack }: { emoji: string; title: string; sub: string; onBack: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 0', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontSize: '56px', marginBottom: '1rem' }}>{emoji}</p>
      <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--fg)', marginBottom: '8px', fontFamily: 'var(--font-display)' }}>{title}</p>
      <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem', fontWeight: 600 }}>{sub}</p>
      <button className="btn btn-primary" onClick={onBack}>← Dashboard</button>
    </div>
  );
}

function ResultCard({ emoji, title, correct, wrong, pct, onRetry, onDashboard }: {
  emoji: string; title: string; correct: number; wrong: number; pct: number;
  onRetry: () => void; onDashboard: () => void;
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: '80px', marginBottom: '1rem', animation: 'bounceIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>{emoji}</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--fg)', marginBottom: '6px' }}>{title}</h2>
      <p style={{ fontSize: '15px', color: 'var(--muted)', marginBottom: '1.5rem', fontWeight: 600 }}>{correct} correct · {wrong} again</p>
      <div style={{ width: '100%', maxWidth: '320px', marginBottom: '6px' }}>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
      </div>
      <p style={{ fontSize: '14px', color: 'var(--muted-bright)', marginBottom: '2rem', fontWeight: 700 }}>{pct}% accuracy</p>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button className="btn btn-primary" onClick={onRetry}>Study Again 🔄</button>
        <button className="btn" onClick={onDashboard}>Dashboard</button>
      </div>
    </div>
  );
}
