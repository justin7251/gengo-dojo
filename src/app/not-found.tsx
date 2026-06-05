import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-ui)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(88,204,2,0.07)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-80px', left: '-80px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(28,176,246,0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '400px' }}>
        <div style={{ fontSize: '80px', marginBottom: '1.5rem', animation: 'bounce 1.2s ease-in-out infinite' }}>🔍</div>

        <div style={{ background: '#fff', border: '2.5px solid var(--border-dark)', borderRadius: '20px', padding: '2rem', boxShadow: '0 8px 0 var(--border-dark)', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '8px' }}>404</p>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 900, color: 'var(--fg)', marginBottom: '10px', lineHeight: 1.2 }}>
            Page not found
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600, lineHeight: 1.6, marginBottom: 0 }}>
            This page doesn't exist or has moved. Head back to the dojo!
          </p>
        </div>

        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '13px 28px', borderRadius: '14px', background: 'var(--green)', border: '2.5px solid var(--green-dark)', color: '#fff', fontSize: '15px', fontWeight: 800, textDecoration: 'none', boxShadow: '0 5px 0 var(--green-dark)', fontFamily: 'var(--font-display)', transition: 'all 0.1s ease' }}>
          🏯 Back to Dashboard
        </Link>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          40%       { transform: translateY(-12px); }
          60%       { transform: translateY(-6px); }
        }
      `}</style>
    </main>
  );
}
