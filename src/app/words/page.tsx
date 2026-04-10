'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { Word, Progress, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import { isDue, isMastered } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function WordsPage() {
  return <AuthGuard><WordList /></AuthGuard>;
}

type StatusFilter = 'all' | 'due' | 'learning' | 'mastered';
type GroupBy      = 'topic' | 'status';

const PAGE_SIZE = 10;

function speak(text: string, targetLang: TargetLang) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utter    = new SpeechSynthesisUtterance(text);
  utter.lang     = VOICE_LANG[targetLang] ?? 'ja-JP';
  utter.rate     = 0.8;
  const voices   = window.speechSynthesis.getVoices();
  const langCode = VOICE_LANG[targetLang].split('-')[0];
  const native   = voices.find(v => v.lang.startsWith(langCode));
  if (native) utter.voice = native;
  window.speechSynthesis.speak(utter);
}

function WordList() {
  const router = useRouter();

  const [uid, setUid]               = useState('');
  const [targetLang, setTargetLang] = useState<TargetLang>('ja');
  const [words, setWords]           = useState<Word[]>([]);
  const [progress, setProgress]     = useState<Record<string, Progress>>({});
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<StatusFilter>('all');
  const [groupBy, setGroupBy]       = useState<GroupBy>('topic');
  const [search, setSearch]         = useState('');
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [speaking, setSpeaking]     = useState(false);
  const [reviewing, setReviewing]   = useState(false);
  const [page, setPage]             = useState(1);

  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const profile = await getUserProfile(user.uid);
      if (!profile) return;
      setTargetLang(profile.targetLang);
      const [w, p] = await Promise.all([
        getUserWords(user.uid, profile.targetLang, profile.nativeLang),
        getProgress(user.uid, profile.targetLang, profile.nativeLang),
      ]);
      setWords(w);
      setProgress(p);
      setLoading(false);
    });
  }, []);

  // Reset page on filter/search/group change
  useEffect(() => { setPage(1); setExpanded(null); }, [filter, search, groupBy]);

  const getStatus = useCallback((w: Word): 'mastered' | 'due' | 'learning' => {
    const p = progress[w.id];
    if (!p) return 'learning';
    if (isMastered(p)) return 'mastered';
    if (isDue(p))      return 'due';
    return 'learning';
  }, [progress]);

  function getDaysUntil(w: Word): string {
    const p = progress[w.id];
    if (!p) return '—';
    const diff = p.nextReview - Date.now();
    if (diff <= 0) return 'Now';
    return `${Math.ceil(diff / 86_400_000)}d`;
  }

  function handleToggle(id: string, kanji: string) {
    if (expanded === id) {
      setExpanded(null);
      window.speechSynthesis.cancel();
    } else {
      setExpanded(id);
      setSpeaking(true);
      speak(kanji, targetLang);
      setTimeout(() => setSpeaking(false), 1200);
    }
  }

  async function handleQuickReview(word: Word, rating: 'good' | 'easy') {
    if (reviewing) return;
    setReviewing(true);
    const prev = progress[word.id];
    if (prev) {
      await rateWord(uid, word.id, rating, prev, targetLang,
        words.find(w => w.id === word.id)?.nativeLang ?? 'en');
      setProgress(p => ({
        ...p,
        [word.id]: {
          ...prev,
          correct:      prev.correct + 1,
          interval:     rating,
          nextReview:   Date.now() + (rating === 'easy' ? 30 * 86400000 : 7 * 86400000),
          lastReviewed: Date.now(),
        },
      }));
    }
    setReviewing(false);
    setExpanded(null);
  }

  // ── Filter + search ───────────────────────────────────
  const filtered = words.filter(w => {
    if (filter !== 'all' && getStatus(w) !== filter) return false;
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
  });

  // ── Pagination (applied to flat list before grouping) ─
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Group paginated words ─────────────────────────────
  type Group = { label: string; sublabel: string; words: Word[]; color: string };
  const groups: Group[] = [];

  if (groupBy === 'topic') {
    const topics = Array.from(new Set(paginated.map(w => w.topic)));
    topics.forEach(topic => {
      const tw      = paginated.filter(w => w.topic === topic);
      const due     = tw.filter(w => getStatus(w) === 'due').length;
      const mastered = tw.filter(w => getStatus(w) === 'mastered').length;
      groups.push({
        label:    topic,
        sublabel: `${tw.length} words · ${due} due · ${mastered} mastered`,
        words:    tw,
        color:    due > 0 ? '#BA7517' : mastered === tw.length ? '#0F6E56' : 'var(--muted)',
      });
    });
  } else {
    const statusGroups: { key: StatusFilter; label: string; color: string }[] = [
      { key: 'due',      label: 'Due for review', color: '#BA7517' },
      { key: 'learning', label: 'Still learning', color: '#185FA5' },
      { key: 'mastered', label: 'Mastered',       color: '#0F6E56' },
    ];
    statusGroups.forEach(sg => {
      const sw = paginated.filter(w => getStatus(w) === sg.key);
      if (sw.length) {
        groups.push({
          label:    sg.label,
          sublabel: `${sw.length} word${sw.length !== 1 ? 's' : ''}`,
          words:    sw,
          color:    sg.color,
        });
      }
    });
  }

  // ── Counts ────────────────────────────────────────────
  const counts = {
    all:      words.length,
    due:      words.filter(w => getStatus(w) === 'due').length,
    learning: words.filter(w => getStatus(w) === 'learning').length,
    mastered: words.filter(w => getStatus(w) === 'mastered').length,
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
      <div style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '4px' }}>Word list</h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
          {words.length} words · tap any word to study it
        </p>
      </div>

      {/* Status summary */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px', marginBottom: '1.25rem',
      }}>
        {[
          { key: 'due',      label: 'Due',      value: counts.due,      bg: '#FAEEDA', color: '#854F0B' },
          { key: 'learning', label: 'Learning', value: counts.learning, bg: '#E6F1FB', color: '#185FA5' },
          { key: 'mastered', label: 'Mastered', value: counts.mastered, bg: '#E1F5EE', color: '#0F6E56' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setFilter(filter === s.key as StatusFilter ? 'all' : s.key as StatusFilter)}
            style={{
              padding: '10px 8px', borderRadius: '10px', textAlign: 'center',
              borderWidth: '1px', borderStyle: 'solid',
              borderColor: filter === s.key ? s.color : 'var(--border)',
              background:  filter === s.key ? s.bg    : 'var(--surface)',
              cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 700, color: filter === s.key ? s.color : 'var(--fg)' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '11px', color: filter === s.key ? s.color : 'var(--muted)', marginTop: '2px' }}>
              {s.label}
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search kanji, meaning, topic…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '10px 14px',
          borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)',
          borderRadius: '10px', background: 'var(--surface)',
          color: 'var(--fg)', fontSize: '14px', fontFamily: 'inherit',
          marginBottom: '1rem', outline: 'none',
        }}
      />

      {/* Group toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '12px', color: 'var(--muted)', marginRight: '4px' }}>Group:</span>
        {(['topic', 'status'] as GroupBy[]).map(g => (
          <button key={g} onClick={() => setGroupBy(g)} style={{
            padding: '5px 12px', borderRadius: '6px',
            borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)',
            fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit',
            background: groupBy === g ? 'var(--fg)' : 'transparent',
            color:      groupBy === g ? 'var(--bg)' : 'var(--muted)',
            transition: 'all 0.15s',
          }}>
            {g.charAt(0).toUpperCase() + g.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1.25rem' }} />

      {/* Empty state */}
      {!filtered.length && (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)', fontSize: '14px' }}>
          No words match your search or filter.
        </div>
      )}

      {/* Groups + word rows */}
      {groups.map(group => (
        <div key={group.label} style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: '8px',
          }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: group.color }}>
              {group.label}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--muted)' }}>{group.sublabel}</p>
          </div>

          <div style={{
            borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)',
            borderRadius: '12px', overflow: 'hidden',
          }}>
            {group.words.map((w, i) => {
              const status    = getStatus(w);
              const prog      = progress[w.id];
              const isExpanded = expanded === w.id;
              const isLast    = i === group.words.length - 1;

              return (
                <div key={w.id}>
                  {/* Summary row */}
                  <button
                    onClick={() => handleToggle(w.id, w.kanji)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      gap: '12px', padding: '11px 14px', textAlign: 'left',
                      borderBottom: (!isLast || isExpanded) ? '1px solid var(--border)' : 'none',
                      background: isExpanded ? 'var(--surface)' : 'transparent',
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'background 0.15s',
                      borderLeft: `3px solid ${
                        status === 'due'      ? '#BA7517' :
                        status === 'mastered' ? '#1D9E75' : 'transparent'
                      }`,
                    }}
                  >
                    <span style={{
                      fontSize: '22px', minWidth: '32px', textAlign: 'center',
                      fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
                      color: 'var(--fg)',
                    }}>
                      {w.kanji}
                    </span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--fg)', marginBottom: '1px', lineHeight: 1.3 }}>
                        {w.meaning}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {w.reading}{w.romanization ? ` · ${w.romanization}` : ''}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 500,
                        color: status === 'due'      ? '#854F0B' :
                               status === 'mastered' ? '#0F6E56' : '#185FA5',
                      }}>
                        {status === 'due'      ? `⏱ ${getDaysUntil(w)}` :
                         status === 'mastered' ? '✓ mastered' : getDaysUntil(w)}
                      </span>
                      {prog && (
                        <span style={{ fontSize: '10px', color: 'var(--muted)' }}>
                          {prog.correct}✓ {prog.wrong}✗
                        </span>
                      )}
                    </div>

                    <span style={{
                      fontSize: '12px', color: 'var(--muted)',
                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s', marginLeft: '4px',
                    }}>
                      ›
                    </span>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{
                      padding: '14px 16px',
                      background: 'var(--surface)',
                      borderBottom: !isLast ? '1px solid var(--border)' : 'none',
                      animation: 'fadeIn 0.15s ease',
                    }}>

                      {/* Voice + reading */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <button
                          onClick={() => {
                            setSpeaking(true);
                            speak(w.kanji, targetLang);
                            setTimeout(() => setSpeaking(false), 1200);
                          }}
                          style={{
                            width: '38px', height: '38px', borderRadius: '50%',
                            border: '1px solid #444',
                            background: speaking ? '#0F6E56' : '#2a2a2a',
                            cursor: 'pointer', fontSize: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'all 0.15s',
                          }}
                        >
                          🔊
                        </button>
                        <div>
                          <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--fg)' }}>
                            {w.reading}
                            {w.romanization && (
                              <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '6px' }}>
                                · {w.romanization}
                              </span>
                            )}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {w.type} · {w.topic}
                          </p>
                        </div>
                      </div>

                      {/* Example sentence */}
                      {w.example && (
                        <div style={{
                          padding: '10px 12px', background: 'var(--bg)',
                          borderRadius: '8px', border: '1px solid var(--border)',
                          marginBottom: '12px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: w.example_translation ? '6px' : '0' }}>
                            <span style={{ fontSize: '14px', marginTop: '2px' }}>💬</span>
                            <p style={{
                              flex: 1, fontSize: '13px', lineHeight: 1.7, color: 'var(--fg)',
                              fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
                            }}>
                              {w.example}
                            </p>
                            <button
                              onClick={() => {
                                setSpeaking(true);
                                speak(w.example, targetLang);
                                setTimeout(() => setSpeaking(false), w.example.length * 80);
                              }}
                              style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                border: '1px solid #444', background: '#2a2a2a',
                                cursor: 'pointer', fontSize: '12px', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}
                            >
                              🔊
                            </button>
                          </div>
                          {w.example_translation && (
                            <p style={{
                              fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic',
                              paddingTop: '6px', borderTop: '1px solid var(--border)',
                              paddingLeft: '20px',
                            }}>
                              {w.example_translation}
                            </p>
                          )}
                        </div>
                      )}

                      {/* SRS stats + quick review */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        {prog && (
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                              {prog.correct}✓ {prog.wrong}✗
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                              {prog.interval} · next {getDaysUntil(w)}
                            </span>
                          </div>
                        )}

                        {/* Quick review */}
                        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                          <button
                            onClick={() => handleQuickReview(w, 'good')}
                            disabled={reviewing}
                            style={{
                              padding: '6px 12px',
                              borderWidth: '1px', borderStyle: 'solid', borderColor: '#1D9E75',
                              borderRadius: '8px', background: '#E1F5EE', color: '#0F6E56',
                              fontSize: '12px', fontWeight: 500,
                              cursor: reviewing ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit', opacity: reviewing ? 0.5 : 1,
                            }}
                          >
                            ✓ Know it · 7d
                          </button>
                          <button
                            onClick={() => handleQuickReview(w, 'easy')}
                            disabled={reviewing}
                            style={{
                              padding: '6px 12px',
                              borderWidth: '1px', borderStyle: 'solid', borderColor: '#185FA5',
                              borderRadius: '8px', background: '#E6F1FB', color: '#185FA5',
                              fontSize: '12px', fontWeight: 500,
                              cursor: reviewing ? 'not-allowed' : 'pointer',
                              fontFamily: 'inherit', opacity: reviewing ? 0.5 : 1,
                            }}
                          >
                            ⚡ Easy · 30d
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '8px',
          marginTop: '1rem', paddingTop: '1rem',
          borderTop: '1px solid var(--border)',
        }}>
          <button
            className="btn"
            style={{ fontSize: '13px', padding: '6px 14px' }}
            disabled={page === 1}
            onClick={() => { setPage(p => p - 1); setExpanded(null); window.scrollTo(0, 0); }}
          >
            ← Prev
          </button>

          {/* Page numbers */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce<(number | '...')[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(n);
                return acc;
              }, [])
              .map((n, i) => n === '...' ? (
                <span key={`ellipsis-${i}`} style={{ padding: '6px 4px', fontSize: '13px', color: 'var(--muted)' }}>…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => { setPage(n as number); setExpanded(null); window.scrollTo(0, 0); }}
                  style={{
                    width: '32px', height: '32px', borderRadius: '6px',
                    borderWidth: '1px', borderStyle: 'solid',
                    borderColor: page === n ? 'var(--teal)' : 'var(--border)',
                    background:  page === n ? 'var(--teal-light)' : 'transparent',
                    color:       page === n ? 'var(--teal-dark)'  : 'var(--muted)',
                    fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                    fontWeight: page === n ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {n}
                </button>
              ))
            }
          </div>

          <button
            className="btn"
            style={{ fontSize: '13px', padding: '6px 14px' }}
            disabled={page === totalPages}
            onClick={() => { setPage(p => p + 1); setExpanded(null); window.scrollTo(0, 0); }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Page info */}
      {totalPages > 1 && (
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
          Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} words
        </p>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </Shell>
  );
}

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
          词 Word list
        </span>
      </div>
      <div style={{
        width: '100%', maxWidth: '680px', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem',
      }}>
        {children}
      </div>
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
