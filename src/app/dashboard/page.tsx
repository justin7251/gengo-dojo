'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuth } from '@/lib/auth';
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
import AuthGuard from '@/components/AuthGuard';

const INTERESTS = [
  'Judo', 'Anime', 'Cooking', 'Gaming', 'Music',
  'Travel', 'Fashion', 'Architecture', 'Medicine',
  'Photography', 'Football', 'Cinema', 'Manga',
  'Tea ceremony', 'Calligraphy', 'Origami', 'Business',
  'Nature', 'Technology', 'Art',
];

export default function DashboardPage() {
  return <AuthGuard><Dashboard /></AuthGuard>;
}

function Dashboard() {
  const router = useRouter();

  const [uid, setUid]               = useState('');
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [words, setWords]           = useState<Word[]>([]);
  const [progress, setProgress]     = useState<Record<string, Progress>>({});
  const [topics, setTopics]         = useState<string[]>([]);
  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError]           = useState('');

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false);
  const [newInterests, setNewInterests]     = useState<string[]>([]);
  const [newLevel, setNewLevel]             = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [newNativeLang, setNewNativeLang]   = useState<NativeLang>('en');
  const [newTargetLang, setNewTargetLang]   = useState<TargetLang>('ja');
  const [saving, setSaving]                 = useState(false);

  useEffect(() => {
    return onAuth(async (user) => {
      if (!user) return;
      setUid(user.uid);
      const p = await getUserProfile(user.uid);
      setProfile(p);
      if (p) {
        const [w, pr, t] = await Promise.all([
          getUserWords(user.uid, p.targetLang, p.nativeLang),
          getProgress(user.uid, p.targetLang, p.nativeLang),
          getUserTopics(user.uid, p.targetLang, p.nativeLang),
        ]);
        setWords(w);
        setProgress(pr);
        setTopics(t);
      }
      setLoading(false);
    });
  }, []);

  // ── Generate words ──────────────────────────────────
  async function generateWords(interest: string) {
    if (!profile) return;
    setGenerating(interest);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interest,
          targetLang: profile.targetLang,
          nativeLang: profile.nativeLang,
          level:      profile.level,
        }),
      });
      const data = await res.json();
      if (!data.words?.length) throw new Error('No words returned');

      const newWords: Word[] = data.words.map((
        w: Omit<Word, 'id' | 'nativeLang' | 'createdAt'>,
      ) => ({
        ...w,
        id:         `${profile.targetLang}-${w.kanji}`,
        nativeLang: profile.nativeLang,
        createdAt:  Date.now(),
      }));

      await saveUserWords(uid, newWords, profile.targetLang, profile.nativeLang);
      await initProgress(uid, newWords.map(w => w.id), profile.targetLang, profile.nativeLang);

      const [w, pr, t] = await Promise.all([
        getUserWords(uid, profile.targetLang, profile.nativeLang),
        getProgress(uid, profile.targetLang, profile.nativeLang),
        getUserTopics(uid, profile.targetLang, profile.nativeLang),
      ]);
      setWords(w);
      setProgress(pr);
      setTopics(t);
    } catch {
      setError('Failed to generate words. Please try again.');
    } finally {
      setGenerating(null);
    }
  }

  // ── Profile editing ─────────────────────────────────
  function openEdit() {
    if (!profile) return;
    setNewInterests(profile.interests);
    setNewLevel(profile.level);
    setNewNativeLang(profile.nativeLang);
    setNewTargetLang(profile.targetLang);
    setEditingProfile(true);
  }

  async function handleUpdateProfile() {
    if (!profile || !newInterests.length) return;
    if ((newNativeLang as string) === (newTargetLang as string)) return;
    setSaving(true);
    try {
      const updated: UserProfile = {
        ...profile,
        interests:  newInterests,
        level:      newLevel,
        nativeLang: newNativeLang,
        targetLang: newTargetLang,
      };
      await saveUserProfile(updated);
      setProfile(updated);
      setEditingProfile(false);
      const [w, pr, t] = await Promise.all([
        getUserWords(uid, updated.targetLang, updated.nativeLang),
        getProgress(uid, updated.targetLang, updated.nativeLang),
        getUserTopics(uid, updated.targetLang, updated.nativeLang),
      ]);
      setWords(w);
      setProgress(pr);
      setTopics(t);
    } catch {
      setError('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  // ── Derived stats ───────────────────────────────────
  const totalWords    = words.length;
  const masteredCount = words.filter(w => progress[w.id] && isMastered(progress[w.id])).length;
  const dueWords      = words.filter(w => progress[w.id] && isDue(progress[w.id]));
  const dueCount      = dueWords.length;
  const targetInfo    = TARGET_LANGUAGES.find(l => l.code === profile?.targetLang);
  const nativeInfo    = NATIVE_LANGUAGES.find(l => l.code === profile?.nativeLang);
  const sameLang      = (newNativeLang as string) === (newTargetLang as string);

  if (loading) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '4rem 0' }}><Spinner /></div>
      </Shell>
    );
  }

  return (
    <Shell uid={uid} email={profile?.email ?? ''}>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>My dojo</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
            {nativeInfo?.flag} {nativeInfo?.label}
          </span>
          <span style={{ fontSize: '14px', color: 'var(--muted)', opacity: 0.4 }}>→</span>
          <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
            {targetInfo?.flag} {targetInfo?.label}
          </span>
          <span style={{ fontSize: '14px', color: 'var(--muted)', opacity: 0.4 }}>·</span>
          <span style={{ fontSize: '14px', color: 'var(--muted)' }}>{profile?.level}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px', marginBottom: '2rem',
      }}>
        {[
          { label: 'Total words', value: totalWords },
          { label: 'Mastered',    value: masteredCount },
          { label: 'Due today',   value: dueCount },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '12px', padding: '16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '28px', fontWeight: 600, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" disabled={!totalWords}
          onClick={() => router.push('/flashcards')}>Flashcards</button>
        <button className="btn" disabled={totalWords < 4}
          onClick={() => router.push('/quiz')}>Quiz</button>
        <button className="btn" disabled={!totalWords}
          onClick={() => router.push('/words')}>Word list</button>
        <button className="btn" disabled={!totalWords}
          onClick={() => router.push('/write')}>✍️ Write</button>
        {(profile?.targetLang === 'ja' || profile?.targetLang === 'ko') && (
          <button className="btn" onClick={() => router.push('/kana')}>
            {profile.targetLang === 'ja' ? 'あ Kana' : '가 Hangul'}
          </button>
        )}
      </div>

      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '2rem' }} />

      {/* Due for review */}
      {dueCount > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <p style={{
            fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--muted)', fontWeight: 500, marginBottom: '12px',
          }}>
            Due for review · {dueCount} word{dueCount !== 1 ? 's' : ''}
          </p>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '12px', overflow: 'hidden',
          }}>
            {dueWords.slice(0, 5).map((w, i) => (
              <div key={w.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: i < Math.min(dueWords.length, 5) - 1
                  ? '1px solid var(--border)' : 'none',
              }}>
                <span style={{
                  fontSize: '22px',
                  fontFamily: 'var(--font-noto-jp), var(--font-noto-sc), "Noto Sans JP", serif',
                }}>
                  {w.kanji}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--muted)', flex: 1, paddingLeft: '12px' }}>
                  {w.meaning}
                </span>
                <span className="pill pill-amber">review</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate vocabulary */}
      <div style={{ marginBottom: '2rem' }}>
        <p style={{
          fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
          color: 'var(--muted)', fontWeight: 500, marginBottom: '12px',
        }}>
          Generate vocabulary
        </p>

        {topics.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {topics.map(t => (
              <button key={t} className="btn" style={{ fontSize: '13px' }}
                disabled={!!generating} onClick={() => generateWords(t)}>
                {generating === t
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Spinner small /> Generating…
                    </span>
                  : `+ More ${t}`}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {(profile?.interests ?? [])
            .filter(i => !topics.includes(i))
            .map(i => (
              <button key={i} className="btn" style={{ fontSize: '13px' }}
                disabled={!!generating} onClick={() => generateWords(i)}>
                {generating === i
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Spinner small /> Generating…
                    </span>
                  : `Generate ${i} words`}
              </button>
            ))}
        </div>

        {generating && (
          <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '12px' }}>
            AI is crafting your {generating} vocabulary in {targetInfo?.label}…
          </p>
        )}
        {error && (
          <p style={{
            fontSize: '13px', color: '#A32D2D', background: '#FCEBEB',
            padding: '10px 12px', borderRadius: '8px', marginTop: '12px',
          }}>
            {error}
          </p>
        )}
      </div>

      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '1.5rem' }} />

      {/* Profile */}
      {!editingProfile ? (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--muted)', fontWeight: 500, marginBottom: '8px',
            }}>
              Your profile
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <span className="pill pill-gray">{nativeInfo?.flag} {nativeInfo?.label}</span>
              <span style={{ fontSize: '12px', color: 'var(--muted)', alignSelf: 'center' }}>→</span>
              <span className="pill pill-blue">{targetInfo?.flag} {targetInfo?.label}</span>
              <span className="pill pill-gray">{profile?.level}</span>
              {(profile?.interests ?? []).map(i => (
                <span key={i} className="pill pill-teal">{i}</span>
              ))}
            </div>
          </div>
          <button className="btn" style={{ fontSize: '13px', flexShrink: 0, marginLeft: '12px' }}
            onClick={openEdit}>
            Edit
          </button>
        </div>

      ) : (
        <div style={{ animation: 'fadeIn 0.2s ease' }}>
          <p style={{
            fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--muted)', fontWeight: 500, marginBottom: '1.25rem',
          }}>
            Edit profile
          </p>

          {/* Language pickers */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: '1rem', marginBottom: '1.25rem',
          }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>I speak</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {NATIVE_LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => setNewNativeLang(l.code)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', borderRadius: '10px', border: '1px solid',
                      borderColor: newNativeLang === l.code ? 'var(--teal)' : 'var(--border)',
                      background:  newNativeLang === l.code ? 'var(--teal-light)' : 'var(--surface)',
                      color:       newNativeLang === l.code ? 'var(--teal-dark)' : 'var(--fg)',
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px',
                      transition: 'all 0.15s', textAlign: 'left', width: '100%',
                    }}>
                    <span>{l.flag}</span>
                    <span style={{ flex: 1 }}>{l.label}</span>
                    {newNativeLang === l.code && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>I want to learn</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {TARGET_LANGUAGES.map(l => (
                  <button key={l.code}
                    onClick={() => setNewTargetLang(l.code)}
                    disabled={(l.code as string) === (newNativeLang as string)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 12px', borderRadius: '10px', border: '1px solid',
                      borderColor: newTargetLang === l.code ? '#185FA5' : 'var(--border)',
                      background:  newTargetLang === l.code ? '#E6F1FB'  : 'var(--surface)',
                      color:       newTargetLang === l.code ? '#185FA5'  : 'var(--fg)',
                      opacity: (l.code as string) === (newNativeLang as string) ? 0.35 : 1,
                      cursor: (l.code as string) === (newNativeLang as string) ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', fontSize: '13px',
                      transition: 'all 0.15s', textAlign: 'left', width: '100%',
                    }}>
                    <span>{l.flag}</span>
                    <span style={{ flex: 1 }}>{l.label}</span>
                    {newTargetLang === l.code && <span style={{ color: '#185FA5' }}>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {sameLang && (
            <p style={{
              fontSize: '13px', color: '#A32D2D', background: '#FCEBEB',
              padding: '10px 12px', borderRadius: '8px', marginBottom: '1rem',
            }}>
              Native and target language can't be the same.
            </p>
          )}

          {/* Level */}
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Level</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {(['beginner', 'intermediate', 'advanced'] as const).map(l => (
              <span key={l} className={`tag ${newLevel === l ? 'selected' : ''}`}
                onClick={() => setNewLevel(l)}>
                {l === 'beginner' ? '🌱 Beginner'
                  : l === 'intermediate' ? '📈 Intermediate' : '🔥 Advanced'}
              </span>
            ))}
          </div>

          {/* Interests */}
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px' }}>Interests</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem' }}>
            {INTERESTS.map(i => (
              <span key={i}
                className={`tag ${newInterests.includes(i) ? 'selected' : ''}`}
                onClick={() => setNewInterests(prev =>
                  prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                )}>
                {i}
              </span>
            ))}
          </div>

          {/* Language change warning */}
          {(newTargetLang !== profile?.targetLang || newNativeLang !== profile?.nativeLang) && (
            <p style={{
              fontSize: '12px', color: '#854F0B', background: '#FAEEDA',
              padding: '10px 12px', borderRadius: '8px', marginBottom: '1rem',
            }}>
              Changing language will switch your word list. Your previous words are saved
              and will reload when you switch back.
            </p>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary"
              disabled={saving || !newInterests.length || sameLang}
              onClick={handleUpdateProfile}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button className="btn" onClick={() => setEditingProfile(false)}>Cancel</button>
          </div>
        </div>
      )}

    </Shell>
  );
}

// ── Shell ─────────────────────────────────────────────
function Shell({ children, uid, email }: {
  children: React.ReactNode;
  uid?: string;
  email?: string;
}) {
  const router = useRouter();
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '2rem 1rem 4rem', background: 'var(--bg)',
    }}>
      <div style={{
        width: '100%', maxWidth: '680px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem',
      }}>
        <span style={{ fontSize: '18px', fontWeight: 600, cursor: 'pointer', letterSpacing: '-0.02em' }}
          onClick={() => router.push('/dashboard')}>
          言語道場
        </span>
        {email && <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{email}</span>}
      </div>
      <div style={{
        width: '100%', maxWidth: '680px', background: 'var(--bg)',
        border: '1px solid var(--border)', borderRadius: '20px', padding: '2.5rem',
      }}>
        {children}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}

function Spinner({ small }: { small?: boolean }) {
  const size = small ? '14px' : '24px';
  return (
    <div style={{
      width: size, height: size,
      border: '2px solid var(--border)', borderTopColor: 'var(--muted)',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
      margin: small ? '0' : '0 auto', flexShrink: 0,
    }} />
  );
}
