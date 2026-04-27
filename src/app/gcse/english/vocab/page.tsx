'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSEVocabPage() {
  return <AuthGuard><GCSEVocab /></AuthGuard>;
}

interface VocabWord {
  word:       string;
  tier:       2 | 3;
  definition: string;
  example:    string;
  subject:    string;
}

// Tier 2 = high-frequency academic words across subjects
// Tier 3 = subject-specific literary/analytical terms
const VOCAB_BANK: VocabWord[] = [
  // Tier 2 — Academic vocabulary
  { word: 'convey', tier: 2, definition: 'To communicate or express an idea or feeling', example: 'The writer conveys a sense of unease through the description of the empty house.', subject: 'General' },
  { word: 'implicit', tier: 2, definition: 'Suggested or understood without being directly stated', example: 'The writer\'s implicit criticism of society is evident throughout the extract.', subject: 'General' },
  { word: 'explicit', tier: 2, definition: 'Stated clearly and directly, leaving nothing implied', example: 'The explicit reference to death in the opening line immediately establishes a dark tone.', subject: 'General' },
  { word: 'juxtapose', tier: 2, definition: 'To place two contrasting things side by side for effect', example: 'The writer juxtaposes wealth and poverty to highlight social inequality.', subject: 'General' },
  { word: 'evoke', tier: 2, definition: 'To bring a feeling, memory, or image to mind', example: 'The description evokes a powerful sense of isolation and loss.', subject: 'General' },
  { word: 'ambiguous', tier: 2, definition: 'Open to more than one interpretation; unclear', example: 'The ending is deliberately ambiguous, leaving the reader uncertain of the outcome.', subject: 'General' },
  { word: 'synthesis', tier: 2, definition: 'Combining elements from different sources to form a whole', example: 'In Q2, you must synthesis information from both texts.', subject: 'Paper 2' },
  { word: 'infer', tier: 2, definition: 'To reach a conclusion from evidence rather than explicit statement', example: 'From the character\'s behaviour, we can infer that she is frightened.', subject: 'AO1' },
  { word: 'omniscient', tier: 2, definition: 'Having unlimited knowledge; knowing everything (narrator)', example: 'The omniscient narrator reveals the character\'s innermost thoughts.', subject: 'Structure' },
  { word: 'perspective', tier: 2, definition: 'A particular way of viewing something; a point of view', example: 'The writer shifts perspective to show how different characters interpret the same event.', subject: 'AO3' },
  // Tier 3 — Literary/analytical terms
  { word: 'pathetic fallacy', tier: 3, definition: 'Using weather or nature to reflect the mood of a character or scene', example: 'The storm raging outside mirrors the protagonist\'s inner turmoil — a use of pathetic fallacy.', subject: 'AO2' },
  { word: 'semantic field', tier: 3, definition: 'A group of words related to the same topic or concept, used together for effect', example: 'The semantic field of war — "battle", "wound", "surrender" — creates a sense of constant conflict.', subject: 'AO2' },
  { word: 'sibilance', tier: 3, definition: 'Repetition of "s" or "sh" sounds for effect (a type of alliteration)', example: '"The slippery surface of the sea" uses sibilance to create a soft, sinister atmosphere.', subject: 'AO2' },
  { word: 'enjambment', tier: 3, definition: 'When a sentence or phrase runs over from one line to the next without a pause', example: 'The use of enjambment mirrors the character\'s racing thoughts, denying the reader any pause.', subject: 'AO2' },
  { word: 'caesura', tier: 3, definition: 'A strong pause in the middle of a line, created by punctuation', example: 'The caesura — "She turned. He was gone." — creates a sudden, jarring break in the narrative.', subject: 'AO2' },
  { word: 'diegetic', tier: 3, definition: 'Sound or action that occurs within the world of the narrative', example: 'The diegetic sound of footsteps increases tension.', subject: 'Structure' },
  { word: 'prolepsis', tier: 3, definition: 'A narrative technique that anticipates a future event (foreshadowing)', example: 'The early description of the broken mirror is an example of prolepsis, hinting at misfortune to come.', subject: 'AO3' },
  { word: 'analepsis', tier: 3, definition: 'A narrative technique that refers back to a past event (flashback)', example: 'The writer uses analepsis to reveal the character\'s traumatic childhood.', subject: 'AO3' },
  { word: 'polysyndeton', tier: 3, definition: 'The use of many conjunctions (and, but, or) in quick succession', example: '"She ran and fell and screamed and wept" — the polysyndeton creates breathless urgency.', subject: 'AO2' },
  { word: 'asyndeton', tier: 3, definition: 'Deliberately leaving out conjunctions for a compressed, fast-paced effect', example: '"She came, she saw, she conquered" — asyndeton creates pace and power.', subject: 'AO2' },
  { word: 'lexical choice', tier: 3, definition: 'The specific words a writer selects and why', example: 'The writer\'s lexical choice of "crumbling" rather than "old" suggests active decay.', subject: 'AO2' },
  { word: 'register', tier: 3, definition: 'The level of formality or type of language used in a particular context', example: 'The writer shifts register from formal to colloquial to mirror the character\'s loss of control.', subject: 'AO5' },
  { word: 'verisimilitude', tier: 3, definition: 'The quality of appearing true or real', example: 'The detailed descriptions of daily life create verisimilitude, grounding the reader in the character\'s world.', subject: 'General' },
  { word: 'bathos', tier: 3, definition: 'An abrupt and jarring shift from serious to trivial for comic or ironic effect', example: 'The speech builds to a grand climax, only to end with bathos: "And that is why I hate Mondays."', subject: 'AO2' },
];

type FilterType = 'all' | 2 | 3;
type ViewMode   = 'browse' | 'flashcard';

function GCSEVocab() {
  const router = useRouter();

  const [filter, setFilter]     = useState<FilterType>('all');
  const [search, setSearch]     = useState('');
  const [mode, setMode]         = useState<ViewMode>('browse');
  const [cardIdx, setCardIdx]   = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [known, setKnown]       = useState<Set<string>>(new Set());

  const filtered = VOCAB_BANK.filter(w => {
    if (filter !== 'all' && w.tier !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return w.word.includes(q) || w.definition.toLowerCase().includes(q) || w.subject.toLowerCase().includes(q);
    }
    return true;
  });

  const flashQueue = filtered.filter(w => !known.has(w.word));
  const current    = flashQueue[cardIdx % Math.max(flashQueue.length, 1)];

  function markKnown() {
    if (!current) return;
    setKnown(prev => new Set([...prev, current.word]));
    setRevealed(false);
    setCardIdx(i => i + 1);
  }

  function markReview() {
    setRevealed(false);
    setCardIdx(i => i + 1);
  }

  return (
    <Screen>
      <TopBar onBack={() => router.push('/gcse')} title="📚 Vocabulary" />

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
        {(['browse', 'flashcard'] as ViewMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '8px', borderRadius: '10px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500,
            border: `1px solid ${mode === m ? 'rgba(0,232,122,0.4)' : 'rgba(255,255,255,0.1)'}`,
            background: mode === m ? 'rgba(0,232,122,0.1)' : 'rgba(255,255,255,0.04)',
            color: mode === m ? '#00e87a' : 'rgba(255,255,255,0.45)', transition: 'all 0.15s',
          }}>
            {m === 'browse' ? '📋 Browse' : '🎴 Flashcards'}
          </button>
        ))}
      </div>

      {/* Filter + Search */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        {(['all', 2, 3] as FilterType[]).map(f => (
          <button key={String(f)} onClick={() => setFilter(f)} style={{
            padding: '5px 12px', borderRadius: '99px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '11px', fontWeight: filter === f ? 600 : 400,
            border: `1px solid ${filter === f ? 'rgba(0,232,122,0.4)' : 'rgba(255,255,255,0.1)'}`,
            background: filter === f ? 'rgba(0,232,122,0.1)' : 'transparent',
            color: filter === f ? '#00e87a' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s',
          }}>
            {f === 'all' ? 'All' : `Tier ${f}`}
          </button>
        ))}
      </div>

      {mode === 'browse' && (
        <input type="text" placeholder="Search words…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', marginBottom: '1rem' }} />
      )}

      {/* Browse mode */}
      {mode === 'browse' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(w => (
            <div key={w.word} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px', border: `1px solid ${w.tier === 3 ? 'rgba(127,119,221,0.2)' : 'rgba(0,232,122,0.15)'}`, borderLeft: `3px solid ${w.tier === 3 ? '#7F77DD' : '#00e87a'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{w.word}</span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: w.tier === 3 ? 'rgba(127,119,221,0.15)' : 'rgba(0,232,122,0.1)', color: w.tier === 3 ? '#9F99E8' : '#00e87a', border: `1px solid ${w.tier === 3 ? 'rgba(127,119,221,0.25)' : 'rgba(0,232,122,0.2)'}` }}>
                  Tier {w.tier}
                </span>
                <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>{w.subject}</span>
              </div>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px', lineHeight: 1.4 }}>{w.definition}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', lineHeight: 1.5 }}>"{w.example}"</p>
            </div>
          ))}
        </div>
      )}

      {/* Flashcard mode */}
      {mode === 'flashcard' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
            <span>{flashQueue.length} remaining · {known.size} known</span>
            {known.size > 0 && <button onClick={() => { setKnown(new Set()); setCardIdx(0); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-ui)', fontSize: '12px' }}>Reset</button>}
          </div>

          {flashQueue.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🏆</p>
              <p style={{ fontSize: '18px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>All words known!</p>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '2rem' }}>You've marked all {VOCAB_BANK.length} words as known.</p>
              <button onClick={() => { setKnown(new Set()); setCardIdx(0); }} style={WHITE_BTN}>Start over</button>
            </div>
          ) : current ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Card */}
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.35)', borderRadius: '20px', padding: '2rem', marginBottom: '1rem', border: `1px solid ${current.tier === 3 ? 'rgba(127,119,221,0.25)' : 'rgba(0,232,122,0.2)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '240px' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '99px', background: current.tier === 3 ? 'rgba(127,119,221,0.15)' : 'rgba(0,232,122,0.1)', color: current.tier === 3 ? '#9F99E8' : '#00e87a' }}>
                    Tier {current.tier}
                  </span>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '99px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}>
                    {current.subject}
                  </span>
                </div>
                <p style={{ fontSize: '32px', fontWeight: 700, color: '#fff', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                  {current.word}
                </p>
                {!revealed ? (
                  <button onClick={() => setRevealed(true)} style={{ ...WHITE_BTN, fontSize: '13px' }}>
                    Reveal definition
                  </button>
                ) : (
                  <div style={{ animation: 'fadeIn 0.2s ease', width: '100%' }}>
                    <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, marginBottom: '1rem' }}>{current.definition}</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', lineHeight: 1.5, paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      "{current.example}"
                    </p>
                  </div>
                )}
              </div>

              {revealed && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
                  <button onClick={markReview} style={{ padding: '14px', borderRadius: '12px', border: '1px solid rgba(226,75,74,0.35)', background: 'rgba(226,75,74,0.12)', color: '#ff8080', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                    Still learning
                  </button>
                  <button onClick={markKnown} style={{ padding: '14px', borderRadius: '12px', border: '1px solid rgba(0,232,122,0.35)', background: 'rgba(0,232,122,0.12)', color: '#00e87a', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                    ✓ Know it
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
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
    <main style={{ minHeight: '100vh', background: '#040e08', backgroundImage: 'radial-gradient(ellipse at top, #081c10 0%, #040e08 60%)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 2.5rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(0,232,122,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(0,232,122,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </main>
  );
}
function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <button onClick={onBack} style={GHOST_BTN}>← Back</button>
      <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{title}</span>
      <div style={{ width: '60px' }} />
    </div>
  );
}
const WHITE_BTN: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', color: '#040e08', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' };
const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
