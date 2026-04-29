// ── src/app/gcse/maths/algebra/page.tsx ──────────────
'use client';
import AuthGuard from '@/components/AuthGuard';
import { MathsTopicPage } from '@/components/GCSEMathsTopic';
export default function AlgebraPage() {
  return <AuthGuard><MathsTopicPage topic="algebra" /></AuthGuard>;
}
