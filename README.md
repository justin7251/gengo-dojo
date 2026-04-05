# 言語道場 — Gengo Dojo

AI-powered language learning app that generates vocabulary around your personal interests. Built with Next.js, Firebase, and GROQ.

**Live app:** [gengo-dojo.vercel.app](https://gengo-dojo.vercel.app)

---

## What it does

Most language apps teach the same generic word lists to everyone. Gengo Dojo generates vocabulary specifically around what you care about — if you love Judo, you learn judo words. If you love cooking, you learn cooking words. The AI builds your curriculum, not a textbook author.

---

## Features

### Learning modes
- **Flashcards** — see the character, reveal meaning, rate yourself with spaced repetition (Again / Hard / Good / Easy)
- **Quiz** — multiple choice questions with instant feedback and example sentences
- **Writing practice** — draw characters on a canvas with a ghost guide overlay, self-rate your strokes
- **Kana dojo** — dedicated hiragana and katakana practice with flashcards, listening, and writing modes

### AI vocabulary generation
- Generates 15 words per topic using GROQ (Llama 3.3 70B)
- Each word includes: character, reading, romanization, meaning, example sentence, and English translation
- Shared vocabulary cache — if someone already generated "Judo beginner Japanese", you get it instantly from Firestore instead of calling the AI
- Rate limited: 10 generations per day, 30 second cooldown between each

### Spaced repetition (SRS)
- Review schedule: 1 day → 3 days → 7 days → 30 days
- Wrong answers reset to tomorrow
- Progress tracked per word in Firestore
- Dashboard shows words due for review today

### Voice
- Tap 🔊 on any card to hear the word or example sentence
- Uses Web Speech API — free, no API key required, runs on device
- Supports: Japanese (ja-JP), Chinese (zh-CN), Korean (ko-KR), Spanish (es-ES), French (fr-FR)

### Languages supported
- **Learning:** Japanese, Mandarin Chinese, Korean, Spanish, French
- **Interface/meanings:** English, Spanish, French
- A Spanish speaker learning Japanese gets meanings in Spanish, not English

### Kana learning
- Full hiragana (46 characters) and katakana (46 characters)
- Each character has a mnemonic memory aid
- Three practice modes: flashcard, listen (hear sound → pick character), write (canvas tracing)
- Tap any character on the overview grid to hear it spoken
- Progress tracked separately from vocabulary

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Hosting | Vercel |
| Auth | Firebase Authentication (Google sign-in) |
| Database | Firestore |
| AI | GROQ API (llama-3.3-70b-versatile) |
| Voice | Web Speech API (browser built-in) |
| Fonts | Noto Sans JP + Noto Sans SC via next/font/google |
| Styling | Inline styles + global CSS (no UI library) |

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Onboarding — sign in + interests
│   ├── dashboard/page.tsx    # Main dashboard
│   ├── flashcards/page.tsx   # Flashcard study mode
│   ├── quiz/page.tsx         # Multiple choice quiz
│   ├── words/page.tsx        # Full word list with search + filter
│   ├── write/page.tsx        # Vocabulary writing practice
│   ├── kana/
│   │   ├── page.tsx          # Kana hub + character grid
│   │   ├── flashcard/page.tsx
│   │   ├── listen/page.tsx
│   │   └── write/page.tsx
│   └── api/
│       └── generate/route.ts # Server-side GROQ vocabulary generation
├── lib/
│   ├── types.ts              # Shared TypeScript types
│   ├── firebase.ts           # Firebase app init
│   ├── firestore.ts          # All Firestore read/write helpers
│   ├── auth.ts               # Google sign-in helpers
│   ├── srs.ts                # Spaced repetition logic
│   └── kana.ts               # Hiragana + katakana data with mnemonics
└── components/
    └── AuthGuard.tsx         # Route protection wrapper
```

---

## Firestore structure

```
users/
  {uid}/
    interests:      string[]
    targetLanguage: 'ja' | 'zh' | 'ko' | 'es' | 'fr'
    nativeLanguage: 'en' | 'es' | 'fr'
    level:          'beginner' | 'intermediate' | 'advanced'

vocabulary/
  {uid}/words/
    {wordId}/
      kanji:               string
      reading:             string
      romanization:        string
      meaning:             string
      example:             string   ← 100% target language
      example_translation: string   ← native language
      type:                'noun' | 'verb' | 'adjective' | 'other'
      topic:               string
      targetLanguage:      string
      nativeLanguage:      string
      level:               string

progress/
  {uid}/words/
    {wordId}/
      correct:      number
      wrong:        number
      nextReview:   timestamp
      interval:     'new' | 'wrong' | 'hard' | 'good' | 'easy'
      lastReviewed: timestamp

kana_progress/
  {uid}/chars/
    {char}/         ← e.g. "あ", "ア"
      correct:      number
      wrong:        number
      nextReview:   timestamp
      interval:     string

vocabulary_cache/
  {targetLang}-{nativeLang}-{level}-{topic}/
    words:      Word[]
    createdAt:  timestamp
    (expires after 30 days)

generation_quota/
  {uid}/
    dailyCount:      number
    lastGeneratedAt: timestamp
    resetDate:       'YYYY-MM-DD'
```

---

## Environment variables

Create `.env.local` in the project root:

```bash
# Firebase (client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# GROQ (server-side only — never expose to client)
GROQ_API_KEY=
```

All variables must also be added to Vercel under **Project Settings → Environment Variables** for production.

---

## Getting started

```bash
# Clone and install
git clone https://github.com/your-username/gengo-dojo
cd gengo-dojo
npm install

# Add environment variables
cp .env.example .env.local
# Fill in your Firebase and GROQ keys

# Run locally
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Firebase setup

1. Create a project at [firebase.google.com](https://firebase.google.com)
2. Enable **Authentication → Google** sign-in
3. Create a **Firestore** database in production mode
4. Copy your config values into `.env.local`
5. Deploy these Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /vocabulary/{userId}/words/{wordId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /progress/{userId}/words/{wordId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /kana_progress/{userId}/chars/{char} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    match /vocabulary_cache/{cacheId} {
      allow read:  if request.auth != null;
      allow write: if request.auth != null;
    }

    match /generation_quota/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## GROQ setup

1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Add `GROQ_API_KEY=gsk_...` to `.env.local` and Vercel

The app uses `llama-3.3-70b-versatile` with `response_format: { type: 'json_object' }` to guarantee clean JSON output. The prompt explicitly instructs the model to write example sentences in the target language only, with a separate translation field.

---

## Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Make sure all environment variables are set in Vercel before deploying — the build will fail if `GROQ_API_KEY` is missing.

---

## Spaced repetition intervals

| Rating | Next review |
|---|---|
| Again | 1 day |
| Hard | 3 days |
| Good | 7 days |
| Easy | 30 days |

If a word is marked Easy 3+ times it is considered mastered and shown in the dashboard stats.

---

## Rate limits

| Limit | Value |
|---|---|
| Daily generations | 10 per user |
| Cooldown between generations | 30 seconds |
| Vocabulary cache TTL | 30 days |
| Words per generation | 15 |

Cache hits (words already generated by another user) still apply the cooldown but do not count toward the daily limit.

---

## Roadmap

- [ ] JLPT / HSK / TOPIK structured word lists
- [ ] Grammar pattern cards
- [ ] Sentence mining (i+1 method)
- [ ] Kanji radical learning
- [ ] Thematic word groups (body, numbers, time, directions)
- [ ] Streak tracking and learning history
- [ ] Mobile app (React Native or Flutter)
- [ ] Offline mode with local caching

---

## License

MIT