'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { Word, Progress, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import { isMastered } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function ScenePage() {
  return <AuthGuard><Scene /></AuthGuard>;
}

type Phase = 'loading-words' | 'generating' | 'reading' | 'results';

interface SceneData {
  scene:        string;   // full scene text in target language
  translation:  string;   // scene translated to native language
  hiddenWords:  string[]; // word IDs that appear in the scene
}

interface TappedWord {
  wordId:   string;
  kanji:    string;
  meaning:  string;
  found:    boolean;  // was it actually in the scene?
}

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

function Scene() {
  const router = useRouter();

  const [uid, setUid]                   = useState('');
  const [targetLang, setTargetLang]     = useState<TargetLang>('ja');
  const [nativeLang, setNativeLang]     = useState<NativeLang>('en');
  const [allWords, setAllWords]         = useState<Word[]>([]);
  const [progress, setProgress]         = useState<Record<string, Progress>>({});
  const [phase, setPhase]               = useState<Phase>('loading-words');
  const [sceneData, setSceneData]       = useState<SceneData | null>(null);
  const [tapped, setTapped]             = useState<Set<string>>(new Set());
  const [tappedList, setTappedList]     = useState<TappedWord[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);
  const [speaking, setSpeaking]         = useState(false);
  const [error, setError]               = useState('');

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
      setAllWords(words);
      setProgress(prog);
      // Auto-generate scene once words loaded
      await generateScene(words, profile.targetLang, profile.nativeLang);
    });
  }, []);

  async function generateScene(
    words:      Word[],
    tLang:      TargetLang,
    nLang:      NativeLang,
  ) {
    setPhase('generating');
    setError('');
    setTapped(new Set());
    setTappedList([]);
    setShowTranslation(false);
    setSceneData(null);

    try {
      // Pick 5-8 words to hide in the scene
      // Prefer mastered words + due words
      const mastered = words.filter(w => progress[w.id] && isMastered(progress[w.id]));
      const others   = words.filter(w => !isMastered(progress[w.id] ?? { correct: 0, wrong: 0, nextReview: 0, interval: 'new', lastReviewed: 0, wordId: '' }));
      const pool     = [...mastered, ...others].slice(0, 30);
      const selected = pool.sort(() => Math.random() - 0.5).slice(0, Math.min(7, pool.length));

      if (selected.length < 3) {
        setError('You need at least 3 words to generate a scene. Generate more vocabulary first.');
        setPhase('loading-words');
        return;
      }

      const res = await fetch('/api/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: selected.map(w => ({
            id:       w.id,
            kanji:    w.kanji,
            reading:  w.reading,
            meaning:  w.meaning,
            topic:    w.topic,
          })),
          targetLang: tLang,
          nativeLang: nLang,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate scene');
      const data = await res.json();

      setSceneData({
        scene:       data.scene,
        translation: data.translation,
        hiddenWords: selected.map(w => w.id),
      });
      setPhase('reading');
    } catch (err) {
      setError('Failed to generate scene. Please try again.');
      setPhase('loading-words');
    }
  }

  function handleTapWord(word: Word) {
    if (tapped.has(word.id)) return;
    const newTapped = new Set(tapped);
    newTapped.add(word.id);
    setTapped(newTapped);

    const found = sceneData?.hiddenWords.includes(word.id) ?? false;
    setTappedList(prev => [...prev, {
      wordId:  word.id,
      kanji:   word.kanji,
      meaning: word.meaning,
      found,
    }]);
  }

  function handleSpeak() {
    if (!sceneData) return;
    setSpeaking(true);
    speak(sceneData.scene, targetLang);
    setTimeout(() => setSpeaking(false), sceneData.scene.length * 80);
  }

  async function handleSubmit() {
    if (!sceneData) return;

    const foundCount   = tappedList.filter(t => t.found).length;
    const hiddenCount  = sceneData.hiddenWords.length;
    const score        = hiddenCount > 0 ? Math.round((foundCount / hiddenCount) * 100) : 0;

    // Rate words based on performance
    for (const word of allWords.filter(w => sceneData.hiddenWords.includes(w.id))) {
      const prev   = progress[word.id];
      const wasFound = tappedList.find(t => t.wordId === word.id)?.found;
      if (!prev) continue;

      let rating: 'wrong' | 'hard' | 'good' | 'easy';
      if (!tapped.has(word.id)) {
        rating = 'wrong';   // missed entirely
      } else if (wasFound) {
        rating = score >= 80 ? 'good' : 'hard';
      } else {
        rating = 'hard';
      }
      await rateWord(uid, word.id, rating, prev, targetLang, nativeLang);
    }

    setPhase('results');
  }

  // ── Generating ────────────────────────────────────────
  if (phase === 'generating' || phase === 'loading-words') {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '1.5rem' }}>🎬</div>
          <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
            {phase === 'generating' ? 'Generating your scene…' : 'Loading words…'}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
            AI is writing a scene using your vocabulary
          </p>
          <Spinner />
          {error && (
            <div style={{
              marginTop: '2rem', padding: '12px 16px',
              background: '#FCEBEB', border: '1px solid #E24B4A',
              borderRadius: '10px', fontSize: '13px', color: '#A32D2D',
            }}>
              {error}
              <br />
              <button
                className="btn"
                style={{ marginTop: '12px', fontSize: '13px' }}
                onClick={() => router.push('/dashboard')}
              >
                Go to dashboard
              </button>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  // ── Results ───────────────────────────────────────────
  if (phase === 'results' && sceneData) {
    const foundCount  = tappedList.filter(t => t.found).length;
    const hiddenCount = sceneData.hiddenWords.length;
    const score       = hiddenCount > 0 ? Math.round((foundCount / hiddenCount) * 100) : 0;
    const emoji       = score >= 80 ? '🎯' : score >= 50 ? '👀' : '😅';
    const message     = score >= 80 ? 'Sharp eyes!'
      : score >= 50 ? 'Getting there!'
      : 'Keep reading!';

    const hiddenWordObjects = allWords.filter(w => sceneData.hiddenWords.includes(w.id));

    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: '52px', marginBottom: '1rem' }}>{emoji}</div>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>{message}</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>
            {foundCount} of {hiddenCount} hidden words spotted · {score}%
          </p>

          {/* Score bar */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              height: '8px', background: 'var(--surface)',
              borderRadius: '4px', overflow: 'hidden',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                height: '100%',
                width: `${score}%`,
                borderRadius: '4px',
                background: score >= 80 ? 'var(--teal)' : score >= 50 ? '#EF9F27' : '#E24B4A',
                transition: 'width 0.6s ease',
              }} />
            </div>
          </div>

          {/* Word reveal */}
          <div style={{
            textAlign: 'left',
            border: '1px solid var(--border)',
            borderRadius: '12px', overflow: 'hidden',
            marginBottom: '2rem',
          }}>
            <div style={{
              padding: '10px 16px', background: 'var(--surface)',
              borderBottom: '1px solid var(--border)',
              fontSize: '11px', textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--muted)', fontWeight: 500,
            }}>
              Hidden words in this scene
            </div>
            {hiddenWordObjects.map((w, i) => {
              const wasFound  = tappedList.find(t => t.wordId === w.id)?.found;
              const wasTapped = tapped.has(w.id);

              let borderColor = 'var(--border)';
              let statusIcon  = '👻';
              let statusColor = 'var(--muted)';

              if (wasFound) {
                borderColor = '#1D9E75';
                statusIcon  = '✓';
                statusColor = '#0F6E56';
              } else if (wasTapped) {
                borderColor = '#E24B4A';
                statusIcon  = '✗';
                statusColor = '#A32D2D';
              }

              return (
                <div key={w.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px',
                  borderBottom: i < hiddenWordObjects.length - 1 ? '1px solid var(--border)' : 'none',
                  borderLeft: `3px solid ${borderColor}`,
                  background: 'transparent',
                }}>
                  <span style={{
                    fontSize: '22px',
                    fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
                    color: 'var(--fg)',
                  }}>
                    {w.kanji}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--fg)' }}>
                      {w.meaning}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {w.reading}
                    </p>
                  </div>
                  <span style={{
                    fontSize: '14px', fontWeight: 600,
                    color: statusColor,
                  }}>
                    {statusIcon}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Scene with highlights */}
          <div style={{
            textAlign: 'left',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '16px',
            marginBottom: '2rem',
          }}>
            <p style={{
              fontSize: '11px', textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--muted)',
              fontWeight: 500, marginBottom: '10px',
            }}>
              The scene
            </p>
            <p style={{
              fontSize: '14px', lineHeight: 2,
              fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
              color: 'var(--fg)',
            }}>
              <HighlightedScene
                scene={sceneData.scene}
                words={hiddenWordObjects}
              />
            </p>
            {sceneData.translation && (
              <p style={{
                fontSize: '13px', color: 'var(--muted)',
                fontStyle: 'italic', marginTop: '12px',
                paddingTop: '12px', borderTop: '1px solid var(--border)',
              }}>
                {sceneData.translation}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => generateScene(allWords, targetLang, nativeLang)}
            >
              New scene
            </button>
            <button className="btn" onClick={() => router.push('/dashboard')}>
              Dashboard
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  // ── Reading ───────────────────────────────────────────
  if (phase === 'reading' && sceneData) {
    const hiddenWordObjects = allWords.filter(w => sceneData.hiddenWords.includes(w.id));

    return (
      <Shell onBack={() => router.push('/dashboard')}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{
            fontSize: '11px', textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--muted)',
            fontWeight: 500, marginBottom: '6px',
          }}>
            Scene mode
          </p>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '6px' }}>
            Find your vocabulary
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6 }}>
            Read the scene. Tap words below that you think appear in it.
            {hiddenWordObjects.length} words are hidden inside.
          </p>
        </div>

        {/* Scene text */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '16px', padding: '1.5rem',
          marginBottom: '1.5rem', position: 'relative',
        }}>
          {/* 🔊 */}
          <button
            onClick={handleSpeak}
            title="Listen to scene"
            style={{
              position: 'absolute', top: '12px', right: '12px',
              width: '34px', height: '34px', borderRadius: '50%',
              border: '1px solid #444',
              background: speaking ? '#0F6E56' : '#2a2a2a',
              cursor: 'pointer', fontSize: '15px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            🔊
          </button>

          <p style={{
            fontSize: '15px', lineHeight: 2.0, color: 'var(--fg)',
            fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", "Noto Sans SC", serif',
            paddingRight: '40px',
          }}>
            {sceneData.scene}
          </p>

          {/* Translation toggle */}
          <button
            onClick={() => setShowTranslation(t => !t)}
            style={{
              marginTop: '12px', fontSize: '12px',
              color: 'var(--muted)', background: 'none',
              border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', padding: 0,
              textDecoration: 'underline',
            }}
          >
            {showTranslation ? 'Hide translation' : 'Show translation'}
          </button>

          {showTranslation && (
            <p style={{
              marginTop: '10px', fontSize: '13px', color: 'var(--muted)',
              fontStyle: 'italic', lineHeight: 1.7,
              paddingTop: '10px', borderTop: '1px solid var(--border)',
              animation: 'fadeIn 0.2s ease',
            }}>
              {sceneData.translation}
            </p>
          )}
        </div>

        {/* Tapped words so far */}
        {tappedList.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <p style={{
              fontSize: '11px', textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--muted)',
              fontWeight: 500, marginBottom: '8px',
            }}>
              Tapped · {tappedList.length}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {tappedList.map(t => (
                <span
                  key={t.wordId}
                  style={{
                    padding: '4px 10px', borderRadius: '99px',
                    fontSize: '13px', fontWeight: 500,
                    background: t.found ? '#E1F5EE' : '#FCEBEB',
                    color:      t.found ? '#0F6E56' : '#A32D2D',
                    borderWidth: '1px', borderStyle: 'solid',
                    borderColor: t.found ? '#1D9E75' : '#E24B4A',
                    fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
                  }}
                >
                  {t.kanji} {t.found ? '✓' : '✗'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Word grid to tap */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{
            fontSize: '11px', textTransform: 'uppercase',
            letterSpacing: '0.08em', color: 'var(--muted)',
            fontWeight: 500, marginBottom: '10px',
          }}>
            Your vocabulary — tap words you see in the scene
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {allWords.map(word => {
              const isTapped = tapped.has(word.id);
              return (
                <button
                  key={word.id}
                  onClick={() => handleTapWord(word)}
                  disabled={isTapped}
                  style={{
                    padding: '8px 14px',
                    borderWidth: '1px', borderStyle: 'solid',
                    borderColor: isTapped ? 'var(--muted)' : 'var(--border)',
                    borderRadius: '10px',
                    background: isTapped ? 'var(--surface)' : 'var(--bg)',
                    color: isTapped ? 'var(--muted)' : 'var(--fg)',
                    cursor: isTapped ? 'default' : 'pointer',
                    opacity: isTapped ? 0.5 : 1,
                    fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
                    fontSize: '16px',
                    transition: 'all 0.15s',
                  }}
                  title={word.meaning}
                >
                  {word.kanji}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={handleSubmit}
        >
          Reveal results →
        </button>

      </Shell>
    );
  }

  return null;
}

// ── Highlighted scene component ───────────────────────
function HighlightedScene({ scene, words }: { scene: string; words: Word[] }) {
  let result = scene;
  const highlights: { kanji: string; meaning: string }[] = [];

  words.forEach(w => {
    if (scene.includes(w.kanji)) {
      highlights.push({ kanji: w.kanji, meaning: w.meaning });
    }
  });

  if (!highlights.length) return <>{scene}</>;

  // Split scene by known words and wrap them
  const parts: { text: string; isWord: boolean; meaning?: string }[] = [];
  let remaining = scene;

  while (remaining.length > 0) {
    let foundAt = -1;
    let foundWord = '';
    let foundMeaning = '';

    for (const h of highlights) {
      const idx = remaining.indexOf(h.kanji);
      if (idx !== -1 && (foundAt === -1 || idx < foundAt)) {
        foundAt      = idx;
        foundWord    = h.kanji;
        foundMeaning = h.meaning;
      }
    }

    if (foundAt === -1) {
      parts.push({ text: remaining, isWord: false });
      break;
    }

    if (foundAt > 0) {
      parts.push({ text: remaining.slice(0, foundAt), isWord: false });
    }
    parts.push({ text: foundWord, isWord: true, meaning: foundMeaning });
    remaining = remaining.slice(foundAt + foundWord.length);
  }

  return (
    <>
      {parts.map((p, i) =>
        p.isWord ? (
          <span
            key={i}
            title={p.meaning}
            style={{
              background: '#E1F5EE',
              color: '#0F6E56',
              borderRadius: '4px',
              padding: '0 3px',
              cursor: 'help',
              borderBottom: '2px solid #1D9E75',
            }}
          >
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

// ── Shell ─────────────────────────────────────────────
function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '2rem 1rem 4rem', background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: '680px',
        display: 'flex', alignItems: 'center', marginBottom: '1.5rem',
      }}>
        <button className="btn" style={{ fontSize: '13px' }} onClick={onBack}>← Back</button>
        <span style={{ fontSize: '18px', fontWeight: 600, marginLeft: '1rem', letterSpacing: '-0.02em' }}>
          🎬 Scene
        </span>
      </div>
      <div style={{
        width: '100%', maxWidth: '680px', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem',
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
      width: '28px', height: '28px',
      border: '2px solid var(--border)', borderTopColor: 'var(--muted)',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto',
    }} />
  );
}
