'use client';

import { useRouter } from 'next/navigation';
import { DailyTaskId } from '@/lib/firestore';

export interface DailyTask {
  id:       DailyTaskId;
  emoji:    string;
  label:    string;
  sub:      string;
  route:    string;
  color:    string;
  bg:       string;
  shadow:   string;
  disabled: boolean;
}

interface Props {
  completed:  Partial<Record<DailyTaskId, boolean>>;
  dueCount:   number;
  wordCount:  number;
  onTaskDone: (id: DailyTaskId) => void;
}

const ALL_DONE_MESSAGES = [
  "You crushed it today! 🎉",
  "Full marks, Agent. 🕵️",
  "Daily mission complete! ⚡",
  "Perfect day. See you tomorrow! 🏆",
];

export function TodayPanel({ completed, dueCount, wordCount, onTaskDone }: Props) {
  const router   = useRouter();
  const canPlay  = wordCount >= 4;

  const TASKS: DailyTask[] = [
    {
      id:       'flashcards',
      emoji:    '🃏',
      label:    'Flashcards',
      sub:      dueCount > 0 ? `${dueCount} due` : 'SRS review',
      route:    '/flashcards',
      color:    'var(--green)',
      bg:       'var(--green-light)',
      shadow:   'var(--green-dark)',
      disabled: !canPlay,
    },
    {
      id:       'quiz',
      emoji:    '🧩',
      label:    'Quiz',
      sub:      '4 questions',
      route:    '/quiz',
      color:    'var(--blue)',
      bg:       'var(--blue-light)',
      shadow:   'var(--blue-dark)',
      disabled: !canPlay,
    },
    {
      id:       'mission',
      emoji:    '🎯',
      label:    'Mission',
      sub:      'Any mode',
      route:    '/mission',
      color:    'var(--purple)',
      bg:       'var(--purple-light)',
      shadow:   'var(--purple-dark)',
      disabled: !canPlay,
    },
    {
      id:       'survival',
      emoji:    '💀',
      label:    'Survival',
      sub:      '3 lives',
      route:    '/survival',
      color:    'var(--red)',
      bg:       'var(--red-light)',
      shadow:   'var(--red-dark)',
      disabled: !canPlay,
    },
  ];

  const doneCount  = TASKS.filter(t => completed[t.id]).length;
  const allDone    = doneCount === 4;
  const pct        = (doneCount / 4) * 100;
  const doneMsg    = ALL_DONE_MESSAGES[new Date().getDay() % ALL_DONE_MESSAGES.length];

  return (
    <div style={{
      background:    '#fff',
      border:        '2.5px solid var(--border-dark)',
      borderRadius:  '20px',
      padding:       '1.25rem',
      marginBottom:  '1.25rem',
      boxShadow:     '0 6px 0 var(--border-dark)',
      position:      'relative',
      overflow:      'hidden',
    }}>
      {/* Glow blob */}
      <div style={{
        position:     'absolute', top: '-30px', right: '-30px',
        width:        '140px',    height:    '140px',
        borderRadius: '50%',
        background:   allDone ? 'rgba(88,204,2,0.12)' : 'rgba(28,176,246,0.08)',
        filter:       'blur(30px)', pointerEvents: 'none',
        transition:   'background 0.5s',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', position: 'relative', zIndex: 1 }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
            Today's Mission
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 800, color: 'var(--fg)', lineHeight: 1 }}>
            {allDone ? doneMsg : `${doneCount} / 4 complete`}
          </p>
        </div>
        {/* XP earned today */}
        <div style={{
          background:    allDone ? 'var(--green-light)' : '#fff3d0',
          border:        `2.5px solid ${allDone ? 'var(--green)' : '#ffd966'}`,
          borderRadius:  '99px',
          padding:       '5px 12px',
          boxShadow:     `0 3px 0 ${allDone ? 'var(--green-dark)' : '#ffd966'}`,
          display:       'flex', alignItems: 'center', gap: '5px',
          transition:    'all 0.3s',
        }}>
          <span style={{ fontSize: '14px' }}>{allDone ? '🏆' : '⚡'}</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 800, color: allDone ? 'var(--green-dark)' : '#a05600' }}>
            +{doneCount * 25} XP
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track" style={{ marginBottom: '14px', height: '8px' }}>
        <div className="progress-fill" style={{
          width:      `${pct}%`,
          background: allDone ? 'linear-gradient(90deg,var(--green),#7ee800)' : 'linear-gradient(90deg,var(--blue),var(--purple))',
          transition: 'width 0.5s cubic-bezier(0.34,1.56,0.64,1)',
        }} />
      </div>

      {/* Task grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', position: 'relative', zIndex: 1 }}>
        {TASKS.map(task => {
          const done = !!completed[task.id];
          return (
            <button
              key={task.id}
              onClick={() => {
                if (!task.disabled) {
                  onTaskDone(task.id);
                  router.push(task.route);
                }
              }}
              disabled={task.disabled}
              className="today-task-btn"
              style={{
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                gap:           '5px',
                padding:       '10px 4px',
                borderRadius:  '14px',
                border:        `2.5px solid ${done ? 'var(--green)' : task.disabled ? 'var(--border-dark)' : task.color + '55'}`,
                background:    done ? 'var(--green-light)' : task.disabled ? 'var(--bg-secondary)' : task.bg,
                cursor:        task.disabled ? 'default' : 'pointer',
                opacity:       task.disabled ? 0.45 : 1,
                boxShadow:     done
                  ? '0 4px 0 var(--green-dark)'
                  : task.disabled
                    ? '0 4px 0 var(--border-dark)'
                    : `0 4px 0 ${task.shadow}55`,
                transition:    'all 0.15s ease',
                fontFamily:    'var(--font-ui)',
                position:      'relative',
                overflow:      'hidden',
              }}
            >
              <span style={{ fontSize: done ? '20px' : '22px' }}>
                {done ? '✅' : task.emoji}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: done ? 'var(--green-dark)' : task.disabled ? 'var(--muted)' : 'var(--fg)', textAlign: 'center', lineHeight: 1.2 }}>
                {task.label}
              </span>
              <span style={{ fontSize: '9px', fontWeight: 600, color: done ? 'var(--green-dark)' : 'var(--muted)', textAlign: 'center', lineHeight: 1.2 }}>
                {done ? 'Done!' : task.sub}
              </span>
            </button>
          );
        })}
      </div>

      {!canPlay && (
        <p style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '10px', fontWeight: 600 }}>
          Generate vocabulary from the dashboard to unlock today's tasks
        </p>
      )}

      <style>{`
        .today-task-btn:hover:not(:disabled) { transform: translateY(-2px); }
        .today-task-btn:active:not(:disabled) { transform: translateY(3px); box-shadow: none !important; }
      `}</style>
    </div>
  );
}
