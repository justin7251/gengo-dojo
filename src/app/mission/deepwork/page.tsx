'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { getAgentProfile, updateAgentAfterMission } from '@/lib/agent';
import { Word, Progress, Rating, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import { rollEncounter, Encounter } from '@/lib/encounter';
import { isDue } from '@/lib/srs';
import EncounterOverlay from '@/components/EncounterOverlay';
import AuthGuard from '@/components/AuthGuard';

export default function DeepWorkPage() {
  return <AuthGuard><DeepWorkMission /></AuthGuard>;
}

type Phase      = 'playing' | 'done';
type RevealStep = 'word' | 'meaning' | 'example';

function speak(text: string, targetLang: TargetLang) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utter    = new SpeechSynthesisUtterance(text);
  utter.lang     = VOICE_LANG[targetLang] ?? 'ja-JP';
  utter.rate     = 0.75;
  const voices   = window.speechSynthesis.getVoices();
  const langCode = VOICE_LANG[targetLang].split('-')[0];
  const native   = voices.find(v => v.lang.startsWith(langCode));
  if (native) utter.voice = native;
  window.speechSynthesis.speak(utter);
}

function DeepWorkMission() {
  const router = useRouter();

  const [uid, setUid]               = useState('');
  const [targetLang, setTargetLang] = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang] = useState<NativeLang>('en');
  const [allWords, setAllWords]     = useState<Word[]>([]);
  const [progress, setProgress]     = useState<Record<string, Progress>>({});
  const [queue, setQueue]           = useState<Word[]>([]);
  const [phase, setPhase]           = useState<Phase>('playing');
  const [idx, setIdx]               = useState(0);
  const [reveal, setReveal]         = useState<RevealStep>('word');
  const [stats, setStats]           = useState({ correct: 0, wrong: 0 });
  const [loading, setLoading]       = useState(true);
  const [encounter, setEncounter]   = useState<Encounter | null>(null);

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
      const [ws, prog] = await Promise.all([
        getUserWords(user.uid, profile.targetLang, profile.nativeLang),
        getProgress(user.uid, profile.targetLang, profile.nativeLang),
      ]);
      setAllWords(ws);
      setProgress(prog);
      const due  = ws.filter(w => prog[w.id] && isDue(prog[w.id]));
      const rest = ws.filter(w => !prog[w.id] || !isDue(prog[w.id]));
      setQueue([...due, ...rest.sort(() => Math.random() - 0.5)].slice(0, 20));
      setLoading(false);
    });
  }, []);

  const current = queue[idx];
  const pct     = queue.length ? Math.round((idx / queue.length) * 100) : 0;

  async function handleRate(rating: Rating) {
    if (!current) return;
    const prev = progress[current.id];
    if (prev) {
      await rateWord(uid, current.id, rating, prev, targetLang, nativeLang);
      setStats(s => ({ correct: rating !== 'wrong' ? s.correct + 1 : s.correct, wrong: rating === 'wrong' ? s.wrong + 1 : s.wrong }));
    }
    const enc = rollEncounter(0.15, allWords, targetLang);
    if (enc) { setEncounter(enc); return; }
    advance();
  }

  async function advance() {
    const next = idx + 1;
    if (next >= queue.length) {
      setPhase('done');
      try {
        const ag = await getAgentProfile(uid);
        if (ag) {
          const params = new URLSearchParams({
            correct: String(stats.correct), wrong: String(stats.wrong), mode: 'deepwork',
            prevSuspicion: String(ag.suspicionLevel), prevChapter: String(ag.chapter), prevStreak: String(ag.streakDays),
          });
          const debrief = await updateAgentAfterMission(uid, stats.correct, stats.wrong, 'deepwork');
          if (debrief.newFragment) params.set('fragment', debrief.newFragment);
          router.push(`/debrief?${params.toString()}`);
        }
      } catch { /* ignore */ }
      return;
    }
    setIdx(next); setReveal('word');
    speak(queue[next].kanji, targetLang);
  }

  function handleEncounterWin() { setEncounter(null); setStats(s => ({ ...s, correct: s.correct + 2 })); advance(); }
  function handleEncounterLose() {
    setEncounter(null); setStats(s => ({ ...s, wrong: s.wrong + 1 }));
    const prev = progress[current?.id];
    if (prev && uid) rateWord(uid, current.id, 'wrong', prev, targetLang, nativeLang);
    advance();
  }

  if (loading) return <Screen><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><Spinner /></div></Screen>;

  if (phase === 'done') return (
    <Screen>
      <TopBar onBack={() => router.push('/mission')} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '1rem' }}>🧠</div>
        <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Deep work complete</h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
          {stats.correct} correct · {stats.wrong} wrong
        </p>
        <button onClick={() => router.push('/mission')} style={WHITE_BTN}>Debrief</button>
      </div>
    </Screen>
  );

  return (
    <>
      {encounter && <EncounterOverlay encounter={encounter} allWords={allWords} onWin={handleEncounterWin} onLose={handleEncounterLose} />}
      <Screen>
        <TopBar onBack={() => router.push('/mission')} />

        {/* Progress */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '5px', fontFamily: 'var(--font-mono)' }}>
            <span>{idx + 1} / {queue.length}</span><span>{pct}%</span>
          </div>
          <div style={{ height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px' }}>
            <div style={{ height: '2px', background: '#00e87a', borderRadius: '1px', width: `${pct}%`, transition: 'width 0.4s', boxShadow: '0 0 6px rgba(0,232,122,0.5)' }} />
          </div>
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {current?.topic}
            </span>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {current?.type}
            </span>
          </div>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(239,159,39,0.12)', color: '#EF9F27', border: '1px solid rgba(239,159,39,0.2)' }}>
            ⚡ 15% encounter
          </span>
        </div>

        {/* Voice */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button onClick={() => speak(current?.kanji ?? '', targetLang)} style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>🔊</button>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(0,0,0,0.35)', borderRadius: '20px', padding: '2.5rem 2rem', textAlign: 'center', minHeight: '260px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
          {/* Ghost */}
          <div style={{ position: 'absolute', fontSize: '200px', lineHeight: 1, fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: 'rgba(0,232,122,0.04)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', userSelect: 'none' }}>
            {current?.kanji}
          </div>
          <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>
            <div style={{ fontSize: '80px', lineHeight: 1, marginBottom: '12px', fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: '#fff' }}>
              {current?.kanji}
            </div>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginBottom: '20px' }}>
              {current?.reading}{current?.romanization ? ` · ${current.romanization}` : ''}
            </p>
            {reveal === 'word' && (
              <button onClick={() => { setReveal('meaning'); speak(current.kanji, targetLang); }} style={WHITE_BTN}>
                Reveal meaning
              </button>
            )}
            {reveal !== 'word' && (
              <div style={{ animation: 'fadeIn 0.2s ease' }}>
                <div style={{ fontSize: '24px', fontWeight: 600, color: '#fff', marginBottom: '14px', padding: '12px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.15)', display: 'inline-block' }}>
                  {current?.meaning}
                </div>
                {reveal === 'meaning' && (
                  <div><button onClick={() => setReveal('example')} style={GHOST_BTN}>Show example →</button></div>
                )}
                {reveal === 'example' && current?.example && (
                  <div style={{ animation: 'fadeIn 0.2s ease' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', lineHeight: 1.7, textAlign: 'left', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p style={{ fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: '#fff', marginBottom: current.example_translation ? '6px' : '0' }}>{current.example}</p>
                      {current.example_translation && (
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px' }}>{current.example_translation}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SRS buttons */}
        {reveal !== 'word' && (
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: '10px' }}>HOW DID YOU DO?</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
              {([
                { r: 'wrong', label: 'Again', sub: '1d',  bg: 'rgba(226,75,74,0.2)',  border: 'rgba(226,75,74,0.4)' },
                { r: 'hard',  label: 'Hard',  sub: '3d',  bg: 'rgba(239,159,39,0.2)', border: 'rgba(239,159,39,0.4)' },
                { r: 'good',  label: 'Good',  sub: '7d',  bg: 'rgba(255,255,255,0.12)',border: 'rgba(255,255,255,0.3)' },
                { r: 'easy',  label: 'Easy',  sub: '30d', bg: 'rgba(0,232,122,0.2)',  border: 'rgba(0,232,122,0.4)' },
              ] as { r: Rating; label: string; sub: string; bg: string; border: string }[]).map(({ r, label, sub, bg, border }) => (
                <button key={r} onClick={() => handleRate(r)} style={{ padding: '10px 0', borderRadius: '10px', borderWidth: '1px', borderStyle: 'solid', borderColor: border, background: bg, color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontFamily: 'var(--font-ui)', transition: 'opacity 0.15s' }}>
                  <span>{label}</span>
                  <span style={{ fontSize: '11px', opacity: 0.6 }}>{sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
          @keyframes spin { to{transform:rotate(360deg)} }
        `}</style>
      </Screen>
    </>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#040f0a',
      backgroundImage: 'radial-gradient(ellipse at top, #0a2418 0%, #040f0a 60%, #020807 100%)',
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1.25rem 2rem', fontFamily: 'var(--font-ui)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,232,122,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,232,122,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </main>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <button onClick={onBack} style={GHOST_BTN}>← Back</button>
      <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>🧠 Deep Work</span>
      <div style={{ width: '60px' }} />
    </div>
  );
}

const WHITE_BTN: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', color: '#040f0a', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' };
const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
function Spinner() { return <div style={{ width: '28px', height: '28px', border: '2px solid rgba(0,232,122,0.15)', borderTopColor: '#00e87a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />; }
