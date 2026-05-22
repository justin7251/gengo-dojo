'use client';

import { useState, useEffect, useRef } from 'react';

// ── Stuck detection hook ───────────────────────────────
// Tracks wrong attempts on a single card/question
// Returns: hint visibility, answer visibility, attempt count

interface UseStuckOptions {
  hintAfter:   number;   // show hint after N wrong attempts (default 2)
  revealAfter: number;   // reveal answer after N wrong attempts (default 3)
  onReveal?:   () => void;
}

interface StuckState {
  attempts:      number;
  showHint:      boolean;
  showAnswer:    boolean;
  recordWrong:   () => void;
  reset:         () => void;
}

export function useStuck({
  hintAfter   = 2,
  revealAfter = 3,
  onReveal,
}: Partial<UseStuckOptions> = {}): StuckState {
  const [attempts, setAttempts]   = useState(0);
  const [showHint, setShowHint]   = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  function recordWrong() {
    const next = attempts + 1;
    setAttempts(next);
    if (next >= revealAfter) {
      setShowAnswer(true);
      setShowHint(false);
      onReveal?.();
    } else if (next >= hintAfter) {
      setShowHint(true);
    }
  }

  function reset() {
    setAttempts(0);
    setShowHint(false);
    setShowAnswer(false);
  }

  return { attempts, showHint, showAnswer, recordWrong, reset };
}

// ── Stuck hint UI component ────────────────────────────
// Drop this below any question that can get stuck
interface HintProps {
  hint:        string;         // short hint (1 sentence)
  analogy?:    string;         // repeat the analogy card content
  show:        boolean;
  accentColor: string;
}

export function StuckHint({ hint, analogy, show, accentColor }: HintProps) {
  if (!show) return null;
  return (
    <div style={{
      padding: '12px 14px',
      background: `${accentColor}12`,
      borderRadius: '12px',
      border: `1px solid ${accentColor}30`,
      animation: 'fadeInUp 0.25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>&#128161;</span>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 600, color: accentColor, marginBottom: '3px' }}>
            Hint
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
            {hint}
          </p>
          {analogy && (
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginTop: '6px', fontStyle: 'italic' }}>
              Remember: {analogy}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Answer reveal UI component ─────────────────────────
interface RevealProps {
  answer:      string;
  explanation?: string;
  show:        boolean;
  accentColor: string;
}

export function StuckReveal({ answer, explanation, show, accentColor }: RevealProps) {
  if (!show) return null;
  return (
    <div style={{
      padding: '14px 16px',
      background: 'rgba(226,75,74,0.08)',
      borderRadius: '12px',
      border: '1px solid rgba(226,75,74,0.25)',
      animation: 'fadeInUp 0.25s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>&#128214;</span>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(226,75,74,0.8)', marginBottom: '6px', letterSpacing: '0.08em' }}>
            THE ANSWER
          </p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: explanation ? '8px' : '0', fontFamily: 'var(--font-mono)', lineHeight: 1.4 }}>
            {answer}
          </p>
          {explanation && (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.55 }}>
              {explanation}
            </p>
          )}
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>
            That is okay &#8212; it takes a few tries to stick!
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Attempt counter dots ───────────────────────────────
// Visual indicator of how many tries used
interface AttemptsProps {
  attempts:    number;
  max:         number;      // revealAfter value
  accentColor: string;
}

export function AttemptDots({ attempts, max, accentColor }: AttemptsProps) {
  if (attempts === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
        {max - attempts > 0 ? `${max - attempts} attempt${max - attempts !== 1 ? 's' : ''} left` : 'Answer revealed'}
      </span>
      <div style={{ display: 'flex', gap: '3px', marginLeft: '4px' }}>
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: i < attempts
              ? attempts >= max ? '#E24B4A' : accentColor
              : 'rgba(255,255,255,0.15)',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
    </div>
  );
}
