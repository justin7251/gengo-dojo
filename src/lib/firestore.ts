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