'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { updateAgentAfterMission, getAgentProfile } from '@/lib/agent';
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
  const [wrongPair, setWrongPair]   = useState<string | null>(null);
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
      const p: MatchPair[] = selected.map(w => ({
        wordId:  w.id,
        kanji:   w.kanji,
        meaning: w.meaning,
        matched: false,
      }));
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

    // After mission ends, instead of setPhase('done'):
    async function endSession() {
        const agentBefore = await getAgentProfile(uid);
        const debrief = await updateAgentAfterMission(uid, stats.correct, stats.wrong, 'scrap');
            
        const params = new URLSearchParams({
        correct:       String(stats.correct),
        wrong:         String(stats.wrong),
        mode:          'scrap',             // or 'deepwork' / 'braindead'
        prevSuspicion: String(agentBefore?.suspicionLevel ?? 0),
        prevChapter:   String(agentBefore?.chapter ?? 1),
        prevStreak:    String(agentBefore?.streakDays ?? 0),
        ...(debrief.newFragment ? { fragment: debrief.newFragment } : {}),
        });
        router.push(`/debrief?${params.toString()}`);
    }

  async function handleSelectMeaning(wordId: string) {
    if (!selectedKanji) return;
    const pair = pairs.find(p => p.wordId === wordId);
    if (pair?.matched) return;

    if (selectedKanji === wordId) {
      // Correct match
      setPairs(prev => prev.map(p => p.wordId === wordId ? { ...p, matched: true } : p));
      setStats(s => ({ ...s, correct: s.correct + 1 }));
      const prev = progress[wordId];
      if (prev) rateWord(uid, wordId, 'good', prev, targetLang, nativeLang);

      const allMatched = pairs.filter(p => p.wordId !== wordId).every(p => p.matched);
      if (allMatched) {
        setDone(true);
        updateAgentAfterMission(uid, stats.correct + 1, stats.wrong, 'braindead').catch(() => {});
      }
    } else {
      // Wrong match
      setWrongPair(selectedKanji);
      setStats(s => ({ ...s, wrong: s.wrong + 1 }));
      const prev = progress[selectedKanji];
      if (prev) rateWord(uid, selectedKanji, 'hard', prev, targetLang, nativeLang);
      setTimeout(() => setWrongPair(null), 600);
    }
    setSelectedKanji(null);
  }

  const matched = pairs.filter(p => p.matched).length;

  if (loading) return <Shell onBack={() => router.push('/mission')}><div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div></Shell>;

  if (done) {
    return (
      <Shell onBack={() => router.push('/mission')}>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '52px', marginBottom: '1rem' }}>🌙</div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>All matched</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
            {stats.correct} correct · {stats.wrong} wrong
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => endSession()}>Debrief</button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onBack={() => router.push('/mission')}>

      {/* Progress */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
          <span>{matched} / {pairs.length} matched</span>
          <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>tap kanji → tap meaning</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${(matched / pairs.length) * 100}%` }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>

        {/* Left: kanji */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {pairs.map(p => (
            <button key={p.wordId} onClick={() => handleSelectKanji(p.wordId, p.kanji)}
              disabled={p.matched}
              style={{
                padding: '16px', borderRadius: '12px',
                borderWidth: '1px', borderStyle: 'solid',
                borderColor: p.matched ? '#1D9E75'
                  : selectedKanji === p.wordId ? '#185FA5'
                  : wrongPair === p.wordId ? '#E24B4A'
                  : 'var(--border)',
                background: p.matched ? '#E1F5EE'
                  : selectedKanji === p.wordId ? '#E6F1FB'
                  : wrongPair === p.wordId ? '#FCEBEB'
                  : 'var(--surface)',
                cursor: p.matched ? 'default' : 'pointer',
                fontSize: '28px', fontFamily: '"Noto Sans JP","Noto Sans SC",serif',
                color: p.matched ? '#0F6E56' : 'var(--fg)',
                textAlign: 'center', transition: 'all 0.15s',
                opacity: p.matched ? 0.5 : 1,
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
                  padding: '16px', borderRadius: '12px',
                  borderWidth: '1px', borderStyle: 'solid',
                  borderColor: pair?.matched ? '#1D9E75' : 'var(--border)',
                  background:  pair?.matched ? '#E1F5EE'  : 'var(--surface)',
                  cursor: pair?.matched ? 'default' : 'pointer',
                  fontSize: '13px', color: pair?.matched ? '#0F6E56' : 'var(--fg)',
                  textAlign: 'center', transition: 'all 0.15s',
                  opacity: pair?.matched ? 0.5 : 1,
                  minHeight: '60px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit', lineHeight: 1.3,
                }}>
                {m.meaning}
              </button>
            );
          })}
        </div>
      </div>

    </Shell>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem 4rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '680px', display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn" style={{ fontSize: '13px' }} onClick={onBack}>← Back</button>
        <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '1rem' }}>🌙 Brain Dead</span>
      </div>
      <div style={{ width: '100%', maxWidth: '680px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem' }}>
        {children}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
function Spinner() {
  return <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--muted)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />;
}