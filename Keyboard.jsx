// Keyboard.jsx — responsive virtual piano keyboard.
// Desktop: C3..B3 (7 keys) + C4..B4+C5 (8 keys) = 15 white keys total.
// Mobile (<900px): two stacked rows:
//   treble: C4..B4+C5 (8 white keys)
//   bass:   C3..B3+C4 (8 white keys)

const WHITE_IN_OCT = ['C','D','E','F','G','A','B'];
const BLACK_POSITIONS = [0, 1, 3, 4, 5]; // index of white key after which a black key falls
const BLACK_NAMES = ['C#','D#','F#','G#','A#'];

function buildOctave(startOct) {
  const whites = WHITE_IN_OCT.map(n => `${n}${startOct}`);
  const blacks = BLACK_POSITIONS.map((p, k) => ({
    name: `${BLACK_NAMES[k]}${startOct}`,
    leftPct: ((p + 1) / 7) * 100,
  }));
  return { whites, blacks };
}

// extraC: append the upper C (octave + 1) as a final white key.
function OctaveRow({ startOct, highlighted, onKey, compact, extraC = false }) {
  const { whites, blacks } = buildOctave(startOct);
  const allWhites = extraC ? [...whites, `C${startOct + 1}`] : whites;
  const totalWhites = allWhites.length;

  return (
    <div className={'keyboard-wrap' + (compact ? ' compact' : '')}>
      {allWhites.map((n) => {
        const state = highlighted[n];
        const cls = ['white-key', state].filter(Boolean).join(' ');
        return (
          <div key={n} className={cls} onMouseDown={() => onKey(n)}>
            {n.startsWith('C') && <span className="kl mono">{n}</span>}
          </div>
        );
      })}
      {blacks.map((b) => {
        // Rescale left% from 7-key basis to totalWhites
        const adjustedPct = (b.leftPct / 100) * (7 / totalWhites) * 100;
        const state = highlighted[b.name];
        const cls = ['black-key', state].filter(Boolean).join(' ');
        return (
          <div
            key={b.name}
            className={cls}
            style={{ left: `calc(${adjustedPct}% - 15px)` }}
            onMouseDown={() => onKey(b.name)}
          />
        );
      })}
    </div>
  );
}

function TwoOctaveKeyboard({ highlighted = {}, onKey = () => {}, narrow: forcedNarrow, clef = 'grand' }) {
  const [narrowAuto, setNarrow] = React.useState(window.innerWidth < 900);
  React.useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const narrow = forcedNarrow !== undefined ? forcedNarrow : narrowAuto;

  const showTreble = clef !== 'bass';
  const showBass   = clef !== 'treble';

  if (narrow) {
    return (
      <div className="kb-split">
        {showTreble && (
          <div className="kb-split-row">
            <div className="kb-clef-label">𝄞 <span className="mono">treble</span></div>
            <OctaveRow startOct={4} highlighted={highlighted} onKey={onKey} compact extraC />
          </div>
        )}
        {showBass && (
          <div className="kb-split-row">
            <div className="kb-clef-label">𝄢 <span className="mono">bass</span></div>
            <OctaveRow startOct={3} highlighted={highlighted} onKey={onKey} compact extraC />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={'kb-continuous' + (clef !== 'grand' ? ' single' : '')}>
      {showBass   && <OctaveRow startOct={3} highlighted={highlighted} onKey={onKey} extraC={clef === 'bass'} />}
      {showTreble && <OctaveRow startOct={4} highlighted={highlighted} onKey={onKey} extraC />}
    </div>
  );
}

window.TwoOctaveKeyboard = TwoOctaveKeyboard;
