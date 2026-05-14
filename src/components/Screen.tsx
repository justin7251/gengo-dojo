'use client';

import React from 'react';

interface ScreenProps {
  children: React.ReactNode;
  /** Accent colour for the grid overlay. Defaults to '#00e87a' */
  accent?: string;
  /** Background gradient start colour. Defaults to '#0d1428' */
  gradientFrom?: string;
  /** Background base colour. Defaults to '#06080f' */
  background?: string;
  /** Max width of the inner content column. Defaults to '560px' */
  maxWidth?: string;
}

export function Screen({
  children,
  accent = '#00e87a',
  gradientFrom = '#0d1428',
  background = '#06080f',
  maxWidth = '560px',
}: ScreenProps) {
  // Convert hex accent to rgba for the grid lines
  const gridColor = hexToRgba(accent, 0.025);

  return (
    <main
      style={{
        minHeight: '100vh',
        background,
        backgroundImage: `radial-gradient(ellipse at top left, ${gradientFrom} 0%, ${background} 60%)`,
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1.25rem 3rem',
        fontFamily: 'var(--font-ui)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `linear-gradient(${gridColor} 1px, transparent 1px), linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content column */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth,
          margin: '0 auto',
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </main>
  );
}

// ── Helper ──────────────────────────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
