// ── src/app/gcse/maths/statistics/page.tsx ───────────
'use client';
import AuthGuard from '@/components/AuthGuard';
import { MathsTopicPage } from '@/components/GCSEMathsTopic';
export default function StatisticsPage() {
  return <AuthGuard><MathsTopicPage topic="statistics" /></AuthGuard>;
}
