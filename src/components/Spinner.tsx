'use client';
export function Spinner({ size = 32, color = '#7F77DD' }: { size?: number; color?: string }) {
  return (
    <>
      <div style={{
        width: size,
        height: size,
        border: `2px solid ${color}33`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}