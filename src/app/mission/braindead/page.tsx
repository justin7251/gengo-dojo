'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { getAgentProfile, updateAgentAfterMission } from '@/lib/agent';
import { Word, Progress, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';

export default function BrainDeadPage() {
  return <AuthGuard><BrainDeadMission /></AuthGuard>;
}

interface MatchPair { wordId: string; kanji: string; meaning: string; matched: boolean; }

function speak(text: string, targetLang: TargetLang) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utter    = new SpeechSynthesisUtterance(text);
  utter.lang     = VOICE_LANG[targetLang] ?? 'ja-JP';
  utter.rate     = 0.7;
  const voices   = window.speechSynthesis.getVoices();
  const langCode = VOICE_LANG[targetLang].split('-')[0];
  const native   = voices.find(v => v.lang.startsWith(langCode));
  if (native) utter.voice = native;
  window.speechSynthesis.speak(utter);
}

function BrainDeadMission() {
  const router = useRouter();

  const [uid, setUid]               = useState('');
  const [targetLang, setTargetLang] = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang] = useState<NativeLang>('en');
  const [progress, setProgress]     = useState<Record<string, Progress>>({});
  const [pairs, setPairs]           = useState<MatchPair[]>([]);
  const [meanings, setMeanings]     = useState<{ wordId: string; meaning: string }[]>([]);
  const [selectedKanji, setSelectedKanji] = useState<string | null>(null);
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [done, setDone]             = useState(false);
  const [stats, setStats]           = useState({ correct: 0, wrong: 0 });
  const [loading, setLoading]       = useState(true);

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
      setProgress(prog);
      const selected = ws.sort(() => Math.random() - 0.5).slice(0, 8);
      const p: MatchPair[] = selected.map(w => ({ wordId: w.id, kanji: w.kanji, meaning: w.meaning, matched: false }));
      setPairs(p);
      setMeanings(p.map(pp => ({ wordId: pp.wordId, meaning: pp.meaning })).sort(() => Math.random() - 0.5));
      setLoading(false);
    });
  }, []);

  function handleSelectKanji(wordId: string, kanji: string) {
    if (pairs.find(p => p.wordId === wordId)?.matched) return;
    setSelectedKanji(wordId);
    speak(kanji, targetLang);
  }

  async function handleSelectMeaning(wordId: string) {
    if (!selectedKanji) return;
    const pair = pairs.find(p => p.wordId === wordId);
    if (pair?.matched) return;

    if (selectedKanji === wordId) {
      const newPairs = pairs.map(p => p.wordId === wordId ? { ...p, matched: true } : p);
      setPairs(newPairs);
      setStats(s => ({ ...s, correct: s.correct + 1 }));
      const prev = progress[wordId];
      if (prev) rateWord(uid, wordId, 'good', prev, targetLang, nativeLang);
      if (newPairs.every(p => p.matched)) {
        setDone(true);
        try {
          const ag = await getAgentProfile(uid);
          if (ag) {
            const newCorrect = stats.correct + 1;
            const params = new URLSearchParams({
              correct: String(newCorrect), wrong: String(stats.wrong), mode: 'braindead',
              prevSuspicion: String(ag.suspicionLevel), prevChapter: String(ag.chapter), prevStreak: String(ag.streakDays),
            });
            const debrief = await updateAgentAfterMission(uid, newCorrect, stats.wrong, 'braindead');
            if (debrief.newFragment) params.set('fragment', debrief.newFragment);
            setTimeout(() => router.push(`/debrief?${params.toString()}`), 800);
          }
        } catch { /* ignore */ }
      }
    } else {
      setWrongFlash(selectedKanji);
      setStats(s => ({ ...s, wrong: s.wrong + 1 }));
      const prev = progress[selectedKanji];
      if (prev) rateWord(uid, selectedKanji, 'hard', prev, targetLang, nativeLang);
      setTimeout(() => setWrongFlash(null), 600);
    }
    setSelectedKanji(null);
  }

  const matched = pairs.filter(p => p.matched).length;

  if (loading) return <Screen><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><Spinner /></div></Screen>;

  if (done) return (
    <Screen>
      <TopBar onBack={() => router.push('/mission')} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '1rem', filter: 'drop-shadow(0 0 20px rgba(55,138,221,0.5))' }}>🌙</div>
        <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>All matched</h2>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem' }}>
          {stats.correct} correct · {stats.wrong} wrong
        </p>
        <p style={{ fontSize: '13px', color: 'rgba(55,138,221,0.8)', marginBottom: '1rem' }}>Redirecting to debrief…</p>
      </div>
    </Screen>
  );

  return (
    <Screen>
      <TopBar onBack={() => router.push('/mission')} />

      {/* Progress */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
            {matched} / {pairs.length} matched
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(55,138,221,0.7)', fontStyle: 'italic' }}>
            tap kanji → tap meaning
          </span>
        </div>
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ height: '3px', background: '#378ADD', borderRadius: '2px', width: `${(matched / pairs.length) * 100}%`, transition: 'width 0.4s', boxShadow: '0 0 8px rgba(55,138,221,0.5)' }} />
        </div>
      </div>

      {/* Match grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
        {/* Left: kanji */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pairs.map(p => (
            <button key={p.wordId} onClick={() => handleSelectKanji(p.wordId, p.kanji)}
              disabled={p.matched}
              style={{
                padding: '16px', borderRadius: '12px', cursor: p.matched ? 'default' : 'pointer',
                fontFamily: '"Noto Sans JP","Noto Sans SC",serif', fontSize: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', minHeight: '64px',
                borderWidth: '1px', borderStyle: 'solid',
                borderColor: p.matched ? 'rgba(0,232,122,0.3)'
                  : selectedKanji === p.wordId ? 'rgba(55,138,221,0.7)'
                  : wrongFlash === p.wordId ? 'rgba(226,75,74,0.6)'
                  : 'rgba(255,255,255,0.1)',
                background: p.matched ? 'rgba(0,232,122,0.08)'
                  : selectedKanji === p.wordId ? 'rgba(55,138,221,0.15)'
                  : wrongFlash === p.wordId ? 'rgba(226,75,74,0.12)'
                  : 'rgba(255,255,255,0.04)',
                color: p.matched ? 'rgba(0,232,122,0.6)'
                  : selectedKanji === p.wordId ? 'rgba(55,138,221,0.9)'
                  : '#fff',
                opacity: p.matched ? 0.4 : 1,
                boxShadow: selectedKanji === p.wordId ? '0 0 16px rgba(55,138,221,0.3)' : 'none',
              }}>
              {p.kanji}
            </button>
          ))}
        </div>

        {/* Right: meanings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {meanings.map(m => {
            const pair = pairs.find(p => p.wordId === m.wordId);
            return (
              <button key={m.wordId} onClick={() => handleSelectMeaning(m.wordId)}
                disabled={pair?.matched}
                style={{
                  padding: '10px', borderRadius: '12px', cursor: pair?.matched ? 'default' : 'pointer',
                  fontSize: '12px', fontFamily: 'var(--font-ui)', lineHeight: 1.3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  minHeight: '64px', transition: 'all 0.15s',
                  borderWidth: '1px', borderStyle: 'solid',
                  borderColor: pair?.matched ? 'rgba(0,232,122,0.3)' : 'rgba(255,255,255,0.1)',
                  background: pair?.matched ? 'rgba(0,232,122,0.08)' : 'rgba(255,255,255,0.04)',
                  color: pair?.matched ? 'rgba(0,232,122,0.6)' : 'rgba(255,255,255,0.8)',
                  opacity: pair?.matched ? 0.4 : 1,
                }}>
                {m.meaning}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#030810',
      backgroundImage: 'radial-gradient(ellipse at top left, #0a1a30 0%, #030810 60%, #010508 100%)',
      display: 'flex', flexDirection: 'column',
      padding: '1.5rem 1.25rem 2rem', fontFamily: 'var(--font-ui)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(55,138,221,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(55,138,221,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
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
      <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>🌙 Brain Dead</span>
      <div style={{ width: '60px' }} />
    </div>
  );
}

const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
function Spinner() { return <div style={{ width: '28px', height: '28px', border: '2px solid rgba(55,138,221,0.15)', borderTopColor: '#378ADD', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />; }
