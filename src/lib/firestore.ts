'use client';

import {
  doc, setDoc, getDoc, getDocs,
  collection, query, where,
  serverTimestamp, updateDoc, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Word, Progress, UserProfile, Rating } from './types';
import { applyRating } from './srs';

// ── User profile ──────────────────────────────────────────
export async function saveUserProfile(profile: UserProfile) {
  await setDoc(doc(db, 'users', profile.uid), profile, { merge: true });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// ── Shared vocabulary cache ───────────────────────────
export async function getCachedWords(
  topic: string,
  lang: string,
  level: string
): Promise<Word[] | null> {
  const cacheId = `${lang}-${level}-${topic.toLowerCase().replace(/\s+g/, '-')}`;
  const snap = await getDoc(doc(db, 'vocabulary_cache', cacheId));
  if (!snap.exists()) return null;
  const data = snap.data();
  // Cache expires after 30 days
  if (Date.now() - data.createdAt > 30 * 86_400_000) return null;
  return data.words as Word[];
}

export async function setCachedWords(
  topic: string,
  lang: string,
  level: string,
  words: Word[]
): Promise<void> {
  const cacheId = `${lang}-${level}-${topic.toLowerCase().replace(/\s+g/, '-')}`;
  await setDoc(doc(db, 'vocabulary_cache', cacheId), {
    topic, lang, level,
    words,
    createdAt: Date.now(),
  });
}   

// ── Vocabulary ────────────────────────────────────────────
export async function saveWords(uid: string, words: Word[]) {
  const batch = writeBatch(db);
  words.forEach((w) => {
    batch.set(doc(db, 'vocabulary', uid, 'words', w.id), w);
    // Initialise progress for each new word
    batch.set(doc(db, 'progress', uid, 'words', w.id), {
      wordId: w.id,
      correct: 0,
      wrong: 0,
      nextReview: Date.now(),
      interval: 'new',
      lastReviewed: Date.now(),
    } satisfies Progress);
  });
  await batch.commit();
}

export async function getWords(uid: string): Promise<Word[]> {
  const snap = await getDocs(collection(db, 'vocabulary', uid, 'words'));
  return snap.docs.map((d) => d.data() as Word);
}

// ── Progress ──────────────────────────────────────────────
export async function getProgress(uid: string): Promise<Record<string, Progress>> {
  const snap = await getDocs(collection(db, 'progress', uid, 'words'));
  const result: Record<string, Progress> = {};
  snap.docs.forEach((d) => { result[d.id] = d.data() as Progress; });
  return result;
}

export async function rateWord(uid: string, wordId: string, rating: Rating, prev: Progress) {
  const update = applyRating(prev, rating);
  await updateDoc(doc(db, 'progress', uid, 'words', wordId), update);
}

// ── Kana progress ─────────────────────────────────────
export async function getKanaProgress(uid: string): Promise<Record<string, Progress>> {
  const snap = await getDocs(collection(db, 'kana_progress', uid, 'chars'));
  const result: Record<string, Progress> = {};
  snap.docs.forEach(d => { result[d.id] = d.data() as Progress; });
  return result;
}

export async function rateKana(uid: string, char: string, rating: Rating, prev: Progress) {
  const update = applyRating(prev, rating);
  await setDoc(doc(db, 'kana_progress', uid, 'chars', char), {
    ...prev,
    ...update,
    wordId: char,
  }, { merge: true });
}

export async function initKanaProgress(uid: string, chars: string[]) {
  const batch = writeBatch(db);
  chars.forEach(char => {
    batch.set(
      doc(db, 'kana_progress', uid, 'chars', char),
      {
        wordId: char,
        correct: 0, wrong: 0,
        nextReview: Date.now(),
        interval: 'new',
        lastReviewed: Date.now(),
      } satisfies Progress,
      { merge: true }
    );
  });
  await batch.commit();
}