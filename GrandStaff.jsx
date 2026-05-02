// GrandStaff.jsx — renders treble + bass as two visually separated staves.
// Treble staff: E4..F5 (C5 in 3rd space), notes range C4..C6 with ledger lines.
// Bass staff: G2..A3 (C3 in 2nd space), notes range C2..B3 with ledger lines.
// Notes route to the staff matching their clef; the two bands share horizontal
// time alignment but are drawn in separate SVG elements with a visible gap.

const WHITE = ['C','D','E','F','G','A','B'];

function stepsFromC4(pitch) {
  const m = pitch.match(/^([A-G])([#b♯♭]?)(\d)$/);
  if (!m) return 0;
  const [_, letter, , oct] = m;
  return (parseInt(oct, 10) - 4) * 7 + WHITE.indexOf(letter);
}
const STEP = 6;

// Treble: bottom line E4 = y 68. E4 is step 2 from C4.
function trebleY(pitch) { return 68 - (stepsFromC4(pitch) - 2) * STEP; }

// Bass: top line A3 = y 20 (local). A3 is step -2 from C4.
function bassY(pitch) { return 20 - (stepsFromC4(pitch) + 2) * STEP; }

function clefForPitch(pitch) {
  return stepsFromC4(pitch) >= 0 ? 'treble' : 'bass';
}

// Ledger lines for any notehead at local y. Both staves span y=20..68;
// ledgers above are at y=8, -4, -16, … and below are at y=80, 92, 104, ….
function ledgersForY(y) {
  const out = [];
  if (y >= 80) {
    for (let yL = 80; yL <= y + 3; yL += 12) out.push(yL);
  } else if (y <= 8) {
    for (let yL = 8; yL >= y - 3; yL -= 12) out.push(yL);
  }
  return out;
}

function StaffBand({ which, notes, playheadIndex, width, narrow, showPlayhead }) {
  const lines = [20, 32, 44, 56, 68];
  const viewTop = -40;             // headroom for ledgers above (tier-4 bass C5 region)
  const viewBottom = 128;          // room for ledgers below (tier-4 treble C3 region)
  const localHeight = viewBottom - viewTop;
  const startX = narrow ? 50 : 78;
  const endX = width - 14;
  const spacing = notes.length > 0 ? (endX - startX) / (notes.length + 0.5) : 60;
  const yFn = which === 'treble' ? trebleY : bassY;

  return (
    <div className={'staff-band ' + which}>
      <svg viewBox={`0 ${viewTop} ${width} ${localHeight}`} width="100%" preserveAspectRatio="xMidYMid meet">
        {/* Staff lines */}
        <g stroke="#17161a" strokeWidth="1">
          {lines.map((y, i) => <line key={i} x1="0" y1={y} x2={width} y2={y} />)}
        </g>

        {/* Clef glyph */}
        {which === 'treble'
          ? <text x={narrow ? 2 : 8} y={70} fontFamily="Georgia, serif" fontSize={narrow ? 60 : 72} fill="#17161a">𝄞</text>
          : <text x={narrow ? 6 : 12} y={56} fontFamily="Georgia, serif" fontSize={narrow ? 48 : 58} fill="#17161a">𝄢</text>}

        {/* Opening barline */}
        <line x1={startX - 14} y1={20} x2={startX - 14} y2={68} stroke="#17161a" strokeWidth="1" />


        {/* Notes */}
        {notes.map((entry, i) => {
          if (entry === null) return null;
          const { n, globalIdx } = entry;
          const x = startX + (i + 0.5) * spacing;
          const y = yFn(n.pitch);
          const isCurrent = globalIdx === playheadIndex;
          const fill =
            n.status === 'correct'            ? '#2f5d3a' :
            n.status === 'incorrect'          ? '#8a2d2d' :
            (showPlayhead && isCurrent)       ? '#17161a' :
            '#9b978c';
          const opacity = (n.status === 'pending' && showPlayhead && !isCurrent) ? 0.55 : 1;
          const acc = n.pitch.match(/[#b]/)?.[0];
          const stemUp = y >= 44;
          const stemY2 = stemUp ? y - 30 : y + 30;
          const stemX = stemUp ? x + 7 : x - 7;
          const ledgers = ledgersForY(y);

          return (
            <g key={i} opacity={opacity}>
              {/* Ledger lines for notes outside the staff */}
              {ledgers.map((ly, j) => (
                <line key={j} x1={x - 11} y1={ly} x2={x + 11} y2={ly} stroke="#17161a" strokeWidth="1" />
              ))}
              {/* Accidental */}
              {acc === '#' && <text x={x - 22} y={y + 5} fontFamily="Georgia, serif" fontSize="22" fill={fill}>♯</text>}
              {acc === 'b' && <text x={x - 22} y={y + 5} fontFamily="Georgia, serif" fontSize="22" fill={fill}>♭</text>}
              {/* Notehead */}
              <ellipse cx={x} cy={y} rx="7" ry="5.2" fill={fill} transform={`rotate(-20 ${x} ${y})`} />
              {/* Stem */}
              <line x1={stemX} y1={y} x2={stemX} y2={stemY2} stroke={fill} strokeWidth="1.3" />
              {/* Playhead marker — only when hint is visible */}
              {showPlayhead && isCurrent && (
                <rect x={x - 14} y={which === 'treble' ? 2 : 88} width="28" height="2" fill="#8a2d2d" />
              )}
            </g>
          );
        })}

        {/* Final double barline */}
        {notes.some(e => e !== null) && (
          <>
            <line x1={endX - 6} y1={20} x2={endX - 6} y2={68} stroke="#17161a" strokeWidth="1" />
            <line x1={endX - 2} y1={20} x2={endX - 2} y2={68} stroke="#17161a" strokeWidth="2" />
          </>
        )}
      </svg>
    </div>
  );
}

function GrandStaff({ notes = [], playheadIndex = 0, clef = 'grand', width = 760, narrow = false, showPlayhead = true }) {
  const slotClef = (n) => n.assignedClef || clefForPitch(n.pitch);
  const trebleSlots = notes.map((n, i) => slotClef(n) === 'treble' ? { n, globalIdx: i } : null);
  const bassSlots   = notes.map((n, i) => slotClef(n) === 'bass'   ? { n, globalIdx: i } : null);

  const showTreble = clef === 'grand' || clef === 'treble';
  const showBass   = clef === 'grand' || clef === 'bass';
  const effectiveWidth = narrow ? 340 : width;

  return (
    <div className={'grand-staff' + (narrow ? ' narrow' : '')}>
      {showTreble && (
        <StaffBand which="treble" notes={trebleSlots} playheadIndex={playheadIndex} width={effectiveWidth} narrow={narrow} showPlayhead={showPlayhead} />
      )}
      {showTreble && showBass && <div className="staff-gap" aria-hidden="true" />}
      {showBass && (
        <StaffBand which="bass" notes={bassSlots} playheadIndex={playheadIndex} width={effectiveWidth} narrow={narrow} showPlayhead={showPlayhead} />
      )}
    </div>
  );
}

window.GrandStaff = GrandStaff;
window.clefForPitch = clefForPitch;
window.stepsFromC4 = stepsFromC4;
window.trebleY = trebleY;
