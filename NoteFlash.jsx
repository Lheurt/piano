// NoteFlash.jsx — single-note prompt staff for the Note name view.
// Shows one large notehead on a treble OR bass staff, with optional accidental
// and ledger lines for notes outside the 5 staff lines.
//
// Treble staff lines (top→bottom): F5, D5, B4, G4, E4. Step coords from C4.
// Bass   staff lines (top→bottom): A3, F3, D3, B2, G2.
//
// Reuses window.stepsFromC4 from GrandStaff.jsx.

function NoteFlash({ pitch, accidental, clef }) {
  const width = 240;
  const height = 240;

  // Coordinate system:
  //   STEP = 12 px per scale step (one line OR one space).
  //   Two adjacent staff lines are STEP * 2 = 24 px apart (line + space between).
  //   Bottom staff line at y = 180. Five lines at y = 180, 156, 132, 108, 84.
  const STEP = 12;
  const BOTTOM_LINE_Y = 180;
  const STAFF_LINES_Y = [84, 108, 132, 156, 180];   // top → bottom

  // stepsFromC4 returns 0 for C4. Bottom staff line is:
  //   treble: E4  → step 2  from C4
  //   bass:   G2  → step -10 from C4
  const BOTTOM_STEP = clef === 'treble' ? 2 : -10;

  function yFor(p) {
    const steps = window.stepsFromC4(p);
    return BOTTOM_LINE_Y - (steps - BOTTOM_STEP) * STEP;
  }

  const noteheadY = yFor(pitch);
  const centerX = width / 2;

  // Ledger lines extend above y=84 (top staff line) or below y=180 (bottom).
  // Each ledger sits at one STEP*2 = 24 px from the previous, on the line side
  // (so ledger ys above are 60, 36, 12, …; below are 204, 228, …).
  function ledgersForY(y) {
    const out = [];
    if (y > BOTTOM_LINE_Y + STEP) {
      // Notehead on a ledger LINE if delta is even multiple of STEP*2;
      // include every ledger at or above the notehead's row.
      for (let yL = BOTTOM_LINE_Y + STEP * 2; yL <= y + 2; yL += STEP * 2) out.push(yL);
    } else if (y < STAFF_LINES_Y[0] - STEP) {
      for (let yL = STAFF_LINES_Y[0] - STEP * 2; yL >= y - 2; yL -= STEP * 2) out.push(yL);
    }
    return out;
  }
  const ledgers = ledgersForY(noteheadY);

  const accGlyph = accidental === '#' ? '♯' : accidental === 'b' ? '♭' : null;
  const clefGlyph = clef === 'treble' ? '𝄞' : '𝄢';
  // Treble clef glyph anchors around its tail (G4 line, y=156); the unicode
  // glyph baseline sits below the curl, so place baseline a touch below the
  // bottom staff line.
  const clefY = clef === 'treble' ? 196 : 156;
  const clefSize = clef === 'treble' ? 128 : 76;

  return (
    <div className="notename-prompt">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        <g stroke="#17161a" strokeWidth="1.2">
          {STAFF_LINES_Y.map((y, i) => (
            <line key={i} x1="14" y1={y} x2={width - 8} y2={y} />
          ))}
        </g>
        <text x="6" y={clefY} fontFamily="Georgia, serif" fontSize={clefSize} fill="#17161a">
          {clefGlyph}
        </text>
        <line x1="68" y1={STAFF_LINES_Y[0]} x2="68" y2={STAFF_LINES_Y[4]}
              stroke="#17161a" strokeWidth="1" />
        {ledgers.map((ly, i) => (
          <line key={i} x1={centerX - 22} y1={ly} x2={centerX + 22} y2={ly}
                stroke="#17161a" strokeWidth="1.2" />
        ))}
        {accGlyph && (
          <text x={centerX - 36} y={noteheadY + 9}
                fontFamily="Georgia, serif" fontSize="34" fill="#17161a">{accGlyph}</text>
        )}
        <ellipse cx={centerX} cy={noteheadY} rx="13" ry="9.5"
                 fill="#17161a" transform={`rotate(-20 ${centerX} ${noteheadY})`} />
      </svg>
    </div>
  );
}

window.NoteFlash = NoteFlash;
