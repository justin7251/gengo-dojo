'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress } from '@/lib/firestore';
import { Word, Progress, TargetLang, NativeLang } from '@/lib/types';
import { isDue, isMastered } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function WordsPage() {
  return <AuthGuard><WordList /></AuthGuard>;
}

type Filter = 'all' | 'due' | 'mastered' | 'learning';
type SortBy = 'topic' | 'newest' | 'hardest';

function WordList() {
  const router = useRouter();

  const [words, setWords]       = useState<Word[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<Filter>('all');
  const [sortBy, setSortBy]     = useState<SortBy>('topic');
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      const [w, p] = await Promise.all([
        getUserWords(user.uid, profile.targetLang, profile.nativeLang),
        getProgress(user.uid, profile.targetLang, profile.nativeLang),
      ]);
      setWords(w);
      setProgress(p);
      setLoading(false);
    });
  }, []);

  function getStatus(w: Word): 'mastered' | 'due' | 'learning' {
    const p = progress[w.id];
    if (!p) return 'learning';
    if (isMastered(p)) return 'mastered';
    if (isDue(p))      return 'due';
    return 'learning';
  }

  function getDaysUntilReview(w: Word): string {
    const p = progress[w.id];
    if (!p) return '—';
    const diff = p.nextReview - Date.now();
    if (diff <= 0) return 'Now';
    const days = Math.ceil(diff / 86_400_000);
    return `${days}d`;
  }

  // ── Filter + search + sort ────────────────────────────
  const filtered = words
    .filter(w => {
      const status = getStatus(w);
      if (filter !== 'all' && status !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          w.kanji.includes(q) ||
          w.reading.includes(q) ||
          w.meaning.toLowerCase().includes(q) ||
          w.topic.toLowerCase().includes(q) ||
          (w.romanization ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'hardest') {
        const pa = progress[a.id];
        const pb = progress[b.id];
        const ratioA = pa ? pa.wrong / Math.max(pa.correct + pa.wrong, 1) : 0;
        const ratioB = pb ? pb.wrong / Math.max(pb.correct + pb.wrong, 1) : 0;
        return ratioB - ratioA;
      }
      return a.topic.localeCompare(b.topic);
    });

  // Group by topic when sorting by topic
  const grouped = sortBy === 'topic'
    ? filtered.reduce<Record<string, Word[]>>((acc, w) => {
        acc[w.topic] = acc[w.topic] ? [...acc[w.topic], w] : [w];
        return acc;
      }, {})
    : null;

  const statusPill = (w: Word) => {
    const s = getStatus(w);
    if (s === 'mastered') return <span className="pill pill-teal">mastered</span>;
    if (s === 'due')      return <span className="pill pill-amber">due</span>;
    return <span className="pill pill-gray">learning</span>;
  };

  if (loading) {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div>
      </Shell>
    );
  }

  if (!words.length) {
    return (
      <Shell onBack={() => router.push('/dashboard')}>
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div style={{ fontSize: '40px', marginBottom: '1rem' }}>📭</div>
          <p style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>No words yet</p>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '1.5rem' }}>
            Generate vocabulary from the dashboard to get started.
          </p>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
            Go to dashboard
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell onBack={() => router.push('/dashboard')}>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>Word list</h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
          {words.length} words · {words.filter(w => getStatus(w) === 'mastered').length} mastered
        </p>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search kanji, meaning, topic…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px',
          border: '1px solid var(--border)', borderRadius: '10px',
          background: 'var(--surface)', color: 'var(--fg)',
          fontSize: '14px', fontFamily: 'inherit',
          marginBottom: '1rem', outline: 'none',
        }}
      />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['all', 'due', 'learning', 'mastered'] as Filter[]).map(f => {
          const count = f === 'all'
            ? words.length
            : words.filter(w => getStatus(w) === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: '99px',
                border: '1px solid', fontSize: '13px',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                borderColor: filter === f ? 'var(--teal)' : 'var(--border)',
                background:  filter === f ? 'var(--teal-light)' : 'var(--surface)',
                color:       filter === f ? 'var(--teal-dark)'  : 'var(--muted)',
                fontWeight:  filter === f ? 500 : 400,
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} · {count}
            </button>
          );
        })}
      </div>

      {/* Sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Sort:</span>
        {(['topic', 'newest', 'hardest'] as SortBy[]).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            style={{
              padding: '4px 10px', borderRadius: '6px',
              border: '1px solid var(--border)', fontSize: '12px',
              cursor: 'pointer', fontFamily: 'inherit',
              background: sortBy === s ? 'var(--fg)' : 'transparent',
              color:      sortBy === s ? 'var(--bg)' : 'var(--muted)',
              transition: 'all 0.15s',
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1.5rem' }} />

      {/* Empty filtered state */}
      {!filtered.length && (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)', fontSize: '14px' }}>
          No words match your search or filter.
        </div>
      )}

      {/* Grouped by topic */}
      {grouped ? (
        Object.entries(grouped).map(([topic, topicWords]) => (
          <div key={topic} style={{ marginBottom: '1.5rem' }}>
            <p style={{
              fontSize: '11px', textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--muted)',
              fontWeight: 500, marginBottom: '8px',
            }}>
              {topic} · {topicWords.length} words
            </p>
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: '12px', overflow: 'hidden',
            }}>
              {topicWords.map((w, i) => (
                <WordRow
                  key={w.id}
                  word={w}
                  isLast={i === topicWords.length - 1}
                  expanded={expanded === w.id}
                  onToggle={() => setExpanded(expanded === w.id ? null : w.id)}
                  statusPill={statusPill(w)}
                  daysUntil={getDaysUntilReview(w)}
                  progress={progress[w.id]}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {filtered.map((w, i) => (
            <WordRow
              key={w.id}
              word={w}
              isLast={i === filtered.length - 1}
              expanded={expanded === w.id}
              onToggle={() => setExpanded(expanded === w.id ? null : w.id)}
              statusPill={statusPill(w)}
              daysUntil={getDaysUntilReview(w)}
              progress={progress[w.id]}
            />
          ))}
        </div>
      )}

    </Shell>
  );
}

// ── Word row ──────────────────────────────────────────
function WordRow({
  word, isLast, expanded, onToggle, statusPill, daysUntil, progress,
}: {
  word:       Word;
  isLast:     boolean;
  expanded:   boolean;
  onToggle:   () => void;
  statusPill: React.ReactNode;
  daysUntil:  string;
  progress?:  Progress;
}) {
  return (
    <div>
      {/* Summary row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px',
          borderBottom: (!isLast || expanded) ? '1px solid var(--border)' : 'none',
          cursor: 'pointer', transition: 'background 0.15s',
          background: expanded ? 'var(--surface)' : 'transparent',
        }}
      >
        <span style={{
          fontSize: '24px', minWidth: '36px', textAlign: 'center',
          fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", "Noto Sans SC", serif',
        }}>
          {word.kanji}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '1px', lineHeight: 1.3 }}>
            {word.meaning}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {word.reading}
            {word.romanization ? ` · ${word.romanization}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          {statusPill}
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{daysUntil}</span>
        </div>
        <span style={{
          fontSize: '12px', color: 'var(--muted)',
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }}>
          ▾
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '16px',
          background: 'var(--surface)',
          borderBottom: !isLast ? '1px solid var(--border)' : 'none',
          animation: 'fadeIn 0.15s ease',
        }}>

          {/* Example sentence */}
          {word.example && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{
                fontSize: '11px', textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--muted)',
                fontWeight: 500, marginBottom: '6px',
              }}>
                Example
              </p>
              <div style={{
                fontSize: '14px', lineHeight: 1.7,
                padding: '10px 12px', background: 'var(--bg)',
                borderRadius: '8px', border: '1px solid var(--border)',
              }}>
                <p style={{
                  fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
                  marginBottom: word.example_translation ? '6px' : '0',
                }}>
                  {word.example}
                </p>
                {word.example_translation && (
                  <p style={{
                    fontSize: '13px', color: 'var(--muted)',
                    fontStyle: 'italic',
                    borderTop: '1px solid var(--border)', paddingTop: '6px',
                  }}>
                    {word.example_translation}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Meta row */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>Type</p>
              <span className="pill pill-blue">{word.type}</span>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>Topic</p>
              <span className="pill pill-gray">{word.topic}</span>
            </div>
            {progress && (
              <div>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>Score</p>
                <span className="pill pill-gray">
                  {progress.correct}✓ {progress.wrong}✗
                </span>
              </div>
            )}
            {progress && (
              <div>
                <p style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>Interval</p>
                <span className="pill pill-gray">{progress.interval}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
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
          言語道場
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
      width: '24px', height: '24px',
      border: '2px solid var(--border)', borderTopColor: 'var(--muted)',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto',
    }} />
  );
}
