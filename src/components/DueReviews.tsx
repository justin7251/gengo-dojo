'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDueLessonReviews, LessonReview, reviewLabel, daysUntilReview } from '@/lib/lesson-srs';
import { getLesson, GCSELesson } from '@/lib/gcse-lessons';

interface Props {
  uid:        string;
  onStartReview: (lesson: GCSELesson, review: LessonReview) => void;
}

const SUBJECT_COLOR: Record<string, string> = {
  maths:   '#378ADD',
  english: '#7F77DD',
  science: '#00e87a',
};

export function DueReviewsList({ uid, onStartReview }: Props) {
  const router = useRouter();
  const [reviews, setReviews]   = useState<LessonReview[]>([]);
  const [lessons, setLessons]   = useState<Record<string, GCSELesson>>({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!uid) return;
    load();
  }, [uid]);

  async function load() {
    try {
      const due = await getDueLessonReviews(uid);
      setReviews(due);
      // Fetch lesson data for each due review
      const lessonMap: Record<string, GCSELesson> = {};
      await Promise.all(
        due.map(async r => {
          const lesson = await getLesson(r.lessonId);
          if (lesson) lessonMap[r.lessonId] = lesson;
        })
      );
      setLessons(lessonMap);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div style={{ height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  );

  if (reviews.length === 0) return null;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(239,159,39,0.8)' }}>
          REVIEW DUE &#8212; {reviews.length} lesson{reviews.length !== 1 ? 's' : ''}
        </p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          Spaced repetition
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {reviews.map(review => {
          const lesson = lessons[review.lessonId];
          const color  = SUBJECT_COLOR[review.subject] ?? '#fff';
          const days   = daysUntilReview(review.nextReview);

          return (
            <button
              key={review.lessonId}
              onClick={() => lesson && onStartReview(lesson, review)}
              disabled={!lesson}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '12px 14px', borderRadius: '12px', cursor: lesson ? 'pointer' : 'not-allowed',
                border: `1px solid rgba(239,159,39,0.25)`,
                background: 'rgba(239,159,39,0.07)',
                fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%',
                transition: 'all 0.15s',
                opacity: lesson ? 1 : 0.5,
              }}
            >
              {/* Subject dot */}
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}` }} />

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {review.topic}
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                  {review.subject} &#183; reviewed {review.reviewCount}x
                </p>
              </div>

              {/* Due badge */}
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px',
                  background: days === 0 ? 'rgba(239,159,39,0.2)' : 'rgba(255,255,255,0.06)',
                  color: days === 0 ? '#EF9F27' : 'rgba(255,255,255,0.35)',
                  border: `1px solid ${days === 0 ? 'rgba(239,159,39,0.3)' : 'rgba(255,255,255,0.08)'}`,
                }}>
                  {days === 0 ? 'Due now' : reviewLabel(review)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ width: '20px', height: '20px', border: '2px solid rgba(239,159,39,0.15)', borderTopColor: '#EF9F27', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}>
      <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
