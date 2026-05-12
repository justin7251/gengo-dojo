import {
  collection, doc, setDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp,
  updateDoc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LessonCard } from '@/components/GCSELessonCard';

// ── Types ──────────────────────────────────────────────
export interface GCSELesson {
  id:          string;
  subject:     string;
  topic:       string;
  topicSlug:   string;
  cards:       LessonCard[];
  quickCheck?: unknown[];
  published:   boolean;
  createdAt:   Timestamp | null;
  updatedAt:   Timestamp | null;
  createdBy:   string;
}

export interface LessonProgress {
  lessonId:    string;
  completed:   boolean;
  completedAt: Timestamp | null;
  score:       number;
  totalCards:  number;
}

// ── Helpers ────────────────────────────────────────────
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ── Admin: save lesson draft ───────────────────────────
export async function saveLessonDraft(
  lesson: Omit<GCSELesson, 'id' | 'createdAt' | 'updatedAt' | 'topicSlug'>,
  existingId?: string,
): Promise<string> {
  const id  = existingId ?? `${lesson.subject}-${slugify(lesson.topic)}-${Date.now()}`;
  const ref = doc(db, 'gcse_lessons', id);
  await setDoc(ref, {
    ...lesson,
    id,
    topicSlug: slugify(lesson.topic),
    updatedAt: serverTimestamp(),
    createdAt: existingId ? (await getDoc(ref)).data()?.createdAt ?? serverTimestamp() : serverTimestamp(),
  }, { merge: true });
  return id;
}

// ── Admin: publish / unpublish ─────────────────────────
export async function publishLesson(id: string, published: boolean): Promise<void> {
  await updateDoc(doc(db, 'gcse_lessons', id), { published, updatedAt: serverTimestamp() });
}

// ── Admin: delete lesson ───────────────────────────────
export async function deleteLesson(id: string): Promise<void> {
  await deleteDoc(doc(db, 'gcse_lessons', id));
}

// ── Admin: get all lessons (published + drafts) ────────
export async function getAllLessons(): Promise<GCSELesson[]> {
  const snap = await getDocs(query(collection(db, 'gcse_lessons'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => d.data() as GCSELesson);
}

// ── Users: get published lessons for a subject ─────────
export async function getPublishedLessons(subject: string): Promise<GCSELesson[]> {
  const snap = await getDocs(
    query(
      collection(db, 'gcse_lessons'),
      where('subject', '==', subject),
      where('published', '==', true),
      orderBy('createdAt', 'asc'),
    )
  );
  return snap.docs.map(d => d.data() as GCSELesson);
}

// ── Users: get a single lesson ─────────────────────────
export async function getLesson(id: string): Promise<GCSELesson | null> {
  const snap = await getDoc(doc(db, 'gcse_lessons', id));
  return snap.exists() ? snap.data() as GCSELesson : null;
}

// ── Users: save lesson progress ───────────────────────
export async function saveLessonProgress(
  uid: string,
  lessonId: string,
  score: number,
  totalCards: number,
): Promise<void> {
  const ref = doc(db, 'gcse_lesson_progress', uid, 'lessons', lessonId);
  await setDoc(ref, {
    lessonId,
    completed:   true,
    completedAt: serverTimestamp(),
    score,
    totalCards,
  }, { merge: true });
}

// ── Users: get all lesson progress ────────────────────
export async function getLessonProgress(uid: string): Promise<Record<string, LessonProgress>> {
  const snap = await getDocs(collection(db, 'gcse_lesson_progress', uid, 'lessons'));
  const result: Record<string, LessonProgress> = {};
  snap.docs.forEach(d => { result[d.id] = d.data() as LessonProgress; });
  return result;
}
