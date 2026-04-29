// ── src/app/gcse/maths/geometry/page.tsx ─────────────
'use client';
import AuthGuard from '@/components/AuthGuard';
import { MathsTopicPage } from '@/components/GCSEMathsTopic';
export default function GeometryPage() {
  return <AuthGuard><MathsTopicPage topic="geometry" /></AuthGuard>;
}
