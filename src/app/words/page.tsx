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
type TopicFilter  = string | 'all';

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
  const [nativeLang, setNativeLang] = useState<NativeLang>('en');
  const [words, setWords]           = useState<Word[]>([]);
  const [progress, setProgress]     = useState<Record<string, Progress>>({});
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<StatusFilter>('all');
  const [groupBy, setGroupBy]       = useState<GroupBy>('topic');
  const [topicFilter, setTopicFilter] = useState<TopicFilter>('all');
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
      setNativeLang(profile.nativeLang);
      const [w, p] = await Promise.all([
        getUserWords(user.uid, profile.targetLang, profile.nativeLang),
        getProgress(user.uid, profile.targetLang, profile.nativeLang),
      ]);
      setWords(w);
      setProgress(p);
      setLoading(false);
    });
  }, []);

  useEffect(() => { setPage(1); setExpanded(null); }, [filter, search, groupBy, topicFilter]);

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
      await rateWord(uid, word.id, rating, prev, targetLang, nativeLang);
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

  const allTopics = Array.from(new Set(words.map(w => w.topic)));

  const filtered = words.filter(w => {
    if (topicFilter !== 'all' && w.topic !== topicFilter) return false;
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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  type Group = { label: string; sublabel: string; words: Word[]; color: string };
  const groups: Group[] = [];

  if (groupBy === 'topic') {
    if (topicFilter !== 'all') {
      groups.push({ label: topicFilter, sublabel: `${paginated.length} words`, words: paginated, color: 'var(--muted)' });
    } else {
      const topics = Array.from(new Set(paginated.map(w => w.topic)));
      topics.forEach(topic => {
        const tw      = paginated.filter(w => w.topic === topic);
        const due     = tw.filter(w => getStatus(w) === 'due').length;
        const mastered = tw.filter(w => getStatus(w) === 'mastered').length;
        groups.push({
          label:    topic,
          sublabel: `${tw.length} words · ${due} due · ${mastered} mastered`,
          words:    tw,
          color:    due > 0 ? '#EF9F27' : mastered === tw.length ? '#00e87a' : 'var(--muted-bright)',
        });
      });
    }
  } else {
    [
      { key: 'due' as StatusFilter,      label: 'Due for review', color: '#EF9F27' },
      { key: 'learning' as StatusFilter, label: 'Still learning', color: '#378ADD' },
      { key: 'mastered' as StatusFilter, label: 'Mastered',       color: '#00e87a' },
    ].forEach(sg => {
      const sw = paginated.filter(w => getStatus(w) === sg.key);
      if (sw.length) groups.push({ label: sg.label, sublabel: `${sw.length} word${sw.length !== 1 ? 's' : ''}`, words: sw, color: sg.color });
    });
  }

  const counts = {
    all:      words.length,
    due:      words.filter(w => getStatus(w) === 'due').length,
    learning: words.filter(w => getStatus(w) === 'learning').length,
    mastered: words.filter(w => getStatus(w) === 'mastered').length,
  };

  if (loading) return (
    <Screen>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><Spinner /></div>
    </Screen>
  );

  if (!words.length) return (
    <Screen>
      <TopBar onBack={() => router.push('/dashboard')} title="词 Word List" />
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p style={{ fontSize: '40px', marginBottom: '1rem' }}>📭</p>
        <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--fg)', marginBottom: '8px' }}>No words yet</p>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '2rem' }}>Generate vocabulary from the dashboard.</p>
        <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>Go to dashboard</button>
      </div>
    </Screen>
  );

  return (
    <Screen>
      <TopBar onBack={() => router.push('/dashboard')} title="词 Word List" />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '1rem' }}>
        {[
          { key: 'due',      label: 'Due',      value: counts.due,      color: '#EF9F27', dim: 'rgba(239,159,39,0.12)' },
          { key: 'learning', label: 'Learning', value: counts.learning, color: '#378ADD', dim: 'rgba(55,138,221,0.12)' },
          { key: 'mastered', label: 'Mastered', value: counts.mastered, color: '#00e87a', dim: 'rgba(0,232,122,0.12)' },
        ].map(s => (
          <button key={s.key}
            onClick={() => setFilter(filter === s.key as StatusFilter ? 'all' : s.key as StatusFilter)}
            style={{
              padding: '10px 8px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', transition: 'all 0.15s',
              border: `1px solid ${filter === s.key ? s.color + '60' : 'var(--border)'}`,
              background: filter === s.key ? s.dim : 'var(--surface)',
            }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: filter === s.key ? s.color : 'var(--fg)' }}>{s.value}</div>
            <div style={{ fontSize: '10px', color: filter === s.key ? s.color : 'var(--muted)', marginTop: '2px', letterSpacing: '0.06em' }}>{s.label.toUpperCase()}</div>
          </button>
        ))}
      </div>

      {/* Topic tabs */}
      {allTopics.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          <style>{`div::-webkit-scrollbar{display:none}`}</style>
          {['all', ...allTopics].map(topic => {
            const isActive   = topicFilter === topic;
            const topicWords = topic === 'all' ? words : words.filter(w => w.topic === topic);
            const due        = topicWords.filter(w => getStatus(w) === 'due').length;
            return (
              <button key={topic} onClick={() => { setTopicFilter(topic); setExpanded(null); }}
                style={{
                  flexShrink: 0, padding: '6px 12px', borderRadius: '99px', cursor: 'pointer',
                  fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: isActive ? 600 : 400,
                  whiteSpace: 'nowrap', transition: 'all 0.15s',
                  border: `1px solid ${isActive ? 'rgba(0,232,122,0.5)' : 'var(--border)'}`,
                  background: isActive ? 'rgba(0,232,122,0.12)' : 'var(--surface)',
                  color: isActive ? '#00e87a' : 'var(--muted)',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                {topic === 'all' ? 'All topics' : topic}
                {due > 0 && (
                  <span style={{ fontSize: '10px', fontWeight: 700, background: '#EF9F27', color: '#000', borderRadius: '99px', padding: '1px 5px', minWidth: '16px', textAlign: 'center' }}>
                    {due}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '14px', pointerEvents: 'none' }}>⌕</span>
        <input type="text" placeholder="Search kanji, meaning, topic…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--fg)', fontSize: '13px', fontFamily: 'var(--font-ui)', width: '100%', padding: '9px 12px 9px 32px', outline: 'none' }}
        />
      </div>

      {/* Group toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '1rem' }}>
        <span style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.06em' }}>GROUP:</span>
        {(['topic', 'status'] as GroupBy[]).map(g => (
          <button key={g} onClick={() => setGroupBy(g)} style={{
            padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '11px', letterSpacing: '0.04em',
            border: '1px solid var(--border)',
            background: groupBy === g ? 'var(--fg)' : 'transparent',
            color: groupBy === g ? 'var(--bg)' : 'var(--muted)', transition: 'all 0.15s',
          }}>
            {g.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1rem' }} />

      {/* Empty */}
      {!filtered.length && (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)', fontSize: '14px' }}>
          No words match your filter.
        </div>
      )}

      {/* Groups */}
      {groups.map(group => (
        <div key={group.label} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: group.color, letterSpacing: '0.06em' }}>
              {group.label.toUpperCase()}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--muted)' }}>{group.sublabel}</p>
          </div>

          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {group.words.map((w, i) => {
              const status     = getStatus(w);
              const prog       = progress[w.id];
              const isExpanded = expanded === w.id;
              const isLast     = i === group.words.length - 1;
              const accentColor = status === 'due' ? '#EF9F27' : status === 'mastered' ? '#00e87a' : 'transparent';

              return (
                <div key={w.id}>
                  {/* Row */}
                  <button onClick={() => handleToggle(w.id, w.kanji)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      gap: '12px', padding: '11px 14px', textAlign: 'left',
                      borderBottom: (!isLast || isExpanded) ? '1px solid var(--border)' : 'none',
                      background: isExpanded ? 'var(--surface-2)' : 'var(--surface)',
                      cursor: 'pointer', fontFamily: 'var(--font-ui)',
                      transition: 'background 0.15s',
                      borderLeft: `3px solid ${accentColor}`,
                    }}>
                    <span style={{ fontSize: '22px', minWidth: '32px', textAlign: 'center', fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: 'var(--fg)' }}>
                      {w.kanji}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--fg)', marginBottom: '1px', lineHeight: 1.3 }}>{w.meaning}</p>
                      <p style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        {w.reading}{w.romanization ? ` · ${w.romanization}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 500,
                        color: status === 'due' ? '#EF9F27' : status === 'mastered' ? '#00e87a' : '#378ADD',
                      }}>
                        {status === 'due' ? `⏱ ${getDaysUntil(w)}` : status === 'mastered' ? '✓ done' : getDaysUntil(w)}
                      </span>
                      {prog && <span style={{ fontSize: '10px', color: 'var(--muted)' }}>{prog.correct}✓ {prog.wrong}✗</span>}
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', marginLeft: '4px' }}>›</span>
                  </button>

                  {/* Expanded */}
                  {isExpanded && (
                    <div style={{
                      padding: '14px 16px', background: 'var(--bg)',
                      borderBottom: !isLast ? '1px solid var(--border)' : 'none',
                      animation: 'fadeIn 0.15s ease',
                      borderLeft: `3px solid ${accentColor}`,
                    }}>
                      {/* Voice + reading */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                        <button onClick={() => { setSpeaking(true); speak(w.kanji, targetLang); setTimeout(() => setSpeaking(false), 1200); }}
                          style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            border: `1px solid ${speaking ? 'rgba(0,232,122,0.6)' : 'var(--border)'}`,
                            background: speaking ? 'rgba(0,232,122,0.15)' : 'var(--surface)',
                            cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s', color: 'var(--fg)',
                          }}>🔊</button>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--fg)' }}>
                            {w.reading}
                            {w.romanization && <span style={{ fontSize: '12px', color: 'var(--muted)', marginLeft: '6px' }}>· {w.romanization}</span>}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--muted)' }}>{w.type} · {w.topic}</p>
                        </div>
                      </div>

                      {/* Example */}
                      {w.example && (
                        <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: w.example_translation ? '6px' : '0' }}>
                            <span style={{ fontSize: '13px', marginTop: '2px', color: 'var(--muted)' }}>💬</span>
                            <p style={{ flex: 1, fontSize: '13px', lineHeight: 1.7, color: 'var(--fg)', fontFamily: '"Noto Sans JP","Noto Sans SC",serif' }}>{w.example}</p>
                            <button onClick={() => { setSpeaking(true); speak(w.example, targetLang); setTimeout(() => setSpeaking(false), w.example.length * 80); }}
                              style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }}>
                              🔊
                            </button>
                          </div>
                          {w.example_translation && (
                            <p style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', paddingTop: '6px', borderTop: '1px solid var(--border)', paddingLeft: '20px' }}>
                              {w.example_translation}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Stats + quick review */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        {prog && (
                          <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                            {prog.correct}✓ {prog.wrong}✗ · {prog.interval} · next {getDaysUntil(w)}
                          </span>
                        )}
                        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                          <button onClick={() => handleQuickReview(w, 'good')} disabled={reviewing} style={{
                            padding: '5px 10px', borderRadius: '7px',
                            border: '1px solid rgba(0,232,122,0.35)',
                            background: 'rgba(0,232,122,0.1)', color: '#00e87a',
                            fontSize: '11px', fontWeight: 500, cursor: reviewing ? 'not-allowed' : 'pointer',
                            fontFamily: 'var(--font-ui)', opacity: reviewing ? 0.5 : 1,
                          }}>✓ Know it · 7d</button>
                          <button onClick={() => handleQuickReview(w, 'easy')} disabled={reviewing} style={{
                            padding: '5px 10px', borderRadius: '7px',
                            border: '1px solid rgba(55,138,221,0.35)',
                            background: 'rgba(55,138,221,0.1)', color: '#7bbfff',
                            fontSize: '11px', fontWeight: 500, cursor: reviewing ? 'not-allowed' : 'pointer',
                            fontFamily: 'var(--font-ui)', opacity: reviewing ? 0.5 : 1,
                          }}>⚡ Easy · 30d</button>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <button className="btn" style={{ fontSize: '12px', padding: '5px 12px' }}
            disabled={page === 1}
            onClick={() => { setPage(p => p - 1); setExpanded(null); window.scrollTo(0, 0); }}>
            ← Prev
          </button>
          <div style={{ display: 'flex', gap: '4px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
              .reduce<(number | '...')[]>((acc, n, idx, arr) => {
                if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(n); return acc;
              }, [])
              .map((n, i) => n === '...' ? (
                <span key={`e-${i}`} style={{ padding: '6px 4px', fontSize: '12px', color: 'var(--muted)' }}>…</span>
              ) : (
                <button key={n} onClick={() => { setPage(n as number); setExpanded(null); window.scrollTo(0, 0); }} style={{
                  width: '30px', height: '30px', borderRadius: '6px',
                  border: '1px solid', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  borderColor: page === n ? 'rgba(0,232,122,0.5)' : 'var(--border)',
                  background: page === n ? 'rgba(0,232,122,0.12)' : 'transparent',
                  color: page === n ? '#00e87a' : 'var(--muted)',
                  fontWeight: page === n ? 600 : 400, transition: 'all 0.15s',
                }}>{n}</button>
              ))}
          </div>
          <button className="btn" style={{ fontSize: '12px', padding: '5px 12px' }}
            disabled={page === totalPages}
            onClick={() => { setPage(p => p + 1); setExpanded(null); window.scrollTo(0, 0); }}>
            Next →
          </button>
        </div>
      )}

      {totalPages > 1 && (
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
          {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} words
        </p>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-ui)', padding: '0 1rem 4rem' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>{children}</div>
    </main>
  );
}

function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1.5rem 0 1rem' }}>
      <button onClick={onBack} style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px',
        padding: '6px 12px', color: 'var(--fg)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)',
      }}>← Back</button>
      <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.01em' }}>{title}</span>
    </div>
  );
}

function Spinner() {
  return <div style={{ width: '24px', height: '24px', border: '2px solid var(--surface-2)', borderTopColor: '#00e87a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}
