// ── src/app/gcse/science/physics/page.tsx ────────────
'use client';
import AuthGuard from '@/components/AuthGuard';
import { ScienceTopicPage } from '@/components/GCSEScienceTopic';
export default function PhysicsPage() {
  return <AuthGuard><ScienceTopicPage subject="physics" /></AuthGuard>;
}
