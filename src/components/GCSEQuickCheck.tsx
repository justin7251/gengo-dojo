'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  onReplay:      (fromCard: number) => void;
}

type AnswerState = { answered: boolean; correct: boolean; value: string };

const SCORE_CONFIG = [
  { min: 0, max: 0, emoji: '😅', message: 'Let\'s go back and look again',       action: 'replay-all',     actionLabel: 'Back to lesson',       color: 'var(--red)'    },
  { min: 1, max: 1, emoji: '🤔', message: 'Almost! Try the tricky parts again',  action: 'replay-partial', actionLabel: 'Try those cards again', color: 'var(--orange)' },
  { min: 2, max: 2, emoji: '💪', message: 'So close! One more go',               action: 'replay-recall',  actionLabel: 'Try the last card',    color: 'var(--orange)' },
  { min: 3, max: 3, emoji: '🎉', message: 'You got it! Ready to practise',       action: 'practise',       actionLabel: 'Try exam questions',   color: 'var(--green)'  },
];

export function QuickCheck({ questions, topic, accentColor, practiseRoute, onReplay }: Props) {
  const router = useRouter();
  const [qIdx, setQIdx]               = useState(0);
  const [answers, setAnswers]         = useState<AnswerState[]>([]);
  const [current, setCurrent]         = useState<AnswerState | null>(null);
  const [inputVal, setInputVal]       = useState('');
  const [showResults, setShowResults] = useState(false);

  const q     = questions[qIdx];
  const score = answers.filter(a => a.correct).length;
  const total = questions.length;
  const pct   = Math.round(((qIdx + (current ? 1 : 0)) / total) * 100);

  const config = SCORE_CONFIG.find(c => score >= c.min && score <= c.max) ?? SCORE_CONFIG[3];

  function submitAnswer(value: string, correct: boolean) {
    const state: AnswerState = { answered: true, correct, value };
    setCurrent(state);
  }

  function checkMultipleChoice(idx: number) {
    if (current) return;
    const correct = idx === (q as MultipleChoiceQ).correctIndex;
    submitAnswer(String(idx), correct);
  }

  function checkFillBlank() {
    if (!inputVal.trim() || current) return;
    const correct = inputVal.trim().toLowerCase() === (q as FillBlankQ).answer.toLowerCase();
    submitAnswer(inputVal.trim(), correct);
  }

  function handleNext() {
    if (!current) return;
    setAnswers(prev => [...prev, current]);
    if (qIdx + 1 >= total) { setShowResults(true); return; }
    setQIdx(i => i + 1);
    setCurrent(null);
    setInputVal('');
  }

  function handleReplayAction() {
    const action = config.action;
    if (action === 'practise') { router.push(practiseRoute); return; }
    if (action === 'replay-all')     { onReplay(0); return; }
    if (action === 'replay-partial') { onReplay(2); return; }
    if (action === 'replay-recall')  { onReplay(6); return; }
  }

  if (showResults) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'bounceIn 0.4s ease' }}>
        <div style={{ textAlign: 'center', padding: '1.5rem', background: '#fff', border: `2.5px solid ${config.color}55`, borderRadius: '20px', boxShadow: `0 6px 0 ${config.color}55` }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>{config.emoji}</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 900, color: 'var(--fg)', marginBottom: '6px' }}>
            {score}/{total} correct
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600, marginBottom: '1.25rem' }}>{config.message}</p>
          <div className="progress-track" style={{ marginBottom: '8px' }}>
            <div className="progress-fill" style={{ width: `${(score / total) * 100}%` }} />
          </div>
        </div>

        {/* Answer review */}
        <div style={{ background: '#fff', border: '2.5px solid var(--border-dark)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 0 var(--border-dark)' }}>
          <div style={{ padding: '10px 16px', background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-dark)', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Review</div>
          {questions.map((q, i) => {
            const ans = answers[i];
            return (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 16px', borderBottom: i < questions.length - 1 ? '1.5px solid var(--border)' : 'none', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{ans?.correct ? '✅' : '❌'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--fg)', marginBottom: '2px' }}>
                    {q.type === 'multipleChoice' ? q.question : q.type === 'fillBlank' ? q.sentence.replace('___', `___`) : q.question}
                  </p>
                  {!ans?.correct && (
                    <p style={{ fontSize: '12px', color: 'var(--green-dark)', fontWeight: 700 }}>
                      ✓ {q.type === 'multipleChoice' ? q.choices[q.correctIndex] : q.type === 'fillBlank' ? q.answer : 'See model answer'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleReplayAction}>
            {config.actionLabel} →
          </button>
          {config.action !== 'practise' && (
            <button className="btn" onClick={() => router.push(practiseRoute)}>Skip to practice</button>
          )}
        </div>
        <style>{`@keyframes bounceIn{0%{opacity:0;transform:scale(0.85)}60%{transform:scale(1.04)}100%{opacity:1;transform:scale(1)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Quick Check · {topic}</span>
        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)' }}>{qIdx + 1}/{total}</span>
      </div>
      <div className="progress-track" style={{ height: '6px' }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}cc)` }} />
      </div>

      {/* Question card */}
      <div style={{ background: '#fff', border: `2.5px solid ${accentColor}55`, borderRadius: '18px', padding: '1.25rem', boxShadow: `0 6px 0 ${accentColor}55` }}>
        {/* Multiple choice */}
        {q.type === 'multipleChoice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg)', lineHeight: 1.5 }}>{q.question}</p>
            {!current ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {q.choices.map((choice, i) => (
                  <button key={i} onClick={() => checkMultipleChoice(i)}
                    style={{ padding: '12px 14px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600, border: '2.5px solid var(--border-dark)', background: 'var(--bg-secondary)', color: 'var(--fg)', boxShadow: '0 3px 0 var(--border-dark)', transition: 'all 0.1s ease' }}
                    className="gcse-choice-btn"
                  >{choice}</button>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
                {q.choices.map((choice, i) => {
                  const isCorrect  = i === q.correctIndex;
                  const isSelected = String(i) === current.value;
                  return (
                    <div key={i} style={{ padding: '12px 14px', borderRadius: '12px', border: `2.5px solid ${isCorrect ? 'var(--green)' : isSelected ? 'var(--red)' : 'var(--border-dark)'}`, background: isCorrect ? 'var(--green-light)' : isSelected ? 'var(--red-light)' : 'var(--bg-secondary)', color: isCorrect ? 'var(--green-dark)' : isSelected ? 'var(--red-dark)' : 'var(--muted)', fontSize: '14px', fontFamily: 'var(--font-ui)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: isCorrect ? '0 3px 0 var(--green-dark)' : isSelected ? '0 3px 0 var(--red-dark)' : '0 3px 0 var(--border-dark)', animation: isSelected && !isCorrect ? 'wrongShake 0.35s ease' : isCorrect && isSelected ? 'correctPop 0.3s ease' : 'none' }}>
                      {isCorrect && <span>✅</span>}{isSelected && !isCorrect && <span>❌</span>}
                      {choice}
                    </div>
                  );
                })}
                <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '2px solid var(--border-dark)' }}>
                  <p style={{ fontSize: '13px', color: 'var(--fg-secondary)', lineHeight: 1.5, fontWeight: 600 }}>{q.explanation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fill blank */}
        {q.type === 'fillBlank' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '2px solid var(--border-dark)' }}>
              <p style={{ fontSize: '17px', fontWeight: 600, color: 'var(--fg)', lineHeight: 1.7 }}>
                {q.sentence.split('___').map((part, i, arr) => (
                  <span key={i}>{part}{i < arr.length - 1 && (
                    <span style={{ display: 'inline-block', minWidth: '70px', borderBottom: `3px solid ${current ? (current.correct ? 'var(--green)' : 'var(--red)') : accentColor}`, color: current ? (current.correct ? 'var(--green-dark)' : 'var(--red-dark)') : accentColor, fontFamily: 'var(--font-geist-mono, monospace)', fontSize: '15px', textAlign: 'center', padding: '0 4px' }}>
                      {current ? current.value : ''}
                    </span>
                  )}</span>
                ))}
              </p>
            </div>
            {!current ? (
              <>
                <input autoFocus type="text" placeholder="Type your answer…" value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => e.key === 'Enter' && inputVal.trim() && checkFillBlank()} />
                <button onClick={checkFillBlank} disabled={!inputVal.trim()} className="btn" style={{ justifyContent: 'center', background: accentColor, borderColor: accentColor, color: '#fff', boxShadow: `0 4px 0 ${accentColor}88`, opacity: inputVal.trim() ? 1 : 0.4 }}>Check ✓</button>
              </>
            ) : (
              <div style={{ padding: '12px 14px', borderRadius: '12px', animation: 'bounceIn 0.3s ease', background: current.correct ? 'var(--green-light)' : 'var(--red-light)', border: `2.5px solid ${current.correct ? 'var(--green)' : 'var(--red)'}`, boxShadow: current.correct ? '0 3px 0 var(--green-dark)' : '0 3px 0 var(--red-dark)' }}>
                {current.correct
                  ? <p style={{ fontSize: '15px', fontWeight: 800, color: 'var(--green-dark)', fontFamily: 'var(--font-display)' }}>Yes! That's right! 🎉</p>
                  : <><p style={{ fontSize: '13px', color: 'var(--red-dark)', fontWeight: 700, marginBottom: '4px' }}>The answer is:</p><p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--fg)' }}>{q.answer}</p></>
                }
                <p style={{ fontSize: '12px', color: 'var(--fg-secondary)', marginTop: '6px', lineHeight: 1.5, fontWeight: 600 }}>{q.explanation}</p>
              </div>
            )}
          </div>
        )}

        {/* Short answer */}
        {q.type === 'shortAnswer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '2px solid var(--border-dark)' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg)', lineHeight: 1.5 }}>{q.question}</p>
            </div>
            {!current ? (
              <>
                <textarea autoFocus placeholder="Write your answer in your own words…" value={inputVal} onChange={e => setInputVal(e.target.value)} rows={4} />
                <p style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', fontWeight: 700 }}>
                  {inputVal.trim().split(/\s+/).filter(Boolean).length} words
                </p>
                {inputVal.trim().length > 5 && (
                  <button onClick={() => submitAnswer(inputVal, true)} className="btn" style={{ justifyContent: 'center', background: accentColor, borderColor: accentColor, color: '#fff', boxShadow: `0 4px 0 ${accentColor}88` }}>
                    See model answer →
                  </button>
                )}
              </>
            ) : (
              <div style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '2.5px solid var(--border-dark)', animation: 'fadeIn 0.2s ease' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: 'var(--muted-bright)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Model Answer</p>
                <p style={{ fontSize: '14px', color: 'var(--fg)', lineHeight: 1.7, fontWeight: 600, marginBottom: '10px' }}>{q.modelAnswer}</p>
                <div style={{ paddingTop: '10px', borderTop: '2px solid var(--border)' }}>
                  <p style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700, marginBottom: '6px' }}>Key words:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {q.keywords.map((kw, i) => (
                      <span key={i} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '99px', background: `${accentColor}18`, color: accentColor, border: `2px solid ${accentColor}40`, fontWeight: 700 }}>{kw}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {current && (
        <button onClick={handleNext} className="btn btn-primary" style={{ justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
          {qIdx + 1 >= total ? 'See my score 🎯' : 'Next question →'}
        </button>
      )}

      <style>{`
        @keyframes fadeIn    { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounceIn  { 0%{opacity:0;transform:scale(0.8)} 60%{transform:scale(1.06)} 100%{opacity:1;transform:scale(1)} }
        @keyframes wrongShake{ 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        @keyframes correctPop{ 0%{transform:scale(1)} 35%{transform:scale(1.06)} 100%{transform:scale(1)} }
        .gcse-choice-btn:hover { background: var(--bg) !important; transform: translateY(-1px); }
        .gcse-choice-btn:active { transform: translateY(2px); }
      `}</style>
    </div>
  );
}
