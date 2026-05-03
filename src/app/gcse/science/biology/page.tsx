// ── src/app/gcse/science/biology/page.tsx ────────────
'use client';
import AuthGuard from '@/components/AuthGuard';
import { ScienceTopicPage } from '@/components/GCSEScienceTopic';
export default function BiologyPage() {
  return <AuthGuard><ScienceTopicPage subject="biology" /></AuthGuard>;
}
