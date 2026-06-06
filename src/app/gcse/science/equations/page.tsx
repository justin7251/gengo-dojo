'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSEScienceEquationsPage() {
  return <AuthGuard><ScienceEquations /></AuthGuard>;
}

interface Equation {
  id:       string;
  subject:  'physics' | 'chemistry' | 'biology';
  topic:    string;
  name:     string;
  formula:  string;
  symbols:  string;
  units:    string;
  givenIn:  boolean; // given on formula sheet or must be memorised
}

const EQUATIONS: Equation[] = [
  // ── Physics ─────────────────────────────────────────
  { id: 'weight',       subject: 'physics', topic: 'Forces',      name: 'Weight',                  formula: 'W = m × g',            symbols: 'W = weight (N), m = mass (kg), g = gravitational field strength (N/kg)', units: 'Newtons (N)', givenIn: false },
  { id: 'work',         subject: 'physics', topic: 'Energy',       name: 'Work done',               formula: 'W = F × d',            symbols: 'W = work done (J), F = force (N), d = distance (m)', units: 'Joules (J)', givenIn: false },
  { id: 'ke',           subject: 'physics', topic: 'Energy',       name: 'Kinetic energy',          formula: 'KE = ½ × m × v²',      symbols: 'KE = kinetic energy (J), m = mass (kg), v = velocity (m/s)', units: 'Joules (J)', givenIn: false },
  { id: 'gpe',          subject: 'physics', topic: 'Energy',       name: 'Gravitational PE',        formula: 'GPE = m × g × h',      symbols: 'GPE = gravitational PE (J), m = mass (kg), g = 9.8 N/kg, h = height (m)', units: 'Joules (J)', givenIn: false },
  { id: 'power',        subject: 'physics', topic: 'Energy',       name: 'Power',                   formula: 'P = E / t',            symbols: 'P = power (W), E = energy (J), t = time (s)', units: 'Watts (W)', givenIn: false },
  { id: 'efficiency',   subject: 'physics', topic: 'Energy',       name: 'Efficiency',              formula: 'efficiency = useful output ÷ total input', symbols: 'Expressed as a decimal or %', units: 'No units (ratio)', givenIn: false },
  { id: 'voltage',      subject: 'physics', topic: 'Electricity',  name: 'Voltage',                 formula: 'V = I × R',            symbols: 'V = voltage (V), I = current (A), R = resistance (Ω)', units: 'Volts (V)', givenIn: false },
  { id: 'charge',       subject: 'physics', topic: 'Electricity',  name: 'Charge',                  formula: 'Q = I × t',            symbols: 'Q = charge (C), I = current (A), t = time (s)', units: 'Coulombs (C)', givenIn: false },
  { id: 'elec-power',   subject: 'physics', topic: 'Electricity',  name: 'Electrical power',        formula: 'P = I × V',            symbols: 'P = power (W), I = current (A), V = voltage (V)', units: 'Watts (W)', givenIn: false },
  { id: 'wave-speed',   subject: 'physics', topic: 'Waves',        name: 'Wave speed',              formula: 'v = f × λ',            symbols: 'v = wave speed (m/s), f = frequency (Hz), λ = wavelength (m)', units: 'm/s', givenIn: false },
  { id: 'pressure',     subject: 'physics', topic: 'Forces',       name: 'Pressure',                formula: 'P = F / A',            symbols: 'P = pressure (Pa), F = force (N), A = area (m²)', units: 'Pascals (Pa)', givenIn: false },
  { id: 'momentum',     subject: 'physics', topic: 'Forces',       name: 'Momentum',                formula: 'p = m × v',            symbols: 'p = momentum (kg·m/s), m = mass (kg), v = velocity (m/s)', units: 'kg·m/s', givenIn: true },
  { id: 'density',      subject: 'physics', topic: 'Particle model', name: 'Density',               formula: 'ρ = m / V',            symbols: 'ρ = density (kg/m³), m = mass (kg), V = volume (m³)', units: 'kg/m³', givenIn: false },
  { id: 'speed',        subject: 'physics', topic: 'Forces',       name: 'Speed',                   formula: 'v = d / t',            symbols: 'v = speed (m/s), d = distance (m), t = time (s)', units: 'm/s', givenIn: false },
  { id: 'acceleration', subject: 'physics', topic: 'Forces',       name: 'Acceleration',            formula: 'a = (v - u) / t',      symbols: 'a = acceleration (m/s²), v = final velocity, u = initial velocity, t = time (s)', units: 'm/s²', givenIn: false },
  // ── Chemistry ───────────────────────────────────────
  { id: 'moles',        subject: 'chemistry', topic: 'Quantitative', name: 'Moles',                 formula: 'n = m / Mr',           symbols: 'n = moles (mol), m = mass (g), Mr = relative formula mass', units: 'Moles (mol)', givenIn: false },
  { id: 'concentration',subject: 'chemistry', topic: 'Quantitative', name: 'Concentration',         formula: 'c = n / V',            symbols: 'c = concentration (mol/dm³), n = moles (mol), V = volume (dm³)', units: 'mol/dm³', givenIn: false },
  { id: 'atom-economy', subject: 'chemistry', topic: 'Quantitative', name: 'Atom economy',          formula: 'atom economy = (Mr useful ÷ Mr all) × 100', symbols: 'Mr = relative formula mass', units: '%', givenIn: true },
  { id: 'percentage-yield', subject: 'chemistry', topic: 'Quantitative', name: 'Percentage yield',  formula: '% yield = (actual ÷ theoretical) × 100', symbols: 'Masses in grams', units: '%', givenIn: false },
  // ── Biology ─────────────────────────────────────────
  { id: 'magnification', subject: 'biology', topic: 'Cell biology', name: 'Magnification',          formula: 'M = I / A',            symbols: 'M = magnification, I = image size, A = actual size', units: 'No units', givenIn: false },
  { id: 'bmi',           subject: 'biology', topic: 'Organisation', name: 'BMI',                    formula: 'BMI = mass / height²', symbols: 'mass in kg, height in m', units: 'kg/m²', givenIn: true },
];

type FilterSubject = 'all' | 'physics' | 'chemistry' | 'biology';
type ViewMode      = 'browse' | 'flashcard' | 'calculator';

function ScienceEquations() {
  const router = useRouter();

  const [filter, setFilter]       = useState<FilterSubject>('all');
  const [mode, setMode]           = useState<ViewMode>('browse');
  const [search, setSearch]       = useState('');
  const [cardIdx, setCardIdx]     = useState(0);
  const [revealed, setRevealed]   = useState(false);
  const [known, setKnown]         = useState<Set<string>>(new Set());
  // Calculator state
  const [calcEq, setCalcEq]       = useState<Equation | null>(null);
  const [calcInputs, setCalcInputs] = useState<Record<string, string>>({});
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [calcError, setCalcError]   = useState('');

  const filtered = EQUATIONS.filter(e => {
    if (filter !== 'all' && e.subject !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.name.toLowerCase().includes(q) ||
        e.formula.toLowerCase().includes(q) ||
        e.topic.toLowerCase().includes(q);
    }
    return true;
  });

  const flashQueue = filtered.filter(e => !known.has(e.id));
  const current    = flashQueue[cardIdx % Math.max(flashQueue.length, 1)];

  const subjectColor = (s: string) =>
    s === 'physics' ? 'var(--purple)' : s === 'chemistry' ? 'var(--orange)' : 'var(--green)';

  // ── Simple equation solver ─────────────────────────
  function parseAndSolve(eq: Equation, inputs: Record<string, string>): string {
    try {
      const vals: Record<string, number> = {};
      for (const [k, v] of Object.entries(inputs)) {
        if (v.trim()) vals[k] = parseFloat(v);
      }

      // Physics equations
      if (eq.id === 'weight')       return solve3('W', 'm', 'g', vals, 'W = m × g');
      if (eq.id === 'work')         return solve3('W', 'F', 'd', vals, 'W = F × d');
      if (eq.id === 'power')        return solve3('P', 'E', 't', vals, 'P = E / t');
      if (eq.id === 'voltage')      return solve3('V', 'I', 'R', vals, 'V = I × R');
      if (eq.id === 'charge')       return solve3('Q', 'I', 't', vals, 'Q = I × t');
      if (eq.id === 'elec-power')   return solve3('P', 'I', 'V', vals, 'P = I × V');
      if (eq.id === 'pressure')     return solve3('P', 'F', 'A', vals, 'P = F / A');
      if (eq.id === 'momentum')     return solve3('p', 'm', 'v', vals, 'p = m × v');
      if (eq.id === 'density')      return solve3('ρ', 'm', 'V', vals, 'ρ = m / V');
      if (eq.id === 'speed')        return solve3('v', 'd', 't', vals, 'v = d / t');
      if (eq.id === 'moles')        return solve3('n', 'm', 'Mr', vals, 'n = m / Mr');
      if (eq.id === 'concentration')return solve3('c', 'n', 'V', vals, 'c = n / V');

      if (eq.id === 'ke') {
        const { KE, m, v } = vals;
        if (KE === undefined && m !== undefined && v !== undefined)
          return `KE = ½ × ${m} × ${v}² = ${(0.5 * m * v * v).toFixed(4)} J`;
        if (m === undefined && KE !== undefined && v !== undefined)
          return `m = 2KE / v² = ${(2 * KE / (v * v)).toFixed(4)} kg`;
        if (v === undefined && KE !== undefined && m !== undefined)
          return `v = √(2KE/m) = ${Math.sqrt(2 * KE / m).toFixed(4)} m/s`;
      }

      if (eq.id === 'gpe') {
        const { GPE, m, g, h } = vals;
        const gVal = g ?? 9.8;
        if (GPE === undefined && m !== undefined && h !== undefined)
          return `GPE = ${m} × ${gVal} × ${h} = ${(m * gVal * h).toFixed(4)} J`;
        if (m === undefined && GPE !== undefined && h !== undefined)
          return `m = GPE / (g × h) = ${(GPE / (gVal * h)).toFixed(4)} kg`;
        if (h === undefined && GPE !== undefined && m !== undefined)
          return `h = GPE / (m × g) = ${(GPE / (m * gVal)).toFixed(4)} m`;
      }

      if (eq.id === 'wave-speed') {
        const { v, f, λ } = vals;
        if (v === undefined && f !== undefined && λ !== undefined)
          return `v = ${f} × ${λ} = ${(f * λ).toFixed(4)} m/s`;
        if (f === undefined && v !== undefined && λ !== undefined)
          return `f = v / λ = ${(v / λ).toFixed(4)} Hz`;
        if (λ === undefined && v !== undefined && f !== undefined)
          return `λ = v / f = ${(v / f).toFixed(4)} m`;
      }

      if (eq.id === 'acceleration') {
        const { a, v, u, t } = vals;
        if (a === undefined && v !== undefined && u !== undefined && t !== undefined)
          return `a = (${v} - ${u}) / ${t} = ${((v - u) / t).toFixed(4)} m/s²`;
        if (v === undefined && a !== undefined && u !== undefined && t !== undefined)
          return `v = u + a×t = ${(u + a * t).toFixed(4)} m/s`;
        if (u === undefined && v !== undefined && a !== undefined && t !== undefined)
          return `u = v - a×t = ${(v - a * t).toFixed(4)} m/s`;
        if (t === undefined && a !== undefined && v !== undefined && u !== undefined)
          return `t = (v - u) / a = ${((v - u) / a).toFixed(4)} s`;
      }

      if (eq.id === 'magnification') {
        const { M, I, A } = vals;
        if (M === undefined && I !== undefined && A !== undefined)
          return `M = ${I} / ${A} = ${(I / A).toFixed(2)}×`;
        if (I === undefined && M !== undefined && A !== undefined)
          return `I = M × A = ${(M * A).toFixed(4)} (same units as A)`;
        if (A === undefined && M !== undefined && I !== undefined)
          return `A = I / M = ${(I / M).toFixed(4)} (same units as I)`;
      }

      if (eq.id === 'percentage-yield') {
        const { actual, theoretical } = vals;
        if (actual !== undefined && theoretical !== undefined)
          return `% yield = (${actual} / ${theoretical}) × 100 = ${((actual / theoretical) * 100).toFixed(2)}%`;
      }

      return 'Enter all but one value to solve for the unknown.';
    } catch {
      return 'Check your inputs — all values must be numbers.';
    }
  }

  function solve3(a: string, b: string, c: string, vals: Record<string, number>, formula: string): string {
    const aVal = vals[a], bVal = vals[b], cVal = vals[c];
    const isDivide = formula.includes('/');
    if (aVal === undefined && bVal !== undefined && cVal !== undefined)
      return `${a} = ${isDivide ? `${b} / ${c}` : `${b} × ${c}`} = ${isDivide ? (bVal / cVal).toFixed(4) : (bVal * cVal).toFixed(4)}`;
    if (bVal === undefined && aVal !== undefined && cVal !== undefined)
      return isDivide
        ? `${b} = ${a} × ${c} = ${(aVal * cVal).toFixed(4)}`
        : `${b} = ${a} / ${c} = ${(aVal / cVal).toFixed(4)}`;
    if (cVal === undefined && aVal !== undefined && bVal !== undefined)
      return isDivide
        ? `${c} = ${b} / ${a} = ${(bVal / aVal).toFixed(4)}`
        : `${c} = ${a} / ${b} = ${(aVal / bVal).toFixed(4)}`;
    return 'Enter all but one value to calculate.';
  }

  return (
    <Shell>
      <TopBar onBack={() => router.push('/gcse/science')} title="🔢 Equations" />

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
        {(['browse', 'flashcard', 'calculator'] as ViewMode[]).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: '8px', borderRadius: '10px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500,
            border: `1px solid ${mode === m ? 'rgba(55,138,221,0.5)' : 'rgba(255,255,255,0.1)'}`,
            background: mode === m ? 'rgba(55,138,221,0.12)' : 'var(--bg-secondary)',
            color: mode === m ? '#7bbfff' : 'rgba(255,255,255,0.45)', transition: 'all 0.15s',
          }}>
            {m === 'browse' ? '📋 Browse' : m === 'flashcard' ? '🎴 Flashcards' : '🧮 Calculator'}
          </button>
        ))}
      </div>

      {/* Subject filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
        {(['all', 'physics', 'chemistry', 'biology'] as FilterSubject[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            flex: 1, padding: '6px', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', fontSize: '11px',
            border: `1px solid ${filter === f ? subjectColor(f) + '55' : 'var(--bg-secondary)'}`,
            background: filter === f ? subjectColor(f) + '15' : 'transparent',
            color: filter === f ? subjectColor(f) : 'rgba(255,255,255,0.4)', transition: 'all 0.15s',
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Browse ── */}
      {mode === 'browse' && (
        <>
          <input type="text" placeholder="Search equations…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', background: 'var(--bg-secondary)', border: '2px solid var(--border-dark)', borderRadius: '10px', color: 'var(--fg)', fontFamily: 'var(--font-ui)', fontSize: '13px', outline: 'none', marginBottom: '1rem' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(eq => (
              <div key={eq.id} style={{
                background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '14px',
                border: `2px solid ${subjectColor(eq.subject)}55`,
                borderLeft: `3px solid ${subjectColor(eq.subject)}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>{eq.name}</span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: subjectColor(eq.subject) + '15', color: subjectColor(eq.subject) + 'bb' }}>{eq.topic}</span>
                  {!eq.givenIn && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(226,75,74,0.12)', color: 'rgba(255,150,150,0.7)' }}>📝 memorise</span>}
                  {eq.givenIn  && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: 'rgba(0,232,122,0.1)', color: 'rgba(0,232,122,0.6)' }}>📄 given</span>}
                </div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>{eq.formula}</p>
                <p style={{ fontSize: '12px', color: 'var(--fg-secondary)', marginBottom: '3px' }}>{eq.symbols}</p>
                <p style={{ fontSize: '11px', color: 'var(--fg-secondary)' }}>Units: {eq.units}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Flashcard ── */}
      {mode === 'flashcard' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--fg-secondary)', marginBottom: '1rem', fontFamily: 'var(--font-mono)' }}>
            <span>{flashQueue.length} remaining · {known.size} known</span>
            {known.size > 0 && <button onClick={() => { setKnown(new Set()); setCardIdx(0); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-secondary)', fontFamily: 'var(--font-ui)', fontSize: '12px' }}>Reset</button>}
          </div>

          {flashQueue.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <p style={{ fontSize: '48px', marginBottom: '1rem' }}>🏆</p>
              <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--fg)', marginBottom: '8px' }}>All equations known!</p>
              <button onClick={() => { setKnown(new Set()); setCardIdx(0); }} style={WHITE_BTN}>Start over</button>
            </div>
          ) : current ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{
                flex: 1, background: 'rgba(0,0,0,0.35)', borderRadius: '20px', padding: '2rem',
                marginBottom: '1rem', border: `1px solid ${subjectColor(current.subject)}30`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '240px',
              }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '99px', background: subjectColor(current.subject) + '15', color: subjectColor(current.subject) }}>{current.subject}</span>
                  <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '99px', background: 'var(--bg-secondary)', color: 'var(--fg-secondary)' }}>{current.topic}</span>
                  {!current.givenIn && <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '99px', background: 'rgba(226,75,74,0.1)', color: 'rgba(255,150,150,0.6)' }}>memorise</span>}
                </div>
                <p style={{ fontSize: '20px', fontWeight: 700, color: 'var(--fg)', marginBottom: '1.5rem' }}>{current.name}</p>
                {!revealed ? (
                  <button onClick={() => setRevealed(true)} style={{ ...WHITE_BTN, fontSize: '13px' }}>Reveal formula</button>
                ) : (
                  <div style={{ animation: 'fadeIn 0.2s ease', width: '100%' }}>
                    <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--fg)', fontFamily: 'var(--font-mono)', marginBottom: '12px' }}>{current.formula}</p>
                    <p style={{ fontSize: '12px', color: 'var(--fg-secondary)', lineHeight: 1.6, paddingTop: '12px', borderTop: '1px solid var(--bg-secondary)', marginBottom: '4px' }}>{current.symbols}</p>
                    <p style={{ fontSize: '11px', color: 'var(--fg-secondary)' }}>Units: {current.units}</p>
                  </div>
                )}
              </div>
              {revealed && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
                  <button onClick={() => { setCardIdx(i => i + 1); setRevealed(false); }} style={{ padding: '14px', borderRadius: '12px', border: '1px solid rgba(226,75,74,0.35)', background: 'rgba(226,75,74,0.12)', color: '#ff8080', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                    Still learning
                  </button>
                  <button onClick={() => { setKnown(prev => new Set([...prev, current.id])); setCardIdx(i => i + 1); setRevealed(false); }} style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--green)55', background: 'var(--green-light)', color: 'var(--green)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                    ✓ Know it
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* ── Calculator ── */}
      {mode === 'calculator' && (
        <div>
          <p style={{ fontSize: '12px', color: 'var(--fg-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
            Select an equation. Enter known values — leave one blank to solve for it.
          </p>
          {/* Equation picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1.25rem' }}>
            {filtered.map(eq => (
              <button key={eq.id} onClick={() => { setCalcEq(eq); setCalcInputs({}); setCalcResult(null); setCalcError(''); }} style={{
                padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                border: `1px solid ${calcEq?.id === eq.id ? subjectColor(eq.subject) + '55' : 'var(--bg-secondary)'}`,
                background: calcEq?.id === eq.id ? subjectColor(eq.subject) + '12' : 'var(--bg-secondary)',
                fontFamily: 'var(--font-ui)', textAlign: 'left', width: '100%', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)', minWidth: '120px' }}>{eq.name}</span>
                <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: subjectColor(eq.subject) }}>{eq.formula}</span>
              </button>
            ))}
          </div>

          {/* Input fields */}
          {calcEq && (
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '14px', padding: '16px', border: '1px solid var(--bg-secondary)', animation: 'fadeIn 0.2s ease' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)', marginBottom: '4px' }}>{calcEq.name}</p>
              <p style={{ fontSize: '15px', fontFamily: 'var(--font-mono)', color: subjectColor(calcEq.subject), marginBottom: '14px' }}>{calcEq.formula}</p>

              {/* Parse symbol names from symbols field */}
              {calcEq.symbols.split(',').map((sym, i) => {
                const varName = sym.trim().split('=')[0].trim();
                return (
                  <div key={i} style={{ marginBottom: '8px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--fg-secondary)', display: 'block', marginBottom: '4px', letterSpacing: '0.04em' }}>
                      {sym.trim()}
                    </label>
                    <input
                      type="number"
                      placeholder="Leave blank to solve for this"
                      value={calcInputs[varName] ?? ''}
                      onChange={e => setCalcInputs(prev => ({ ...prev, [varName]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', background: 'var(--bg-secondary)', border: '1px solid #fff', borderRadius: '8px', color: 'var(--fg)', fontFamily: 'var(--font-mono)', fontSize: '14px', outline: 'none' }}
                    />
                  </div>
                );
              })}

              <button
                onClick={() => {
                  const result = parseAndSolve(calcEq, calcInputs);
                  setCalcResult(result);
                }}
                style={{ ...WHITE_BTN, width: '100%', marginTop: '8px' }}
              >
                Calculate
              </button>

              {calcResult && (
                <div style={{ marginTop: '12px', padding: '12px 14px', background: 'rgba(55,138,221,0.12)', borderRadius: '10px', border: '1px solid rgba(55,138,221,0.3)', animation: 'fadeIn 0.2s ease' }}>
                  <p style={{ fontSize: '11px', letterSpacing: '0.08em', color: 'rgba(55,138,221,0.7)', marginBottom: '6px' }}>RESULT</p>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}>{calcResult}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </Shell>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 2.5rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(55,138,221,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(55,138,221,0.025) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </main>
  );
}
function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <button onClick={onBack} className="btn">← Back</button>
      <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--fg)' }}>{title}</span>
      <div style={{ width: '60px' }} />
    </div>
  );
}
const WHITE_BTN: React.CSSProperties = { background: 'var(--green)', border: '2.5px solid var(--green-dark)', borderRadius: '12px', padding: '11px 24px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-ui)', boxShadow: '0 4px 0 var(--green-dark)' };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 3rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '260px', height: '260px', borderRadius: '50%', background: 'rgba(88,204,2,0.06)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </main>
  );
}
