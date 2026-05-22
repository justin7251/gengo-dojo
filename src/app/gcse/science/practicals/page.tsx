'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

export default function GCSESciencePracticalsPage() {
  return <AuthGuard><SciencePracticals /></AuthGuard>;
}

interface Practical {
  id:        string;
  subject:   'biology' | 'chemistry' | 'physics';
  title:     string;
  aim:       string;
  method:    string[];
  variables: { independent: string; dependent: string; control: string[] };
  results:   string;
  evaluation: string[];
  examTips:  string[];
}

const PRACTICALS: Practical[] = [
  {
    id: 'microscopy', subject: 'biology', title: 'Microscopy — Observing Cells',
    aim: 'Prepare and observe a slide of plant and animal cells under a light microscope.',
    method: ['Cut a thin section of onion epidermis', 'Place on a glass slide with a drop of water', 'Add a drop of iodine stain', 'Lower a coverslip at 45° to avoid bubbles', 'View under low power then high power', 'Measure image and actual size to calculate magnification'],
    variables: { independent: 'Type of cell observed', dependent: 'Appearance and size of cells', control: ['Same stain concentration', 'Same microscope settings', 'Same light source'] },
    results: 'Draw labelled diagrams of cells observed. Calculate magnification using M = I/A.',
    evaluation: ['Air bubbles distort images — lower coverslip slowly', 'Stain too concentrated makes image unclear', 'Thin sections give clearer images', 'Always start on low power before increasing magnification'],
    examTips: ['Know the formula M = I/A and be able to rearrange it', 'State that iodine stains starch blue-black', 'Know the difference between plant and animal cell structures', 'Be able to calculate actual size from scale bars'],
  },
  {
    id: 'osmosis', subject: 'biology', title: 'Osmosis in Plant Tissue',
    aim: 'Investigate the effect of different sugar solution concentrations on potato strips.',
    method: ['Cut potato strips to equal length (e.g. 30mm)', 'Prepare solutions: 0%, 0.25%, 0.5%, 0.75%, 1.0% sugar', 'Place one strip in each solution for 30 minutes', 'Remove, pat dry and measure final length', 'Calculate % change in length'],
    variables: { independent: 'Concentration of sugar solution', dependent: '% change in length/mass of potato strip', control: ['Same starting length of potato', 'Same time in solution', 'Same temperature', 'Same species of potato'] },
    results: 'Plot % change in length vs concentration. Identify the isotonic point (0% change = same concentration as cell contents ≈ 0.3 mol/dm³ for potato).',
    evaluation: ['Dry strips the same way to avoid diluting solutions', 'Measure before AND after to calculate % change', 'Use % change not absolute change to account for unequal starting lengths', 'Random errors: cutting strips to different lengths'],
    examTips: ['Know the definition of osmosis: movement of water molecules from high to low water potential through a partially permeable membrane', 'Explain results: hypertonic → plasmolysis (shrinks); hypotonic → turgid (swells)', 'Calculate % change: (final - initial) / initial × 100'],
  },
  {
    id: 'enzymes', subject: 'biology', title: 'Effect of Temperature on Enzyme Activity',
    aim: 'Investigate how temperature affects the rate of amylase breaking down starch.',
    method: ['Set up water baths at 20°C, 30°C, 40°C, 50°C, 60°C', 'Place starch solution and amylase in separate test tubes in each water bath for 5 min', 'Spot iodine solution onto a spotting tile', 'Mix amylase and starch — take a sample every 30 seconds', 'Note when iodine no longer turns blue-black (starch broken down)', 'Record time for each temperature'],
    variables: { independent: 'Temperature (°C)', dependent: 'Time for starch to be fully digested', control: ['Same concentration of amylase', 'Same concentration of starch', 'Same volume of each solution', 'Same pH'] },
    results: 'Rate = 1/time. Plot rate vs temperature. Optimum temperature for amylase ≈ 37°C.',
    evaluation: ['Iodine turns blue-black with starch, colourless/orange when absent', 'Above optimum temperature: enzyme denatures (active site changes shape)', 'Use a pH buffer to control pH', 'Colorimeter gives more precise results than visual observation'],
    examTips: ['Know why enzymes denature above optimum temperature', 'Explain using lock-and-key model', 'Calculate rate from time: rate = 1/time (s⁻¹)', 'Know that each enzyme has a specific optimum temperature and pH'],
  },
  {
    id: 'chromatography', subject: 'chemistry', title: 'Paper Chromatography',
    aim: 'Separate and identify food colourings using paper chromatography.',
    method: ['Draw a pencil baseline 2cm from the bottom of chromatography paper', 'Spot samples onto the baseline with a fine capillary tube', 'Place in solvent (water or ethanol) — solvent must be below the baseline', 'Allow solvent to travel up to near the top (solvent front)', 'Remove paper, mark solvent front, allow to dry', 'Calculate Rf values for each spot'],
    variables: { independent: 'Food colouring tested', dependent: 'Rf value of each pigment', control: ['Same solvent', 'Same paper', 'Same temperature', 'Same spot size'] },
    results: 'Calculate Rf = distance moved by spot / distance moved by solvent front. Compare Rf values to identify unknown substances.',
    evaluation: ['Use pencil not pen for baseline (pen ink would dissolve)', 'Spots must be small and concentrated', 'Solvent must not touch the baseline spots directly', 'Multiple spots in one lane indicate a mixture'],
    examTips: ['Rf values are always between 0 and 1', 'Pure substance: only one spot', 'Same Rf value in same solvent = same substance', 'Can be used to check purity of a substance'],
  },
  {
    id: 'titration', subject: 'chemistry', title: 'Acid-Base Titration',
    aim: 'Determine the concentration of an acid by titrating against a standard alkali solution.',
    method: ['Fill burette with acid, remove air bubble from tip', 'Use a pipette to measure exact volume of alkali into conical flask', 'Add 2-3 drops of indicator (phenolphthalein or methyl orange)', 'Add acid from burette slowly, swirling continuously', 'Near endpoint: add dropwise until indicator just changes colour', 'Record titre (volume of acid used)', 'Repeat until concordant results (within 0.10 cm³)'],
    variables: { independent: 'Volume of acid added', dependent: 'Colour change of indicator / pH', control: ['Same concentration of alkali', 'Same indicator', 'Same temperature'] },
    results: 'Use average concordant titre to calculate concentration: c = n/V. Record results in a table.',
    evaluation: ['Rinse burette with acid before use (not water)', 'Rinse pipette with alkali before use', 'Concordant results = within 0.10 cm³ of each other', 'Rough titration first to find approximate endpoint', 'Phenolphthalein: pink (alkali) → colourless (acid)'],
    examTips: ['Calculate moles: n = c × V (V must be in dm³)', 'Use molar ratios from balanced equation', 'Know why we use concordant results (reduce random error)', 'Systematic error: if burette not rinsed — solution would be diluted'],
  },
  {
    id: 'rates', subject: 'chemistry', title: 'Rates of Reaction — Disappearing Cross',
    aim: 'Investigate how concentration affects the rate of reaction between sodium thiosulfate and HCl.',
    method: ['Draw a bold X on paper, place conical flask on top', 'Measure 50cm³ Na₂S₂O₃ into flask', 'Add HCl — start timer', 'View X from above — stop timer when X is no longer visible', 'Repeat with different concentrations of Na₂S₂O₃ (dilute with water)', 'Keep total volume constant at 60cm³'],
    variables: { independent: 'Concentration of Na₂S₂O₃', dependent: 'Time for X to disappear', control: ['Same volume of solution', 'Same temperature', 'Same concentration of HCl', 'Same thickness of X'] },
    results: 'Rate = 1/time. Plot rate vs concentration — positive correlation expected.',
    evaluation: ['Subjective endpoint — different observers may stop at different times (random error)', 'Use a light sensor / colorimeter for more precise results', 'Products: sulfur precipitate (pale yellow solid) causes cloudiness', 'Higher concentration → more frequent collisions → faster rate'],
    examTips: ['Explain rate using collision theory', 'Higher concentration → more particles per unit volume → more frequent collisions → faster rate', 'Calculate rate = 1/time in s⁻¹', 'Know the equation: Na₂S₂O₃ + 2HCl → 2NaCl + SO₂ + S + H₂O'],
  },
  {
    id: 'radiation', subject: 'physics', title: 'Specific Heat Capacity',
    aim: 'Determine the specific heat capacity of a material using an electrical heater.',
    method: ['Measure the mass of the metal block', 'Insert thermometer and heater into pre-drilled holes', 'Record initial temperature', 'Connect heater to joulemeter/power supply', 'Switch on — record temperature every minute for 10 minutes', 'Record energy supplied from joulemeter', 'Plot temperature vs energy graph'],
    variables: { independent: 'Energy supplied (J)', dependent: 'Temperature increase (°C)', control: ['Same mass of material', 'Same starting temperature', 'Same voltage'] },
    results: 'Use E = mcΔT to calculate c. From graph: gradient = 1/(mc), so c = 1/(m × gradient).',
    evaluation: ['Insulate block to reduce heat loss to surroundings', 'Use oil in holes for better thermal contact', 'Systematic error: heat loss means measured c will be higher than true value', 'Use joulemeter not ammeter/voltmeter to reduce calculation errors'],
    examTips: ['Know E = mcΔT and be able to rearrange it', 'Higher specific heat capacity = more energy needed to raise temperature', 'Water has very high SHC (4200 J/kg°C) — explain why it\'s used as a coolant', 'Unit of SHC: J/kg°C or J/kg/K'],
  },
  {
    id: 'resistance', subject: 'physics', title: 'I-V Characteristics',
    aim: 'Investigate how current varies with voltage for different components.',
    method: ['Set up circuit with component, ammeter in series, voltmeter in parallel', 'Use variable resistor to change voltage', 'Record current (A) and voltage (V) at each setting', 'Reverse connections to get negative readings', 'Repeat for: resistor, filament lamp, diode'],
    variables: { independent: 'Voltage (V)', dependent: 'Current (A)', control: ['Same component throughout each test', 'Same circuit connections'] },
    results: 'Plot I-V graphs. Resistor: straight line through origin (ohmic). Lamp: curved (resistance increases with temperature). Diode: only conducts in one direction.',
    evaluation: ['Component may heat up — take readings quickly or allow to cool', 'Filament lamp glows — this is evidence of energy transfer', 'Resistance = V/I at any point on the graph', 'Diode has very high resistance in reverse direction'],
    examTips: ['Know shapes of I-V graphs for all three components', 'Ohm\'s law: V = IR (only applies to ohmic conductors at constant temperature)', 'Calculate resistance from graph: R = V/I (use any point)', 'Explain why lamp is non-ohmic: temperature increases resistance'],
  },
];

type FilterSubject = 'all' | 'biology' | 'chemistry' | 'physics';
type ViewMode      = 'browse' | 'quiz';

function SciencePracticals() {
  const router = useRouter();

  const [filter, setFilter]       = useState<FilterSubject>('all');
  const [mode, setMode]           = useState<ViewMode>('browse');
  const [selected, setSelected]   = useState<Practical | null>(null);
  const [quizPrac, setQuizPrac]   = useState<Practical | null>(null);
  const [quizSection, setQuizSection] = useState<'method' | 'variables' | 'evaluation' | 'tips'>('method');
  const [revealed, setRevealed]   = useState(false);

  const subjectColor = (s: string) =>
    s === 'physics' ? '#7F77DD' : s === 'chemistry' ? '#EF9F27' : '#00e87a';

  const filtered = PRACTICALS.filter(p => filter === 'all' || p.subject === filter);

  function startQuiz(p: Practical) {
    setQuizPrac(p);
    setQuizSection('method');
    setRevealed(false);
    setMode('quiz');
  }

  return (
    <Screen>
      <TopBar onBack={() => { if (mode === 'quiz' || selected) { setMode('browse'); setSelected(null); setQuizPrac(null); } else router.push('/gcse/science'); }}
        title={selected ? selected.title : quizPrac ? `Quiz: ${quizPrac.title}` : '🔬 Required Practicals'} />

      {/* ── Detail view ── */}
      {selected && mode === 'browse' && (
        <div style={{ flex: 1, animation: 'fadeIn 0.2s ease' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '99px', background: subjectColor(selected.subject) + '15', color: subjectColor(selected.subject) }}>{selected.subject}</span>
          </div>

          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '1.25rem', lineHeight: 1.6, fontStyle: 'italic' }}>
            Aim: {selected.aim}
          </p>

          {/* Method */}
          <Section title="Method" color={subjectColor(selected.subject)}>
            {selected.method.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: subjectColor(selected.subject), minWidth: '20px', fontFamily: 'var(--font-mono)' }}>{i + 1}.</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </Section>

          {/* Variables */}
          <Section title="Variables" color={subjectColor(selected.subject)}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Independent (what you change):</p>
            <p style={{ fontSize: '13px', color: '#fff', marginBottom: '10px' }}>{selected.variables.independent}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Dependent (what you measure):</p>
            <p style={{ fontSize: '13px', color: '#fff', marginBottom: '10px' }}>{selected.variables.dependent}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Control variables (what you keep the same):</p>
            {selected.variables.control.map((c, i) => (
              <p key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '3px' }}>• {c}</p>
            ))}
          </Section>

          {/* Results */}
          <Section title="Results & Analysis" color={subjectColor(selected.subject)}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{selected.results}</p>
          </Section>

          {/* Evaluation */}
          <Section title="Evaluation" color={subjectColor(selected.subject)}>
            {selected.evaluation.map((e, i) => (
              <p key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, marginBottom: '5px' }}>• {e}</p>
            ))}
          </Section>

          {/* Exam tips */}
          <Section title="Exam Tips" color="#EF9F27">
            {selected.examTips.map((t, i) => (
              <p key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, marginBottom: '5px' }}>⚡ {t}</p>
            ))}
          </Section>

          <button onClick={() => startQuiz(selected)} style={{ ...WHITE_BTN, width: '100%', marginTop: '1rem' }}>
            Quiz me on this practical →
          </button>
        </div>
      )}

      {/* ── Quiz view ── */}
      {mode === 'quiz' && quizPrac && (
        <div style={{ flex: 1, animation: 'fadeIn 0.2s ease' }}>
          {/* Section tabs */}
          <div style={{ display: 'flex', gap: '5px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {(['method', 'variables', 'evaluation', 'tips'] as const).map(s => (
              <button key={s} onClick={() => { setQuizSection(s); setRevealed(false); }} style={{
                padding: '5px 10px', borderRadius: '8px', cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontSize: '11px',
                border: `1px solid ${quizSection === s ? subjectColor(quizPrac.subject) + '55' : 'rgba(255,255,255,0.1)'}`,
                background: quizSection === s ? subjectColor(quizPrac.subject) + '15' : 'rgba(255,255,255,0.04)',
                color: quizSection === s ? subjectColor(quizPrac.subject) : 'rgba(255,255,255,0.4)', transition: 'all 0.15s',
              }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '20px', minHeight: '200px', border: '1px solid rgba(255,255,255,0.07)', marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
              {quizSection === 'method' && 'Can you recall all the steps?'}
              {quizSection === 'variables' && 'What are the independent, dependent and control variables?'}
              {quizSection === 'evaluation' && 'What are the key sources of error and improvements?'}
              {quizSection === 'tips' && 'What are the key exam points for this practical?'}
            </p>

            {!revealed ? (
              <button onClick={() => setRevealed(true)} style={{ ...WHITE_BTN, fontSize: '13px' }}>
                Reveal answer
              </button>
            ) : (
              <div style={{ textAlign: 'left', width: '100%', animation: 'fadeIn 0.2s ease' }}>
                {quizSection === 'method' && quizPrac.method.map((s, i) => (
                  <p key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: '5px' }}><span style={{ color: subjectColor(quizPrac.subject), fontWeight: 700 }}>{i + 1}.</span> {s}</p>
                ))}
                {quizSection === 'variables' && (
                  <>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px' }}>Independent:</p>
                    <p style={{ fontSize: '13px', color: '#fff', marginBottom: '8px' }}>{quizPrac.variables.independent}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px' }}>Dependent:</p>
                    <p style={{ fontSize: '13px', color: '#fff', marginBottom: '8px' }}>{quizPrac.variables.dependent}</p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '3px' }}>Control:</p>
                    {quizPrac.variables.control.map((c, i) => <p key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', marginBottom: '3px' }}>• {c}</p>)}
                  </>
                )}
                {quizSection === 'evaluation' && quizPrac.evaluation.map((e, i) => (
                  <p key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, marginBottom: '5px' }}>• {e}</p>
                ))}
                {quizSection === 'tips' && quizPrac.examTips.map((t, i) => (
                  <p key={i} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, marginBottom: '5px' }}>⚡ {t}</p>
                ))}
              </div>
            )}
          </div>

          {revealed && (
            <div style={{ display: 'flex', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
              <button onClick={() => setRevealed(false)} style={{ ...GHOST_BTN, flex: 1 }}>Try again</button>
              <button onClick={() => {
                const sections: typeof quizSection[] = ['method', 'variables', 'evaluation', 'tips'];
                const next = sections[(sections.indexOf(quizSection) + 1) % sections.length];
                setQuizSection(next); setRevealed(false);
              }} style={{ ...WHITE_BTN, flex: 1 }}>Next section →</button>
            </div>
          )}
        </div>
      )}

      {/* ── Browse list ── */}
      {mode === 'browse' && !selected && (
        <>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {(['all', 'biology', 'chemistry', 'physics'] as FilterSubject[]).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '5px 12px', borderRadius: '99px', cursor: 'pointer',
                fontFamily: 'var(--font-ui)', fontSize: '12px',
                border: `1px solid ${filter === f ? subjectColor(f) + '55' : 'rgba(255,255,255,0.1)'}`,
                background: filter === f ? subjectColor(f) + '15' : 'rgba(255,255,255,0.04)',
                color: filter === f ? subjectColor(f) : 'rgba(255,255,255,0.4)', transition: 'all 0.15s',
              }}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(p => (
              <div key={p.id} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${subjectColor(p.subject)}20`, borderLeft: `3px solid ${subjectColor(p.subject)}` }}>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{p.title}</span>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '99px', background: subjectColor(p.subject) + '15', color: subjectColor(p.subject) + 'bb' }}>{p.subject}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4, marginBottom: '10px' }}>{p.aim}</p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setSelected(p)} style={{ flex: 1, padding: '7px', borderRadius: '8px', border: `1px solid ${subjectColor(p.subject)}30`, background: subjectColor(p.subject) + '10', color: subjectColor(p.subject), fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                      📋 Study
                    </button>
                    <button onClick={() => startQuiz(p)} style={{ flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
                      🎯 Quiz
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </Screen>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: '12px', background: 'rgba(0,0,0,0.25)', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color, letterSpacing: '0.06em' }}>{title.toUpperCase()}</span>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
      </button>
      {open && <div style={{ padding: '0 14px 12px', animation: 'fadeIn 0.15s ease' }}>{children}</div>}
    </div>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#060d0a', backgroundImage: 'radial-gradient(ellipse at top, #0d2018 0%, #060d0a 60%)', display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem 2.5rem', fontFamily: 'var(--font-ui)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(212,83,126,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(212,83,126,0.02) 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '520px', margin: '0 auto', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </main>
  );
}
function TopBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
      <button onClick={onBack} style={GHOST_BTN}>← Back</button>
      <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff', textAlign: 'center', flex: 1, padding: '0 8px' }}>{title}</span>
      <div style={{ width: '60px' }} />
    </div>
  );
}
const WHITE_BTN: React.CSSProperties = { background: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', color: '#060d0a', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)' };
const GHOST_BTN: React.CSSProperties = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '7px 14px', color: 'rgba(255,255,255,0.65)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-ui)' };
