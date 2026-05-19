'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { saveLessonDraft, getAllLessons, GCSELesson } from '@/lib/gcse-lessons';

const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID ?? '';

const ALL_TOPICS: { subject: string; topic: string }[] = [
  // Maths
  { subject: 'maths', topic: 'Linear equations' },
  { subject: 'maths', topic: 'Simultaneous equations' },
  { subject: 'maths', topic: 'Quadratic equations' },
  { subject: 'maths', topic: 'Sequences & nth term' },
  { subject: 'maths', topic: 'Inequalities' },
  { subject: 'maths', topic: 'Pythagoras theorem' },
  { subject: 'maths', topic: 'Trigonometry (SOH CAH TOA)' },
  { subject: 'maths', topic: 'Circle theorems' },
  { subject: 'maths', topic: 'Area & volume' },
  { subject: 'maths', topic: 'Percentages' },
  { subject: 'maths', topic: 'Ratio & proportion' },
  { subject: 'maths', topic: 'Standard form' },
  { subject: 'maths', topic: 'Probability basics' },
  { subject: 'maths', topic: 'Mean, median, mode & range' },
  { subject: 'maths', topic: 'Surds' },
  { subject: 'maths', topic: 'Vectors' },
  // English
  { subject: 'english', topic: 'Metaphor & simile' },
  { subject: 'english', topic: 'Personification' },
  { subject: 'english', topic: 'Alliteration & sibilance' },
  { subject: 'english', topic: 'Pathetic fallacy' },
  { subject: 'english', topic: 'Semantic field' },
  { subject: 'english', topic: 'Language analysis (AO2)' },
  { subject: 'english', topic: 'Structure analysis (AO3)' },
  { subject: 'english', topic: 'Writing to persuade' },
  { subject: 'english', topic: 'Writing to describe' },
  { subject: 'english', topic: 'Formal letter writing' },
  { subject: 'english', topic: 'Varying sentence structure' },
  // Science
  { subject: 'science', topic: 'Cell structure & function' },
  { subject: 'science', topic: 'Osmosis' },
  { subject: 'science', topic: 'Photosynthesis' },
  { subject: 'science', topic: 'Aerobic & anaerobic respiration' },
  { subject: 'science', topic: 'DNA, genes & chromosomes' },
  { subject: 'science', topic: 'Natural selection & evolution' },
  { subject: 'science', topic: 'Ionic bonding' },
  { subject: 'science', topic: 'Covalent bonding' },
  { subject: 'science', topic: 'Moles & relative formula mass' },
  { subject: 'science', topic: 'Rate of reaction — collision theory' },
  { subject: 'science', topic: 'Atomic structure & isotopes' },
  { subject: 'science', topic: 'Speed, velocity & acceleration' },
  { subject: 'science', topic: 'Newton\'s laws of motion' },
  { subject: 'science', topic: 'Specific heat capacity' },
  { subject: 'science', topic: 'Radioactive decay & half-life' },
];

const SUBJECT_COLOR: Record<string, string> = {
  maths:   '#378ADD',
  english: '#7F77DD',
  science: '#00e87a',
};

type JobStatus = 'pending' | 'generating' | 'done' | 'error';

interface Job {
  subject: string;
  topic:   string;
  status:  JobStatus;
  id?:     string;
  error?:  string;
}

export default function AdminBulkGeneratePage() {
  const router = useRouter();

  const [authed, setAuthed]           = useState(false);
  const [uid, setUid]                 = useState('');
  const [existing, setExisting]       = useState<Set<string>>(new Set());
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [jobs, setJobs]               = useState<Job[]>([]);
  const [running, setRunning]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [autoPublish, setAutoPublish] = useState(false);

  useEffect(() => {
    return onAuth(async user => {
      if (!user) { router.push('/dashboard'); return; }
      if (ADMIN_UID && user.uid !== ADMIN_UID) { router.push('/dashboard'); return; }
      setUid(user.uid);
      setAuthed(true);
      const all = await getAllLessons();
      const keys = new Set(all.map(l => `${l.subject}::${l.topic}`));
      setExisting(keys);
      setLoading(false);
    });
  }, []);

  function topicKey(t: { subject: string; topic: string }) {
    return `${t.subject}::${t.topic}`;
  }

  function toggleTopic(key: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    const visible = filtered.map(topicKey).filter(k => !existing.has(k));
    setSelected(new Set(visible));
  }

  function clearAll() { setSelected(new Set()); }

  const filtered = ALL_TOPICS.filter(t =>
    filterSubject === 'all' || t.subject === filterSubject
  );

  const newTopics  = filtered.filter(t => !existing.has(topicKey(t)));
  const doneTopics = filtered.filter(t => existing.has(topicKey(t)));

  async function generateOne(job: Job, jobUid: string): Promise<Partial<Job>> {
    try {
      const res  = await fetch('/api/gcse/learn', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subject: job.subject, topic: job.topic }),
      });
      const data = await res.json();
      if (!data.cards?.length) throw new Error('No cards returned');

      const id = await saveLessonDraft({
        subject:   job.subject,
        topic:     job.topic,
        cards:     data.cards,
        quickCheck: data.quickCheck ?? [],
        published: autoPublish,
        createdBy: jobUid,
      });
      return { status: 'done', id };
    } catch (e: any) {
      return { status: 'error', error: e.message ?? 'Failed' };
    }
  }

  async function runGeneration() {
    const toGenerate = Array.from(selected).map(key => {
      const [subject, ...rest] = key.split('::');
      return { subject, topic: rest.join('::'), status: 'pending' as JobStatus };
    });

    setJobs(toGenerate);
    setRunning(true);

    // Run sequentially to avoid rate limits
    for (let i = 0; i < toGenerate.length; i++) {
      setJobs(prev => prev.map((j, idx) => idx === i ? { ...j, status: 'generating' } : j));
      const result = await generateOne(toGenerate[i], uid);
      setJobs(prev => prev.map((j, idx) => idx === i ? { ...j, ...result } : j));
      // Small delay between requests
      if (i < toGenerate.length - 1) await new Promise(r => setTimeout(r, 1200));
    }

    setRunning(false);
    // Refresh existing
    const all = await getAllLessons();
    setExisting(new Set(all.map(l => `${l.subject}::${l.topic}`)));
  }

  if (!authed || loading) return (
    <Screen>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spinner /></div>
    </Screen>
  );

  const doneCount  = jobs.filter(j => j.status === 'done').length;
  const errorCount = jobs.filter(j => j.status === 'error').length;
  const totalJobs  = jobs.length;
  const progress   = totalJobs > 0 ? Math.round((doneCount + errorCount) / totalJobs * 100) : 0;

  return (
    <Screen>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={() => router.push('/gcse/admin')} style={GHOST_BTN}>Back</button>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)' }}>ADMIN</p>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Bulk Generate</h1>
        </div>
        <div style={{ width: '60px' }} />
      </div>

      {/* Job progress */}
      {jobs.length > 0 && (
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '14px 16px', marginBottom: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
            <span>{doneCount}/{totalJobs} done{errorCount > 0 ? ` · ${errorCount} errors` : ''}</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden', marginBottom: '12px' }}>
            <div style={{ height: '4px', background: '#00e87a', borderRadius: '2px', width: `${progress}%`, transition: 'width 0.4s', boxShadow: '0 0 6px rgba(0,232,122,0.5)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '180px', overflowY: 'auto' }}>
            {jobs.map((job, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>
                  {job.status === 'done' ? '✓' : job.status === 'error' ? '✗' : job.status === 'generating' ? '⟳' : '○'}
                </span>
                <span style={{
                  color: job.status === 'done' ? '#00e87a' : job.status === 'error' ? '#ff8080' : job.status === 'generating' ? '#EF9F27' : 'rgba(255,255,255,0.35)',
                  flex: 1,
                }}>
                  {job.topic}
                </span>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{job.subject}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      {!running && (
        <>
          {/* Auto-publish toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', marginBottom: '1rem' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>Auto-publish</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Publish lessons without reviewing first</p>
            </div>
            <button onClick={() => setAutoPublish(p => !p)} style={{
              width: '44px', height: '24px', borderRadius: '99px', border: 'none', cursor: 'pointer', padding: 0,
              background: autoPublish ? '#00e87a' : 'rgba(255,255,255,0.15)',
              position: 'relative', transition: 'background 0.2s',
            }}>
              <span style={{ position: 'absolute', top: '3px', left: autoPublish ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>

          {/* Subject filter */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
            {['all', 'maths', 'english', 'science'].map(f => (
              <button key={f} onClick={() => setFilterSubject(f)} style={{
                flex: 1, padding: '7px', borderRadius: '8px', cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontSize: '11px',
                border: `1px solid ${filterSubject === f ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)'}`,
                background: filterSubject === f ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: filterSubject === f ? '#fff' : 'rgba(255,255,255,0.4)',
                transition: 'all 0.15s',
              }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Select all / clear */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', alignItems: 'center' }}>
            <button onClick={selectAll} style={{ fontSize: '12px', color: '#00e87a', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', padding: 0 }}>
              Select all new ({newTopics.filter(t => !existing.has(topicKey(t))).length})
            </button>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>·</span>
            <button onClick={clearAll} style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', padding: 0 }}>
              Clear
            </button>
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
              {selected.size} selected
            </span>
          </div>

          {/* Topic list — new */}
          {newTopics.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>
                NOT GENERATED YET — {newTopics.length} topics
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {newTopics.map(t => {
                  const key      = topicKey(t);
                  const isSelected = selected.has(key);
                  const color    = SUBJECT_COLOR[t.subject];
                  return (
                    <button key={key} onClick={() => toggleTopic(key)} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                      border: `1px solid ${isSelected ? color + '50' : 'rgba(255,255,255,0.08)'}`,
                      background: isSelected ? color + '10' : 'rgba(255,255,255,0.02)',
                      fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
                      transition: 'all 0.12s',
                    }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, border: `1.5px solid ${isSelected ? color : 'rgba(255,255,255,0.2)'}`, background: isSelected ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        {isSelected && <span style={{ fontSize: '10px', color: '#03080a', fontWeight: 800 }}>&#10003;</span>}
                      </div>
                      <span style={{ fontSize: '13px', color: isSelected ? '#fff' : 'rgba(255,255,255,0.65)', flex: 1 }}>{t.topic}</span>
                      <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: color + '15', color: color + 'bb' }}>{t.subject}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Already generated */}
          {doneTopics.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '10px', letterSpacing: '0.08em', color: 'rgba(0,232,122,0.5)', marginBottom: '6px' }}>
                ALREADY GENERATED — {doneTopics.length} topics
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {doneTopics.map(t => (
                  <span key={topicKey(t)} style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '99px', background: 'rgba(0,232,122,0.08)', color: 'rgba(0,232,122,0.5)', border: '1px solid rgba(0,232,122,0.15)' }}>
                    &#10003; {t.topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={runGeneration}
            disabled={selected.size === 0}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
              background: selected.size > 0 ? '#00e87a' : 'rgba(255,255,255,0.08)',
              color: selected.size > 0 ? '#03080a' : 'rgba(255,255,255,0.3)',
              fontSize: '15px', fontWeight: 800,
              cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-ui)',
              boxShadow: selected.size > 0 ? '0 0 20px rgba(0,232,122,0.3)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {selected.size === 0
              ? 'Select topics to generate'
              : `Generate ${selected.size} lesson${selected.size !== 1 ? 's' : ''} ${autoPublish ? '& publish' : 'as drafts'}`}
          </button>

          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: '8px' }}>
            Generated one at a time — takes about {selected.size * 6} seconds
          </p>
        </>
      )}

      {/* Running state */}
      {running && (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            Generating lessons... do not close this page.
          </p>
        </div>
      )}

      {/* Done summary */}
      {!running && jobs.length > 0 && doneCount + errorCount === totalJobs && (
        <div style={{ marginTop: '1rem', padding: '14px 16px', background: doneCount === totalJobs ? 'rgba(0,232,122,0.1)' : 'rgba(239,159,39,0.1)', borderRadius: '12px', border: `1px solid ${doneCount === totalJobs ? 'rgba(0,232,122,0.3)' : 'rgba(239,159,39,0.3)'}`, textAlign: 'center' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: doneCount === totalJobs ? '#00e87a' : '#EF9F27', marginBottom: '8px' }}>
            {doneCount === totalJobs ? `All ${doneCount} lessons generated!` : `${doneCount} done, ${errorCount} failed`}
          </p>
          <button onClick={() => router.push('/gcse/admin')} style={{ padding: '9px 20px', borderRadius: '10px', border: 'none', background: '#fff', color: '#06080f', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            View in lesson manager
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
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
function Spinner() { return <div style={{ width: '28px', height: '28px', border: '2px solid rgba(0,232,122,0.15)', borderTopColor: '#00e87a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />; }
