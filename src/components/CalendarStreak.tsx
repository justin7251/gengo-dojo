'use client';

import { useMemo } from 'react';

interface Props {
  streakHistory: string[];  // YYYY-MM-DD strings of fully-completed days
  streakDays:    number;    // current agent streak (for missions)
  todayDone:     boolean;   // whether today's 4 tasks are complete
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS  = ['M','T','W','T','F','S','S'];

export function CalendarStreak({ streakHistory, streakDays, todayDone }: Props) {
  const { weeks, monthLabels } = useMemo(() => {
    const today     = new Date();
    const todayStr  = formatDate(today);
    const historySet = new Set(streakHistory);

    // Build 35 days (5 weeks) ending today
    // Start from the Monday of 5 weeks ago
    const endDate   = new Date(today);
    const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0 … Sun=6
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - dayOfWeek - 28); // 4 full weeks back + current partial

    const days: { date: string; state: 'done' | 'missed' | 'today' | 'future' | 'empty' }[] = [];
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
      const d = formatDate(cursor);
      let state: typeof days[0]['state'];
      if (d === todayStr)               state = todayDone ? 'done' : 'today';
      else if (d > todayStr)            state = 'future';
      else if (historySet.has(d))       state = 'done';
      else                              state = 'missed';
      days.push({ date: d, state });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Pad to full grid of 5 rows × 7 cols
    while (days.length % 7 !== 0) days.push({ date: '', state: 'empty' });

    // Group into weeks
    const weeks: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    // Month labels: find where months change across the grid
    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let i = 0; i < days.length; i++) {
      if (!days[i].date) continue;
      const m = new Date(days[i].date).getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ col: i % 7, label: MONTH_NAMES[m] });
        lastMonth = m;
      }
    }

    return { weeks, monthLabels };
  }, [streakHistory, todayDone]);

  const currentStreak = streakDays;
  const bestStreak    = Math.max(streakDays, streakHistory.length > 0 ? currentStreak : 0);

  // Count consecutive done days from today backwards
  const consecutive = useMemo(() => {
    const s = new Set(streakHistory);
    const today = new Date();
    let count = 0;
    for (let i = 0; i < 100; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = formatDate(d);
      if (s.has(ds) || (i === 0 && todayDone)) count++;
      else break;
    }
    return count;
  }, [streakHistory, todayDone]);

  return (
    <div style={{
      background:   '#fff',
      border:       '2.5px solid var(--border-dark)',
      borderRadius: '20px',
      padding:      '1.25rem',
      marginBottom: '1.25rem',
      boxShadow:    '0 5px 0 var(--border-dark)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
            Streak Calendar
          </p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 800, color: 'var(--fg)', lineHeight: 1 }}>
            {consecutive > 0 ? `${consecutive} day${consecutive !== 1 ? 's' : ''} in a row 🔥` : 'Start your streak today!'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ textAlign: 'center', background: 'var(--orange-light)', border: '2px solid var(--orange)55', borderRadius: '10px', padding: '6px 10px', boxShadow: '0 2px 0 var(--orange-dark)55' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, color: 'var(--orange-dark)', lineHeight: 1 }}>{consecutive}</p>
            <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Now</p>
          </div>
          <div style={{ textAlign: 'center', background: 'var(--green-light)', border: '2px solid var(--green)55', borderRadius: '10px', padding: '6px 10px', boxShadow: '0 2px 0 var(--green-dark)55' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 800, color: 'var(--green-dark)', lineHeight: 1 }}>{streakHistory.length}</p>
            <p style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</p>
          </div>
        </div>
      </div>

      {/* Day column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px', marginBottom: '4px' }}>
        {DAY_LABELS.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
            {week.map((day, di) => {
              if (day.state === 'empty') return <div key={di} />;

              const isToday  = day.state === 'today';
              const isDone   = day.state === 'done';
              const isMissed = day.state === 'missed';
              const isFuture = day.state === 'future';

              const bg     = isDone   ? 'var(--green)'
                           : isToday  ? 'var(--blue-light)'
                           : isMissed ? 'var(--bg-secondary)'
                           : 'transparent';
              const border = isDone   ? '2px solid var(--green-dark)'
                           : isToday  ? '2px solid var(--blue)'
                           : isMissed ? '2px solid var(--border-dark)'
                           : 'none';

              return (
                <div
                  key={di}
                  title={day.date}
                  style={{
                    aspectRatio:  '1',
                    borderRadius: '6px',
                    background:   bg,
                    border,
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent: 'center',
                    fontSize:     '9px',
                    fontWeight:   800,
                    color:        isDone ? '#fff' : isToday ? 'var(--blue-dark)' : 'var(--muted)',
                    position:     'relative',
                    boxShadow:    isDone ? '0 1px 0 var(--green-dark)' : 'none',
                    animation:    isDone ? undefined : undefined,
                  }}
                >
                  {isDone && (
                    <span style={{ fontSize: '10px' }}>✓</span>
                  )}
                  {isToday && !isDone && (
                    <span style={{ fontSize: '10px', color: 'var(--blue)' }}>
                      {new Date().getDate()}
                    </span>
                  )}
                  {isMissed && (
                    <span style={{ fontSize: '10px', opacity: 0.4 }}>
                      {new Date(day.date).getDate()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '10px', justifyContent: 'flex-end' }}>
        {[
          { color: 'var(--green)', label: 'Complete' },
          { color: 'var(--blue-light)', border: 'var(--blue)', label: 'Today' },
          { color: 'var(--bg-secondary)', border: 'var(--border-dark)', label: 'Missed' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: l.color, border: l.border ? `1.5px solid ${l.border}` : 'none' }} />
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
