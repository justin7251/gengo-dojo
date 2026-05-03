// ── src/app/gcse/science/chemistry/page.tsx ──────────
'use client';
import AuthGuard from '@/components/AuthGuard';
import { ScienceTopicPage } from '@/components/GCSEScienceTopic';
export default function ChemistryPage() {
  return <AuthGuard><ScienceTopicPage subject="chemistry" /></AuthGuard>;
}
