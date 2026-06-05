'use client';

import { useEffect } from 'react';

interface Props {
  error:  Error & { digest?: string };
  reset:  () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[Gengo Dojo error]', error);
  }, [error]);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-ui)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(255,75,75,0.06)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '400px' }}>
        <div style={{ fontSize: '72px', marginBottom: '1.5rem' }}>⚡</div>

        <div style={{ background: '#fff', border: '2.5px solid var(--border-dark)', borderRadius: '20px', padding: '2rem', boxShadow: '0 8px 0 var(--border-dark)', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Something went wrong
          </p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 900, color: 'var(--fg)', marginBottom: '10px', lineHeight: 1.2 }}>
            Unexpected error
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600, lineHeight: 1.6, marginBottom: 0 }}>
            Something broke on this page. Try again, or head back to the dashboard.
          </p>
          {error.digest && (
            <p style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '10px', fontFamily: 'monospace', background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
              {error.digest}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={reset}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '14px', background: 'var(--green)', border: '2.5px solid var(--green-dark)', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 5px 0 var(--green-dark)', fontFamily: 'var(--font-display)', transition: 'all 0.1s ease' }}>
            🔄 Try again
          </button>
          <a href="/dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 22px', borderRadius: '14px', background: '#fff', border: '2.5px solid var(--border-dark)', color: 'var(--fg-secondary)', fontSize: '14px', fontWeight: 800, textDecoration: 'none', boxShadow: '0 5px 0 var(--border-dark)', fontFamily: 'var(--font-display)' }}>
            🏯 Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
