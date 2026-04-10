'use client';

import { useState, useEffect, useRef } from 'react';
import { Encounter } from '@/lib/encounter';
import { glitchText } from '@/lib/encounter';
import { Word } from '@/lib/types';

interface Props {
  encounter:  Encounter;
  allWords:   Word[];
  onWin:      () => void;
  onLose:     () => void;
}

export default function EncounterOverlay({ encounter, allWords, onWin, onLose }: Props) {
  const [timeLeft, setTimeLeft]   = useState(encounter.timeLimit);
  const [selected, setSelected]   = useState('');
  const [answered, setAnswered]   = useState(false);
  const [glitched, setGlitched]   = useState(encounter.type === 'glitch');
  const [typed, setTyped]         = useState('');
  const timerRef                  = useRef<NodeJS.Timeout | null>(null);
  const glitchRef                 = useRef<NodeJS.Timeout | null>(null);

  // Glitch flicker effect
  useEffect(() => {
    if (encounter.type !== 'glitch') return;
    glitchRef.current = setInterval(() => {
      setGlitched(g => !g);
    }, 200);
    return () => { if (glitchRef.current) clearInterval(glitchRef.current); };
  }, [encounter.type]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!answered) {
            setAnswered(true);
            setTimeout(() => onLose(), 1000);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (glitchRef.current) clearInterval(glitchRef.current);
  }

  // Boss / Glitch — multiple choice
  function handleChoice(choice: string) {
    if (answered) return;
    stopTimer();
    setSelected(choice);
    setAnswered(true);
    setGlitched(false);
    const correct = choice === encounter.word.meaning;
    setTimeout(() => correct ? onWin() : onLose(), 1200);
  }

  // Intercept — type answer
  function handleIntercept() {
    if (answered) return;
    stopTimer();
    setAnswered(true);
    const userAnswer = typed.toLowerCase().trim();
    const expected   = encounter.word.meaning.toLowerCase().trim();
    const correct    = userAnswer === expected ||
      expected.includes(userAnswer) ||
      userAnswer.includes(expected);
    setTimeout(() => correct ? onWin() : onLose(), 800);
  }

  // Build choices for boss/glitch
  const choices = allWords.length >= 4
    ? [
        ...allWords
          .filter(w => w.id !== encounter.word.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map(w => w.meaning),
        encounter.word.meaning,
      ].sort(() => Math.random() - 0.5)
    : [encounter.word.meaning];

  const timerPct   = (timeLeft / encounter.timeLimit) * 100;
  const timerColor = timeLeft > 7 ? '#E24B4A' : timeLeft > 3 ? '#EF9F27' : '#ffffff';

  const encounterConfig = {
    boss: {
      title:    '⚔️ BOSS WORD',
      subtitle: 'A rare word has interrupted your mission. Defeat it.',
      bg:       '#1a0a0a',
      accent:   '#E24B4A',
    },
    glitch: {
      title:    '⚡ SYSTEM GLITCH',
      subtitle: 'Signal corrupted. Decode the transmission or lose progress.',
      bg:       '#0a0a1a',
      accent:   '#534AB7',
    },
    intercept: {
      title:    '📡 CLASSIFIED INTERCEPT',
      subtitle: 'Translate the intercepted message. Type your answer.',
      bg:       '#0a1a0a',
      accent:   '#1D9E75',
    },
  }[encounter.type];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: encounterConfig.bg,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
      animation: 'encounterIn 0.3s ease',
    }}>

      {/* Timer bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: '4px', background: 'rgba(255,255,255,0.1)',
      }}>
        <div style={{
          height: '4px',
          width: `${timerPct}%`,
          background: timerColor,
          transition: 'width 1s linear, background 0.3s',
          boxShadow: `0 0 8px ${timerColor}`,
        }} />
      </div>

      {/* Timer number */}
      <div style={{
        position: 'absolute', top: '16px', right: '20px',
        fontSize: '28px', fontWeight: 700,
        color: timerColor,
        fontVariantNumeric: 'tabular-nums',
        textShadow: `0 0 12px ${timerColor}`,
        transition: 'color 0.3s',
      }}>
        {timeLeft}
      </div>

      <div style={{ width: '100%', maxWidth: '480px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{
            fontSize: '13px', letterSpacing: '0.15em',
            color: encounterConfig.accent,
            marginBottom: '6px', fontWeight: 600,
          }}>
            {encounterConfig.title}
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
            {encounterConfig.subtitle}
          </p>
        </div>

        {/* Boss / Glitch */}
        {(encounter.type === 'boss' || encounter.type === 'glitch') && (
          <>
            <div style={{
              textAlign: 'center', marginBottom: '2rem',
              padding: '2rem',
              borderWidth: '1px', borderStyle: 'solid',
              borderColor: `${encounterConfig.accent}44`,
              borderRadius: '16px',
              background: `${encounterConfig.accent}11`,
            }}>
              <div style={{
                fontSize: '72px', lineHeight: 1,
                fontFamily: '"Noto Sans JP", "Noto Sans SC", serif',
                color: glitched ? encounterConfig.accent : '#ffffff',
                textShadow: glitched
                  ? `0 0 20px ${encounterConfig.accent}`
                  : 'none',
                transition: 'color 0.1s',
                marginBottom: '8px',
                filter: glitched ? 'blur(1px)' : 'none',
              }}>
                {glitched && encounter.message
                  ? encounter.message
                  : encounter.word.kanji}
              </div>
              {!glitched && (
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                  {encounter.word.reading}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {choices.map(choice => {
                const isCorrect  = choice === encounter.word.meaning;
                const isSelected = choice === selected;
                let bg    = 'rgba(255,255,255,0.05)';
                let color = 'rgba(255,255,255,0.8)';
                let border = 'rgba(255,255,255,0.15)';

                if (answered) {
                  if (isCorrect)               { bg = '#0F6E5622'; color = '#1D9E75'; border = '#1D9E75'; }
                  else if (isSelected)         { bg = '#E24B4A22'; color = '#E24B4A'; border = '#E24B4A'; }
                  else                         { bg = 'transparent'; color = 'rgba(255,255,255,0.2)'; }
                }

                return (
                  <button key={choice} onClick={() => handleChoice(choice)} disabled={answered}
                    style={{
                      padding: '14px 16px', borderRadius: '10px',
                      borderWidth: '1px', borderStyle: 'solid', borderColor: border,
                      background: bg, color,
                      fontSize: '14px', cursor: answered ? 'default' : 'pointer',
                      fontFamily: 'inherit', textAlign: 'left',
                      transition: 'all 0.15s',
                    }}>
                    {answered && isCorrect  && '✓ '}
                    {answered && isSelected && !isCorrect && '✗ '}
                    {choice}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Intercept — type answer */}
        {encounter.type === 'intercept' && (
          <>
            <div style={{
              marginBottom: '1.5rem', padding: '1.5rem',
              borderWidth: '1px', borderStyle: 'solid',
              borderColor: `${encounterConfig.accent}44`,
              borderRadius: '16px',
              background: `${encounterConfig.accent}11`,
            }}>
              <p style={{
                fontSize: '16px', lineHeight: 1.8, color: '#ffffff',
                fontFamily: '"Noto Sans JP", "Noto Sans SC", serif',
              }}>
                {encounter.message}
              </p>
            </div>

            <input
              autoFocus
              type="text"
              placeholder={`Translate to English…`}
              value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleIntercept(); }}
              disabled={answered}
              style={{
                width: '100%', padding: '14px 16px',
                borderWidth: '1px', borderStyle: 'solid',
                borderColor: `${encounterConfig.accent}88`,
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)',
                color: '#ffffff', fontSize: '15px',
                fontFamily: 'inherit', marginBottom: '10px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleIntercept}
              disabled={answered || !typed.trim()}
              style={{
                width: '100%', padding: '14px',
                borderRadius: '10px', border: 'none',
                background: encounterConfig.accent,
                color: '#fff', fontSize: '15px',
                fontWeight: 600, cursor: answered ? 'default' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Transmit →
            </button>
          </>
        )}

      </div>

      <style>{`
        @keyframes encounterIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}