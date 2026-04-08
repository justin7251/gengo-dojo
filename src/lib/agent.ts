'use client';

import {
  doc, setDoc, getDoc, updateDoc,
  collection, getDocs, query, orderBy, limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { AgentProfile } from './types';

const CODENAMES = [
  'Kestrel', 'Cipher', 'Vantage', 'Specter', 'Wraith',
  'Lynx',    'Onyx',   'Raven',   'Cobra',   'Dusk',
];

const CITIES: Record<string, string> = {
  ja: 'Tokyo', zh: 'Shanghai', ko: 'Seoul', es: 'Madrid', fr: 'Paris',
};

// Story fragments per chapter
export const STORY_FRAGMENTS: Record<number, string> = {
  1:  'You land at the airport. The signs are unreadable. You remember your first word.',
  2:  'A contact passes you a note. Three words. You understand two of them.',
  3:  'The handler calls. "Your cover is holding," she says. "For now."',
  4:  'You order coffee without pointing at the menu. The barista doesn\'t flinch.',
  5:  'A newspaper headline. You read it slowly. Then again, faster.',
  6:  'Someone speaks to you on the train. You answer. They don\'t walk away.',
  7:  'The target\'s assistant leaves a voicemail. You transcribe it word for word.',
  8:  'You dream in the language for the first time. You wake up unsettled.',
  9:  'The handler says: "You\'re ready." You\'re not sure you believe her.',
  10: 'The final document. Every word is familiar. You were never just a student.',
};

export interface MissionDebrief {
  before: AgentProfile;
  after:  AgentProfile;
  correct: number;
  wrong:   number;
  newFragment: string | null;
  mode: string;
}

export async function getAgentProfile(uid: string): Promise<AgentProfile | null> {
  const snap = await getDoc(doc(db, 'agents', uid));
  return snap.exists() ? (snap.data() as AgentProfile) : null;
}

export async function createAgentProfile(
  uid:        string,
  targetLang: string
): Promise<AgentProfile> {
  const codename = CODENAMES[Math.floor(Math.random() * CODENAMES.length)];
  const city     = CITIES[targetLang] ?? 'Unknown City';
  const profile: AgentProfile = {
    uid, codename, city,
    coverStatus:    'intact',
    chapter:        1,
    streakDays:     0,
    lastActiveDate: '',
    suspicionLevel: 0,
    documentsFound: [],
    totalMissions:  0,
  };
  await setDoc(doc(db, 'agents', uid), profile);
  return profile;
}

export async function updateAgentAfterMission(
  uid:     string,
  correct: number,
  wrong:   number,
  mode:    string
): Promise<MissionDebrief> {
  const snap = await getDoc(doc(db, 'agents', uid));
  if (!snap.exists()) throw new Error('Agent not found');
  const before = snap.data() as AgentProfile;
  const today  = new Date().toISOString().split('T')[0];

  // Streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];
  let streakDays = before.streakDays;
  if (before.lastActiveDate === yStr)   streakDays += 1;
  else if (before.lastActiveDate !== today) streakDays = 1;

  // Suspicion
  let suspicionLevel = before.suspicionLevel + Math.floor(wrong / 2);
  suspicionLevel     = Math.max(0, suspicionLevel - Math.floor(correct / 3));
  suspicionLevel     = Math.min(suspicionLevel, 5);

  // Cover
  let coverStatus = before.coverStatus;
  if (suspicionLevel >= 5)      coverStatus = 'blown';
  else if (suspicionLevel >= 3) coverStatus = 'compromised';
  else                          coverStatus = 'intact';

  // Chapter
  const totalCorrect = (before.documentsFound.length * 3) + correct;
  const chapter      = Math.min(Math.floor(totalCorrect / 10) + 1, 10);

  // New fragment?
  let newFragment: string | null = null;
  const documentsFound           = [...before.documentsFound];
  const fragKey                  = `chapter-${chapter}`;
  if (chapter > before.chapter && !documentsFound.includes(fragKey)) {
    documentsFound.push(fragKey);
    newFragment = STORY_FRAGMENTS[chapter] ?? null;
  }

  const after: AgentProfile = {
    ...before,
    streakDays,
    lastActiveDate: today,
    suspicionLevel,
    coverStatus,
    chapter,
    documentsFound,
    totalMissions: before.totalMissions + 1,
  };

  await updateDoc(doc(db, 'agents', uid), {
    streakDays,
    lastActiveDate: today,
    suspicionLevel,
    coverStatus,
    chapter,
    documentsFound,
    totalMissions: after.totalMissions,
  });

  // Sync leaderboard
  const score = (streakDays * 10) + (after.totalMissions * 3) + (correct * 2);
  await setDoc(doc(db, 'leaderboard', uid), {
    uid,
    codename:      before.codename,
    city:          before.city,
    streakDays,
    totalMissions: after.totalMissions,
    score,
    coverStatus,
    updatedAt:     Date.now(),
  }, { merge: true });

  return { before, after, correct, wrong, newFragment, mode };
}

export async function resetCover(uid: string): Promise<void> {
  await updateDoc(doc(db, 'agents', uid), {
    coverStatus:    'intact',
    suspicionLevel: 0,
    chapter:        1,
    documentsFound: [],
    streakDays:     0,
  });
  await setDoc(doc(db, 'leaderboard', uid), {
    coverStatus: 'blown',
    score:       0,
  }, { merge: true });
}

// Leaderboard
export interface LeaderboardEntry {
  uid:           string;
  codename:      string;
  city:          string;
  streakDays:    number;
  totalMissions: number;
  score:         number;
  coverStatus:   string;
}

export async function getLeaderboard(limitCount = 20): Promise<LeaderboardEntry[]> {
  const q    = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as LeaderboardEntry);
}

export function getCoverColor(status: AgentProfile['coverStatus']): string {
  if (status === 'intact')      return '#0F6E56';
  if (status === 'compromised') return '#854F0B';
  return '#A32D2D';
}

export function getCoverBg(status: AgentProfile['coverStatus']): string {
  if (status === 'intact')      return '#E1F5EE';
  if (status === 'compromised') return '#FAEEDA';
  return '#FCEBEB';
}

export function getSuspicionLabel(level: number): string {
  const labels = ['Clean', 'Noticed', 'Watched', 'Suspected', 'Identified', 'Blown'];
  return labels[Math.min(level, 5)];
}