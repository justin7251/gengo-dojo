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

// ── Energy modes ──────────────────────────────────────
export type EnergyMode = 'scrap' | 'deepwork' | 'braindead';

export interface ModeConfig {
  id:              EnergyMode;
  label:           string;
  emoji:           string;
  duration:        string;
  description:     string;
  timerPerWord:    number;   // seconds, 0 = no timer
  srsWeight:       number;   // multiplier on SRS interval
  encounterChance: number;   // 0-1 probability
  wordsPerSession: number;
}

export const ENERGY_MODES: ModeConfig[] = [
  {
    id:              'scrap',
    label:           'Scrap',
    emoji:           '⚡',
    duration:        '30 sec',
    description:     'Fast-fire survival vocab. No mercy.',
    timerPerWord:    6,
    srsWeight:       0.5,
    encounterChance: 0,
    wordsPerSession: 5,
  },
  {
    id:              'deepwork',
    label:           'Deep Work',
    emoji:           '🧠',
    duration:        '20 min',
    description:     'Full immersion. Translation. Writing. The real thing.',
    timerPerWord:    0,
    srsWeight:       2,
    encounterChance: 0.15,
    wordsPerSession: 20,
  },
  {
    id:              'braindead',
    label:           'Brain Dead',
    emoji:           '🌙',
    duration:        'Chill',
    description:     'Late night passive matching. Low stakes. Just stay alive.',
    timerPerWord:    0,
    srsWeight:       0.25,
    encounterChance: 0,
    wordsPerSession: 10,
  },
];

// ── Spy identity ──────────────────────────────────────
export interface AgentProfile {
  uid:            string;
  codename:       string;
  city:           string;
  coverStatus:    'intact' | 'compromised' | 'blown';
  chapter:        number;
  streakDays:     number;
  lastActiveDate: string;   // YYYY-MM-DD
  suspicionLevel: number;   // 0-5
  documentsFound: string[]; // unlocked story fragment IDs
  totalMissions:  number;
}