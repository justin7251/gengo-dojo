// ── src/app/gcse/maths/number/page.tsx ───────────────
'use client';
import AuthGuard from '@/components/AuthGuard';
import { MathsTopicPage } from '@/components/GCSEMathsTopic';
export default function NumberPage() {
  return <AuthGuard><MathsTopicPage topic="number" /></AuthGuard>;
}
