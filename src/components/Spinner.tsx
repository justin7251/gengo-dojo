'use client';

export function Spinner({
  size  = 32,
  color = 'var(--green)',
}: {
  size?:  number;
  color?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div
        style={{
          width:          size,
          height:         size,
          border:         `3px solid var(--border-dark)`,
          borderTopColor: color,
          borderRadius:   '50%',
          animation:      'spin 0.65s linear infinite',
          flexShrink:     0,
        }}
      />
    </div>
  );
}
