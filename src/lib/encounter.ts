'use client';

import { Word, TargetLang } from './types';

export type EncounterType = 'boss' | 'glitch' | 'intercept';

export interface Encounter {
  type:      EncounterType;
  word:      Word;
  timeLimit: number;
  message?:  string;   // for glitch/intercept
}

// Roll for encounter based on mode's chance
export function rollEncounter(
  chance:   number,
  words:    Word[],
  targetLang: TargetLang
): Encounter | null {
  if (Math.random() > chance) return null;
  if (!words.length) return null;

  const roll = Math.random();
  const word = words[Math.floor(Math.random() * words.length)];

  if (roll < 0.5) {
    return { type: 'boss', word, timeLimit: 15 };
  } else if (roll < 0.8) {
    return {
      type:      'glitch',
      word,
      timeLimit: 10,
      message:   glitchText(word.kanji),
    };
  } else {
    return {
      type:      'intercept',
      word,
      timeLimit: 12,
      message:   word.example,
    };
  }
}

// Scramble text visually
export function glitchText(text: string): string {
  const glitchChars = '█▓▒░▄▀■□▪▫';
  return text.split('').map((c, i) => {
    if (Math.random() < 0.4) {
      return glitchChars[Math.floor(Math.random() * glitchChars.length)];
    }
    return c;
  }).join('');
}