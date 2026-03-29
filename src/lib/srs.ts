import { Rating, Progress } from './types';

const INTERVALS_MS: Record<Rating, number> = {
  wrong: 1 * 86_400_000,    // 1 day
  hard:  3 * 86_400_000,    // 3 days
  good:  7 * 86_400_000,    // 7 days
  easy:  30 * 86_400_000,   // 30 days
};

export function getNextReview(rating: Rating): number {
  return Date.now() + INTERVALS_MS[rating];
}

export function isDue(progress: Progress): boolean {
  return progress.nextReview <= Date.now();
}

export function isMastered(progress: Progress): boolean {
  return progress.correct >= 3 && progress.interval === 'easy';
}

export function applyRating(
  prev: Progress,
  rating: Rating
): Partial<Progress> {
  return {
    correct: rating !== 'wrong' ? prev.correct + 1 : prev.correct,
    wrong:   rating === 'wrong' ? prev.wrong + 1   : prev.wrong,
    interval: rating,
    nextReview: getNextReview(rating),
    lastReviewed: Date.now(),
  };
}