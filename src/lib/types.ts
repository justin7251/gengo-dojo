export interface Word {
  id: string;
  kanji: string;
  reading: string;
  romanization: string;
  meaning: string;
  example: string;
  type: 'noun' | 'verb' | 'adjective' | 'other';
  topic: string;
  lang: 'ja' | 'zh';
  level: 'beginner' | 'intermediate' | 'advanced';
  createdAt: number;
}

export interface Progress {
  wordId: string;
  correct: number;
  wrong: number;
  nextReview: number;    // Unix ms timestamp
  interval: 'new' | 'wrong' | 'hard' | 'good' | 'easy';
  lastReviewed: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  interests: string[];
  lang: 'ja' | 'zh';
  level: 'beginner' | 'intermediate' | 'advanced';
  createdAt: number;
}

export type Rating = 'wrong' | 'hard' | 'good' | 'easy';