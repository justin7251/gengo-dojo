'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
import { signOut } from '@/lib/auth';
import {
  getUserProfile, saveUserProfile,
  getUserWords, saveUserWords,
  getProgress, initProgress,
  getUserTopics,
  getDailyProgress, markDailyTask,
  getStreakHistory, seedStreakHistory,
  DailyTaskId, DailyProgress,
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
import { Spinner } from '@/components/Spinner';
import NotificationSettings from '@/components/NotificationSettings';
import { TodayPanel } from '@/components/TodayPanel';
import { CalendarStreak } from '@/components/CalendarStreak';

const INTERESTS = [
  'Judo','Anime','Cooking','Gaming','Music','Travel','Fashion',
  'Architecture','Medicine','Photography','Football','Cinema',
  'Manga','Tea ceremony','Calligraphy','Origami','Business',
  'Nature','Technology','Art',
];

export default function DashboardPage() {
  return <AuthGuard><Dashboard /></AuthGuard>;
}

// ── Animated counter ──────────────────────────────────
function useCountUp(target: number, duration = 800, delay = 0) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    if (started.current) return;
    started.current = true;
    const t = setTimeout(() => {
      const start = performance.now();
      function tick(now: number) {
        const elapsed = now - start;
        const p = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(eased * target));
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);
  return value;
}

// ── Stat card ─────────────────────────────────────────
function StatCard({ emoji, label, value, color, delay }: {
  emoji: string; label: string; value: number;
  color: string; delay: number;
}) {
  const displayed = useCountUp(value, 700, delay);
  return (
    <div style={{
      background: '#fff', borderRadius: '16px',
      border: `2.5px solid ${color}55`, boxShadow: `0 5px 0 ${color}55`,
      padding: '12px 8px', textAlign: 'center',
      animation: `bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms both`,
    }}>
      <div style={{ fontSize: '22px', marginBottom: '2px' }}>{emoji}</div>
      <p style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1, fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
        {displayed}
      </p>
      <p style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 700, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </p>
    </div>
  );
}

// ── XP bar ────────────────────────────────────────────
function XPBar({ xp, ready }: { xp: number; ready: boolean }) {
  const max = 500;
  const pct = Math.min((xp % max) / max * 100, 100);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setWidth(pct), 400);
    return () => clearTimeout(t);
  }, [ready, pct]);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted-bright)' }}>⚡ XP</span>
        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--fg-secondary)' }}>{xp % max} / {max}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────
function Dashboard() {
  const router = useRouter();

  const [uid, setUid]                     = useState('');
  const [profile, setProfile]             = useState<UserProfile | null>(null);
  const [agent, setAgent]                 = useState<AgentProfile | null>(null);
  const [words, setWords]                 = useState<Word[]>([]);
  const [progress, setProgress]           = useState<Record<string, Progress>>({});
  const [topics, setTopics]               = useState<string[]>([]);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);
  const [streakHistory, setStreakHistory] = useState<string[]>([]);
  const [loading, setLoading]             = useState(true);
  const [generating, setGenerating]       = useState<string | null>(null);
  const [error, setError]                 = useState('');
  const [editingProfile, setEditingProfile] = useState(false);
  const [newInterests, setNewInterests]   = useState<string[]>([]);
  const [newLevel, setNewLevel]           = useState<'beginner'|'intermediate'|'advanced'>('beginner');
  const [newNativeLang, setNewNativeLang] = useState<NativeLang>('en');
  const [newTargetLang, setNewTargetLang] = useState<TargetLang>('ja');
  const [saving, setSaving]               = useState(false);
  const [ready, setReady]                 = useState(false);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const p = await getUserProfile(user.uid);
      setProfile(p);
      if (p) {
        const [w, pr, t, ag, dp, sh] = await Promise.all([
          getUserWords(user.uid, p.targetLang, p.nativeLang),
          getProgress(user.uid, p.targetLang, p.nativeLang),
          getUserTopics(user.uid, p.targetLang, p.nativeLang),
          getAgentProfile(user.uid),
          getDailyProgress(user.uid),
          getStreakHistory(user.uid),
        ]);
        setWords(w); setProgress(pr); setTopics(t);
        setAgent(ag ?? await createAgentProfile(user.uid, p.targetLang));
        setDailyProgress(dp);
        // Seed history for existing users who have a streak but no calendar history
        const history = sh.length === 0 && (ag?.streakDays ?? 0) > 0
          ? await seedStreakHistory(user.uid, ag!.streakDays)
          : sh;
        setStreakHistory(history);
      }
      setLoading(false);
      setTimeout(() => setReady(true), 60);
    });
  }, []);

  async function handleTaskStart(taskId: DailyTaskId) {
    if (!uid) return;
    const updated = await markDailyTask(uid, taskId);
    setDailyProgress(updated);
    setStreakHistory(updated.streakHistory);
  }

  async function generateWords(interest: string) {
    if (!profile) return;
    setGenerating(interest); setError('');
    try {
      const res = await fetch('/api/generate', {
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
      setWords(prev => { const ids = new Set(prev.map(x => x.id)); return [...prev, ...newWords.filter(x => !ids.has(x.id))]; });
      setProgress(freshProg);
      if (!topics.includes(interest)) setTopics(prev => [...prev, interest]);
    } catch {
      setError('Failed to generate words. Try again!');
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
    setProfile(updated); setSaving(false); setEditingProfile(false);
  }

  const dueCount  = words.filter(w => progress[w.id] && isDue(progress[w.id])).length;
  const mastered  = words.filter(w => progress[w.id] && isMastered(progress[w.id])).length;
  const dueWords  = words.filter(w => progress[w.id] && isDue(progress[w.id]));
  const xp        = (agent?.totalMissions ?? 0) * 30 + mastered * 10;
  const sameLang  = newNativeLang === newTargetLang;
  const nativeInfo  = NATIVE_LANGUAGES.find(l => l.code === profile?.nativeLang);
  const targetInfo  = TARGET_LANGUAGES.find(l => l.code === profile?.targetLang);

  const todayDone = dailyProgress
    ? (['flashcards','quiz','mission','survival'] as DailyTaskId[]).every(t => dailyProgress.completed[t])
    : false;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: '48px', animation: 'float 1.8s ease-in-out infinite' }}>🏯</div>
      <Spinner size={36} color="var(--green)" />
    </div>
  );

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-120px', right: '-120px', width: '420px', height: '420px', borderRadius: '50%', background: 'rgba(88,204,2,0.07)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-100px', left: '-100px', width: '340px', height: '340px', borderRadius: '50%', background: 'rgba(28,176,246,0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 1rem 6rem' }}>

        {/* ── Top bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 0 1.25rem', animation: ready ? 'fadeDown 0.4s ease both' : 'none' }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase' }}>言語道場</p>
            <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--fg)', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>Gengo Dojo 🥋</h1>
          </div>
          {agent && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', animation: ready ? 'fadeDown 0.4s ease 0.1s both' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#fff3d0', border: '2.5px solid #ffd966', borderRadius: '99px', padding: '6px 12px', boxShadow: '0 4px 0 #ffd966' }}>
                <span style={{ fontSize: '16px' }}>🔥</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: '#a05600' }}>{agent.streakDays}</span>
              </div>
              <div style={{ background: '#e8f8ff', border: '2.5px solid #74d4ff', borderRadius: '99px', padding: '6px 12px', boxShadow: '0 4px 0 #74d4ff' }}>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0068a0' }}>Lv.{Math.floor(xp / 500) + 1}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── XP bar ── */}
        {agent && ready && (
          <div style={{ background: '#fff', borderRadius: '16px', border: '2.5px solid var(--border-dark)', padding: '12px 16px', marginBottom: '1.25rem', boxShadow: '0 4px 0 var(--border-dark)', animation: 'fadeUp 0.4s ease 0.05s both' }}>
            <XPBar xp={xp} ready={ready} />
          </div>
        )}

        {/* ── TODAY'S MISSION ── */}
        {ready && dailyProgress && (
          <div style={{ animation: 'bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.08s both' }}>
            <TodayPanel
              completed={dailyProgress.completed}
              dueCount={dueCount}
              wordCount={words.length}
              onTaskDone={handleTaskStart}
            />
          </div>
        )}

        {/* ── CALENDAR STREAK ── */}
        {ready && (
          <div style={{ animation: 'fadeUp 0.4s ease 0.15s both' }}>
            <CalendarStreak
              streakHistory={streakHistory}
              streakDays={agent?.streakDays ?? 0}
              todayDone={todayDone}
            />
          </div>
        )}

        {/* ── Stat row ── */}
        {ready && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
            <StatCard emoji="📚" label="Words"    value={words.length} color="var(--blue)"   delay={100} />
            <StatCard emoji="⏰" label="Due"      value={dueCount}     color={dueCount > 0 ? 'var(--orange)' : 'var(--muted)'} delay={170} />
            <StatCard emoji="⭐" label="Mastered" value={mastered}     color="var(--yellow)" delay={240} />
            <StatCard emoji="🎯" label="Missions" value={agent?.totalMissions ?? 0} color="var(--purple)" delay={310} />
          </div>
        )}

        {/* ── Mission path ── */}
        <div style={{ marginBottom: '1.5rem', animation: ready ? 'fadeUp 0.5s ease 0.18s both' : 'none' }}>
          <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '12px' }}>🗺️ Mission Path</p>
          <div style={{ position: 'relative', padding: '0 0 0 60px' }}>
            <div style={{ position: 'absolute', left: '24px', top: '12px', bottom: '12px', width: '3px', background: 'linear-gradient(to bottom, var(--green), var(--blue-light))', borderRadius: '2px', transformOrigin: 'top', animation: ready ? 'lineGrow 0.6s cubic-bezier(0.16,1,0.3,1) 0.28s both' : 'none' }} />
            {[
              { emoji: '📋', label: 'Mission Briefing', sub: 'Choose your mode',  route: '/mission',           color: 'var(--purple)', bg: 'var(--purple-light)', active: true },
              { emoji: '⚡', label: 'Scrap',            sub: '30-second blitz',   route: '/mission/scrap',     color: 'var(--orange)', bg: 'var(--orange-light)', active: words.length >= 4 },
              { emoji: '🧠', label: 'Deep Work',        sub: '20-min immersion',  route: '/mission/deepwork',  color: 'var(--green)',  bg: 'var(--green-light)',  active: words.length >= 4 },
              { emoji: '🌙', label: 'Brain Dead',       sub: 'Passive matching',  route: '/mission/braindead', color: 'var(--blue)',   bg: 'var(--blue-light)',   active: words.length >= 4 },
            ].map((m, i) => (
              <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', animation: ready ? `fadeRight 0.4s ease ${0.3 + i * 0.07}s both` : 'none' }}>
                <button onClick={() => m.active && router.push(m.route)}
                  style={{ position: 'absolute', left: '0', width: '48px', height: '48px', borderRadius: '50%', border: `3px solid ${m.active ? m.color : 'var(--border-dark)'}`, background: m.active ? m.bg : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', cursor: m.active ? 'pointer' : 'default', boxShadow: m.active ? `0 5px 0 ${m.color}` : '0 5px 0 var(--border-dark)', transition: 'transform 0.12s ease', fontFamily: 'inherit' }}
                  className={m.active ? 'mission-node' : ''}>
                  {m.active ? m.emoji : '🔒'}
                </button>
                <button onClick={() => m.active && router.push(m.route)} className={m.active ? 'mission-row-btn' : ''}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: '16px', background: m.active ? '#fff' : '#f7f7f7', border: `2.5px solid ${m.active ? m.color + '55' : 'var(--border-dark)'}`, boxShadow: m.active ? `0 5px 0 ${m.color}55` : '0 5px 0 var(--border-dark)', cursor: m.active ? 'pointer' : 'default', opacity: m.active ? 1 : 0.45, fontFamily: 'var(--font-ui)', transition: 'all 0.1s ease', position: 'relative', top: 0 }}>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--fg)' }}>{m.label}</p>
                    <p style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>{m.sub}</p>
                  </div>
                  {m.active && <span style={{ fontSize: '18px', fontWeight: 900, color: m.color }}>›</span>}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Study tools ── */}
        <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '12px', animation: ready ? 'fadeUp 0.4s ease 0.33s both' : 'none' }}>🎮 Study Tools</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '1.5rem' }}>
          {[
            { emoji: '📖', label: 'Word List',  sub: `${words.length} words · ${dueCount} due`, route: '/words',      color: 'var(--blue)',   bg: 'var(--blue-light)',   taskId: null },
            { emoji: '🃏', label: 'Flashcards', sub: 'SRS review',                               route: '/flashcards', color: 'var(--green)',  bg: 'var(--green-light)',  taskId: 'flashcards' as DailyTaskId },
            { emoji: '🧩', label: 'Quiz',       sub: 'Multiple choice',                          route: '/quiz',       color: 'var(--blue)',   bg: 'var(--blue-light)',   taskId: 'quiz' as DailyTaskId },
            { emoji: '💀', label: 'Survival',   sub: '3 lives · timed',                          route: '/survival',   color: 'var(--red)',    bg: 'var(--red-light)',    taskId: 'survival' as DailyTaskId },
            { emoji: '✍️', label: 'Write',      sub: 'Canvas practice',                          route: '/write',      color: 'var(--pink)',   bg: 'var(--purple-light)', taskId: null },
            { emoji: '🎤', label: 'Shadow',     sub: 'Pronunciation',                            route: '/shadow',     color: 'var(--orange)', bg: 'var(--orange-light)', taskId: null },
            { emoji: '🗺️', label: 'Scene',      sub: 'Reading in context',                       route: '/scene',      color: 'var(--green)',  bg: 'var(--green-light)',  taskId: null },
            ...(profile?.targetLang === 'ja' || profile?.targetLang === 'ko'
              ? [{ emoji: 'あ', label: profile.targetLang === 'ja' ? 'Kana' : 'Hangul', sub: 'Characters', route: '/kana', color: 'var(--green)', bg: 'var(--green-light)', taskId: null }]
              : []),
          ].map((tool, i) => {
            const taskDone = tool.taskId && dailyProgress?.completed[tool.taskId];
            return (
              <button key={tool.label} onClick={() => { if (tool.taskId) handleTaskStart(tool.taskId); router.push(tool.route); }} className="study-tool-btn"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderRadius: '16px', background: '#fff', border: `2.5px solid ${taskDone ? 'var(--green)' : tool.color + '55'}`, boxShadow: taskDone ? '0 5px 0 var(--green-dark)' : `0 5px 0 ${tool.color}55`, cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all 0.1s ease', textAlign: 'left', position: 'relative', top: 0, animation: ready ? `bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) ${0.36 + i * 0.05}s both` : 'none' }}>
                <span style={{ fontSize: '26px', width: '44px', height: '44px', borderRadius: '12px', background: taskDone ? 'var(--green-light)' : tool.bg, border: `2px solid ${taskDone ? 'var(--green)55' : tool.color + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: tool.emoji === 'あ' ? '"Noto Sans JP",serif' : 'inherit', transition: 'transform 0.15s ease' }} className="tool-icon">
                  {taskDone ? '✅' : tool.emoji}
                </span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 800, color: 'var(--fg)' }}>{tool.label}</p>
                  <p style={{ fontSize: '12px', color: taskDone ? 'var(--green-dark)' : 'var(--muted)', fontWeight: 600 }}>{taskDone ? '✓ Done today' : tool.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Due words ── */}
        {dueCount > 0 && (
          <div style={{ marginBottom: '1.5rem', animation: ready ? 'fadeUp 0.4s ease 0.48s both' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>⏰ Due for Review</p>
              <span className="pill pill-orange" style={{ background: 'var(--orange-light)', color: '#a05600', border: '2px solid #ffbe5a' }}>{dueCount} words</span>
            </div>
            <div style={{ background: '#fff', borderRadius: '16px', border: '2.5px solid var(--border-dark)', boxShadow: '0 5px 0 var(--border-dark)', overflow: 'hidden' }}>
              {dueWords.slice(0, 5).map((w, i) => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 16px', borderBottom: i < Math.min(dueWords.length, 5) - 1 ? '2px solid var(--border)' : 'none', borderLeft: '4px solid var(--orange)', transition: 'background 0.15s', animation: ready ? `fadeRight 0.35s ease ${0.52 + i * 0.06}s both` : 'none' }} className="due-row">
                  <span style={{ fontSize: '22px', minWidth: '30px', fontFamily: '"Noto Sans JP","Noto Sans SC",serif', color: 'var(--fg)' }}>{w.kanji}</span>
                  <span style={{ fontSize: '14px', color: 'var(--fg-secondary)', flex: 1, fontWeight: 600 }}>{w.meaning}</span>
                  <span style={{ fontSize: '12px', color: 'var(--orange)', fontWeight: 800 }}>REVIEW</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Generate vocabulary ── */}
        <div style={{ marginBottom: '1.5rem', animation: ready ? 'fadeUp 0.4s ease 0.52s both' : 'none' }}>
          <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '10px' }}>✨ Generate Vocabulary</p>
          {topics.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              {topics.map(t => (
                <button key={t} className="btn btn-blue" style={{ fontSize: '13px', padding: '8px 16px' }} disabled={!!generating} onClick={() => generateWords(t)}>
                  {generating === t ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Spinner size={14} color="#fff" /> Generating…</span> : `+ More ${t}`}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {(profile?.interests ?? []).filter(i => !topics.includes(i)).map(i => (
              <button key={i} className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }} disabled={!!generating} onClick={() => generateWords(i)}>
                {generating === i ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Spinner size={14} color="#fff" /> Generating…</span> : `Generate ${i}`}
              </button>
            ))}
          </div>
          {error && (
            <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--red-light)', borderRadius: '12px', border: '2px solid var(--red)', color: 'var(--red-dark)', fontSize: '13px', fontWeight: 700 }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        <div style={{ height: '2.5px', background: 'var(--border-dark)', borderRadius: '2px', marginBottom: '1.5rem' }} />

        {/* ── Profile ── */}
        {!editingProfile ? (
          <div style={{ animation: ready ? 'fadeUp 0.4s ease 0.56s both' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>👤 Your Profile</p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn" style={{ fontSize: '13px', padding: '7px 14px' }} onClick={openEdit}>Edit</button>
                <button className="btn btn-red" style={{ fontSize: '13px', padding: '7px 14px' }} onClick={async () => { await signOut(); router.push('/'); }}>Sign out</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.25rem' }}>
              <span className="pill pill-gray">{nativeInfo?.flag} {nativeInfo?.label}</span>
              <span style={{ fontSize: '14px', color: 'var(--muted)', alignSelf: 'center' }}>→</span>
              <span className="pill pill-blue">{targetInfo?.flag} {targetInfo?.label}</span>
              <span className="pill pill-purple">{profile?.level}</span>
              {(profile?.interests ?? []).map(i => <span key={i} className="pill pill-teal">{i}</span>)}
            </div>
            <NotificationSettings uid={uid} />
          </div>
        ) : (
          <div style={{ animation: 'fadeUp 0.25s ease both' }}>
            <p style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '1.25rem' }}>✏️ Edit Profile</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--muted-bright)', marginBottom: '8px', fontWeight: 700 }}>I speak</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {NATIVE_LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => setNewNativeLang(l.code)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '12px', border: '2.5px solid', borderColor: newNativeLang === l.code ? 'var(--green)' : 'var(--border-dark)', background: newNativeLang === l.code ? 'var(--green-light)' : '#fff', color: newNativeLang === l.code ? 'var(--green-dark)' : 'var(--fg)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '13px', textAlign: 'left', width: '100%', fontWeight: 700, boxShadow: newNativeLang === l.code ? '0 4px 0 var(--green-dark)' : '0 4px 0 var(--border-dark)', transition: 'all 0.12s ease' }}>
                      <span>{l.flag}</span><span style={{ flex: 1 }}>{l.label}</span>{newNativeLang === l.code && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--muted-bright)', marginBottom: '8px', fontWeight: 700 }}>I'm learning</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {TARGET_LANGUAGES.map(l => (
                    <button key={l.code} onClick={() => setNewTargetLang(l.code)} disabled={(l.code as string) === (newNativeLang as string)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', borderRadius: '12px', border: '2.5px solid', borderColor: newTargetLang === l.code ? 'var(--blue)' : 'var(--border-dark)', background: newTargetLang === l.code ? 'var(--blue-light)' : '#fff', color: newTargetLang === l.code ? 'var(--blue-dark)' : 'var(--fg)', opacity: (l.code as string) === (newNativeLang as string) ? 0.35 : 1, cursor: (l.code as string) === (newNativeLang as string) ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, textAlign: 'left', width: '100%', boxShadow: newTargetLang === l.code ? '0 4px 0 var(--blue-dark)' : '0 4px 0 var(--border-dark)', transition: 'all 0.12s ease' }}>
                      <span>{l.flag}</span><span style={{ flex: 1 }}>{l.label}</span>{newTargetLang === l.code && <span>✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {sameLang && <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--red-dark)', background: 'var(--red-light)', padding: '10px 14px', borderRadius: '12px', marginBottom: '1rem', border: '2px solid var(--red)' }}>⚠️ Native and target language can't be the same.</div>}
            <p style={{ fontSize: '13px', color: 'var(--muted-bright)', marginBottom: '8px', fontWeight: 700 }}>Level</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1.25rem' }}>
              {(['beginner','intermediate','advanced'] as const).map(l => (
                <button key={l} onClick={() => setNewLevel(l)} style={{ flex: 1, padding: '9px 8px', borderRadius: '12px', border: '2.5px solid', borderColor: newLevel === l ? 'var(--purple)' : 'var(--border-dark)', background: newLevel === l ? 'var(--purple-light)' : '#fff', color: newLevel === l ? 'var(--purple-dark)' : 'var(--fg-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 700, boxShadow: newLevel === l ? '0 4px 0 var(--purple-dark)' : '0 4px 0 var(--border-dark)', transition: 'all 0.12s ease' }}>
                  {l === 'beginner' ? '🌱 Beginner' : l === 'intermediate' ? '📈 Mid' : '🔥 Advanced'}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '13px', color: 'var(--muted-bright)', marginBottom: '8px', fontWeight: 700 }}>Interests</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginBottom: '1.5rem' }}>
              {INTERESTS.map(i => (
                <button key={i} onClick={() => setNewInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])} style={{ padding: '6px 14px', borderRadius: '99px', border: '2.5px solid', fontSize: '13px', borderColor: newInterests.includes(i) ? 'var(--green)' : 'var(--border-dark)', background: newInterests.includes(i) ? 'var(--green-light)' : '#fff', color: newInterests.includes(i) ? '#2a7a00' : 'var(--fg-secondary)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 700, boxShadow: newInterests.includes(i) ? '0 3px 0 var(--green-dark)' : '0 3px 0 var(--border-dark)', transition: 'all 0.12s ease' }}>
                  {i}
                </button>
              ))}
            </div>
            {(newTargetLang !== profile?.targetLang || newNativeLang !== profile?.nativeLang) && (
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#a05600', background: 'var(--orange-light)', padding: '10px 14px', borderRadius: '12px', marginBottom: '1rem', border: '2px solid var(--orange)' }}>⚡ Switching language will change your word list. Previous words are saved.</div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" disabled={saving || !newInterests.length || sameLang} onClick={handleUpdateProfile}>
                {saving ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Spinner size={14} color="#fff" /> Saving…</span> : '💾 Save Changes'}
              </button>
              <button className="btn" onClick={() => setEditingProfile(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeRight{ from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        @keyframes bounceIn { 0%{opacity:0;transform:scale(0.85)} 60%{transform:scale(1.03)} 100%{opacity:1;transform:scale(1)} }
        @keyframes lineGrow { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        .mission-node:hover  { transform: scale(1.12) !important; }
        .mission-row-btn:hover  { background: #fafffe !important; transform: translateY(-2px); }
        .mission-row-btn:active { transform: translateY(3px) !important; }
        .study-tool-btn:hover  { background: #fafffc !important; transform: translateY(-2px); }
        .study-tool-btn:active { transform: translateY(4px) !important; }
        .study-tool-btn:hover .tool-icon { transform: scale(1.15) rotate(-5deg); }
        .due-row:hover { background: #fffbf5; }
      `}</style>
    </main>
  );
}
