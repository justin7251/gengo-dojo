'use client';

import ProGuard from '@/components/ProGuard';

// Applies to /gcse and every nested route (subjects, topics, admin, etc.)
// Non-pro users are redirected to /dashboard before any GCSE content
// (including data fetches) ever renders.
export default function GCSELayout({ children }: { children: React.ReactNode }) {
  return <ProGuard>{children}</ProGuard>;
}
