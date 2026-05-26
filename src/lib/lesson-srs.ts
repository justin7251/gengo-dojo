import {
  doc, setDoc, getDoc, getDocs,
  collection, query, where, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── SRS intervals for lessons (days) ──────────────────
// First review: 3 days after completion
// Second:       7 days
// Third:        14 days
// Fourth:       30 days
// After that:   60 days (maintenance)
const INTERVALS = [3, 7, 14, 30, 60];

export interface LessonReview {
  uid:         string;
  lessonId:    string;
  topic:       string;
  subject:     string;
  reviewCount: number;         // how many times reviewed
  nextReview:  string;         // ISO date YYYY-MM-DD
  lastScore:   number;         // last quick-check score (0-3)
  lastReviewed: string | null; // ISO date
  createdAt:   Timestamp | null;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ── Schedule first review after lesson completion ──────
export async function scheduleLessonReview(
  uid: string,
  lessonId: string,
  topic: string,
  subject: string,
  score: number,   // quick-check score 0-3
): Promise<void> {
  const ref = doc(db, 'lesson_reviews', uid, 'reviews', lessonId);

  // If score was poor (0-1), review sooner
  const intervalIdx = score <= 1 ? 0 : score === 2 ? 0 : 1;
  const nextReview  = addDays(INTERVALS[intervalIdx]);

  await setDoc(ref, {
    uid, lessonId, topic, subject,
    reviewCount:  0,
    nextReview,
    lastScore:    score,
    lastReviewed: null,
    createdAt:    serverTimestamp(),
  }, { merge: false });
}

// ── Record a review session ────────────────────────────
export async function recordLessonReview(
  uid: string,
  lessonId: string,
  score: number,
): Promise<LessonReview> {
  const ref  = doc(db, 'lesson_reviews', uid, 'reviews', lessonId);
  const snap = await getDoc(ref);

  if (!snap.exists()) throw new Error('No review scheduled for this lesson');

  const existing    = snap.data() as LessonReview;
  const reviewCount = existing.reviewCount + 1;

  // Pick next interval based on score
  // Good score (3) → advance interval
  // Poor score (0-1) → repeat same or go back
  let nextIdx: number;
  if (score === 3)      nextIdx = Math.min(reviewCount, INTERVALS.length - 1);
  else if (score === 2) nextIdx = Math.max(reviewCount - 1, 0);
  else                  nextIdx = 0; // reset to 3 days

  const nextReview = addDays(INTERVALS[nextIdx]);
  const updated: Partial<LessonReview> = {
    reviewCount,
    nextReview,
    lastScore:    score,
    lastReviewed: todayStr(),
  };

  await setDoc(ref, updated, { merge: true });
  return { ...existing, ...updated } as LessonReview;
}

// ── Get all due lesson reviews for a user ──────────────
export async function getDueLessonReviews(uid: string): Promise<LessonReview[]> {
  const today = todayStr();
  const snap  = await getDocs(
    query(
      collection(db, 'lesson_reviews', uid, 'reviews'),
      where('nextReview', '<=', today),
    )
  );
  return snap.docs.map(d => d.data() as LessonReview);
}

// ── Get days until next review ─────────────────────────
export function daysUntilReview(nextReview: string): number {
  const today = new Date(todayStr());
  const next  = new Date(nextReview);
  const diff  = Math.ceil((next.getTime() - today.getTime()) / 86400000);
  return Math.max(0, diff);
}

// ── Review label ───────────────────────────────────────
export function reviewLabel(review: LessonReview): string {
  const days = daysUntilReview(review.nextReview);
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}
