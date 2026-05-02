// pannable-keyboard.jsx — generalized version of B1-v2.
//
// Props:
//   lo, hi               MIDI numbers bounding the underlying range.
//                        Both should be C-rooted; visible window is one
//                        octave (8 white keys) within [lo, hi].
//   defaultLeftC         MIDI number for the visible-window left edge when
//                        no prompt is active. e.g. 60 (C4) → window C4–C5.
//   highlighted          { 'C4': 'correct' | 'active' | 'incorrect' | 'selected' }
//   onKey                (name) => void
//   focusMidis           array of MIDI numbers from the current prompt.
//                        When this changes, the keyboard auto-centers.
//   autoCenterMode       'prompt' (snap to chord-center on each prompt; default)
//                        | 'default' (always return to defaultLeftC on prompt change)
//                        | 'manual' (no auto-pan)
//   mapVariant           'full' (38 px, ticks + labels + dots) | 'mini' (10 px, ticks + dots)
//   keyHeight, blackHeight   pixel heights for the playable row
//
// Same gesture set as B1-v2:
//   - tap a key: plays it (movement < 6 px from press)
//   - drag the keys: live horizontal pan, sub-semitone smooth, snaps to
//     nearest semitone on release
//   - tap the minimap: teleport so the tap point is the visible center
//   - drag the minimap viewport rect: scrub at semitone precision
//
// Exposed on window: PannableKeyboard.

const PK_VISIBLE_SEMI = 12;    // default visible semitone count (1 octave)
const PK_DRAG_THRESHOLD_PX = 6;

const PK_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function pkKeysInRange(loMidi, hiMidi) {
  const whites = [];
  const blacks = [];
  for (let m = loMidi; m <= hiMidi; m++) {
    const pc = ((m % 12) + 12) % 12;
    const oct = Math.floor(m / 12) - 1;
    const name = PK_SHARP[pc] + oct;
    if (!name.includes('#')) whites.push({ midi: m, name, isC: name[0] === 'C' });
  }
  for (let m = loMidi; m <= hiMidi; m++) {
    const pc = ((m % 12) + 12) % 12;
    const oct = Math.floor(m / 12) - 1;
    const name = PK_SHARP[pc] + oct;
    if (name.includes('#')) {
      const leftWhiteIndex = whites.findIndex(w => w.midi === m - 1);
      if (leftWhiteIndex >= 0) blacks.push({ midi: m, name, leftWhiteIndex });
    }
  }
  return { whites, blacks };
}

// Pick a sensible auto-pan target on prompt change.
function pkPickLeftEdge(midis, lo, hi, visibleSemi, fallback) {
  const minLeft = lo;
  const maxLeft = hi - visibleSemi;
  if (!midis || midis.length === 0) return Math.max(minLeft, Math.min(maxLeft, fallback));
  const mLo = Math.min(...midis);
  const mHi = Math.max(...midis);
  const center = (mLo + mHi) / 2;
  let leftC = Math.floor(center / 12) * 12;
  if (mHi - mLo > 12) leftC = Math.floor(mLo / 12) * 12;
  return Math.max(minLeft, Math.min(maxLeft, leftC));
}

// =====================================================================
// PlayableRow — the keyboard surface itself, with drag-to-pan.
// =====================================================================
function PKRow({ leftC, lo, hi, visibleSemi, highlighted, onKey, onPan, height = 180, blackHeight = 110 }) {
  window.useNamingMode();
  // n octaves spans 7n+1 visible whites (both endpoint Cs counted).
  const visibleWhites = (visibleSemi / 12) * 7 + 1;
  // Render the full [lo, hi] range once so whites[0] is a stable anchor.
  // pkKeysInRange is pure, so memoize on the range.
  const { whites, blacks } = React.useMemo(() => pkKeysInRange(lo, hi), [lo, hi]);
  const totalWhites = whites.length;

  const containerRef = React.useRef(null);
  const [containerW, setContainerW] = React.useState(343);
  React.useLayoutEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (containerRef.current) setContainerW(containerRef.current.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const whiteW = containerW / visibleWhites;
  const innerW = whiteW * totalWhites;
  // Continuous semitone -> pixel offset: 12 semis = 7 white widths, uniformly.
  // Avoids the integer-index snap that bumps when leftC crosses a black-key
  // semitone.
  const baseTx = totalWhites > 0
    ? -(leftC - whites[0].midi) * (7 / 12) * whiteW
    : 0;

  const dragRef = React.useRef({
    active: false, startedPan: false, startX: 0, startLeftC: leftC, pointerId: null, keyToFire: null,
  });

  const handlePointerDown = (e, keyName) => {
    if (!onPan) {
      if (keyName) onKey && onKey(keyName);
      return;
    }
    dragRef.current = {
      active: true, startedPan: false, startX: e.clientX,
      startLeftC: leftC, pointerId: e.pointerId, keyToFire: keyName || null,
    };
    if (e.currentTarget.setPointerCapture && e.pointerId != null) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    }
  };

  const handlePointerMove = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    if (!d.startedPan && Math.abs(dx) >= PK_DRAG_THRESHOLD_PX) d.startedPan = true;
    if (d.startedPan && onPan) {
      const whiteDelta = dx / whiteW;
      const semiDelta = whiteDelta * (12 / 7);
      onPan(d.startLeftC - semiDelta);
    }
  };

  const handlePointerUp = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    if (!d.startedPan && d.keyToFire) {
      onKey && onKey(d.keyToFire);
    } else if (d.startedPan && onPan) {
      onPan(null); // settle
    }
    dragRef.current = { active: false, startedPan: false, startX: 0, startLeftC: leftC, pointerId: null, keyToFire: null };
  };

  return (
    <div
      className="pk-row"
      ref={containerRef}
      style={{ height, touchAction: onPan ? 'pan-y' : 'auto' }}
      onPointerDown={(e) => handlePointerDown(e, null)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="pk-row-inner"
        style={{
          position: 'absolute',
          top: 0, left: 0,
          height,
          width: innerW,
          transform: `translateX(${baseTx}px)`,
          willChange: 'transform',
        }}
      >
        {whites.map((w, i) => {
          const state = highlighted[w.name];
          const cls = ['pk-white'];
          if (state) cls.push('pk-' + state);
          return (
            <div
              key={w.midi}
              className={cls.join(' ')}
              style={{
                position: 'absolute',
                left: i * whiteW,
                width: whiteW,
                height,
              }}
              onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, w.name); }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {w.isC && (
                <span className={'pk-label mono' + (w.midi === 60 ? ' pk-label-mc' : '')}>
                  {window.formatNoteName(w.name)}{w.midi === 60 ? ' · ' + window.t('pk.middle') : ''}
                </span>
              )}
            </div>
          );
        })}
        {blacks.map(b => {
          const leftPx = (b.leftWhiteIndex + 1) * whiteW;
          const blackWidth = whiteW * 0.6;
          const state = highlighted[b.name];
          const cls = ['pk-black'];
          if (state) cls.push('pk-' + state);
          return (
            <div
              key={b.midi}
              className={cls.join(' ')}
              style={{
                position: 'absolute',
                left: leftPx - blackWidth / 2,
                width: blackWidth,
                height: blackHeight,
              }}
              onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, b.name); }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          );
        })}
      </div>
    </div>
  );
}

// =====================================================================
// EdgeMarkers — small "← G2" / "B5 →" badges when prompt notes fall
// outside the visible window.
// =====================================================================
function PKEdgeMarkers({ leftC, visibleSemi, highlighted }) {
  window.useNamingMode();
  const visibleLo = leftC;
  const visibleHi = leftC + visibleSemi;
  const offLeft = [];
  const offRight = [];
  Object.entries(highlighted).forEach(([name, state]) => {
    if (state !== 'correct' && state !== 'active' && state !== 'selected') return;
    const m = window.nameToMidi(name);
    if (m == null) return;
    if (m < visibleLo) offLeft.push({ name, m, state });
    else if (m > visibleHi) offRight.push({ name, m, state });
  });
  if (offLeft.length === 0 && offRight.length === 0) return null;
  return (
    <>
      {offLeft.length > 0 && (
        <div className="pk-edge pk-edge-left">
          <span className="pk-edge-arrow">←</span>
          <span className="mono">{offLeft.map(x => window.formatNoteName(x.name)).join(' ')}</span>
        </div>
      )}
      {offRight.length > 0 && (
        <div className="pk-edge pk-edge-right">
          <span className="mono">{offRight.map(x => window.formatNoteName(x.name)).join(' ')}</span>
          <span className="pk-edge-arrow">→</span>
        </div>
      )}
    </>
  );
}

// =====================================================================
// Minimap — full or mini variant.
// =====================================================================
function PKMinimap({ leftMidi, lo, hi, visibleSemi, highlighted, onTeleport, onScrubStart, onScrubMove, onScrubEnd, scrubbing, animating, variant = 'full' }) {
  window.useNamingMode();
  const minimapRef = React.useRef(null);
  const fullRange = hi - lo;

  // Octave labels (only those inside [lo, hi]).
  const octaves = [];
  for (let oct = Math.floor(lo / 12) - 1; oct <= Math.floor(hi / 12) - 1; oct++) {
    const m = (oct + 1) * 12;
    if (m >= lo && m <= hi) octaves.push({ oct, m });
  }

  const xToLeftMidi = (clientX) => {
    if (!minimapRef.current) return leftMidi;
    const rect = minimapRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const newCenter = lo + pct * fullRange;
    let newLeft = Math.round(newCenter - visibleSemi / 2);
    return Math.max(lo, Math.min(hi - visibleSemi, newLeft));
  };

  const dragOffsetRef = React.useRef(0);
  const xToLeftMidiDrag = (clientX) => {
    if (!minimapRef.current) return leftMidi;
    const rect = minimapRef.current.getBoundingClientRect();
    const x = clientX - rect.left - dragOffsetRef.current;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const newLeft = lo + pct * fullRange;
    return Math.max(lo, Math.min(hi - visibleSemi, newLeft));
  };

  const startViewportDrag = (clientX) => {
    if (!minimapRef.current) return;
    const rect = minimapRef.current.getBoundingClientRect();
    const viewportLeftPx = ((leftMidi - lo) / fullRange) * rect.width;
    dragOffsetRef.current = (clientX - rect.left) - viewportLeftPx;
    onScrubStart && onScrubStart();
  };

  const viewportLeftPct = ((leftMidi - lo) / fullRange) * 100;
  const viewportWidthPct = (visibleSemi / fullRange) * 100;

  const highlightedMidis = Object.keys(highlighted)
    .map(window.nameToMidi)
    .filter(m => m != null && m >= lo && m <= hi);

  const wrapCls = 'pk-mm pk-mm-' + variant;

  return (
    <div
      className={wrapCls}
      ref={minimapRef}
      onMouseDown={(e) => { onTeleport && onTeleport(xToLeftMidi(e.clientX)); }}
      onTouchStart={(e) => {
        if (e.target.classList.contains('pk-mm-viewport')) return;
        onTeleport && onTeleport(xToLeftMidi(e.touches[0].clientX));
      }}
    >
      {octaves.map(({ oct, m }) => {
        const pct = ((m - lo) / fullRange) * 100;
        return (
          <React.Fragment key={oct}>
            <div className="pk-mm-tick" style={{ left: `${pct}%` }} />
            {variant === 'full' && (
              <span className="pk-mm-tick-label mono" style={{ left: `${pct}%` }}>{window.formatNoteName('C')}{oct}</span>
            )}
          </React.Fragment>
        );
      })}
      {highlightedMidis.map(m => {
        const pct = ((m - lo) / fullRange) * 100;
        const name = window.midiToName(m);
        const state = highlighted[name] || 'active';
        return <div key={m} className={'pk-mm-dot pk-mm-dot-' + state} style={{ left: `${pct}%` }} />;
      })}
      <div
        className={'pk-mm-viewport' + (animating ? ' pk-mm-viewport-anim' : '') + (scrubbing ? ' pk-mm-viewport-drag' : '')}
        style={{ left: `${viewportLeftPct}%`, width: `${viewportWidthPct}%` }}
        onMouseDown={(e) => {
          e.stopPropagation();
          startViewportDrag(e.clientX);
          const move = (ev) => onScrubMove && onScrubMove(xToLeftMidiDrag(ev.clientX));
          const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            onScrubEnd && onScrubEnd();
          };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', up);
        }}
        onTouchStart={(e) => { e.stopPropagation(); startViewportDrag(e.touches[0].clientX); }}
        onTouchMove={(e) => { e.stopPropagation(); onScrubMove && onScrubMove(xToLeftMidiDrag(e.touches[0].clientX)); }}
        onTouchEnd={(e) => { e.stopPropagation(); onScrubEnd && onScrubEnd(); }}
      />
    </div>
  );
}

// =====================================================================
// PannableKeyboard — the public, parameterized component.
// =====================================================================
function PannableKeyboard({
  lo, hi,
  defaultLeftC,
  visibleSemi = PK_VISIBLE_SEMI,
  highlighted = {},
  onKey,
  focusMidis = [],
  autoCenterMode = 'prompt',  // 'prompt' | 'default' | 'manual'
  mapVariant = 'full',
  showReadout = true,
  keyHeight = 180,
  blackHeight = 110,
}) {
  const minLeft = lo;
  const maxLeft = Math.max(lo, hi - visibleSemi);

  const initialLeft = (() => {
    if (autoCenterMode === 'prompt' && focusMidis.length > 0) {
      return pkPickLeftEdge(focusMidis, lo, hi, visibleSemi, defaultLeftC);
    }
    return Math.max(minLeft, Math.min(maxLeft, defaultLeftC));
  })();

  const [leftMidi, setLeftMidi] = React.useState(initialLeft);
  const [scrubbing, setScrubbing] = React.useState(false);
  const [keyboardDragging, setKeyboardDragging] = React.useState(false);
  const [animating, setAnimating] = React.useState(false);

  // Latest leftMidi for the auto-pan effect to read without re-running on every pan.
  const leftMidiRef = React.useRef(initialLeft);
  React.useEffect(() => { leftMidiRef.current = leftMidi; }, [leftMidi]);

  React.useEffect(() => {
    if (autoCenterMode === 'manual') return;
    // Don't pull the view if the prompt notes are already visible — only re-pan
    // when the focus would otherwise be off-screen.
    if (autoCenterMode === 'prompt' && focusMidis.length > 0) {
      const visibleLo = Math.round(leftMidiRef.current);
      const visibleHi = visibleLo + visibleSemi;
      if (focusMidis.every(m => m >= visibleLo && m <= visibleHi)) return;
    }
    const target = autoCenterMode === 'prompt' && focusMidis.length > 0
      ? pkPickLeftEdge(focusMidis, lo, hi, visibleSemi, defaultLeftC)
      : Math.max(minLeft, Math.min(maxLeft, defaultLeftC));
    setLeftMidi(target);
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(focusMidis), autoCenterMode, lo, hi, visibleSemi, defaultLeftC]);

  const clamp = (v) => Math.max(minLeft, Math.min(maxLeft, v));

  const onKeyboardPan = (next) => {
    if (next === null) {
      setLeftMidi(v => clamp(Math.round(v)));
      setKeyboardDragging(false);
      return;
    }
    setKeyboardDragging(true);
    setAnimating(false);
    setLeftMidi(clamp(next));
  };

  window.useNamingMode();
  const lowName = window.midiToName(Math.round(leftMidi));
  const highName = window.midiToName(Math.round(leftMidi) + visibleSemi);

  return (
    <div className={'pk pk-map-' + mapVariant}>
      {showReadout && mapVariant === 'full' && (
        <div className="pk-readout mono">
          <span>{window.formatNoteName(lowName)}</span>
          <span className="pk-readout-sep">–</span>
          <span>{window.formatNoteName(highName)}</span>
          {(scrubbing || keyboardDragging) && (
            <span className="pk-readout-tag">{keyboardDragging ? 'panning' : 'dragging'}</span>
          )}
        </div>
      )}
      <PKMinimap
        leftMidi={leftMidi}
        lo={lo}
        hi={hi}
        visibleSemi={visibleSemi}
        highlighted={highlighted}
        scrubbing={scrubbing}
        animating={animating}
        variant={mapVariant}
        onTeleport={(v) => {
          setAnimating(true);
          setLeftMidi(v);
          setTimeout(() => setAnimating(false), 220);
        }}
        onScrubStart={() => { setScrubbing(true); setAnimating(false); }}
        onScrubMove={(v) => setLeftMidi(v)}
        onScrubEnd={() => { setLeftMidi(v => clamp(Math.round(v))); setScrubbing(false); }}
      />
      <div className={'pk-row-wrap' + (keyboardDragging ? ' pk-row-wrap-drag' : '')}>
        <PKEdgeMarkers leftC={Math.round(leftMidi)} visibleSemi={visibleSemi} highlighted={highlighted} />
        <PKRow
          leftC={leftMidi}
          lo={lo}
          hi={hi}
          visibleSemi={visibleSemi}
          highlighted={highlighted}
          onKey={onKey}
          onPan={onKeyboardPan}
          height={keyHeight}
          blackHeight={blackHeight}
        />
      </div>
    </div>
  );
}

window.PannableKeyboard = PannableKeyboard;
window.pkPickLeftEdge = pkPickLeftEdge;
