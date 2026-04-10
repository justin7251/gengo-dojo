'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { updateAgentAfterMission, getAgentProfile } from '@/lib/agent';
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
      setStats(s => ({
        correct: rating !== 'wrong' ? s.correct + 1 : s.correct,
        wrong:   rating === 'wrong' ? s.wrong + 1   : s.wrong,
      }));
    }

    // Roll for encounter before advancing
    const enc = rollEncounter(0.15, allWords, targetLang);
    if (enc) {
      setEncounter(enc);
      return;
    }

    advance();
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

  function advance() {
    const next = idx + 1;
    if (next >= queue.length) {
      setPhase('done');
      updateAgentAfterMission(uid, stats.correct, stats.wrong, 'deepwork').catch(() => {});
      return;
    }
    setIdx(next);
    setReveal('word');
    speak(queue[next].kanji, targetLang);
  }

  function handleEncounterWin() {
    setEncounter(null);
    setStats(s => ({ ...s, correct: s.correct + 2 }));
    advance();
  }

  function handleEncounterLose() {
    setEncounter(null);
    setStats(s => ({ ...s, wrong: s.wrong + 1 }));
    // Penalise — drop last word back to due
    const prev = progress[current?.id];
    if (prev && uid) {
      rateWord(uid, current.id, 'wrong', prev, targetLang, nativeLang);
    }
    advance();
  }

  if (loading) return <Shell onBack={() => router.push('/mission')}><div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div></Shell>;

  if (phase === 'done') {
    const total = stats.correct + stats.wrong;
    const pctC  = total ? Math.round(stats.correct / total * 100) : 0;
    return (
      <Shell onBack={() => router.push('/mission')}>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '52px', marginBottom: '1rem' }}>🧠</div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Deep work complete</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
            {stats.correct} correct · {stats.wrong} wrong · {pctC}% accuracy
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => endSession() }>Debrief</button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <>
      {encounter && (
        <EncounterOverlay
          encounter={encounter}
          allWords={allWords}
          onWin={handleEncounterWin}
          onLose={handleEncounterLose}
        />
      )}

      <Shell onBack={() => router.push('/mission')}>

        {/* Progress */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
            <span>{idx + 1} / {queue.length}</span>
            <span>{pct}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Pills */}
        <div style={{ marginBottom: '1.25rem' }}>
          <span className="pill pill-gray">{current?.topic}</span>
          <span className="pill pill-blue" style={{ marginLeft: '6px' }}>{current?.type}</span>
          <span style={{
            marginLeft: '6px', fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
            background: '#FAEEDA', color: '#854F0B',
          }}>
            ⚡ 15% encounter chance
          </span>
        </div>

        {/* Voice */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
          <button onClick={() => speak(current?.kanji ?? '', targetLang)} style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: '1px solid #444', background: '#2a2a2a',
            cursor: 'pointer', fontSize: '18px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>🔊</button>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '20px', padding: '2.5rem 2rem', textAlign: 'center',
          minHeight: '260px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '80px', lineHeight: 1, marginBottom: '12px', fontFamily: '"Noto Sans JP","Noto Sans SC",serif' }}>
            {current?.kanji}
          </div>
          <p style={{ fontSize: '16px', color: 'var(--muted)', marginBottom: '20px' }}>
            {current?.reading}{current?.romanization ? ` · ${current.romanization}` : ''}
          </p>

          {reveal === 'word' && (
            <button className="btn btn-primary" onClick={() => { setReveal('meaning'); speak(current.kanji, targetLang); }}>
              Reveal meaning
            </button>
          )}

          {reveal !== 'word' && (
            <div style={{ animation: 'fadeIn 0.2s ease', width: '100%' }}>
              <div style={{ fontSize: '22px', fontWeight: 600, marginBottom: '14px', padding: '10px 20px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)', display: 'inline-block' }}>
                {current?.meaning}
              </div>
              {reveal === 'meaning' && (
                <div><button className="btn" style={{ fontSize: '13px' }} onClick={() => setReveal('example')}>Show example →</button></div>
              )}
              {reveal === 'example' && current?.example && (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', lineHeight: 1.7, textAlign: 'left' }}>
                    <p style={{ fontFamily: '"Noto Sans JP","Noto Sans SC",serif', marginBottom: current.example_translation ? '6px' : '0' }}>{current.example}</p>
                    {current.example_translation && (
                      <p style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                        {current.example_translation}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SRS buttons */}
        {reveal !== 'word' && (
          <div style={{ animation: 'fadeIn 0.25s ease' }}>
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
                <button key={r} onClick={() => handleRate(r)} style={{
                  padding: '10px 0', border: `1px solid ${color}`,
                  borderRadius: '10px', background: bg, color,
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  transition: 'opacity 0.15s', fontFamily: 'inherit',
                }}>
                  <span>{label}</span>
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>{sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Shell>
    </>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem 4rem', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: '680px', display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button className="btn" style={{ fontSize: '13px' }} onClick={onBack}>← Back</button>
        <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '1rem' }}>🧠 Deep Work</span>
      </div>
      <div style={{ width: '100%', maxWidth: '680px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem' }}>
        {children}
      </div>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </main>
  );
}
function Spinner() {
  return <div style={{ width: '24px', height: '24px', border: '2px solid var(--border)', borderTopColor: 'var(--muted)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto' }} />;
}