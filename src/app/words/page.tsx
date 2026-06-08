'use client';
import { Spinner } from '@/components/Spinner';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getUserProfile, getUserWords, getProgress, rateWord } from '@/lib/firestore';
import { Word, Progress, TargetLang, NativeLang, VOICE_LANG } from '@/lib/types';
import { isDue, isMastered } from '@/lib/srs';
import AuthGuard from '@/components/AuthGuard';

export default function WordsPage() { return <AuthGuard><WordList /></AuthGuard>; }

type StatusFilter = 'all' | 'due' | 'learning' | 'mastered';
type GroupBy      = 'topic' | 'status';
type TopicFilter  = string | 'all';
const PAGE_SIZE   = 10;

function speak(text: string, targetLang: TargetLang) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = VOICE_LANG[targetLang] ?? 'ja-JP'; u.rate = 0.8;
  const v = window.speechSynthesis.getVoices().find(v => v.lang.startsWith(VOICE_LANG[targetLang].split('-')[0]));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
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

  useEffect(() => { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices(); }, []);
  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return; setUid(user.uid);
      const p = await getUserProfile(user.uid); if (!p) return;
      setTargetLang(p.targetLang); setNativeLang(p.nativeLang);
      const [w, pr] = await Promise.all([getUserWords(user.uid, p.targetLang, p.nativeLang), getProgress(user.uid, p.targetLang, p.nativeLang)]);
      setWords(w); setProgress(pr); setLoading(false);
    });
  }, []);
  useEffect(() => { setPage(1); setExpanded(null); }, [filter, search, groupBy, topicFilter]);

  const getStatus = useCallback((w: Word): 'mastered' | 'due' | 'learning' => {
    const p = progress[w.id];
    if (!p) return 'learning';
    if (isMastered(p)) return 'mastered';
    if (isDue(p)) return 'due';
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
    if (expanded === id) { setExpanded(null); window.speechSynthesis.cancel(); }
    else { setExpanded(id); setSpeaking(true); speak(kanji, targetLang); setTimeout(() => setSpeaking(false), 1200); }
  }

  async function handleQuickReview(word: Word, rating: 'good' | 'easy') {
    if (reviewing) return; setReviewing(true);
    const prev = progress[word.id];
    if (prev) {
      await rateWord(uid, word.id, rating, prev, targetLang, nativeLang);
      // Optimistic update with correct interval number matching rateWord logic
      const nextMs = rating === 'easy' ? 30 * 86400000 : 7 * 86400000;
      setProgress(p => ({ ...p, [word.id]: { ...prev, correct: prev.correct + 1, interval: rating, nextReview: Date.now() + nextMs, lastReviewed: Date.now() } }));
    }
    setReviewing(false);
  }

  const allTopics = Array.from(new Set(words.map(w => w.topic)));
  const filtered  = words.filter(w => {
    if (topicFilter !== 'all' && w.topic !== topicFilter) return false;
    if (filter !== 'all' && getStatus(w) !== filter) return false;
    if (search) { const q = search.toLowerCase(); return w.kanji.includes(q) || w.meaning.toLowerCase().includes(q) || w.reading?.toLowerCase().includes(q) || w.topic?.toLowerCase().includes(q); }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const counts     = { all: words.length, due: words.filter(w => getStatus(w) === 'due').length, learning: words.filter(w => getStatus(w) === 'learning').length, mastered: words.filter(w => getStatus(w) === 'mastered').length };

  type Group = { label: string; sublabel: string; words: Word[]; color: string; accent: string };
  const groups: Group[] = [];
  if (groupBy === 'topic') {
    if (topicFilter !== 'all') {
      groups.push({ label: topicFilter, sublabel: `${paginated.length} words`, words: paginated, color: 'var(--blue)', accent: 'var(--blue-light)' });
    } else {
      Array.from(new Set(paginated.map(w => w.topic))).forEach(topic => {
        const tw = paginated.filter(w => w.topic === topic);
        const due = tw.filter(w => getStatus(w) === 'due').length;
        const mastered = tw.filter(w => getStatus(w) === 'mastered').length;
        groups.push({ label: topic, sublabel: `${tw.length} words · ${due} due · ${mastered} mastered`, words: tw, color: due > 0 ? 'var(--orange)' : mastered === tw.length ? 'var(--green)' : 'var(--blue)', accent: due > 0 ? 'var(--orange-light)' : mastered === tw.length ? 'var(--green-light)' : 'var(--blue-light)' });
      });
    }
  } else {
    [
      { key: 'due' as StatusFilter,      label: 'Due for Review', color: 'var(--orange)', accent: 'var(--orange-light)' },
      { key: 'learning' as StatusFilter, label: 'Still Learning', color: 'var(--blue)',   accent: 'var(--blue-light)'   },
      { key: 'mastered' as StatusFilter, label: 'Mastered',       color: 'var(--green)',  accent: 'var(--green-light)'  },
    ].forEach(sg => {
      const sw = paginated.filter(w => getStatus(w) === sg.key);
      if (sw.length) groups.push({ label: sg.label, sublabel: `${sw.length} word${sw.length !== 1 ? 's' : ''}`, words: sw, color: sg.color, accent: sg.accent });
    });
  }

  if (loading) return (
    <Shell>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1, minHeight:'60vh' }}><Spinner size={40} color="var(--blue)" /></div>
    </Shell>
  );

  if (!words.length) return (
    <Shell>
      <TopBar onBack={() => router.push('/dashboard')} />
      <div style={{ textAlign:'center', padding:'4rem 1rem' }}>
        <p style={{ fontSize:'56px', marginBottom:'1rem' }}>📭</p>
        <p style={{ fontFamily:'var(--font-display)', fontSize:'20px', fontWeight:800, color:'var(--fg)', marginBottom:'8px' }}>No words yet!</p>
        <p style={{ fontSize:'14px', color:'var(--muted)', fontWeight:600, marginBottom:'2rem' }}>Generate vocabulary from the dashboard first.</p>
        <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>Go to Dashboard</button>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <TopBar onBack={() => router.push('/dashboard')} />

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'1rem' }}>
        {[
          { key:'due',      emoji:'⏰', label:'Due',      value:counts.due,      color:'var(--orange)', accent:'var(--orange-light)' },
          { key:'learning', emoji:'📖', label:'Learning', value:counts.learning, color:'var(--blue)',   accent:'var(--blue-light)'   },
          { key:'mastered', emoji:'⭐', label:'Mastered', value:counts.mastered, color:'var(--green)',  accent:'var(--green-light)'  },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(filter === s.key as StatusFilter ? 'all' : s.key as StatusFilter)}
            style={{ padding:'10px 8px', borderRadius:'14px', textAlign:'center', cursor:'pointer', fontFamily:'var(--font-ui)', transition:'all 0.1s ease', border:`2.5px solid ${filter === s.key ? s.color : 'var(--border-dark)'}`, background: filter === s.key ? s.accent : '#fff', boxShadow: filter === s.key ? `0 4px 0 ${s.color}55` : '0 4px 0 var(--border-dark)', transform: filter === s.key ? 'translateY(2px)' : 'none' }}>
            <div style={{ fontSize:'18px', marginBottom:'2px' }}>{s.emoji}</div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'18px', fontWeight:800, color:filter === s.key ? s.color : 'var(--fg)', lineHeight:1 }}>{s.value}</div>
            <div style={{ fontSize:'10px', fontWeight:700, color:filter === s.key ? s.color : 'var(--muted)', marginTop:'2px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Topic tabs */}
      {allTopics.length > 1 && (
        <div style={{ display:'flex', gap:'6px', marginBottom:'10px', overflowX:'auto', paddingBottom:'4px' }}>
          {['all', ...allTopics].map(topic => {
            const isActive = topicFilter === topic;
            const due = (topic === 'all' ? words : words.filter(w => w.topic === topic)).filter(w => getStatus(w) === 'due').length;
            return (
              <button key={topic} onClick={() => { setTopicFilter(topic); setExpanded(null); }}
                style={{ flexShrink:0, padding:'6px 12px', borderRadius:'99px', cursor:'pointer', fontFamily:'var(--font-ui)', fontSize:'12px', fontWeight:700, whiteSpace:'nowrap', transition:'all 0.1s ease', border:`2px solid ${isActive ? 'var(--green)' : 'var(--border-dark)'}`, background: isActive ? 'var(--green-light)' : '#fff', color: isActive ? '#2a7a00' : 'var(--muted-bright)', boxShadow: isActive ? '0 2px 0 var(--green-dark)' : '0 2px 0 var(--border-dark)', display:'flex', alignItems:'center', gap:'5px' }}>
                {topic === 'all' ? 'All topics' : topic}
                {due > 0 && <span style={{ fontSize:'10px', fontWeight:800, background:'var(--orange)', color:'#fff', borderRadius:'99px', padding:'1px 6px' }}>{due}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Search */}
      <div style={{ position:'relative', marginBottom:'10px' }}>
        <span style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'var(--muted)', fontSize:'16px', pointerEvents:'none' }}>🔍</span>
        <input type="text" placeholder="Search kanji, meaning, topic…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft:'40px', background:'#fff', border:'2.5px solid var(--border-dark)', borderRadius:'12px', color:'var(--fg)', fontSize:'13px', fontFamily:'var(--font-ui)', fontWeight:600, width:'100%', padding:'10px 14px 10px 40px', outline:'none', boxShadow:'0 3px 0 var(--border-dark)', transition:'border-color 0.15s, box-shadow 0.15s' }}
        />
      </div>

      {/* Group toggle */}
      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'1rem' }}>
        <span style={{ fontSize:'11px', fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Group:</span>
        {(['topic','status'] as GroupBy[]).map(g => (
          <button key={g} onClick={() => setGroupBy(g)} style={{ padding:'5px 12px', borderRadius:'8px', cursor:'pointer', fontFamily:'var(--font-ui)', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.04em', border:`2px solid ${groupBy === g ? 'var(--blue)' : 'var(--border-dark)'}`, background: groupBy === g ? 'var(--blue-light)' : '#fff', color: groupBy === g ? 'var(--blue-dark)' : 'var(--muted)', boxShadow: groupBy === g ? '0 2px 0 var(--blue-dark)' : '0 2px 0 var(--border-dark)', transition:'all 0.1s ease' }}>
            {g}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <div style={{ textAlign:'center', padding:'2rem', color:'var(--muted)', fontSize:'14px', fontWeight:600, background:'#fff', borderRadius:'14px', border:'2.5px solid var(--border-dark)' }}>No words match your filter.</div>
      ) : (
        groups.map(group => (
          <div key={group.label} style={{ marginBottom:'1.5rem' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
              <span style={{ fontSize:'12px', fontWeight:800, color:group.color, textTransform:'uppercase', letterSpacing:'0.08em' }}>{group.label}</span>
              <span style={{ fontSize:'11px', color:'var(--muted)', fontWeight:700 }}>{group.sublabel}</span>
            </div>
            <div style={{ borderRadius:'16px', overflow:'hidden', border:'2.5px solid var(--border-dark)', boxShadow:'0 4px 0 var(--border-dark)', background:'#fff' }}>
              {group.words.map((w, i) => {
                const status     = getStatus(w);
                const prog       = progress[w.id];
                const isExpanded = expanded === w.id;
                const isLast     = i === group.words.length - 1;
                const accentColor = status === 'due' ? 'var(--orange)' : status === 'mastered' ? 'var(--green)' : 'var(--border-dark)';
                const statusBg    = status === 'due' ? 'var(--orange-light)' : status === 'mastered' ? 'var(--green-light)' : 'var(--blue-light)';
                return (
                  <div key={w.id}>
                    <button onClick={() => handleToggle(w.id, w.kanji)} style={{ width:'100%', display:'flex', alignItems:'center', gap:'12px', padding:'12px 14px', textAlign:'left', borderBottom:(!isLast || isExpanded) ? '1.5px solid var(--border)' : 'none', background: isExpanded ? 'var(--bg-secondary)' : '#fff', cursor:'pointer', fontFamily:'var(--font-ui)', transition:'background 0.1s', borderLeft:`4px solid ${accentColor}` }}>
                      <span style={{ fontSize:'24px', minWidth:'34px', textAlign:'center', fontFamily:'"Noto Sans JP","Noto Sans SC",serif', color:'var(--fg)' }}>{w.kanji}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:'14px', fontWeight:700, color:'var(--fg)', marginBottom:'1px', lineHeight:1.3 }}>{w.meaning}</p>
                        <p style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600 }}>{w.reading}{w.romanization ? ` · ${w.romanization}` : ''}</p>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'3px', flexShrink:0 }}>
                        <span style={{ fontSize:'11px', fontWeight:800, padding:'2px 8px', borderRadius:'99px', background:statusBg, color:status === 'due' ? '#a05600' : status === 'mastered' ? '#2a7a00' : 'var(--blue-dark)', border:`1.5px solid ${status === 'due' ? '#ffbe5a' : status === 'mastered' ? '#8ed44a' : '#74d4ff'}` }}>
                          {status === 'due' ? `⏰ ${getDaysUntil(w)}` : status === 'mastered' ? '⭐ Done' : `📖 ${getDaysUntil(w)}`}
                        </span>
                        {prog && <span style={{ fontSize:'10px', color:'var(--muted)', fontWeight:600 }}>{prog.correct}✓ {prog.wrong}✗</span>}
                      </div>
                      <span style={{ fontSize:'14px', color:'var(--muted)', transform:isExpanded ? 'rotate(90deg)' : 'none', transition:'transform 0.2s', marginLeft:'4px', fontWeight:700 }}>›</span>
                    </button>

                    {isExpanded && (
                      <div style={{ padding:'14px 16px', background:'var(--bg)', borderBottom:!isLast ? '1.5px solid var(--border)' : 'none', animation:'fadeIn 0.15s ease', borderLeft:`4px solid ${accentColor}` }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
                          <button onClick={() => { setSpeaking(true); speak(w.kanji, targetLang); setTimeout(() => setSpeaking(false), 1200); }}
                            style={{ width:'40px', height:'40px', borderRadius:'50%', border:`2.5px solid ${speaking ? 'var(--blue)' : 'var(--border-dark)'}`, background:speaking ? 'var(--blue-light)' : '#fff', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 3px 0 var(--border-dark)' }}>🔊</button>
                          <div>
                            <p style={{ fontSize:'14px', fontWeight:700, color:'var(--fg)' }}>{w.reading}{w.romanization && <span style={{ fontSize:'12px', color:'var(--muted)', marginLeft:'6px' }}>· {w.romanization}</span>}</p>
                            <p style={{ fontSize:'11px', color:'var(--muted)', fontWeight:600 }}>{w.type} · {w.topic}</p>
                          </div>
                        </div>
                        {w.example && (
                          <div style={{ padding:'12px 14px', background:'#fff', borderRadius:'12px', border:'2px solid var(--border-dark)', marginBottom:'12px', boxShadow:'0 3px 0 var(--border-dark)' }}>
                            <div style={{ display:'flex', alignItems:'flex-start', gap:'6px', marginBottom:w.example_translation ? '8px' : 0 }}>
                              <span style={{ fontSize:'13px', color:'var(--muted)', marginTop:'2px' }}>💬</span>
                              <p style={{ flex:1, fontSize:'14px', lineHeight:1.7, color:'var(--fg)', fontFamily:'"Noto Sans JP","Noto Sans SC",serif' }}>{w.example}</p>
                              <button onClick={() => { setSpeaking(true); speak(w.example, targetLang); setTimeout(() => setSpeaking(false), w.example.length * 80); }}
                                style={{ width:'28px', height:'28px', borderRadius:'50%', border:'2px solid var(--border-dark)', background:'var(--bg-secondary)', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center' }}>🔊</button>
                            </div>
                            {w.example_translation && <p style={{ fontSize:'12px', color:'var(--muted)', fontStyle:'italic', borderTop:'1.5px solid var(--border)', paddingTop:'6px', paddingLeft:'20px', fontWeight:600 }}>{w.example_translation}</p>}
                          </div>
                        )}
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
                          {prog && <span style={{ fontSize:'12px', color:'var(--muted)', fontWeight:600 }}>{prog.correct}✓ {prog.wrong}✗ · next {getDaysUntil(w)}</span>}
                          <div style={{ display:'flex', gap:'6px', marginLeft:'auto' }}>
                            <button onClick={() => handleQuickReview(w, 'good')} disabled={reviewing} className="btn" style={{ padding:'6px 12px', fontSize:'12px', background:'var(--green-light)', borderColor:'var(--green)', color:'#2a7a00', boxShadow:'0 2px 0 var(--green-dark)' }}>✓ Know it · 7d</button>
                            <button onClick={() => handleQuickReview(w, 'easy')} disabled={reviewing} className="btn" style={{ padding:'6px 12px', fontSize:'12px', background:'var(--blue-light)', borderColor:'var(--blue)', color:'var(--blue-dark)', boxShadow:'0 2px 0 var(--blue-dark)' }}>⚡ Easy · 30d</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', marginTop:'1rem', paddingTop:'1rem', borderTop:'2px solid var(--border-dark)' }}>
          <button className="btn" style={{ fontSize:'12px', padding:'6px 12px' }} disabled={page === 1} onClick={() => { setPage(p => p - 1); setExpanded(null); window.scrollTo(0,0); }}>← Prev</button>
          <div style={{ display:'flex', gap:'4px' }}>
            {Array.from({ length: totalPages }, (_,i) => i+1).filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1).reduce<(number|'...')[]>((acc, n, idx, arr) => { if (idx > 0 && n - (arr[idx-1] as number) > 1) acc.push('...'); acc.push(n); return acc; }, []).map((n, i) =>
              n === '...' ? <span key={`e-${i}`} style={{ padding:'6px 4px', fontSize:'12px', color:'var(--muted)' }}>…</span>
              : <button key={n} onClick={() => { setPage(n as number); setExpanded(null); window.scrollTo(0,0); }}
                  style={{ width:'32px', height:'32px', borderRadius:'8px', border:`2px solid ${page === n ? 'var(--green)' : 'var(--border-dark)'}`, fontSize:'12px', cursor:'pointer', fontFamily:'var(--font-ui)', fontWeight:700, background: page === n ? 'var(--green-light)' : '#fff', color: page === n ? '#2a7a00' : 'var(--muted)', boxShadow: page === n ? '0 2px 0 var(--green-dark)' : '0 2px 0 var(--border-dark)', transition:'all 0.1s' }}>{n}</button>
            )}
          </div>
          <button className="btn" style={{ fontSize:'12px', padding:'6px 12px' }} disabled={page === totalPages} onClick={() => { setPage(p => p + 1); setExpanded(null); window.scrollTo(0,0); }}>Next →</button>
        </div>
      )}
      {totalPages > 1 && <p style={{ textAlign:'center', fontSize:'11px', color:'var(--muted)', marginTop:'6px', fontWeight:600 }}>{((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length} words</p>}

      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight:'100vh', background:'var(--bg)', fontFamily:'var(--font-ui)', padding:'0 1rem 4rem', position:'relative' }}>
      <div style={{ position:'fixed', top:'-80px', right:'-80px', width:'280px', height:'280px', borderRadius:'50%', background:'rgba(28,176,246,0.07)', filter:'blur(50px)', pointerEvents:'none' }} />
      <div style={{ maxWidth:'680px', margin:'0 auto', position:'relative', zIndex:1 }}>{children}</div>
    </main>
  );
}
function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'1.5rem 0 1rem' }}>
      <button className="btn" style={{ fontSize:'13px', padding:'8px 14px' }} onClick={onBack}>← Back</button>
      <span style={{ fontFamily:'var(--font-display)', fontSize:'20px', fontWeight:800, color:'var(--fg)' }}>📖 Word List</span>
    </div>
  );
}
