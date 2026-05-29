'use client';
import { Spinner } from '@/components/Spinner';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress } from '@/lib/firestore';
import { getAgentProfile, resetCover } from '@/lib/agent';
import { Word, Progress, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';

export default function InterrogationPage() {
  return <AuthGuard><Interrogation /></AuthGuard>;
}

type Phase = 'intro' | 'playing' | 'passed' | 'failed';

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

function Interrogation() {
  const router = useRouter();

  const [uid, setUid]               = useState('');
  const [targetLang, setTargetLang] = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang] = useState<NativeLang>('en');
  const [allWords, setAllWords]     = useState<Word[]>([]);
  const [progress, setProgress]     = useState<Record<string, Progress>>({});
  const [queue, setQueue]           = useState<Word[]>([]);
  const [phase, setPhase]           = useState<Phase>('intro');
  const [idx, setIdx]               = useState(0);
  const [choices, setChoices]       = useState<string[]>([]);
  const [selected, setSelected]     = useState('');
  const [answered, setAnswered]     = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [pressure, setPressure]     = useState(0); // 0-5 escalating UI tension

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
      // Hardest words — most wrong answers
      const sorted = ws
        .sort((a, b) => {
          const pa = prog[a.id], pb = prog[b.id];
          const ratioA = pa ? pa.wrong / Math.max(pa.correct + pa.wrong, 1) : 0;
          const ratioB = pb ? pb.wrong / Math.max(pb.correct + pb.wrong, 1) : 0;
          return ratioB - ratioA;
        })
        .slice(0, 5);
      setQueue(sorted);
      buildChoices(sorted, 0, ws);
      setLoading(false);
    });
  }, []);

  function buildChoices(q: Word[], i: number, all: Word[]) {
    const word        = q[i];
    if (!word) return;
    const distractors = all
      .filter(w => w.id !== word.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map(w => w.meaning);
    setChoices([...distractors, word.meaning].sort(() => Math.random() - 0.5));
  }

  async function handleAnswer(choice: string) {
    if (answered) return;
    const word      = queue[idx];
    const isCorrect = choice === word.meaning;
    setSelected(choice);
    setAnswered(true);

    if (!isCorrect) {
      const newWrong = wrongCount + 1;
      setWrongCount(newWrong);
      setPressure(p => Math.min(p + 2, 5));
      if (newWrong >= 1) {
        // One wrong = failed interrogation
        setTimeout(async () => {
          await resetCover(uid);
          setPhase('failed');
        }, 1500);
        return;
      }
    } else {
      setPressure(p => Math.max(p - 1, 0));
    }

    setTimeout(() => {
      const next = idx + 1;
      if (next >= queue.length) {
        setPhase('passed');
        resetCover(uid);
        return;
      }
      setIdx(next);
      setSelected('');
      setAnswered(false);
      buildChoices(queue, next, allWords);
      speak(queue[next].kanji, targetLang);
    }, 1000);
  }

  const current = queue[idx];

  // Escalating background tension
  const bgTension = [
    'var(--bg)',
    '#0d0808',
    '#110808',
    '#150808',
    '#1a0505',
    '#200000',
  ][pressure];

  const borderTension = [
    'var(--border)',
    '#3a1515',
    '#4a1818',
    '#5a1a1a',
    '#701a1a',
    '#E24B4A44',
  ][pressure];

  if (loading) {
    return (
      <InterrogationShell bg="var(--bg)" border="var(--border)">
        <div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div>
      </InterrogationShell>
    );
  }

  if (phase === 'intro') {
    return (
      <InterrogationShell bg="var(--bg)" border="var(--border)">
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: '52px', marginBottom: '1rem' }}>🔦</div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', color: '#E24B4A' }}>
            Interrogation
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.7 }}>
            Your cover is blown.<br />
            They know who you are.<br />
            Answer all 5 questions correctly to walk free.<br />
            One wrong answer and it's over.
          </p>

          <div style={{
            background: '#1a0000',
            borderWidth: '1px', borderStyle: 'solid', borderColor: '#E24B4A44',
            borderRadius: '12px', padding: '14px 16px',
            fontSize: '13px', color: 'rgba(255,100,100,0.8)',
            marginBottom: '2rem', lineHeight: 1.7, textAlign: 'left',
          }}>
            <div style={{ marginBottom: '6px' }}>✗ No hints</div>
            <div style={{ marginBottom: '6px' }}>✗ No timer shown</div>
            <div style={{ marginBottom: '6px' }}>✗ One wrong = story resets to chapter 1</div>
            <div>✓ Pass all 5 = suspicion clears, cover restored</div>
          </div>

          <button
            style={{
              width: '100%', padding: '14px',
              background: '#E24B4A', border: 'none', borderRadius: '12px',
              color: '#fff', fontSize: '16px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onClick={() => { setPhase('playing'); speak(queue[0].kanji, targetLang); }}
          >
            Begin interrogation
          </button>
        </div>
      </InterrogationShell>
    );
  }

  if (phase === 'passed') {
    return (
      <InterrogationShell bg="var(--bg)" border="var(--border)">
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '52px', marginBottom: '1rem' }}>✓</div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', color: '#0F6E56' }}>
            You walked free
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem', lineHeight: 1.7 }}>
            Cover restored. Suspicion cleared.<br />
            They have nothing on you.
          </p>
          <button className="btn btn-primary" style={{ width: '100%' }}
            onClick={() => router.push('/mission')}>
            Back to missions
          </button>
        </div>
      </InterrogationShell>
    );
  }

  if (phase === 'failed') {
    return (
      <InterrogationShell bg="#0f0000" border="#E24B4A44">
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: '52px', marginBottom: '1rem' }}>✗</div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', color: '#E24B4A' }}>
            Cover blown
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', lineHeight: 1.7 }}>
            They knew. Your story has been reset.<br />
            Start again from Chapter 1.
          </p>
          <button
            style={{
              width: '100%', padding: '14px',
              background: '#E24B4A', border: 'none', borderRadius: '12px',
              color: '#fff', fontSize: '15px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
            onClick={() => router.push('/mission')}
          >
            Start over
          </button>
        </div>
      </InterrogationShell>
    );
  }

  return (
    <InterrogationShell bg={bgTension} border={borderTension}>

      {/* Pressure indicator — no number, just ambient */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '1.5rem',
      }}>
        <span style={{ fontSize: '12px', color: '#E24B4A', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Question {idx + 1} of {queue.length}
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: i < (idx + 1) ? '#E24B4A' : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
      </div>

      {/* No reading hint — just the kanji */}
      <div style={{
        borderWidth: '1px', borderStyle: 'solid', borderColor: borderTension,
        borderRadius: '16px', padding: '2.5rem', textAlign: 'center',
        marginBottom: '1.5rem',
        background: 'rgba(0,0,0,0.3)',
      }}>
        <p style={{
          fontSize: '11px', letterSpacing: '0.15em', color: '#E24B4A88',
          textTransform: 'uppercase', marginBottom: '1rem',
        }}>
          Translate
        </p>
        <div style={{
          fontSize: '80px', lineHeight: 1,
          fontFamily: '"Noto Sans JP","Noto Sans SC",serif',
          color: '#ffffff',
          marginBottom: '0', // no reading shown
        }}>
          {current?.kanji}
        </div>
        {/* No reading. No hints. */}
      </div>

      {/* Choices */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {choices.map(choice => {
          const isCorrect  = choice === current?.meaning;
          const isSelected = choice === selected;
          let bg      = 'rgba(255,255,255,0.04)';
          let bColor  = 'rgba(255,255,255,0.1)';
          let color   = 'rgba(255,255,255,0.8)';
          let opacity = 1;

          if (answered) {
            if (isCorrect)          { bg = '#0F6E5622'; bColor = '#1D9E75'; color = '#1D9E75'; }
            else if (isSelected)    { bg = '#E24B4A22'; bColor = '#E24B4A'; color = '#E24B4A'; }
            else                    { opacity = 0.25; }
          }

          return (
            <button key={choice} onClick={() => handleAnswer(choice)} disabled={answered}
              style={{
                padding: '14px 16px',
                borderWidth: '1px', borderStyle: 'solid', borderColor: bColor,
                borderRadius: '10px', background: bg, color,
                fontSize: '14px', cursor: answered ? 'default' : 'pointer',
                fontFamily: 'inherit', textAlign: 'left',
                transition: 'all 0.15s', opacity,
              }}>
              {answered && isCorrect  && '✓ '}
              {answered && isSelected && !isCorrect && '✗ '}
              {choice}
            </button>
          );
        })}
      </div>

    </InterrogationShell>
  );
}

function InterrogationShell({ children, bg, border }: {
  children: React.ReactNode;
  bg: string;
  border: string;
}) {
  const router = useRouter();
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '2rem 1rem 4rem',
      background: bg, transition: 'background 1s ease',
    }}>
      <div style={{
        width: '100%', maxWidth: '680px',
        display: 'flex', alignItems: 'center', marginBottom: '1.5rem',
      }}>
        <span style={{ fontSize: '18px', fontWeight: 600, color: '#E24B4A', letterSpacing: '-0.02em' }}>
          🔦 Interrogation
        </span>
      </div>
      <div style={{
        width: '100%', maxWidth: '680px',
        borderWidth: '1px', borderStyle: 'solid', borderColor: border,
        borderRadius: '20px', padding: '2.5rem',
        background: 'rgba(0,0,0,0.2)',
        transition: 'border-color 1s ease',
      }}>
        {children}
      </div>
      <style>{`
      `}</style>
    </main>
  );
}
