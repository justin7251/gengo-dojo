'use client';

import React from 'react';

interface ScreenProps {
  children:    React.ReactNode;
  /** Accent colour for decorative blobs. Defaults to green */
  accent?:     string;
  /** Override background colour */
  background?: string;
  /** Max width of the inner content column. Defaults to '560px' */
  maxWidth?:   string;
}

export function Screen({
  children,
  accent     = 'var(--green)',
  background = 'var(--bg)',
  maxWidth   = '560px',
}: ScreenProps) {
  return (
    <main
      style={{
        minHeight:   '100vh',
        background,
        display:     'flex',
        flexDirection: 'column',
        padding:     '1.5rem 1.25rem 4rem',
        fontFamily:  'var(--font-ui)',
        position:    'relative',
        overflow:    'hidden',
      }}
    >
      {/* Decorative corner blobs */}
      <div style={{
        position:     'absolute',
        top:          '-80px',
        right:        '-80px',
        width:        '260px',
        height:       '260px',
        borderRadius: '50%',
        background:   `${accent}18`,
        filter:       'blur(40px)',
        pointerEvents:'none',
        animation:    'orbDrift 7s ease-in-out infinite',
      }} />
      <div style={{
        position:     'absolute',
        bottom:       '-60px',
        left:         '-60px',
        width:        '200px',
        height:       '200px',
        borderRadius: '50%',
        background:   `${accent}10`,
        filter:       'blur(30px)',
        pointerEvents:'none',
        animation:    'orbDrift 9s ease-in-out infinite reverse',
      }} />

      {/* Content column */}
      <div
        style={{
          position:      'relative',
          zIndex:        1,
          maxWidth,
          margin:        '0 auto',
          width:         '100%',
          flex:          1,
          display:       'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </div>
    </main>
  );
}
