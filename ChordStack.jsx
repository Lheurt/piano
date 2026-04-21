// ChordStack.jsx — compact single-clef chord staff used in the hint panel.
// Renders one treble clef and a vertical stack of noteheads at a canonical
// middle-register voicing for a given (root, quality, bass?) chord.

function ChordStack({ root, quality, bass }) {
  const width = 120;
  const height = 130;

  // Canonical voicing: stack chord tones upward starting at or above C4,
  // using each PC's first occurrence at or above midi 60. If a bass is
  // specified, it goes below at midi >= 48 (still on the treble staff's
  // ledger lines — visible as E3..B3 region but rendered on the one clef).
  const pcs = window.pitchClassesFor(root, quality);

  // Pick one MIDI number per PC, starting at 60 and walking upward so the stack
  // is ordered in pitch. We want the lowest voicing, so for each PC choose the
  // lowest midi >= 60 with that PC.
  function midiForPc(pc, minMidi) {
    let m = minMidi;
    while (((m % 12) + 12) % 12 !== pc) m++;
    return m;
  }
  let floor = 60;
  const upperMidis = pcs.slice().sort((a, b) => a - b).map(pc => {
    const m = midiForPc(pc, floor);
    floor = m + 1;
    return m;
  }).sort((a, b) => a - b);

  // Bass (if any): place a single notehead one octave below the root.
  const bassMidi = bass ? midiForPc(window.pitchClassFromRoot(bass), 48) : null;

  // Convert midi to pitch name (e.g., 60 -> "C4") for trebleY input. We use
  // canonical spelling from ROOT_SPELLINGS so the notehead draws with the
  // correct accidental.
  function midiToPitchName(m) {
    const pc = ((m % 12) + 12) % 12;
    const oct = Math.floor(m / 12) - 1;
    return window.ROOT_SPELLINGS[pc] + oct;
  }

  const noteheads = upperMidis.map(m => ({
    pitch: midiToPitchName(m),
    y: window.trebleY(midiToPitchName(m))
  }));
  if (bassMidi !== null) {
    const pitch = midiToPitchName(bassMidi);
    noteheads.unshift({ pitch, y: window.trebleY(pitch) });
  }

  const centerX = 62;

  // Ledger lines: middle C (C4) is step 0; its y is 80. Any pitch below E4
  // (step 2, y=68) or above F5 (step 12, y=8) needs ledger lines.
  function ledgersFor(pitch) {
    const steps = window.stepsFromC4(pitch);
    const out = [];
    // Below E4: ledger at step 0 (C4) y=80, step -2 (A3) y=92, etc.
    if (steps <= 0) {
      for (let s = 0; s >= steps; s -= 2) {
        out.push(80 + ((0 - s) / 2) * 12);
      }
    }
    if (steps >= 12) {
      for (let s = 12; s <= steps; s += 2) {
        out.push(8 - ((s - 12) / 2) * 12);
      }
    }
    return out;
  }

  return (
    <div className="chord-stack">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        {/* Staff lines (5) */}
        <g stroke="#17161a" strokeWidth="1">
          {[20, 32, 44, 56, 68].map((y, i) => (
            <line key={i} x1="14" y1={y} x2={width - 4} y2={y} />
          ))}
        </g>
        {/* Treble clef glyph */}
        <text x="2" y="70" fontFamily="Georgia, serif" fontSize="60" fill="#17161a">𝄞</text>
        {/* Opening barline */}
        <line x1="32" y1="20" x2="32" y2="68" stroke="#17161a" strokeWidth="1" />
        {/* Noteheads + ledgers + accidentals */}
        {noteheads.map((n, i) => {
          const acc = n.pitch.match(/[♯♭]/)?.[0];
          const ledgers = ledgersFor(n.pitch);
          return (
            <g key={i}>
              {ledgers.map((ly, j) => (
                <line key={j} x1={centerX - 11} y1={ly} x2={centerX + 11} y2={ly} stroke="#17161a" strokeWidth="1" />
              ))}
              {acc && (
                <text x={centerX - 22} y={n.y + 5} fontFamily="Georgia, serif" fontSize="18" fill="#17161a">{acc}</text>
              )}
              <ellipse cx={centerX} cy={n.y} rx="7" ry="5.2" fill="#17161a" transform={`rotate(-20 ${centerX} ${n.y})`} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

window.ChordStack = ChordStack;
