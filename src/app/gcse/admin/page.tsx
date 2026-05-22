'use client';
import { Spinner } from '@/components/Spinner';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { getAllLessons, publishLesson, deleteLesson, saveLessonDraft, GCSELesson } from '@/lib/gcse-lessons';

// ── Set your admin UID in .env.local ──────────────────
// NEXT_PUBLIC_ADMIN_UID=your_firebase_uid_here
const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID ?? '';

const SUBJECTS = ['maths', 'english', 'science'];

const SUBJECT_TOPICS: Record<string, string[]> = {
  maths: [
    'Linear equations', 'Simultaneous equations', 'Quadratic equations',
    'Sequences & nth term', 'Inequalities', 'Pythagoras theorem',
    'Trigonometry (SOH CAH TOA)', 'Circle theorems', 'Vectors',
    'Area & volume', 'Percentages', 'Ratio & proportion',
    'Standard form', 'Surds', 'Probability basics', 'Mean, median, mode & range',
  ],
  english: [
    'Metaphor & simile', 'Personification', 'Alliteration & sibilance',
    'Pathetic fallacy', 'Semantic field', 'Retrieval (AO1)',
    'Language analysis (AO2)', 'Structure analysis (AO3)',
    'Writing to persuade', 'Writing to describe', 'Formal letter writing',
    'Varying sentence structure',
  ],
  science: [
    'Cell structure & function', 'Osmosis', 'Photosynthesis',
    'Aerobic & anaerobic respiration', 'DNA, genes & chromosomes',
    'Monohybrid inheritance', 'Natural selection & evolution',
    'Ionic bonding', 'Covalent bonding', 'Moles & relative formula mass',
    'Rate of reaction — collision theory', 'Atomic structure & isotopes',
    'Speed, velocity & acceleration', 'Newton\'s laws of motion',
    'Specific heat capacity', 'Radioactive decay & half-life',
  ],
};

const SUBJECT_COLOR: Record<string, string> = {
  maths:   '#378ADD',
  english: '#7F77DD',
  science: '#00e87a',
};

export default function AdminLessonsPage() {
  const router = useRouter();

  const [uid, setUid]             = useState('');
  const [authed, setAuthed]       = useState(false);
  const [lessons, setLessons]     = useState<GCSELesson[]>([]);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus]   = useState<'all' | 'published' | 'draft'>('all');

  // Create form
  const [createSubject, setCreateSubject] = useState('maths');
  const [createTopic, setCreateTopic]     = useState('');
  const [customTopic, setCustomTopic]     = useState('');
  const [showCreate, setShowCreate]       = useState(false);
  const [error, setError]                 = useState('');

  useEffect(() => {
    return onAuth(async user => {
      if (!user) { router.push('/dashboard'); return; }
      if (ADMIN_UID && user.uid !== ADMIN_UID) { router.push('/dashboard'); return; }
      setUid(user.uid);
      setAuthed(true);
      const all = await getAllLessons();
      setLessons(all);
      setLoading(false);
    });
  }, []);

  async function handleGenerate() {
    const topic = customTopic.trim() || createTopic;
    if (!topic) { setError('Select or type a topic'); return; }
    setGenerating(true); setError('');
    try {
      const res  = await fetch('/api/gcse/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: createSubject, topic, saveToDb: false }),
      });
      const data = await res.json();
      if (!data.cards?.length) throw new Error('No cards returned');

      // Save as draft
      const id = await saveLessonDraft({
        subject:   createSubject,
        topic,
        cards:     data.cards,
        published: false,
        createdBy: uid,
      });

      // Refresh list
      const all = await getAllLessons();
      setLessons(all);
      setShowCreate(false);
      setCustomTopic(''); setCreateTopic('');

      // Go straight to editor
      router.push(`/gcse/admin/edit/${id}`);
    } catch (e) {
      setError('Failed to generate. Try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleTogglePublish(lesson: GCSELesson) {
    await publishLesson(lesson.id, !lesson.published);
    setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, published: !l.published } : l));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this lesson? This cannot be undone.')) return;
    await deleteLesson(id);
    setLessons(prev => prev.filter(l => l.id !== id));
  }

  const filtered = lessons.filter(l => {
    if (filterSubject !== 'all' && l.subject !== filterSubject) return false;
    if (filterStatus === 'published' && !l.published) return false;
    if (filterStatus === 'draft' && l.published) return false;
    return true;
  });

  const counts = {
    total:     lessons.length,
    published: lessons.filter(l => l.published).length,
    drafts:    lessons.filter(l => !l.published).length,
  };

  if (!authed || loading) return (
    <Screen>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    </Screen>
  );

  return (
    <Screen>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/gcse')} style={GHOST_BTN}>Back</button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)' }}>ADMIN</p>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Lesson Manager</h1>
        </div>
        <button onClick={() => setShowCreate(s => !s)} style={{
          padding: '8px 14px', borderRadius: '8px', cursor: 'pointer',
          background: '#00e87a', border: 'none', color: '#040e08',
          fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-ui)',
        }}>
          + New
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '1.25rem' }}>
        {[
          { label: 'Total',     value: counts.total,     color: '#fff' },
          { label: 'Published', value: counts.published, color: '#00e87a' },
          { label: 'Drafts',    value: counts.drafts,    color: '#EF9F27' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '12px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
            <p style={{ fontSize: '22px', fontWeight: 700, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.value}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>{s.label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      {/* Create panel */}
      {showCreate && (
        <div style={{ background: 'rgba(0,232,122,0.06)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(0,232,122,0.2)', marginBottom: '1.25rem', animation: 'fadeIn 0.2s ease' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#00e87a', marginBottom: '12px' }}>Generate new lesson</p>

          {/* Subject */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            {SUBJECTS.map(s => (
              <button key={s} onClick={() => { setCreateSubject(s); setCreateTopic(''); }} style={{
                flex: 1, padding: '7px', borderRadius: '8px', cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontSize: '12px',
                border: `1px solid ${createSubject === s ? SUBJECT_COLOR[s] + '55' : 'rgba(255,255,255,0.1)'}`,
                background: createSubject === s ? SUBJECT_COLOR[s] + '15' : 'transparent',
                color: createSubject === s ? SUBJECT_COLOR[s] : 'rgba(255,255,255,0.5)',
                transition: 'all 0.15s',
              }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Topic picker */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '10px' }}>
            {SUBJECT_TOPICS[createSubject]?.map(t => (
              <button key={t} onClick={() => setCreateTopic(t)} style={{
                padding: '5px 10px', borderRadius: '99px', cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontSize: '11px',
                border: `1px solid ${createTopic === t ? SUBJECT_COLOR[createSubject] + '55' : 'rgba(255,255,255,0.1)'}`,
                background: createTopic === t ? SUBJECT_COLOR[createSubject] + '15' : 'transparent',
                color: createTopic === t ? SUBJECT_COLOR[createSubject] : 'rgba(255,255,255,0.4)',
                transition: 'all 0.15s',
              }}>
                {t}
              </button>
            ))}
          </div>

          {/* Custom topic */}
          <input
            type="text"
            placeholder="Or type a custom topic..."
            value={customTopic}
            onChange={e => setCustomTopic(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', marginBottom: '10px' }}
          />

          {error && <p style={{ fontSize: '12px', color: '#ff8080', marginBottom: '8px' }}>{error}</p>}

          <button onClick={handleGenerate} disabled={generating} style={{
            width: '100%', padding: '11px', borderRadius: '10px',
            background: '#00e87a', border: 'none', color: '#040e08',
            fontSize: '14px', fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-ui)', opacity: generating ? 0.6 : 1,
          }}>
            {generating ? 'Generating...' : 'Generate + open editor'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['all', 'maths', 'english', 'science'].map(f => (
          <button key={f} onClick={() => setFilterSubject(f)} style={{
            padding: '5px 12px', borderRadius: '99px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '11px',
            border: `1px solid ${filterSubject === f ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
            background: filterSubject === f ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: filterSubject === f ? '#fff' : 'rgba(255,255,255,0.4)',
            transition: 'all 0.15s',
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div style={{ height: '28px', width: '1px', background: 'rgba(255,255,255,0.1)', margin: '0 2px' }} />
        {(['all', 'published', 'draft'] as const).map(f => (
          <button key={f} onClick={() => setFilterStatus(f)} style={{
            padding: '5px 12px', borderRadius: '99px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '11px',
            border: `1px solid ${filterStatus === f ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
            background: filterStatus === f ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: filterStatus === f ? '#fff' : 'rgba(255,255,255,0.4)',
            transition: 'all 0.15s',
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Lesson list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
          No lessons yet. Click + New to generate one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(l => {
            const color = SUBJECT_COLOR[l.subject] ?? '#fff';
            return (
              <div key={l.id} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px', border: `1px solid ${color}18`, borderLeft: `3px solid ${l.published ? color : 'rgba(255,255,255,0.15)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', flex: 1 }}>{l.topic}</span>
                  <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: color + '15', color: color + 'cc' }}>{l.subject}</span>
                  <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '99px', background: l.published ? 'rgba(0,232,122,0.12)' : 'rgba(255,255,255,0.06)', color: l.published ? '#00e87a' : 'rgba(255,255,255,0.3)' }}>
                    {l.published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '10px' }}>
                  {l.cards?.length ?? 0} cards
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => router.push(`/gcse/admin/edit/${l.id}`)} style={{ flex: 1, padding: '7px', borderRadius: '8px', border: `1px solid ${color}30`, background: color + '10', color, fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                    Edit
                  </button>
                  <button onClick={() => handleTogglePublish(l)} style={{ flex: 1, padding: '7px', borderRadius: '8px', border: `1px solid ${l.published ? 'rgba(239,159,39,0.35)' : 'rgba(0,232,122,0.35)'}`, background: l.published ? 'rgba(239,159,39,0.1)' : 'rgba(0,232,122,0.1)', color: l.published ? '#EF9F27' : '#00e87a', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
                    {l.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button onClick={() => handleDelete(l.id)} style={{ padding: '7px 10px', borderRadius: '8px', border: '1px solid rgba(226,75,74,0.3)', background: 'rgba(226,75,74,0.08)', color: '#ff8080', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                    Del
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#06080f', backgroundImage: 'radial-gradient(ellipse at top left, #0d1428 0%, #06080f 60%)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 3rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,232,122,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,232,122,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '560px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </main>
  );
}

const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
