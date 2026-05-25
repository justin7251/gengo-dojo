'use client';
import { Spinner } from '@/components/Spinner';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { signOut } from '@/lib/auth';
import {
  getUserProfile, saveUserProfile,
  getUserWords, saveUserWords,
  getProgress, initProgress,
  getUserTopics,
} from '@/lib/firestore';
import {
  Word, Progress, UserProfile,
  NativeLang, TargetLang,
  NATIVE_LANGUAGES, TARGET_LANGUAGES,
} from '@/lib/types';
import { isDue, isMastered } from '@/lib/srs';
import { getAgentProfile, createAgentProfile } from '@/lib/agent';
import { AgentProfile } from '@/lib/types';
import AuthGuard from '@/components/AuthGuard';
import NotificationSettings from '@/components/NotificationSettings';

const INTERESTS = [
  'Judo','Anime','Cooking','Gaming','Music','Travel','Fashion',
  'Architecture','Medicine','Photography','Football','Cinema',
  'Manga','Tea ceremony','Calligraphy','Origami','Business',
  'Nature','Technology','Art',
];

export default function DashboardPage() {
  return <AuthGuard><Dashboard /></AuthGuard>;
}

// ── Animated counter hook ─────────────────────────────────────────────────
function useCountUp(target: number, duration = 800, delay = 0) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    if (started.current) return;
    started.current = true;
    const timeout = setTimeout(() => {
      const start = performance.now();
      function tick(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);
  return value;
}

// ── Animated bar hook ─────────────────────────────────────────────────────
function useAnimatedWidth(target: number, delay = 300) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const t = setTimeout(() => setWidth(target), delay);
    return () => clearTimeout(t);
  }, [target, delay]);
  return width;
}

// ── Stat card with animated counter ──────────────────────────────────────
function StatCard({ label, value, accent, delay }: {
  label: string; value: number; accent?: boolean; delay: number;
}) {
  const displayed = useCountUp(value, 700, delay);
  return (
    <div style={{
      background: 'var(--bg)', borderRadius: '8px',
      padding: '10px 8px', textAlign: 'center',
      border: '1px solid var(--border)',
      animation: `fadeUp 0.4s ease both`,
      animationDelay: `${delay}ms`,
    }}>
      <p style={{
        fontSize: '18px', fontWeight: 600,
        color: accent ? '#EF9F27' : 'var(--fg)',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {displayed}
      </p>
      <p style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '3px' }}>
        {label}
      </p>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
function Dashboard() {
  const router = useRouter();

  const [uid, setUid]               = useState('');
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [agent, setAgent]           = useState<AgentProfile | null>(null);
  const [words, setWords]           = useState<Word[]>([]);
  const [progress, setProgress]     = useState<Record<string, Progress>>({});
  const [topics, setTopics]         = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError]           = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [newInterests, setNewInterests]     = useState<string[]>([]);
  const [newLevel, setNewLevel]             = useState<'beginner'|'intermediate'|'advanced'>('beginner');
  const [newNativeLang, setNewNativeLang]   = useState<NativeLang>('en');
  const [newTargetLang, setNewTargetLang]   = useState<TargetLang>('ja');
  const [saving, setSaving]                 = useState(false);
  // Track when data is ready so animations start at the right moment
  const [ready, setReady]           = useState(false);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const p = await getUserProfile(user.uid);
      setProfile(p);
      if (p) {
        const [w, pr, t, ag] = await Promise.all([
          getUserWords(user.uid, p.targetLang, p.nativeLang),
          getProgress(user.uid, p.targetLang, p.nativeLang),
          getUserTopics(user.uid, p.targetLang, p.nativeLang),
          getAgentProfile(user.uid),
        ]);
        setWords(w); setProgress(pr); setTopics(t);
        setAgent(ag ?? await createAgentProfile(user.uid, p.targetLang));
      }
      setLoading(false);
      // Small delay so the DOM is painted before animations fire
      setTimeout(() => setReady(true), 50);
    });
  }, []);

  async function generateWords(interest: string) {
    if (!profile) return;
    setGenerating(interest); setError('');
    try {
      const res  = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interest, targetLang: profile.targetLang, nativeLang: profile.nativeLang, level: profile.level }),
      });
      const data = await res.json();
      if (!data.words?.length) throw new Error('No words returned');
      const newWords: Word[] = data.words.map((w: Omit<Word,'id'|'nativeLang'|'createdAt'>) => ({
        ...w, id: `${profile.targetLang}-${w.kanji}`, nativeLang: profile.nativeLang, createdAt: Date.now(),
      }));
      await saveUserWords(uid, newWords, profile.targetLang, profile.nativeLang);
      await initProgress(uid, newWords.map(w => w.id), profile.targetLang, profile.nativeLang);
      const freshProg = await getProgress(uid, profile.targetLang, profile.nativeLang);
      setWords(prev => {
        const ids = new Set(prev.map(x => x.id));
        return [...prev, ...newWords.filter(x => !ids.has(x.id))];
      });
      setProgress(freshProg);
      if (!topics.includes(interest)) setTopics(prev => [...prev, interest]);
    } catch {
      setError('Failed to generate words. Please try again.');
    } finally { setGenerating(null); }
  }

  function openEdit() {
    setNewInterests(profile?.interests ?? []);
    setNewLevel(profile?.level ?? 'beginner');
    setNewNativeLang(profile?.nativeLang ?? 'en');
    setNewTargetLang(profile?.targetLang ?? 'ja');
    setEditingProfile(true);
  }

  async function handleUpdateProfile() {
    if (!profile || saving) return;
    setSaving(true);
    const updated: UserProfile = { ...profile, interests: newInterests, level: newLevel, nativeLang: newNativeLang, targetLang: newTargetLang };
    await saveUserProfile(updated);
    if (newTargetLang !== profile.targetLang || newNativeLang !== profile.nativeLang) {
      const [w, pr, t] = await Promise.all([
        getUserWords(uid, newTargetLang, newNativeLang),
        getProgress(uid, newTargetLang, newNativeLang),
        getUserTopics(uid, newTargetLang, newNativeLang),
      ]);
      setWords(w); setProgress(pr); setTopics(t);
    }
    setSaving(false); setEditingProfile(false);
  }

  const dueCount   = words.filter(w => progress[w.id] && isDue(progress[w.id])).length;
  const mastered   = words.filter(w => progress[w.id] && isMastered(progress[w.id])).length;
  const dueWords   = words.filter(w => progress[w.id] && isDue(progress[w.id]));
  const nativeInfo = NATIVE_LANGUAGES.find(l => l.code === profile?.nativeLang);
  const targetInfo = TARGET_LANGUAGES.find(l => l.code === profile?.targetLang);
  const sameLang   = newNativeLang === newTargetLang;

  const coverColor = agent?.coverStatus === 'intact' ? '#00e87a'
    : agent?.coverStatus === 'compromised' ? '#EF9F27' : '#E24B4A';

  // Animated suspicion bar width
  const suspicionPct = useAnimatedWidth(
    agent ? (agent.suspicionLevel / 5) * 100 : 0,
    600
  );

  if (loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <Spinner />
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-ui)' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 1rem 5rem' }}>

        {/* ── Top bar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.5rem 0 1rem',
          animation: ready ? 'fadeDown 0.4s ease both' : 'none',
        }}>
          <div>
            <p style={{ fontSize: '11px', letterSpacing: '0.15em', color: 'var(--muted)', marginBottom: '2px' }}>
              GENGO DOJO
            </p>
            <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.02em' }}>
              言語道場
            </h1>
          </div>
          {agent && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'var(--surface)', borderRadius: '99px',
              padding: '8px 14px', border: '1px solid var(--border)',
              animation: ready ? 'fadeDown 0.4s ease 0.1s both' : 'none',
            }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: coverColor,
                boxShadow: `0 0 8px ${coverColor}`,
                animation: 'pulse 2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--fg)' }}>
                {agent.codename}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {agent.streakDays}d
              </span>
            </div>
          )}
        </div>

        {/* ── Agent status card ── */}
        {agent && (
          <div style={{
            background: 'var(--surface)', borderRadius: 'var(--radius)',
            border: `1px solid ${coverColor}33`,
            padding: '1.25rem', marginBottom: '1.5rem',
            position: 'relative', overflow: 'hidden',
            animation: ready ? 'fadeUp 0.5s ease 0.05s both' : 'none',
          }}>
            {/* Animated glow orb — drifts slowly */}
            <div style={{
              position: 'absolute', top: '-40px', right: '-40px',
              width: '140px', height: '140px', borderRadius: '50%',
              background: `${coverColor}15`,
              filter: 'blur(30px)', pointerEvents: 'none',
              animation: 'orbDrift 6s ease-in-out infinite',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: '4px' }}>
                  AGENT STATUS
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--fg)' }}>
                    {agent.codename}
                  </span>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                    background: `${coverColor}20`, color: coverColor,
                    border: `1px solid ${coverColor}40`,
                    animation: 'fadeIn 0.4s ease 0.3s both',
                  }}>
                    {agent.coverStatus === 'intact' ? '✓ Intact'
                      : agent.coverStatus === 'compromised' ? '⚠ Compromised' : '✗ Blown'}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  {agent.city} · Chapter {agent.chapter}
                </p>
              </div>
              {/* Streak — counts up */}
              <div style={{ textAlign: 'right', animation: ready ? 'fadeIn 0.4s ease 0.4s both' : 'none' }}>
                <StreakCounter value={agent.streakDays} color={coverColor} ready={ready} />
                <p style={{ fontSize: '11px', color: 'var(--muted)' }}>day streak</p>
              </div>
            </div>

            {/* Stats row — each card staggers in */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {ready && [
                { label: 'Words',    value: words.length,          accent: false, delay: 150 },
                { label: 'Due',      value: dueCount,              accent: dueCount > 0, delay: 220 },
                { label: 'Mastered', value: mastered,              accent: false, delay: 290 },
                { label: 'Missions', value: agent.totalMissions,   accent: false, delay: 360 },
              ].map(s => (
                <StatCard key={s.label} {...s} />
              ))}
            </div>

            {/* Suspicion bar — fills in */}
            {agent.suspicionLevel > 0 && (
              <div style={{ marginTop: '10px', animation: ready ? 'fadeIn 0.4s ease 0.5s both' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.08em' }}>SUSPICION</span>
                  <span style={{ fontSize: '10px', color: '#E24B4A' }}>{agent.suspicionLevel}/5</span>
                </div>
                <div style={{ height: '3px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '3px', borderRadius: '2px',
                    width: `${suspicionPct}%`,
                    background: '#E24B4A',
                    boxShadow: '0 0 6px rgba(226,75,74,0.5)',
                    transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                  }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Mission path ── */}
        <div style={{
          marginBottom: '1.5rem',
          animation: ready ? 'fadeUp 0.5s ease 0.2s both' : 'none',
        }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: '1rem' }}>
            MISSION PATH
          </p>

          <div style={{ position: 'relative', padding: '0 0 0 52px' }}>
            {/* Vertical line — draws down on load */}
            <div style={{
              position: 'absolute', left: '21px', top: '10px', bottom: '10px', width: '2px',
              background: 'linear-gradient(to bottom, var(--neon), rgba(0,232,122,0.1))',
              transformOrigin: 'top',
              animation: ready ? 'lineGrow 0.6s cubic-bezier(0.16,1,0.3,1) 0.25s both' : 'none',
            }} />

            {[
              { emoji: '🕵️', label: 'Mission Briefing', sub: 'Choose your mode', route: '/mission', color: '#7F77DD', active: true },
              { emoji: '⚡', label: 'Scrap', sub: '30 second blitz', route: '/mission/scrap', color: '#EF9F27', active: words.length >= 4 },
              { emoji: '🧠', label: 'Deep Work', sub: '20 min immersion', route: '/mission/deepwork', color: '#00e87a', active: words.length >= 4 },
              { emoji: '🌙', label: 'Brain Dead', sub: 'Passive matching', route: '/mission/braindead', color: '#378ADD', active: words.length >= 4 },
            ].map((m, i) => (
              <div
                key={m.label}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  marginBottom: '10px', position: 'relative',
                  animation: ready ? `fadeRight 0.4s ease ${0.3 + i * 0.07}s both` : 'none',
                }}
              >
                {/* Node */}
                <button
                  onClick={() => m.active && router.push(m.route)}
                  className="mission-node"
                  style={{
                    position: 'absolute', left: '-52px',
                    width: '42px', height: '42px', borderRadius: '50%',
                    border: `2px solid ${m.active ? m.color : 'var(--border)'}`,
                    background: m.active ? `${m.color}20` : 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '18px', cursor: m.active ? 'pointer' : 'default',
                    boxShadow: m.active ? `0 0 16px ${m.color}40` : 'none',
                    animation: m.active && i === 0 ? 'glow-pulse 2s ease-in-out infinite' : 'none',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  {m.active ? m.emoji : '🔒'}
                </button>

                {/* Label */}
                <button
                  onClick={() => m.active && router.push(m.route)}
                  className={m.active ? 'mission-row' : ''}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: '12px',
                    background: 'var(--surface)', border: `1px solid ${m.active ? `${m.color}30` : 'var(--border)'}`,
                    cursor: m.active ? 'pointer' : 'default',
                    opacity: m.active ? 1 : 0.4,
                    fontFamily: 'var(--font-ui)', transition: 'all 0.18s ease',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: m.active ? 'var(--fg)' : 'var(--muted)', textAlign: 'left' }}>
                      {m.label}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'left' }}>{m.sub}</p>
                  </div>
                  {m.active && <span style={{
                    fontSize: '14px', color: m.color,
                    transition: 'transform 0.18s ease',
                  }} className="mission-arrow">›</span>}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Study tools ── */}
        <p style={{
          fontSize: '11px', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: '10px',
          animation: ready ? 'fadeUp 0.4s ease 0.35s both' : 'none',
        }}>
          STUDY TOOLS
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '1.5rem' }}>
          {[
            { emoji: '词', label: 'Word list', sub: `${words.length} words · ${dueCount} due`, route: '/words', color: '#9FE1CB' },
            { emoji: '柔', label: 'Flashcards', sub: 'SRS review', route: '/flashcards', color: '#00e87a' },
            { emoji: '?', label: 'Quiz', sub: 'Multiple choice', route: '/quiz', color: '#378ADD' },
            { emoji: '💀', label: 'Survival', sub: '3 lives · timed', route: '/survival', color: '#E24B4A' },
            { emoji: '✍️', label: 'Write', sub: 'Canvas practice', route: '/write', color: '#D4537E' },
            { emoji: '🎤', label: 'Shadow', sub: 'Pronunciation', route: '/shadow', color: '#EF9F27' },
            ...(profile?.targetLang === 'ja' || profile?.targetLang === 'ko'
              ? [{ emoji: 'あ', label: profile.targetLang === 'ja' ? 'Kana' : 'Hangul', sub: 'Characters', route: '/kana', color: '#5DCAA5' }]
              : []),
          ].map((tool, i) => (
            <button
              key={tool.label}
              onClick={() => router.push(tool.route)}
              className="study-tool"
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', borderRadius: '12px',
                background: 'var(--surface)', border: `1px solid ${tool.color}25`,
                cursor: 'pointer', fontFamily: 'var(--font-ui)',
                transition: 'all 0.18s ease', textAlign: 'left',
                position: 'relative', overflow: 'hidden',
                animation: ready ? `fadeUp 0.4s ease ${0.38 + i * 0.05}s both` : 'none',
              }}
            >
              {/* Hover shimmer */}
              <div className="tool-shimmer" style={{
                position: 'absolute', inset: 0,
                background: `radial-gradient(circle at 30% 50%, ${tool.color}12, transparent 60%)`,
                opacity: 0, transition: 'opacity 0.25s ease',
                pointerEvents: 'none',
              }} />
              <span style={{
                fontSize: tool.emoji.length > 2 ? '22px' : '18px',
                width: '36px', height: '36px', borderRadius: '8px',
                background: `${tool.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: tool.color,
                transition: 'transform 0.18s ease',
                fontFamily: tool.emoji === '词' || tool.emoji === '柔'
                  ? '"Noto Sans JP","Noto Sans SC",serif' : 'inherit',
              }} className="tool-icon">
                {tool.emoji}
              </span>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--fg)' }}>{tool.label}</p>
                <p style={{ fontSize: '11px', color: 'var(--muted)' }}>{tool.sub}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Due words ── */}
        {dueCount > 0 && (
          <div style={{
            marginBottom: '1.5rem',
            animation: ready ? 'fadeUp 0.4s ease 0.5s both' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'var(--muted)' }}>
                DUE FOR REVIEW
              </p>
              <span style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                background: 'rgba(239,159,39,0.15)', color: '#EF9F27',
                border: '1px solid rgba(239,159,39,0.3)',
                animation: ready ? 'fadeIn 0.4s ease 0.55s both' : 'none',
              }}>
                {dueCount} words
              </span>
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              {dueWords.slice(0, 5).map((w, i) => (
                <div
                  key={w.id}
                  className="due-row"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                    borderBottom: i < Math.min(dueWords.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                    borderLeft: '3px solid #EF9F27',
                    transition: 'background 0.15s ease',
                    animation: ready ? `fadeRight 0.35s ease ${0.55 + i * 0.06}s both` : 'none',
                  }}
                >
                  <span style={{ fontSize: '20px', minWidth: '28px', fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: 'var(--fg)' }}>
                    {w.kanji}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--muted)', flex: 1 }}>{w.meaning}</span>
                  <span style={{ fontSize: '11px', color: '#EF9F27' }}>review</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Generate vocabulary ── */}
        <div style={{
          marginBottom: '1.5rem',
          animation: ready ? 'fadeUp 0.4s ease 0.55s both' : 'none',
        }}>
          <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: '10px' }}>
            GENERATE VOCABULARY
          </p>
          {topics.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {topics.map(t => (
                <button key={t} className="btn" style={{ fontSize: '12px', padding: '5px 12px' }}
                  disabled={!!generating} onClick={() => generateWords(t)}>
                  {generating === t
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Spinner size={16} /> Generating…</span>
                    : `+ More ${t}`}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {(profile?.interests ?? []).filter(i => !topics.includes(i)).map(i => (
              <button key={i} className="btn" style={{ fontSize: '12px', padding: '5px 12px' }}
                disabled={!!generating} onClick={() => generateWords(i)}>
                {generating === i
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Spinner size={16} /> Generating…</span>
                  : `Generate ${i}`}
              </button>
            ))}
          </div>
          {error && (
            <p style={{ fontSize: '13px', color: '#ff8080', marginTop: '8px', padding: '8px 12px', background: 'rgba(226,75,74,0.1)', borderRadius: '8px', border: '1px solid rgba(226,75,74,0.2)' }}>
              {error}
            </p>
          )}
        </div>

        <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1.5rem' }} />

        {/* ── Profile ── */}
        {!editingProfile ? (
          <div style={{ animation: ready ? 'fadeUp 0.4s ease 0.6s both' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'var(--muted)' }}>YOUR PROFILE</p>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn" style={{ fontSize: '12px', padding: '5px 12px' }} onClick={openEdit}>Edit</button>
                <button className="btn" style={{ fontSize: '12px', padding: '5px 12px', color: '#ff8080', borderColor: 'rgba(226,75,74,0.3)' }}
                  onClick={async () => { await signOut(); router.push('/'); }}>
                  Sign out
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1rem' }}>
              <span className="pill pill-gray">{nativeInfo?.flag} {nativeInfo?.label}</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)', alignSelf: 'center' }}>→</span>
              <span className="pill pill-blue">{targetInfo?.flag} {targetInfo?.label}</span>
              <span className="pill pill-gray">{profile?.level}</span>
              {(profile?.interests ?? []).map(i => (
                <span key={i} className="pill pill-teal">{i}</span>
              ))}
            </div>
            <NotificationSettings uid={uid} />
          </div>
        ) : (
          <div style={{ animation: 'slideDown 0.25s ease both' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.12em', color: 'var(--muted)', marginBottom: '1.25rem' }}>
              EDIT PROFILE
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>I speak</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {NATIVE_LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => setNewNativeLang(l.code)} style={{
                      display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px',
                      borderRadius: '8px', border: '1px solid',
                      borderColor: newNativeLang === l.code ? 'var(--neon)' : 'var(--border)',
                      background: newNativeLang === l.code ? 'var(--neon-dim)' : 'var(--surface)',
                      color: newNativeLang === l.code ? 'var(--neon)' : 'var(--fg)',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px', textAlign: 'left', width: '100%',
                      transition: 'all 0.15s ease',
                    }}>
                      <span>{l.flag}</span><span style={{ flex: 1 }}>{l.label}</span>
                      {newNativeLang === l.code && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>I want to learn</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {TARGET_LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => setNewTargetLang(l.code)}
                      disabled={(l.code as string) === (newNativeLang as string)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px',
                        borderRadius: '8px', border: '1px solid',
                        borderColor: newTargetLang === l.code ? '#378ADD' : 'var(--border)',
                        background: newTargetLang === l.code ? 'rgba(55,138,221,0.12)' : 'var(--surface)',
                        color: newTargetLang === l.code ? '#7bbfff' : 'var(--fg)',
                        opacity: (l.code as string) === (newNativeLang as string) ? 0.35 : 1,
                        cursor: (l.code as string) === (newNativeLang as string) ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit', fontSize: '12px', textAlign: 'left', width: '100%',
                        transition: 'all 0.15s ease',
                      }}>
                      <span>{l.flag}</span><span style={{ flex: 1 }}>{l.label}</span>
                      {newTargetLang === l.code && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {sameLang && (
              <p style={{ fontSize: '12px', color: '#ff8080', background: 'rgba(226,75,74,0.1)', padding: '8px 12px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(226,75,74,0.2)' }}>
                Native and target language can't be the same.
              </p>
            )}

            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Level</p>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem' }}>
              {(['beginner','intermediate','advanced'] as const).map(l => (
                <button key={l} onClick={() => setNewLevel(l)} style={{
                  padding: '6px 12px', borderRadius: '8px', border: '1px solid',
                  borderColor: newLevel === l ? 'var(--neon)' : 'var(--border)',
                  background: newLevel === l ? 'var(--neon-dim)' : 'var(--surface)',
                  color: newLevel === l ? 'var(--neon)' : 'var(--muted)',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: '12px',
                  transition: 'all 0.15s ease',
                }}>
                  {l === 'beginner' ? '🌱 Beginner' : l === 'intermediate' ? '📈 Intermediate' : '🔥 Advanced'}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Interests</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.5rem' }}>
              {INTERESTS.map(i => (
                <button key={i} onClick={() => setNewInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                  style={{
                    padding: '5px 12px', borderRadius: '99px', border: '1px solid', fontSize: '12px',
                    borderColor: newInterests.includes(i) ? 'var(--neon)' : 'var(--border)',
                    background: newInterests.includes(i) ? 'var(--neon-dim)' : 'var(--surface)',
                    color: newInterests.includes(i) ? 'var(--neon)' : 'var(--muted)',
                    cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.15s ease',
                  }}>
                  {i}
                </button>
              ))}
            </div>

            {(newTargetLang !== profile?.targetLang || newNativeLang !== profile?.nativeLang) && (
              <p style={{ fontSize: '12px', color: '#EF9F27', background: 'rgba(239,159,39,0.1)', padding: '8px 12px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239,159,39,0.2)' }}>
                Changing language will switch your word list. Previous words are saved.
              </p>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary" disabled={saving || !newInterests.length || sameLang} onClick={handleUpdateProfile}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <button className="btn" onClick={() => setEditingProfile(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        /* ── Keyframes ─────────────────────────────── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeRight {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes lineGrow {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        @keyframes orbDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(-12px, 8px) scale(1.1); }
          66%       { transform: translate(6px, -10px) scale(0.95); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse  {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:0.6; transform:scale(1.1); }
        }
        @keyframes glow-pulse {
          0%,100% { box-shadow:0 0 12px rgba(0,232,122,0.3); }
          50%     { box-shadow:0 0 28px rgba(0,232,122,0.7); }
        }
        @keyframes streakPop {
          0%   { transform: scale(0.6); opacity: 0; }
          70%  { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }

        /* ── Mission row hover ──────────────────────── */
        .mission-row:hover {
          background: var(--surface-2) !important;
          transform: translateX(3px);
        }
        .mission-row:hover .mission-arrow {
          transform: translateX(3px);
        }
        .mission-node:hover {
          transform: scale(1.12) !important;
        }

        /* ── Study tool hover ───────────────────────── */
        .study-tool:hover {
          background: var(--surface-2) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .study-tool:hover .tool-shimmer {
          opacity: 1 !important;
        }
        .study-tool:hover .tool-icon {
          transform: scale(1.1) rotate(-4deg);
        }
        .study-tool:active {
          transform: translateY(0) scale(0.98);
        }

        /* ── Due row hover ──────────────────────────── */
        .due-row:hover {
          background: var(--surface-2);
        }
      `}</style>
    </main>
  );
}

// ── Streak counter — pops in and counts up ────────────────────────────────
function StreakCounter({ value, color, ready }: { value: number; color: string; ready: boolean }) {
  const displayed = useCountUp(value, 900, 400);
  return (
    <p style={{
      fontSize: '24px', fontWeight: 700, color, lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
      animation: ready ? 'streakPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.4s both' : 'none',
    }}>
      {displayed}
    </p>
  );
}

