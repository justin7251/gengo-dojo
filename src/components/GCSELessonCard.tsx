'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuickCheck, QuickCheckQuestion } from '@/components/GCSEQuickCheck';
import { useStuck, StuckHint, StuckReveal, AttemptDots } from '@/components/StuckDetection';

// ── Card types ─────────────────────────────────────────
export type CardType = 'HOOK' | 'ANALOGY' | 'RULE' | 'EXAMPLE' | 'BLANK' | 'EXPLAIN' | 'RECALL';

export interface LessonCard {
  type: CardType;
  // HOOK + RECALL
  question?:    string;
  guesses?:     string[];
  answer?:      string;
  hook?:        string | null;
  // ANALOGY
  analogy?:     string;
  connection?:  string;
  visual?:      string;
  // RULE
  rule?:        string;
  formula?:     string | null;
  // EXAMPLE
  scenario?:    string;
  steps?:       string[];
  // BLANK
  sentence?:    string;
  hint?:        string;
  // EXPLAIN
  prompt?:      string;
  modelAnswer?: string;
}

export interface Lesson {
  topic:       string;
  subject:     string;
  cards:       LessonCard[];
  quickCheck?: import('@/components/GCSEQuickCheck').QuickCheckQuestion[];
}

interface Props {
  lesson:        Lesson;
  practiseRoute: string;
  accentColor:   string;
  onBack:        () => void;
  onComplete?:   (score: number, total: number) => void;
  quickCheck?:   QuickCheckQuestion[];
}

// Phase labels and colours
const PHASE_META: Record<CardType, { phase: string; label: string; phaseColor: string }> = {
  HOOK:    { phase: '01', label: 'Think about it',  phaseColor: '#EF9F27' },
  ANALOGY: { phase: '02', label: 'It is like...',   phaseColor: '#378ADD' },
  RULE:    { phase: '03', label: 'Here is the rule',phaseColor: '#7F77DD' },
  EXAMPLE: { phase: '04', label: 'See it in action',phaseColor: '#00e87a' },
  BLANK:   { phase: '05', label: 'Fill the gap',    phaseColor: '#D4537E' },
  EXPLAIN: { phase: '06', label: 'Explain it',      phaseColor: '#D4537E' },
  RECALL:  { phase: '07', label: 'Can you remember?',phaseColor: '#EF9F27' },
};

export function LessonCardSwiper({ lesson, practiseRoute, accentColor, onBack, onComplete, quickCheck }: Props) {
  const router = useRouter();

  const [idx, setIdx]                 = useState(0);
  const [sliding, setSliding]         = useState(false);
  const [score, setScore]             = useState(0);
  const [phase, setPhase]             = useState<'lesson' | 'quickcheck'>('lesson');

  // HOOK state
  const [hookGuessed, setHookGuessed] = useState<string | null>(null);
  const [hookRevealed, setHookRevealed] = useState(false);

  // BLANK state
  const [blankInput, setBlankInput]       = useState('');
  const [blankChecked, setBlankChecked]   = useState(false);
  const [blankCorrect, setBlankCorrect]   = useState(false);
  const stuck = useStuck({ hintAfter: 2, revealAfter: 3 });

  // EXPLAIN state
  const [explainText, setExplainText]     = useState('');
  const [explainRevealed, setExplainRevealed] = useState(false);

  // RECALL state
  const [recallText, setRecallText]       = useState('');
  const [recallRevealed, setRecallRevealed] = useState(false);

  const card   = lesson.cards[idx];
  const total  = lesson.cards.length;
  const isLast = idx === total - 1;
  const meta   = PHASE_META[card.type];

  function advance() {
    if (isLast || sliding) return;
    setSliding(true);
    setBlankInput(''); setBlankChecked(false); setBlankCorrect(false);
    setExplainText(''); setExplainRevealed(false);
    setHookGuessed(null); setHookRevealed(false);
    setTimeout(() => { setIdx(i => i + 1); setSliding(false); }, 160);
  }

  function goBack() {
    if (idx === 0 || sliding) return;
    setSliding(true);
    setTimeout(() => { setIdx(i => i - 1); setSliding(false); }, 160);
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
      // Allow retry — don't lock them out
      setTimeout(() => {
        setBlankChecked(false);
        setBlankInput('');
      }, 1800);
    }
  }

  // Can the student proceed to next card?
  function canProceed(): boolean {
    if (card.type === 'HOOK')    return hookGuessed !== null;
    if (card.type === 'BLANK')   return blankChecked;
    if (card.type === 'EXPLAIN') return explainText.trim().length > 10;
    if (card.type === 'RECALL')  return recallRevealed;
    return true;
  }

  // ── Quick check phase ────────────────────────────────
  if (phase === 'quickcheck' && quickCheck?.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button onClick={() => setPhase('lesson')} style={GHOST_BTN}>Back to lesson</button>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{lesson.topic}</p>
          <div style={{ width: '60px' }} />
        </div>
        <QuickCheck
          questions={quickCheck}
          topic={lesson.topic}
          accentColor={accentColor}
          practiseRoute={practiseRoute}
          onReplay={(fromCard) => { setIdx(fromCard); setPhase('lesson'); setBlankInput(''); setBlankChecked(false); setBlankCorrect(false); setExplainText(''); setExplainRevealed(false); setHookGuessed(null); setHookRevealed(false); setRecallText(''); setRecallRevealed(false); }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <button onClick={onBack} style={GHOST_BTN}>Back</button>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          {lesson.topic}
        </p>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>
          {idx + 1}/{total}
        </span>
      </div>

      {/* Phase progress */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.25rem' }}>
        {lesson.cards.map((c, i) => {
          const m = PHASE_META[c.type];
          return (
            <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: i <= idx ? m.phaseColor : 'rgba(255,255,255,0.1)', transition: 'background 0.3s' }} />
          );
        })}
      </div>

      {/* Card */}
      <div style={{
        flex: 1, borderRadius: '22px', padding: '1.5rem',
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${meta.phaseColor}25`,
        display: 'flex', flexDirection: 'column',
        opacity: sliding ? 0 : 1,
        transform: sliding ? 'translateY(10px)' : 'translateY(0)',
        transition: 'opacity 0.16s ease, transform 0.16s ease',
        minHeight: '320px',
      }}>

        {/* Phase badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', color: meta.phaseColor, padding: '4px 10px', background: meta.phaseColor + '18', borderRadius: '99px', border: `1px solid ${meta.phaseColor}30` }}>
            {meta.label.toUpperCase()}
          </span>
        </div>

        {/* ── HOOK ── */}
        {card.type === 'HOOK' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <p style={{ fontSize: '20px', fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: '1.5rem' }}>
              {card.question}
            </p>
            {!hookGuessed ? (
              <>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px', letterSpacing: '0.06em' }}>
                  WHAT DO YOU THINK?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {card.guesses?.map((g, i) => (
                    <button key={i} onClick={() => setHookGuessed(g)} style={{
                      padding: '12px 16px', borderRadius: '12px', cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.85)', fontSize: '14px',
                      fontFamily: 'var(--font-ui)', textAlign: 'left',
                      transition: 'all 0.15s',
                    }}>
                      {g}
                    </button>
                  ))}
                </div>
              </>
            ) : !hookRevealed ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,159,39,0.1)', border: '1px solid rgba(239,159,39,0.25)' }}>
                  <p style={{ fontSize: '12px', color: '#EF9F27', marginBottom: '4px', fontWeight: 600 }}>YOUR GUESS</p>
                  <p style={{ fontSize: '14px', color: '#fff' }}>{hookGuessed}</p>
                </div>
                <button onClick={() => setHookRevealed(true)} style={{ ...WHITE_BTN(accentColor), marginTop: 'auto' }}>
                  See why &#8594;
                </button>
              </div>
            ) : (
              <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(239,159,39,0.1)', border: '1px solid rgba(239,159,39,0.3)', animation: 'fadeIn 0.2s ease' }}>
                <p style={{ fontSize: '12px', color: '#EF9F27', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.06em' }}>INTERESTING — keep reading to find out</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                  This is what the next cards will explain.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── ANALOGY ── */}
        {card.type === 'ANALOGY' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '18px', background: 'rgba(55,138,221,0.1)', borderRadius: '14px', border: '1px solid rgba(55,138,221,0.25)', flex: 1, display: 'flex', alignItems: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#fff', lineHeight: 1.5 }}>
                {card.analogy}
              </p>
            </div>
            {card.visual && (
              <div style={{ padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)' }}>
                <pre style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono)', margin: 0, whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                  {card.visual}
                </pre>
              </div>
            )}
            {card.connection && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                {card.connection}
              </p>
            )}
          </div>
        )}

        {/* ── RULE ── */}
        {card.type === 'RULE' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
            <div style={{ padding: '24px 20px', background: meta.phaseColor + '12', borderRadius: '18px', border: `2px solid ${meta.phaseColor}35`, textAlign: 'center' }}>
              <p style={{ fontSize: '19px', fontWeight: 800, color: '#fff', lineHeight: 1.5, letterSpacing: '-0.01em' }}>
                {card.rule}
              </p>
            </div>
            {card.formula && (
              <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                <p style={{ fontSize: '22px', fontWeight: 800, color: meta.phaseColor, fontFamily: 'var(--font-mono)' }}>
                  {card.formula}
                </p>
              </div>
            )}
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', letterSpacing: '0.08em' }}>
              MEMORISE THIS
            </p>
          </div>
        )}

        {/* ── EXAMPLE ── */}
        {card.type === 'EXAMPLE' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {card.scenario && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '4px', fontStyle: 'italic' }}>
                {card.scenario}
              </p>
            )}
            {card.steps?.slice(0, 3).map((step, i) => (
              <div key={i} style={{
                display: 'flex', gap: '12px', alignItems: 'flex-start',
                padding: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px',
                border: `1px solid ${meta.phaseColor}20`,
                animation: `fadeIn 0.2s ease ${i * 0.1}s both`,
              }}>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                  background: meta.phaseColor + '25', border: `1px solid ${meta.phaseColor}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: meta.phaseColor }}>{i + 1}</span>
                </div>
                <p style={{ fontSize: '14px', color: '#fff', lineHeight: 1.45, fontFamily: step.includes('=') ? 'var(--font-mono)' : 'inherit', marginTop: '2px' }}>
                  {step}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── BLANK ── */}
        {card.type === 'BLANK' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>COMPLETE THE SENTENCE</p>
            <div style={{ padding: '18px', background: 'rgba(0,0,0,0.3)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ fontSize: '17px', fontWeight: 600, color: '#fff', lineHeight: 1.6 }}>
                {card.sentence?.split('___').map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span style={{
                        display: 'inline-block', minWidth: '80px', borderBottom: `2px solid ${meta.phaseColor}`,
                        color: blankChecked ? (blankCorrect ? '#00e87a' : '#ff6060') : meta.phaseColor,
                        fontFamily: 'var(--font-mono)', fontSize: '15px', textAlign: 'center', padding: '0 4px',
                      }}>
                        {blankChecked ? blankInput : ''}
                      </span>
                    )}
                  </span>
                ))}
              </p>
            </div>

            {!blankChecked ? (
              <>
                {/* Attempt dots */}
                {stuck.attempts > 0 && (
                  <AttemptDots attempts={stuck.attempts} max={3} accentColor={meta.phaseColor} />
                )}

                {/* Regular hint */}
                {card.hint && stuck.attempts === 0 && (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                    Hint: think about {card.hint}
                  </p>
                )}

                {/* Stuck hint — shows after 2 wrong */}
                <StuckHint
                  hint={`The answer is related to: ${card.hint ?? 'the main rule from this lesson'}`}
                  analogy={card.sentence?.replace('___', `[${card.answer}]`)}
                  show={stuck.showHint}
                  accentColor={meta.phaseColor}
                />

                {/* Auto-reveal after 3 wrong */}
                <StuckReveal
                  answer={card.answer ?? ''}
                  explanation="Take a look and try to remember it for next time."
                  show={stuck.showAnswer}
                  accentColor={meta.phaseColor}
                />

                {!stuck.showAnswer && (
                  <>
                    <input
                      autoFocus
                      type="text"
                      placeholder="Type your answer..."
                      value={blankInput}
                      onChange={e => setBlankInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && blankInput.trim() && checkBlank()}
                      style={{
                        padding: '12px 14px', background: 'rgba(255,255,255,0.07)',
                        border: `1px solid ${meta.phaseColor}40`, borderRadius: '10px',
                        color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '16px', outline: 'none',
                        width: '100%',
                      }}
                    />
                    <button onClick={checkBlank} disabled={!blankInput.trim()} style={{
                      ...WHITE_BTN(meta.phaseColor),
                      opacity: blankInput.trim() ? 1 : 0.4,
                      cursor: blankInput.trim() ? 'pointer' : 'not-allowed',
                    }}>
                      Check
                    </button>
                  </>
                )}
              </>
            ) : (
              <div style={{ animation: 'fadeIn 0.2s ease', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {blankCorrect ? (
                  <div style={{ padding: '14px 16px', background: 'rgba(0,232,122,0.12)', borderRadius: '12px', border: '1px solid rgba(0,232,122,0.3)', textAlign: 'center' }}>
                    <p style={{ fontSize: '22px', marginBottom: '4px' }}>&#127881;</p>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: '#00e87a' }}>Yes! That is right!</p>
                  </div>
                ) : (
                  <div style={{ padding: '14px 16px', background: 'rgba(239,159,39,0.1)', borderRadius: '12px', border: '1px solid rgba(239,159,39,0.25)', textAlign: 'center' }}>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Not quite. Try again!</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Trying again in a moment...</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── EXPLAIN ── */}
        {card.type === 'EXPLAIN' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#fff', lineHeight: 1.5 }}>{card.prompt}</p>
            </div>
            {!explainRevealed ? (
              <>
                <textarea
                  autoFocus
                  placeholder="Write it in your own words — imagine you are explaining to a friend..."
                  value={explainText}
                  onChange={e => setExplainText(e.target.value)}
                  rows={4}
                  style={{
                    padding: '12px', background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${meta.phaseColor}30`, borderRadius: '10px',
                    color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '14px',
                    outline: 'none', resize: 'none', lineHeight: 1.6, flex: 1,
                  }}
                />
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>
                  {explainText.trim().split(/\s+/).filter(Boolean).length} words — just a few sentences is fine!
                </p>
                {explainText.trim().length > 10 && (
                  <button onClick={() => setExplainRevealed(true)} style={WHITE_BTN(meta.phaseColor)}>
                    See model answer
                  </button>
                )}
              </>
            ) : (
              <div style={{ padding: '14px', background: 'rgba(212,83,126,0.08)', borderRadius: '12px', border: '1px solid rgba(212,83,126,0.25)', animation: 'fadeIn 0.2s ease' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: meta.phaseColor, marginBottom: '8px', letterSpacing: '0.1em' }}>MODEL ANSWER</p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>{card.modelAnswer}</p>
              </div>
            )}
          </div>
        )}

        {/* ── RECALL ── */}
        {card.type === 'RECALL' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>
              SAME QUESTION AS THE START — CAN YOU ANSWER IT NOW?
            </p>
            <div style={{ padding: '18px', background: 'rgba(239,159,39,0.08)', borderRadius: '14px', border: '1px solid rgba(239,159,39,0.2)' }}>
              <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>
                {card.question}
              </p>
            </div>
            {!recallRevealed ? (
              <>
                <textarea
                  placeholder="Answer from memory..."
                  value={recallText}
                  onChange={e => setRecallText(e.target.value)}
                  rows={3}
                  style={{
                    padding: '12px', background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(239,159,39,0.3)', borderRadius: '10px',
                    color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '14px',
                    outline: 'none', resize: 'none', lineHeight: 1.6,
                  }}
                />
                <button onClick={() => setRecallRevealed(true)} style={WHITE_BTN('#EF9F27')}>
                  Check answer
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
                <div style={{ padding: '14px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: '#EF9F27', marginBottom: '6px', letterSpacing: '0.1em' }}>FULL ANSWER</p>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>{card.answer}</p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Nav buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '1rem' }}>
        <button onClick={goBack} disabled={idx === 0} style={{
          ...GHOST_BTN,
          opacity: idx === 0 ? 0.2 : 1,
          cursor: idx === 0 ? 'not-allowed' : 'pointer',
          padding: '12px 18px',
        }}>
          &#8592;
        </button>

        {isLast ? (
          <button
            onClick={() => {
              onComplete?.(score, lesson.cards.length);
              if (quickCheck?.length) {
                setPhase('quickcheck');
              } else {
                router.push(practiseRoute);
              }
            }}
            disabled={!canProceed()}
            style={{
              flex: 1, padding: '13px', borderRadius: '12px',
              background: canProceed() ? accentColor : 'rgba(255,255,255,0.1)',
              border: 'none',
              color: canProceed() ? '#03080a' : 'rgba(255,255,255,0.3)',
              fontSize: '15px', fontWeight: 800,
              cursor: canProceed() ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-ui)',
              boxShadow: canProceed() ? `0 0 24px ${accentColor}40` : 'none',
              transition: 'all 0.2s ease',
            }}>
            {quickCheck?.length ? 'Quick check \u2192' : 'Practise now \u2192'}
          </button>
        ) : (
          <button onClick={advance} disabled={!canProceed()} style={{
            flex: 1, padding: '13px', borderRadius: '12px',
            background: canProceed() ? meta.phaseColor : 'rgba(255,255,255,0.1)',
            border: 'none',
            color: canProceed() ? '#03080a' : 'rgba(255,255,255,0.3)',
            fontSize: '15px', fontWeight: 800,
            cursor: canProceed() ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-ui)',
            transition: 'all 0.2s ease',
          }}>
            {canProceed() ? 'Next \u2192' : card.type === 'HOOK' ? 'Pick one first!' : card.type === 'BLANK' ? 'Check your answer!' : card.type === 'EXPLAIN' ? 'Write something first!' : 'Next \u2192'}
          </button>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────
function WHITE_BTN(color: string): React.CSSProperties {
  return {
    width: '100%', padding: '13px', borderRadius: '12px',
    background: color, border: 'none',
    color: '#03080a', fontSize: '15px', fontWeight: 800,
    cursor: 'pointer', fontFamily: 'var(--font-ui)',
  };
}

const GHOST_BTN: React.CSSProperties = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '10px', padding: '10px 14px',
  color: 'rgba(255,255,255,0.6)', fontSize: '14px',
  cursor: 'pointer', fontFamily: 'var(--font-ui)',
};
