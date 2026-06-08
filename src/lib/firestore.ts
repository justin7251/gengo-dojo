'use client';

import {
  doc, setDoc, getDoc, getDocs,
  collection, writeBatch, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  Word, SharedWord, WordTranslation, UserWord,
  Progress, UserProfile, Rating,
  TargetLang, NativeLang,
} from './types';
import { applyRating } from './srs';

// ── Helpers ───────────────────────────────────────────

function topicSlug(topic: string): string {
  return topic.toLowerCase().replace(/\s+/g, '-');
}

function wordId(kanji: string, targetLang: TargetLang): string {
  return `${targetLang}-${kanji}`;
}

function langPairKey(targetLang: TargetLang, nativeLang: NativeLang): string {
  return `${targetLang}-${nativeLang}`;
}

// ── User profile ──────────────────────────────────────

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await setDoc(doc(db, 'users', profile.uid), profile, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}


// ── User word list ────────────────────────────────────

// Save references to the user's personal word list
export async function saveUserWords(
  uid:        string,
  words:      Word[],
  targetLang: TargetLang,
  nativeLang: NativeLang
): Promise<void> {
  const batch  = writeBatch(db);
  const pairKey = langPairKey(targetLang, nativeLang);

  words.forEach(w => {
    const ref = doc(db, 'user_words', uid, pairKey, w.id);
    const userWord: UserWord = {
      wordId:     w.id,
      topic:      w.topic,
      targetLang: w.targetLang,
      nativeLang,
      addedAt:    Date.now(),
    };
    batch.set(ref, userWord, { merge: true });
  });

  await batch.commit();
}

// Get user's word list, assembled with shared vocab + translations
export async function getUserWords(
  uid:        string,
  targetLang: TargetLang,
  nativeLang: NativeLang
): Promise<Word[]> {
  const pairKey  = langPairKey(targetLang, nativeLang);
  const listSnap = await getDocs(
    collection(db, 'user_words', uid, pairKey)
  );

  if (listSnap.empty) return [];

  // Group by topic for efficient fetching
  const byTopic: Record<string, UserWord[]> = {};
  for (const d of listSnap.docs) {
    const uw = d.data() as UserWord;
    if (!byTopic[uw.topic]) byTopic[uw.topic] = [];
    byTopic[uw.topic].push(uw);
  }

  const words: Word[] = [];

  for (const [topic, userWords] of Object.entries(byTopic)) {
    const slug = topicSlug(topic);
    for (const uw of userWords) {
      // Fetch shared word
      const wordSnap = await getDoc(
        doc(db, 'vocabulary', slug, 'words', uw.wordId)
      );
      if (!wordSnap.exists()) continue;
      const shared = wordSnap.data() as SharedWord;

      // Fetch translation
      const transSnap = await getDoc(
        doc(db, 'vocabulary', slug, 'words', uw.wordId, 'translations', nativeLang)
      );
      if (!transSnap.exists()) continue;
      const trans = transSnap.data() as WordTranslation;

      words.push({
        id:                  uw.wordId,
        kanji:               shared.kanji,
        reading:             shared.reading,
        romanization:        shared.romanization,
        example:             shared.example,
        type:                shared.type,
        targetLang:          shared.targetLang,
        nativeLang,
        topic:               shared.topic,
        createdAt:           shared.createdAt,
        meaning:             trans.meaning,
        example_translation: trans.example_translation,
      });
    }
  }

  return words;
}

// ── Progress ──────────────────────────────────────────

export async function getProgress(
  uid:        string,
  targetLang: TargetLang,
  nativeLang: NativeLang
): Promise<Record<string, Progress>> {
  const pairKey  = langPairKey(targetLang, nativeLang);
  const snap     = await getDocs(
    collection(db, 'progress', uid, pairKey)
  );
  const result: Record<string, Progress> = {};
  snap.docs.forEach(d => { result[d.id] = d.data() as Progress; });
  return result;
}

export async function initProgress(
  uid:        string,
  wordIds:    string[],
  targetLang: TargetLang,
  nativeLang: NativeLang
): Promise<void> {
  const batch   = writeBatch(db);
  const pairKey = langPairKey(targetLang, nativeLang);

  wordIds.forEach(wid => {
    batch.set(
      doc(db, 'progress', uid, pairKey, wid),
      {
        wordId:       wid,
        correct:      0,
        wrong:        0,
        nextReview:   Date.now(),
        interval:     'new',
        lastReviewed: Date.now(),
      } satisfies Progress,
      { merge: true }
    );
  });

  await batch.commit();
}

export async function rateWord(
  uid:        string,
  wordId:     string,
  rating:     Rating,
  prev:       Progress,
  targetLang: TargetLang,
  nativeLang: NativeLang
): Promise<void> {
  const pairKey = langPairKey(targetLang, nativeLang);
  const update  = applyRating(prev, rating);
  await updateDoc(
    doc(db, 'progress', uid, pairKey, wordId),
    update
  );
}

// ── Kana progress ─────────────────────────────────────

export async function getKanaProgress(
  uid: string
): Promise<Record<string, Progress>> {
  const snap   = await getDocs(collection(db, 'kana_progress', uid, 'chars'));
  const result: Record<string, Progress> = {};
  snap.docs.forEach(d => { result[d.id] = d.data() as Progress; });
  return result;
}

export async function rateKana(
  uid:    string,
  char:   string,
  rating: Rating,
  prev:   Progress
): Promise<void> {
  const update = applyRating(prev, rating);
  await setDoc(
    doc(db, 'kana_progress', uid, 'chars', char),
    { ...prev, ...update, wordId: char },
    { merge: true }
  );
}

export async function initKanaProgress(
  uid:   string,
  chars: string[]
): Promise<void> {
  const batch = writeBatch(db);
  chars.forEach(char => {
    batch.set(
      doc(db, 'kana_progress', uid, 'chars', char),
      {
        wordId:       char,
        correct:      0,
        wrong:        0,
        nextReview:   Date.now(),
        interval:     'new',
        lastReviewed: Date.now(),
      } satisfies Progress,
      { merge: true }
    );
  });
  await batch.commit();
}

// ── Topic checks ──────────────────────────────────────

// Get topics a user has added words from
export async function getUserTopics(
  uid:        string,
  targetLang: TargetLang,
  nativeLang: NativeLang
): Promise<string[]> {
  const pairKey  = langPairKey(targetLang, nativeLang);
  const snap     = await getDocs(collection(db, 'user_words', uid, pairKey));
  const topics   = new Set<string>();
  snap.docs.forEach(d => topics.add((d.data() as UserWord).topic));
  return Array.from(topics);
}

// ── Daily task tracking ────────────────────────────────

export type DailyTaskId = 'flashcards' | 'quiz' | 'mission' | 'survival';

export interface DailyProgress {
  date:      string;                          // YYYY-MM-DD
  completed: Partial<Record<DailyTaskId, boolean>>;
  streakHistory: string[];                    // last 35 dates that were fully completed
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export async function getDailyProgress(uid: string): Promise<DailyProgress> {
  const snap = await getDoc(doc(db, 'daily_progress', uid));
  const today = todayStr();
  if (!snap.exists()) return { date: today, completed: {}, streakHistory: [] };
  const data = snap.data() as DailyProgress;
  // Reset tasks if it's a new day (keep streakHistory)
  if (data.date !== today) return { date: today, completed: {}, streakHistory: data.streakHistory ?? [] };
  return data;
}

export async function markDailyTask(
  uid:    string,
  taskId: DailyTaskId,
): Promise<DailyProgress> {
  const current = await getDailyProgress(uid);
  const updated: DailyProgress = {
    ...current,
    completed: { ...current.completed, [taskId]: true },
  };
  // If all 4 done and today not already in history, record it
  const allDone = (['flashcards','quiz','mission','survival'] as DailyTaskId[]).every(t => updated.completed[t]);
  const today   = todayStr();
  if (allDone && !updated.streakHistory.includes(today)) {
    updated.streakHistory = [...(updated.streakHistory ?? []), today].slice(-70); // keep ~10 weeks
  }
  await setDoc(doc(db, 'daily_progress', uid), updated);
  return updated;
}

export async function getStreakHistory(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, 'daily_progress', uid));
  if (!snap.exists()) return [];
  return (snap.data() as DailyProgress).streakHistory ?? [];
}

// ── Seed streak history for existing users ────────────
// Called once if streakHistory is empty but streakDays > 0.
// Back-fills the last N consecutive days so the calendar isn't all grey.
export async function seedStreakHistory(uid: string, streakDays: number): Promise<string[]> {
  if (streakDays <= 0) return [];
  const today    = new Date();
  const history: string[] = [];
  // Fill days from (today - streakDays + 1) up to and including yesterday
  // (today gets marked when they complete tasks)
  for (let i = streakDays - 1; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    history.push(d.toISOString().split('T')[0]);
  }
  const snap = await getDoc(doc(db, 'daily_progress', uid));
  if (snap.exists()) {
    const data = snap.data() as DailyProgress;
    if ((data.streakHistory ?? []).length > 0) return data.streakHistory; // already seeded
    const updated = { ...data, streakHistory: history };
    await setDoc(doc(db, 'daily_progress', uid), updated);
    return history;
  } else {
    const fresh: DailyProgress = {
      date:           todayStr(),
      completed:      {},
      streakHistory:  history,
    };
    await setDoc(doc(db, 'daily_progress', uid), fresh);
    return history;
  }
}
