'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────
export type CardType = 'EXPLAIN' | 'EXAMPLE' | 'VISUAL' | 'MISTAKE' | 'MEMORY' | 'PRACTICE' | 'SUMMARY';

export interface LessonCard {
  type:        CardType;
  title:       string;
  content:     string | null;
  highlight?:  string | null;
  steps?:      string[];
  bullets?:    string[];
  wrong?:      string;
  right?:      string;
  annotation?: string;
  answer?:     string;
}

export interface Lesson {
  topic:   string;
  subject: string;
  cards:   LessonCard[];
}

interface Props {
  lesson:       Lesson;
  practiseRoute: string;
  accentColor:  string;
  onBack:       () => void;
}

// ── Card type meta ─────────────────────────────────────
const CARD_META: Record<CardType, { emoji: string; label: string; bg: string }> = {
  EXPLAIN:  { emoji: '💡', label: 'Explanation',  bg: 'rgba(55,138,221,0.12)'  },
  EXAMPLE:  { emoji: '📝', label: 'Example',      bg: 'rgba(0,232,122,0.1)'    },
  VISUAL:   { emoji: '🗺️', label: 'Visual',       bg: 'rgba(127,119,221,0.12)' },
  MISTAKE:  { emoji: '⚠️', label: 'Watch out',    bg: 'rgba(226,75,74,0.1)'    },
  MEMORY:   { emoji: '🧠', label: 'Memory trick', bg: 'rgba(239,159,39,0.1)'   },
  PRACTICE: { emoji: '✏️', label: 'Practice',     bg: 'rgba(212,83,126,0.1)'   },
  SUMMARY:  { emoji: '⭐', label: 'Summary',      bg: 'rgba(0,232,122,0.1)'    },
};

// ── Main component ─────────────────────────────────────
export function LessonCardSwiper({ lesson, practiseRoute, accentColor, onBack }: Props) {
  const router        = useRouter();
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [slideDir, setSlideDir]     = useState<'left' | 'right' | null>(null);

  const card      = lesson.cards[idx];
  const total     = lesson.cards.length;
  const pct       = Math.round(((idx + 1) / total) * 100);
  const isLast    = idx === total - 1;
  const meta      = CARD_META[card.type];

  function goNext() {
    if (isLast) return;
    setSlideDir('left');
    setShowAnswer(false);
    setTimeout(() => { setIdx(i => i + 1); setSlideDir(null); }, 180);
  }

  function goPrev() {
    if (idx === 0) return;
    setSlideDir('right');
    setShowAnswer(false);
    setTimeout(() => { setIdx(i => i - 1); setSlideDir(null); }, 180);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <button onClick={onBack} style={GHOST_BTN}>← Back</button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>
            {lesson.topic}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)' }}>
            {idx + 1} / {total}
          </p>
        </div>
        <div style={{ width: '60px' }} />
      </div>

      {/* Progress bar */}
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', marginBottom: '1.25rem', overflow: 'hidden' }}>
        <div style={{
          height: '3px', borderRadius: '2px',
          width: `${pct}%`, background: accentColor,
          transition: 'width 0.3s ease',
          boxShadow: `0 0 6px ${accentColor}80`,
        }} />
      </div>

      {/* Card */}
      <div style={{
        flex: 1, background: meta.bg,
        borderRadius: '20px', padding: '1.75rem 1.5rem',
        border: `1px solid ${accentColor}25`,
        animation: slideDir === 'left' ? 'slideLeft 0.18s ease' : slideDir === 'right' ? 'slideRight 0.18s ease' : 'fadeIn 0.2s ease',
        display: 'flex', flexDirection: 'column',
        minHeight: '340px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Card type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
          <span style={{ fontSize: '18px' }}>{meta.emoji}</span>
          <span style={{
            fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em',
            color: accentColor, textTransform: 'uppercase',
          }}>
            {meta.label}
          </span>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '1rem', lineHeight: 1.3 }}>
          {card.title}
        </h2>

        {/* ── Card body by type ── */}

        {/* EXPLAIN */}
        {card.type === 'EXPLAIN' && (
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.75, marginBottom: card.highlight ? '1rem' : '0' }}>
              {card.content}
            </p>
            {card.highlight && (
              <div style={{ marginTop: 'auto', padding: '10px 14px', background: `${accentColor}18`, borderRadius: '10px', border: `1px solid ${accentColor}30` }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: accentColor }}>💡 {card.highlight}</p>
              </div>
            )}
          </div>
        )}

        {/* EXAMPLE */}
        {card.type === 'EXAMPLE' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {card.content && (
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.65 }}>{card.content}</p>
            )}
            {card.steps && card.steps.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {card.steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: accentColor, minWidth: '20px', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      {i + 1}.
                    </span>
                    <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, fontFamily: step.includes('=') ? 'var(--font-mono)' : 'var(--font-ui)' }}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {card.annotation && (
              <div style={{ marginTop: 'auto', padding: '10px 14px', background: `${accentColor}15`, borderRadius: '10px', border: `1px solid ${accentColor}25` }}>
                <p style={{ fontSize: '13px', color: accentColor, lineHeight: 1.5 }}>📌 {card.annotation}</p>
              </div>
            )}
            {card.highlight && !card.annotation && (
              <div style={{ marginTop: 'auto', padding: '10px 14px', background: `${accentColor}15`, borderRadius: '10px', border: `1px solid ${accentColor}25` }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: accentColor }}>💡 {card.highlight}</p>
              </div>
            )}
          </div>
        )}

        {/* VISUAL */}
        {card.type === 'VISUAL' && (
          <div style={{ flex: 1 }}>
            <pre style={{
              fontSize: '13px', color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.7, whiteSpace: 'pre-wrap',
              fontFamily: 'var(--font-mono)',
              background: 'rgba(0,0,0,0.25)', borderRadius: '10px',
              padding: '14px', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {card.content}
            </pre>
          </div>
        )}

        {/* MISTAKE */}
        {card.type === 'MISTAKE' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {card.content && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: '4px' }}>
                {card.content}
              </p>
            )}
            <div style={{ padding: '12px 14px', background: 'rgba(226,75,74,0.12)', borderRadius: '10px', border: '1px solid rgba(226,75,74,0.25)' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#ff8080', marginBottom: '5px', letterSpacing: '0.06em' }}>✗ WRONG</p>
              <p style={{ fontSize: '14px', color: 'rgba(255,200,200,0.85)', lineHeight: 1.55, fontFamily: card.wrong?.includes('=') ? 'var(--font-mono)' : 'inherit' }}>
                {card.wrong}
              </p>
            </div>
            <div style={{ padding: '12px 14px', background: 'rgba(0,232,122,0.1)', borderRadius: '10px', border: '1px solid rgba(0,232,122,0.25)' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#00e87a', marginBottom: '5px', letterSpacing: '0.06em' }}>✓ CORRECT</p>
              <p style={{ fontSize: '14px', color: 'rgba(200,255,230,0.85)', lineHeight: 1.55, fontFamily: card.right?.includes('=') ? 'var(--font-mono)' : 'inherit' }}>
                {card.right}
              </p>
            </div>
          </div>
        )}

        {/* MEMORY */}
        {card.type === 'MEMORY' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: '16px', color: '#fff', lineHeight: 1.75, textAlign: 'center', fontWeight: 500 }}>
                {card.content}
              </p>
            </div>
            {card.highlight && (
              <div style={{ padding: '12px 14px', background: `${accentColor}18`, borderRadius: '10px', border: `1px solid ${accentColor}30`, textAlign: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: accentColor, fontFamily: 'var(--font-mono)' }}>
                  {card.highlight}
                </p>
              </div>
            )}
          </div>
        )}

        {/* PRACTICE */}
        {card.type === 'PRACTICE' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.65 }}>
                {card.content}
              </p>
            </div>

            {!showAnswer ? (
              <button
                onClick={() => setShowAnswer(true)}
                style={{ ...GHOST_BTN, width: '100%', padding: '11px', fontSize: '14px', textAlign: 'center' }}
              >
                Show model answer
              </button>
            ) : (
              <div style={{ animation: 'fadeIn 0.2s ease', padding: '14px', background: 'rgba(0,232,122,0.08)', borderRadius: '12px', border: '1px solid rgba(0,232,122,0.2)' }}>
                <p style={{ fontSize: '11px', letterSpacing: '0.08em', color: '#00e87a', marginBottom: '6px', fontWeight: 600 }}>
                  MODEL ANSWER
                </p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {card.answer}
                </p>
              </div>
            )}
          </div>
        )}

        {/* SUMMARY */}
        {card.type === 'SUMMARY' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {card.bullets?.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color: accentColor, fontSize: '14px', marginTop: '1px', flexShrink: 0 }}>✦</span>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>{b}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
        <button
          onClick={goPrev}
          disabled={idx === 0}
          style={{
            ...GHOST_BTN, flex: 1,
            opacity: idx === 0 ? 0.3 : 1,
            cursor: idx === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          ← Prev
        </button>

        {isLast ? (
          <button
            onClick={() => router.push(practiseRoute)}
            style={{
              flex: 2, padding: '12px', borderRadius: '10px',
              background: accentColor, border: 'none',
              color: '#03080a', fontSize: '14px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
              boxShadow: `0 0 16px ${accentColor}50`,
            }}
          >
            Now practise →
          </button>
        ) : (
          <button
            onClick={goNext}
            style={{
              flex: 2, padding: '12px', borderRadius: '10px',
              background: accentColor, border: 'none',
              color: '#03080a', fontSize: '14px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
            }}
          >
            Next →
          </button>
        )}
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '12px' }}>
        {lesson.cards.map((_, i) => (
          <button
            key={i}
            onClick={() => { setShowAnswer(false); setIdx(i); }}
            style={{
              width: i === idx ? '20px' : '6px', height: '6px',
              borderRadius: '3px', border: 'none', cursor: 'pointer',
              background: i === idx ? accentColor : 'rgba(255,255,255,0.15)',
              transition: 'all 0.2s ease',
              padding: 0,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes fadeIn    { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideLeft { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-20px)} }
        @keyframes slideRight{ from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(20px)} }
        @keyframes spin      { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

const GHOST_BTN: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px', padding: '9px 14px',
  color: 'rgba(255,255,255,0.65)', fontSize: '13px',
  cursor: 'pointer', fontFamily: 'var(--font-ui)',
};
