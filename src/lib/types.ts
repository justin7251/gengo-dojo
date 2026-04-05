// ── Language codes ────────────────────────────────────

export type NativeLang = 'en' | 'es' | 'fr' | 'ko' | 'zh' | 'ja';
export type TargetLang = 'ja' | 'zh' | 'ko' | 'es' | 'fr';

export const NATIVE_LANGUAGES: { code: NativeLang; label: string; flag: string }[] = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'es', label: 'Spanish',  flag: '🇪🇸' },
  { code: 'fr', label: 'French',   flag: '🇫🇷' },
  { code: 'ko', label: 'Korean',   flag: '🇰🇷' },
  { code: 'zh', label: 'Chinese',  flag: '🇨🇳' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
];

export const TARGET_LANGUAGES: {
  code:   TargetLang;
  label:  string;
  flag:   string;
  script: string;
}[] = [
  { code: 'ja', label: 'Japanese', flag: '🇯🇵', script: 'hiragana / kanji' },
  { code: 'zh', label: 'Chinese',  flag: '🇨🇳', script: 'hanzi / pinyin'  },
  { code: 'ko', label: 'Korean',   flag: '🇰🇷', script: 'hangul'          },
  { code: 'es', label: 'Spanish',  flag: '🇪🇸', script: 'latin'           },
  { code: 'fr', label: 'French',   flag: '🇫🇷', script: 'latin'           },
];

// Speech synthesis language codes per target language
export const VOICE_LANG: Record<TargetLang, string> = {
  ja: 'ja-JP',
  zh: 'zh-CN',
  ko: 'ko-KR',
  es: 'es-ES',
  fr: 'fr-FR',
};

// Full language name used in GROQ prompts for translations
export const TRANSLATION_LANG: Record<NativeLang, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  ko: 'Korean',
  zh: 'Mandarin Chinese',
  ja: 'Japanese',
};

// ── Shared vocabulary (stored once globally) ──────────

// Stored at: vocabulary/{topic}/words/{targetLang}-{kanji}
export interface SharedWord {
  kanji:        string;
  reading:      string;
  romanization: string;
  example:      string;       // sentence in target language only
  type:         'noun' | 'verb' | 'adjective' | 'other';
  targetLang:   TargetLang;
  topic:        string;
  createdAt:    number;
}

// Stored at: vocabulary/{topic}/words/{wordId}/translations/{nativeLang}
export interface WordTranslation {
  meaning:             string;  // in native language
  example_translation: string;  // in native language
  nativeLang:          NativeLang;
  createdAt:           number;
}

// ── Assembled word (SharedWord + translation merged) ──
// This is what the app uses everywhere — never stored directly
export interface Word {
  id:                  string;  // {targetLang}-{kanji}
  kanji:               string;
  reading:             string;
  romanization:        string;
  example:             string;
  example_translation: string;
  meaning:             string;
  type:                'noun' | 'verb' | 'adjective' | 'other';
  targetLang:          TargetLang;
  nativeLang:          NativeLang;
  topic:               string;
  createdAt:           number;
}

// ── User word list (lightweight reference) ────────────
// Stored at: user_words/{userId}/{targetLang}-{nativeLang}/{wordId}
export interface UserWord {
  wordId:     string;   // same as Word.id
  topic:      string;
  targetLang: TargetLang;
  nativeLang: NativeLang;
  addedAt:    number;
}

// ── Progress ──────────────────────────────────────────
// Stored at: progress/{userId}/{targetLang}/{topic}/{wordId}
export interface Progress {
  wordId:       string;
  correct:      number;
  wrong:        number;
  nextReview:   number;   // Unix ms timestamp
  interval:     'new' | 'wrong' | 'hard' | 'good' | 'easy';
  lastReviewed: number;
}

// ── User profile ──────────────────────────────────────
export interface UserProfile {
  uid:        string;
  email:      string;
  interests:  string[];
  nativeLang: NativeLang;
  targetLang: TargetLang;
  level:      'beginner' | 'intermediate' | 'advanced';
  createdAt:  number;
}

// ── SRS rating ────────────────────────────────────────
export type Rating = 'wrong' | 'hard' | 'good' | 'easy';
