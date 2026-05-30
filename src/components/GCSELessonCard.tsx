'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QuickCheck, QuickCheckQuestion } from '@/components/GCSEQuickCheck';
import { useStuck, StuckHint, StuckReveal, AttemptDots } from '@/components/StuckDetection';

// ── Card types ─────────────────────────────────────────
export type CardType = 'HOOK' | 'ANALOGY' | 'RULE' | 'EXAMPLE' | 'BLANK' | 'EXPLAIN' | 'RECALL';

export interface LessonCard {
  type:         CardType;
  question?:    string;
  guesses?:     string[];
  answer?:      string;
  hook?:        string | null;
  analogy?:     string;
  connection?:  string;
  visual?:      string;
  rule?:        string;
  formula?:     string | null;
  scenario?:    string;
  steps?:       string[];
  sentence?:    string;
  hint?:        string;
  prompt?:      string;
  modelAnswer?: string;
}

export interface Lesson {
  topic:       string;
  subject:     string;
  cards:       LessonCard[];
  quickCheck?: QuickCheckQuestion[];
}

interface Props {
  lesson:        Lesson;
  practiseRoute: string;
  accentColor:   string;
  onBack:        () => void;
  onComplete?:   (score: number, total: number) => void;
  quickCheck?:   QuickCheckQuestion[];
}

// Phase meta — now using the new light palette
const PHASE_META: Record<CardType, { phase: string; label: string; phaseColor: string; phaseBg: string }> = {
  HOOK:    { phase: '01', label: 'Think about it',   phaseColor: 'var(--orange)',  phaseBg: 'var(--orange-light)' },
  ANALOGY: { phase: '02', label: 'It is like…',      phaseColor: 'var(--blue)',    phaseBg: 'var(--blue-light)'   },
  RULE:    { phase: '03', label: 'The rule',          phaseColor: 'var(--purple)',  phaseBg: 'var(--purple-light)' },
  EXAMPLE: { phase: '04', label: 'See it in action', phaseColor: 'var(--green)',   phaseBg: 'var(--green-light)'  },
  BLANK:   { phase: '05', label: 'Fill the gap',      phaseColor: 'var(--pink)',    phaseBg: 'var(--purple-light)' },
  EXPLAIN: { phase: '06', label: 'Explain it',        phaseColor: 'var(--pink)',    phaseBg: 'var(--purple-light)' },
  RECALL:  { phase: '07', label: 'Can you remember?', phaseColor: 'var(--orange)',  phaseBg: 'var(--orange-light)' },
};

const MIN_EXPLAIN_WORDS = 15;

export function LessonCardSwiper({ lesson, practiseRoute, accentColor, onBack, onComplete, quickCheck }: Props) {
  const router = useRouter();

  const [idx, setIdx]                         = useState(0);
  const [sliding, setSliding]                 = useState(false);
  const [score, setScore]                     = useState(0);
  const [phase, setPhase]                     = useState<'lesson' | 'quickcheck'>('lesson');

  // HOOK
  const [hookGuessed, setHookGuessed]         = useState<string | null>(null);
  const [hookRevealed, setHookRevealed]       = useState(false);

  // BLANK
  const [blankInput, setBlankInput]           = useState('');
  const [blankChecked, setBlankChecked]       = useState(false);
  const [blankCorrect, setBlankCorrect]       = useState(false);
  const blankRetryTimer                       = useRef<NodeJS.Timeout | null>(null);
  const stuck                                 = useStuck({ hintAfter: 2, revealAfter: 3 });

  // EXPLAIN
  const [explainText, setExplainText]         = useState('');
  const [explainRevealed, setExplainRevealed] = useState(false);

  // RECALL
  const [recallText, setRecallText]           = useState('');
  const [recallRevealed, setRecallRevealed]   = useState(false);

  // Clean up BLANK retry timer when navigating
  useEffect(() => {
    return () => { if (blankRetryTimer.current) clearTimeout(blankRetryTimer.current); };
  }, []);

  const card   = lesson.cards[idx];
  const total  = lesson.cards.length;
  const isLast = idx === total - 1;
  const meta   = PHASE_META[card.type];
  const pct    = Math.round(((idx + 1) / total) * 100);

  function resetCardState() {
    if (blankRetryTimer.current) { clearTimeout(blankRetryTimer.current); blankRetryTimer.current = null; }
    setBlankInput(''); setBlankChecked(false); setBlankCorrect(false);
    setExplainText(''); setExplainRevealed(false);
    setHookGuessed(null); setHookRevealed(false);
    setRecallText(''); setRecallRevealed(false);
    stuck.reset();
  }

  function advance() {
    if (isLast || sliding) return;
    setSliding(true);
    resetCardState();
    setTimeout(() => { setIdx(i => i + 1); setSliding(false); }, 140);
  }

  function goBack() {
    if (idx === 0 || sliding) return;
    setSliding(true);
    resetCardState();
    setTimeout(() => { setIdx(i => i - 1); setSliding(false); }, 140);
  }

  function checkBlank() {
    if (!card.answer || !blankInput.trim()) return;
    const correct = blankInput.trim().toLowerCase() === card.answer.toLowerCase();
    setBlankCorrect(correct);
    setBlankChecked(true);
    if (correct) {
      setScore(s => s + 1);
      stuck.reset();
    } else {
      stuck.recordWrong();
      blankRetryTimer.current = setTimeout(() => {
        setBlankInput('');
        setBlankChecked(false);
      }, 1400);
    }
  }

  function canProceed(): boolean {
    switch (card.type) {
      case 'HOOK':    return hookGuessed !== null;
      case 'BLANK':   return blankChecked && blankCorrect || stuck.showAnswer;
      case 'EXPLAIN': return explainRevealed;
      case 'RECALL':  return recallRevealed;
      default:        return true;
    }
  }

  function handleHookGuess(g: string) {
    if (hookGuessed) return;
    setHookGuessed(g);
    // Award a point for engaging with the hook
    setScore(s => s + 1);
    setTimeout(() => setHookRevealed(true), 600);
  }

  function handleExplainReveal() {
    setExplainRevealed(true);
    // Award a point for completing explain
    setScore(s => s + 1);
  }

  function handleRecallReveal() {
    setRecallRevealed(true);
    // Award a point for completing recall
    setScore(s => s + 1);
  }

  const explainWords = explainText.trim().split(/\s+/).filter(Boolean).length;

  if (phase === 'quickcheck' && quickCheck?.length) {
    return (
      <QuickCheck
        questions={quickCheck}
        topic={lesson.topic}
        accentColor={accentColor}
        practiseRoute={practiseRoute}
        onReplay={(fromCard) => {
          setPhase('lesson');
          setIdx(fromCard);
          resetCardState();
        }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', gap: '12px', animation: sliding ? 'slideOut 0.14s ease' : 'slideIn 0.14s ease' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <button onClick={onBack} className="btn" style={{ fontSize: '12px', padding: '6px 12px' }}>← Back</button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 800, color: 'var(--fg)' }}>{lesson.topic}</p>
          <p style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>{idx + 1} / {total}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--green-light)', border: '2px solid var(--green)', borderRadius: '99px', padding: '4px 10px', boxShadow: '0 2px 0 var(--green-dark)' }}>
          <span style={{ fontSize: '12px' }}>⭐</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 800, color: 'var(--green-dark)' }}>{score}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track" style={{ height: '8px' }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)` }} />
      </div>

      {/* Phase badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '99px', background: meta.phaseBg, color: meta.phaseColor, border: `2px solid ${meta.phaseColor}55`, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {meta.phase} · {meta.label}
        </span>
      </div>

      {/* ── Card ── */}
      <div style={{ background: '#fff', border: `2.5px solid ${meta.phaseColor}55`, borderRadius: '20px', padding: '1.5rem', boxShadow: `0 6px 0 ${meta.phaseColor}55`, flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* HOOK */}
        {card.type === 'HOOK' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: 'var(--orange-light)', borderRadius: '14px', padding: '16px', border: '2px solid var(--orange)55' }}>
              <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--fg)', lineHeight: 1.5, fontFamily: 'var(--font-display)' }}>{card.question}</p>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted)' }}>What do you think?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {card.guesses?.map((g, i) => {
                const isSelected = hookGuessed === g;
                return (
                  <button key={i} onClick={() => handleHookGuess(g)} disabled={!!hookGuessed}
                    style={{ padding: '12px 14px', borderRadius: '12px', textAlign: 'left', cursor: hookGuessed ? 'default' : 'pointer', fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600, transition: 'all 0.1s', border: `2.5px solid ${isSelected ? meta.phaseColor : 'var(--border-dark)'}`, background: isSelected ? meta.phaseBg : 'var(--bg-secondary)', color: isSelected ? meta.phaseColor : 'var(--fg-secondary)', boxShadow: isSelected ? `0 3px 0 ${meta.phaseColor}55` : '0 3px 0 var(--border-dark)', animation: isSelected ? 'correctPop 0.3s ease' : 'none' }}>
                    {g}
                  </button>
                );
              })}
            </div>
            {hookRevealed && (
              <div style={{ padding: '12px 14px', background: 'var(--green-light)', borderRadius: '12px', border: '2px solid var(--green)', animation: 'bounceIn 0.35s ease' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>There's more to it!</p>
                <p style={{ fontSize: '13px', color: 'var(--fg)', lineHeight: 1.6, fontWeight: 600 }}>All of these could be partly right — but there's a deeper pattern. Keep going to find out! 🔎</p>
              </div>
            )}
          </div>
        )}

        {/* ANALOGY */}
        {card.type === 'ANALOGY' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--blue-light)', borderRadius: '14px', padding: '16px', border: '2px solid var(--blue)55' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg)', lineHeight: 1.6 }}>{card.analogy}</p>
            </div>
            {card.connection && (
              <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '2px solid var(--border-dark)' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '4px' }}>Why this matters</p>
                <p style={{ fontSize: '14px', color: 'var(--fg-secondary)', lineHeight: 1.6, fontWeight: 600 }}>{card.connection}</p>
              </div>
            )}
            {card.visual && (
              <pre style={{ fontFamily: 'var(--font-geist-mono, monospace)', fontSize: '13px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: '12px', border: '2px solid var(--border-dark)', color: 'var(--fg)', lineHeight: 1.8, whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                {card.visual}
              </pre>
            )}
          </div>
        )}

        {/* RULE */}
        {card.type === 'RULE' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'var(--purple-light)', borderRadius: '14px', padding: '18px', border: '2px solid var(--purple)55', textAlign: 'center' }}>
              <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--fg)', lineHeight: 1.5, fontFamily: 'var(--font-display)' }}>{card.rule}</p>
            </div>
            {card.formula && (
              <div style={{ padding: '14px', background: '#fff', borderRadius: '12px', border: `2.5px solid ${meta.phaseColor}`, textAlign: 'center', boxShadow: `0 4px 0 ${meta.phaseColor}55` }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Technical name</p>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, color: meta.phaseColor }}>{card.formula}</p>
              </div>
            )}
          </div>
        )}

        {/* EXAMPLE */}
        {card.type === 'EXAMPLE' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {card.scenario && (
              <div style={{ background: 'var(--green-light)', borderRadius: '14px', padding: '14px', border: '2px solid var(--green)55' }}>
                <p style={{ fontSize: '11px', fontWeight: 800, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Scenario</p>
                <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--fg)' }}>{card.scenario}</p>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {card.steps?.slice(0, 4).map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '2px solid var(--border-dark)', animation: `fadeIn 0.2s ease ${i * 0.08}s both` }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, background: meta.phaseBg, border: `2px solid ${meta.phaseColor}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: meta.phaseColor }}>{i + 1}</span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--fg)', lineHeight: 1.5, fontFamily: step.includes('=') ? 'var(--font-geist-mono, monospace)' : 'inherit', marginTop: '3px', fontWeight: 600 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BLANK */}
        {card.type === 'BLANK' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>Complete the sentence</p>
            <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: '14px', border: '2.5px solid var(--border-dark)' }}>
              <p style={{ fontSize: '17px', fontWeight: 600, color: 'var(--fg)', lineHeight: 1.7 }}>
                {card.sentence?.split('___').map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span style={{ display: 'inline-block', minWidth: '80px', borderBottom: `3px solid ${blankChecked ? (blankCorrect ? 'var(--green)' : 'var(--red)') : meta.phaseColor}`, color: blankChecked ? (blankCorrect ? 'var(--green-dark)' : 'var(--red-dark)') : meta.phaseColor, fontFamily: 'var(--font-geist-mono, monospace)', fontSize: '15px', textAlign: 'center', padding: '0 4px' }}>
                        {blankChecked ? blankInput : ''}
                      </span>
                    )}
                  </span>
                ))}
              </p>
            </div>

            {!blankChecked ? (
              <>
                {stuck.attempts > 0 && <AttemptDots attempts={stuck.attempts} max={3} accentColor={meta.phaseColor} />}
                {card.hint && stuck.attempts === 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', fontWeight: 600 }}>Hint: think about {card.hint}</p>
                )}
                <StuckHint hint={`The answer is related to: ${card.hint ?? 'the main rule from this lesson'}`} analogy={card.sentence?.replace('___', `[${card.answer}]`)} show={stuck.showHint} accentColor={meta.phaseColor} />
                <StuckReveal answer={card.answer ?? ''} explanation="Take a look and try to remember it for next time." show={stuck.showAnswer} accentColor={meta.phaseColor} />
                {!stuck.showAnswer && (
                  <>
                    <input autoFocus type="text" placeholder="Type your answer…" value={blankInput}
                      onChange={e => setBlankInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && blankInput.trim() && checkBlank()}
                    />
                    <button onClick={checkBlank} className="btn" style={{ background: meta.phaseColor, borderColor: meta.phaseColor, color: '#fff', boxShadow: `0 4px 0 ${meta.phaseColor}88`, opacity: blankInput.trim() ? 1 : 0.4 }} disabled={!blankInput.trim()}>
                      Check ✓
                    </button>
                  </>
                )}
              </>
            ) : (
              <div style={{ animation: 'bounceIn 0.3s ease' }}>
                {blankCorrect ? (
                  <div style={{ padding: '14px 16px', background: 'var(--green-light)', borderRadius: '12px', border: '2.5px solid var(--green)', textAlign: 'center', boxShadow: '0 4px 0 var(--green-dark)' }}>
                    <p style={{ fontSize: '22px', marginBottom: '4px' }}>🎉</p>
                    <p style={{ fontSize: '16px', fontWeight: 800, color: 'var(--green-dark)', fontFamily: 'var(--font-display)' }}>That's right!</p>
                  </div>
                ) : (
                  <div style={{ padding: '14px 16px', background: 'var(--orange-light)', borderRadius: '12px', border: '2.5px solid var(--orange)', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: '#a05600', fontWeight: 700 }}>Not quite — try again!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* EXPLAIN */}
        {card.type === 'EXPLAIN' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '14px', background: 'var(--purple-light)', borderRadius: '14px', border: '2px solid var(--purple)55' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg)', lineHeight: 1.5 }}>{card.prompt}</p>
            </div>
            {!explainRevealed ? (
              <>
                <textarea autoFocus placeholder="Write it in your own words — imagine you're explaining to a friend…" value={explainText} onChange={e => setExplainText(e.target.value)} rows={4} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>
                    {explainWords} / {MIN_EXPLAIN_WORDS} words min
                  </p>
                  <div style={{ width: `${Math.min(explainWords / MIN_EXPLAIN_WORDS * 100, 100)}%`, maxWidth: '120px', height: '4px', background: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border-dark)' }}>
                    <div style={{ height: '100%', background: explainWords >= MIN_EXPLAIN_WORDS ? 'var(--green)' : 'var(--orange)', borderRadius: '2px', width: '100%', transition: 'background 0.3s' }} />
                  </div>
                </div>
                {explainWords >= MIN_EXPLAIN_WORDS && (
                  <button onClick={handleExplainReveal} className="btn" style={{ background: meta.phaseColor, borderColor: meta.phaseColor, color: '#fff', boxShadow: `0 4px 0 ${meta.phaseColor}88`, animation: 'bounceIn 0.3s ease' }}>
                    See model answer ✓
                  </button>
                )}
              </>
            ) : (
              <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '2.5px solid var(--border-dark)', animation: 'fadeIn 0.2s ease' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: meta.phaseColor, marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Model Answer</p>
                <p style={{ fontSize: '14px', color: 'var(--fg)', lineHeight: 1.7, fontWeight: 600 }}>{card.modelAnswer}</p>
              </div>
            )}
          </div>
        )}

        {/* RECALL */}
        {card.type === 'RECALL' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>Same question as the start — can you answer it now?</p>
            <div style={{ padding: '16px', background: 'var(--orange-light)', borderRadius: '14px', border: '2px solid var(--orange)55' }}>
              <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--fg)', lineHeight: 1.4, fontFamily: 'var(--font-display)' }}>{card.question}</p>
            </div>
            {!recallRevealed ? (
              <>
                <textarea placeholder="Answer from memory…" value={recallText} onChange={e => setRecallText(e.target.value)} rows={3} />
                <button onClick={handleRecallReveal} className="btn" style={{ background: meta.phaseColor, borderColor: meta.phaseColor, color: '#fff', boxShadow: `0 4px 0 ${meta.phaseColor}88` }}>
                  Check answer ✓
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
                {recallText.trim() && (
                  <div style={{ padding: '12px 14px', background: 'var(--blue-light)', borderRadius: '12px', border: '2px solid var(--blue)55' }}>
                    <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--blue-dark)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Your answer</p>
                    <p style={{ fontSize: '13px', color: 'var(--fg)', lineHeight: 1.6, fontWeight: 600 }}>{recallText}</p>
                  </div>
                )}
                <div style={{ padding: '14px', background: 'var(--green-light)', borderRadius: '12px', border: '2.5px solid var(--green)', boxShadow: '0 4px 0 var(--green-dark)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Full answer</p>
                  <p style={{ fontSize: '14px', color: 'var(--fg)', lineHeight: 1.7, fontWeight: 600 }}>{card.answer}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={goBack} disabled={idx === 0} className="btn" style={{ padding: '12px 16px', opacity: idx === 0 ? 0.3 : 1 }}>←</button>
        {isLast ? (
          <button onClick={() => { onComplete?.(score, total); quickCheck?.length ? setPhase('quickcheck') : router.push(practiseRoute); }} disabled={!canProceed()} className="btn" style={{ flex: 1, justifyContent: 'center', background: canProceed() ? accentColor : undefined, borderColor: canProceed() ? accentColor : undefined, color: canProceed() ? '#fff' : undefined, boxShadow: canProceed() ? `0 5px 0 ${accentColor}88` : undefined }}>
            {quickCheck?.length ? 'Quick check →' : 'Practise now →'}
          </button>
        ) : (
          <button onClick={advance} disabled={!canProceed()} className="btn" style={{ flex: 1, justifyContent: 'center', background: canProceed() ? meta.phaseColor : undefined, borderColor: canProceed() ? meta.phaseColor : undefined, color: canProceed() ? '#fff' : undefined, boxShadow: canProceed() ? `0 5px 0 ${meta.phaseColor}88` : undefined }}>
            {canProceed() ? 'Next →' : card.type === 'HOOK' ? 'Pick one first!' : card.type === 'BLANK' ? 'Check your answer!' : card.type === 'EXPLAIN' ? `${MIN_EXPLAIN_WORDS - explainWords} more words…` : 'Next →'}
          </button>
        )}
      </div>

      <style>{`
        @keyframes fadeIn    { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounceIn  { 0%{opacity:0;transform:scale(0.8)} 60%{transform:scale(1.06)} 100%{opacity:1;transform:scale(1)} }
        @keyframes correctPop{ 0%{transform:scale(1)} 35%{transform:scale(1.06)} 100%{transform:scale(1)} }
        @keyframes slideIn   { from{opacity:0;transform:translateX(12px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideOut  { from{opacity:1;transform:translateX(0)} to{opacity:0;transform:translateX(-12px)} }
      `}</style>
    </div>
  );
}
