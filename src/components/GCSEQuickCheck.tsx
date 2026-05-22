'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────
export interface MultipleChoiceQ {
  type:         'multipleChoice';
  question:     string;
  choices:      string[];
  correctIndex: number;
  explanation:  string;
}

export interface FillBlankQ {
  type:        'fillBlank';
  sentence:    string;
  answer:      string;
  explanation: string;
}

export interface ShortAnswerQ {
  type:        'shortAnswer';
  question:    string;
  modelAnswer: string;
  keywords:    string[];
}

export type QuickCheckQuestion = MultipleChoiceQ | FillBlankQ | ShortAnswerQ;

interface Props {
  questions:     QuickCheckQuestion[];
  topic:         string;
  accentColor:   string;
  practiseRoute: string;
  onReplay:      (fromCard: number) => void; // replay lesson from a card index
}

type AnswerState = { answered: boolean; correct: boolean; value: string };

const SCORE_CONFIG = [
  { min: 0, max: 0, emoji: '😅', message: "Let us go back and look again",    action: 'replay-all',     actionLabel: 'Back to lesson',         color: '#E24B4A' },
  { min: 1, max: 1, emoji: '🤔', message: "Almost! Try the tricky parts again", action: 'replay-partial', actionLabel: 'Try those cards again',    color: '#EF9F27' },
  { min: 2, max: 2, emoji: '💪', message: "So close! One more go",              action: 'replay-recall',  actionLabel: 'Try the last card again',  color: '#EF9F27' },
  { min: 3, max: 3, emoji: '🎉', message: "You got it! Ready to practise",      action: 'practise',       actionLabel: 'Try exam questions',       color: '#00e87a' },
];

export function QuickCheck({ questions, topic, accentColor, practiseRoute, onReplay }: Props) {
  const router = useRouter();

  const [qIdx, setQIdx]         = useState(0);
  const [answers, setAnswers]   = useState<AnswerState[]>([]);
  const [current, setCurrent]   = useState<AnswerState | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [showResults, setShowResults] = useState(false);

  const q     = questions[qIdx];
  const score = answers.filter(a => a.correct).length;
  const total = questions.length;

  function submitAnswer(value: string, correct: boolean) {
    const state: AnswerState = { answered: true, correct, value };
    setCurrent(state);
  }

  function handleNext() {
    if (!current) return;
    const newAnswers = [...answers, current];
    setAnswers(newAnswers);
    setCurrent(null);
    setInputVal('');
    if (qIdx + 1 >= questions.length) {
      setShowResults(true);
    } else {
      setQIdx(i => i + 1);
    }
  }

  function checkFillBlank() {
    if (q.type !== 'fillBlank' || !inputVal.trim()) return;
    const correct = inputVal.trim().toLowerCase() === q.answer.toLowerCase();
    submitAnswer(inputVal.trim(), correct);
  }

  // ── Results screen ─────────────────────────────────
  if (showResults) {
    const cfg = SCORE_CONFIG.find(c => score >= c.min && score <= c.max) ?? SCORE_CONFIG[3];
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontSize: '12px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '1.5rem', textAlign: 'center' }}>
          QUICK CHECK DONE
        </p>

        {/* Score card */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: cfg.color + '10', borderRadius: '22px',
          border: `1px solid ${cfg.color}25`, padding: '2rem',
          marginBottom: '1rem', textAlign: 'center',
        }}>
          <p style={{ fontSize: '56px', marginBottom: '0.75rem', lineHeight: 1 }}>{cfg.emoji}</p>
          <p style={{ fontSize: '42px', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)', lineHeight: 1, marginBottom: '0.5rem' }}>
            {score}/{total}
          </p>
          <p style={{ fontSize: '17px', fontWeight: 600, color: cfg.color, marginBottom: '1.25rem' }}>
            {cfg.message}
          </p>

          {/* Per-question summary */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '1rem' }}>
            {answers.map((a, i) => (
              <div key={i} style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: a.correct ? 'rgba(0,232,122,0.2)' : 'rgba(226,75,74,0.2)',
                border: `2px solid ${a.correct ? '#00e87a' : '#E24B4A'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px',
              }}>
                {a.correct ? '\u2713' : '\u2717'}
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {cfg.action === 'practise' ? (
            <button onClick={() => router.push(practiseRoute)} style={primaryBtn(accentColor)}>
              {cfg.actionLabel} &#8594;
            </button>
          ) : cfg.action === 'replay-all' ? (
            <button onClick={() => onReplay(0)} style={primaryBtn('#E24B4A')}>
              {cfg.actionLabel}
            </button>
          ) : cfg.action === 'replay-partial' ? (
            <button onClick={() => onReplay(3)} style={primaryBtn('#EF9F27')}>
              {cfg.actionLabel}
            </button>
          ) : (
            <button onClick={() => onReplay(6)} style={primaryBtn('#EF9F27')}>
              {cfg.actionLabel}
            </button>
          )}
          {/* Always give option to go to practise */}
          {cfg.action !== 'practise' && (
            <button onClick={() => router.push(practiseRoute)} style={GHOST_BTN}>
              Skip to exam practice anyway
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>
          QUICK CHECK &mdash; {topic}
        </p>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {questions.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              background: i < qIdx ? accentColor : i === qIdx ? accentColor + '80' : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '6px', fontFamily: 'var(--font-mono)' }}>
          Question {qIdx + 1} of {total}
        </p>
      </div>

      {/* Question card */}
      <div style={{
        flex: 1, background: 'rgba(255,255,255,0.03)', borderRadius: '22px',
        padding: '1.5rem', border: `1px solid ${accentColor}20`,
        display: 'flex', flexDirection: 'column', gap: '1rem',
        marginBottom: '1rem',
      }}>

        {/* Difficulty badge */}
        <span style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
          color: accentColor, padding: '4px 10px',
          background: accentColor + '18', borderRadius: '99px',
          border: `1px solid ${accentColor}30`, alignSelf: 'flex-start',
        }}>
          {q.type === 'multipleChoice' ? 'PICK THE RIGHT ANSWER'
            : q.type === 'fillBlank' ? 'FILL THE GAP'
            : 'EXPLAIN IT'}
        </span>

        {/* ── Multiple choice ── */}
        {q.type === 'multipleChoice' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '17px', fontWeight: 600, color: '#fff', lineHeight: 1.45 }}>
              {q.question}
            </p>
            {!current ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.choices.map((choice, i) => (
                  <button key={i} onClick={() => submitAnswer(choice, i === q.correctIndex)} style={{
                    padding: '13px 16px', borderRadius: '12px', cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.85)', fontSize: '14px',
                    fontFamily: 'var(--font-ui)', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}>
                    {choice}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
                {q.choices.map((choice, i) => {
                  const isCorrect  = i === q.correctIndex;
                  const isSelected = choice === current.value;
                  return (
                    <div key={i} style={{
                      padding: '13px 16px', borderRadius: '12px',
                      border: `1px solid ${isCorrect ? 'rgba(0,232,122,0.4)' : isSelected ? 'rgba(226,75,74,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      background: isCorrect ? 'rgba(0,232,122,0.1)' : isSelected ? 'rgba(226,75,74,0.1)' : 'transparent',
                      color: isCorrect ? '#00e87a' : isSelected ? '#ff8080' : 'rgba(255,255,255,0.3)',
                      fontSize: '14px', fontFamily: 'var(--font-ui)',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                      {isCorrect && <span>&#10003;</span>}
                      {isSelected && !isCorrect && <span>&#10007;</span>}
                      {choice}
                    </div>
                  );
                })}
                <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
                    {q.explanation}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Fill blank ── */}
        {q.type === 'fillBlank' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '16px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '17px', fontWeight: 600, color: '#fff', lineHeight: 1.6 }}>
                {q.sentence.split('___').map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span style={{
                        display: 'inline-block', minWidth: '70px',
                        borderBottom: `2px solid ${current ? (current.correct ? '#00e87a' : '#E24B4A') : accentColor}`,
                        color: current ? (current.correct ? '#00e87a' : '#E24B4A') : accentColor,
                        fontFamily: 'var(--font-mono)', fontSize: '15px',
                        textAlign: 'center', padding: '0 4px', marginBottom: '-2px',
                      }}>
                        {current ? current.value : ''}
                      </span>
                    )}
                  </span>
                ))}
              </p>
            </div>

            {!current ? (
              <>
                <input
                  autoFocus
                  type="text"
                  placeholder="Type your answer..."
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && inputVal.trim() && checkFillBlank()}
                  style={{
                    padding: '12px 14px', background: 'rgba(255,255,255,0.07)',
                    border: `1px solid ${accentColor}40`, borderRadius: '10px',
                    color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '16px', outline: 'none',
                  }}
                />
                <button onClick={checkFillBlank} disabled={!inputVal.trim()} style={{
                  ...primaryBtn(accentColor),
                  opacity: inputVal.trim() ? 1 : 0.4,
                  cursor: inputVal.trim() ? 'pointer' : 'not-allowed',
                }}>
                  Check
                </button>
              </>
            ) : (
              <div style={{
                padding: '12px 14px', borderRadius: '12px', animation: 'fadeIn 0.2s ease',
                background: current.correct ? 'rgba(0,232,122,0.1)' : 'rgba(226,75,74,0.1)',
                border: `1px solid ${current.correct ? 'rgba(0,232,122,0.3)' : 'rgba(226,75,74,0.3)'}`,
              }}>
                {current.correct ? (
                  <p style={{ fontSize: '15px', fontWeight: 700, color: '#00e87a' }}>Yes! That is right! &#127881;</p>
                ) : (
                  <>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '4px' }}>
                      The answer is:
                    </p>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
                      {q.answer}
                    </p>
                  </>
                )}
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '4px', lineHeight: 1.5 }}>
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Short answer ── */}
        {q.type === 'shortAnswer' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ padding: '14px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#fff', lineHeight: 1.5 }}>
                {q.question}
              </p>
            </div>
            {!current ? (
              <>
                <textarea
                  autoFocus
                  placeholder="Write your answer in your own words..."
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  rows={4}
                  style={{
                    padding: '12px', background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${accentColor}30`, borderRadius: '10px',
                    color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '14px',
                    outline: 'none', resize: 'none', lineHeight: 1.6, flex: 1,
                  }}
                />
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'right' }}>
                  {inputVal.trim().split(/\s+/).filter(Boolean).length} words &mdash; a few sentences is fine!
                </p>
                {inputVal.trim().length > 5 && (
                  <button onClick={() => submitAnswer(inputVal, true)} style={primaryBtn(accentColor)}>
                    See model answer
                  </button>
                )}
              </>
            ) : (
              <div style={{ padding: '14px', background: accentColor + '08', borderRadius: '12px', border: `1px solid ${accentColor}25`, animation: 'fadeIn 0.2s ease' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: accentColor, marginBottom: '8px', letterSpacing: '0.1em' }}>
                  MODEL ANSWER
                </p>
                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7 }}>
                  {q.modelAnswer}
                </p>
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '5px' }}>
                    Key words to include:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {q.keywords.map((kw, i) => (
                      <span key={i} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '99px', background: accentColor + '15', color: accentColor, border: `1px solid ${accentColor}25` }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Next button — only shows after answering */}
      {current && (
        <button onClick={handleNext} style={{ ...primaryBtn(accentColor), animation: 'fadeIn 0.2s ease' }}>
          {qIdx + 1 >= total ? 'See my score' : 'Next question'} &#8594;
        </button>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────
function primaryBtn(color: string): React.CSSProperties {
  return {
    width: '100%', padding: '13px', borderRadius: '12px',
    background: color, border: 'none',
    color: '#03080a', fontSize: '15px', fontWeight: 800,
    cursor: 'pointer', fontFamily: 'var(--font-ui)',
  };
}

const GHOST_BTN: React.CSSProperties = {
  width: '100%', padding: '11px', borderRadius: '12px',
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.5)', fontSize: '13px',
  cursor: 'pointer', fontFamily: 'var(--font-ui)',
};
