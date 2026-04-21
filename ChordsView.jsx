// ChordsView.jsx — chord identification practice.

function ChordHintPanel({ chord }) {
  const e = window.chordExplanation(chord);
  return (
    <div className="chord-hint-panel">
      <ChordStack root={chord.root} quality={chord.quality} bass={chord.bass} />
      <div className="chord-hint-body">
        <div className="chord-hint-row">
          <span className="chord-hint-label">Root</span>
          <span className="chord-hint-val">{e.root}</span>
        </div>
        <div className="chord-hint-row">
          <span className="chord-hint-label">Quality</span>
          <span className="chord-hint-val">{e.qualityLabel} <span className="mono chord-hint-sym">({e.qualitySymbol || 'maj'})</span></span>
        </div>
        {e.bass && (
          <div className="chord-hint-row">
            <span className="chord-hint-label">Inversion</span>
            <span className="chord-hint-val">{e.bass} in the bass</span>
          </div>
        )}
        <div className="chord-hint-section-head mono">Built from</div>
        <div className="chord-hint-intervals">
          {e.intervals.map((iv, i) => (
            <div className="chord-hint-interval" key={i}>
              <span className="chord-hint-iv-name">{iv.name}</span>
              <span className="chord-hint-iv-semis mono">+{iv.semitones}</span>
              <span className="chord-hint-iv-tone">{iv.tone}</span>
            </div>
          ))}
        </div>
        <div className="chord-hint-prose">{e.prose}</div>
      </div>
    </div>
  );
}

function ChordsView({ midiConnected, midiDeviceName }) {
  const [tier, setTier] = React.useState(1);
  const [accidentals, setAccidentals] = React.useState(true);
  const [chords, setChords] = React.useState(() => window.makeChordPassage(1, 8, true));
  const [playheadIdx, setPlayheadIdx] = React.useState(0);
  const [selected, setSelected] = React.useState(() => new Set());
  const [muted, setMuted] = React.useState(false);
  // When truthy, this is the latest validateChord() result; used to render feedback.
  const [feedback, setFeedback] = React.useState(null);
  const [showHint, setShowHint] = React.useState(false);

  const isDone = playheadIdx >= chords.length;
  const current = chords[playheadIdx];
  const correct = chords.filter(c => c.status === 'correct').length;
  const attempted = chords.filter(c => c.status !== 'pending').length;

  const changeTier = (t) => {
    setTier(t);
    setChords(window.makeChordPassage(t, 8, accidentals));
    setPlayheadIdx(0);
    setSelected(new Set());
    setFeedback(null);
  };

  const newPassage = () => {
    setChords(window.makeChordPassage(tier, 8, accidentals));
    setPlayheadIdx(0);
    setSelected(new Set());
    setFeedback(null);
  };

  const toggleAccidentals = () => {
    const next = !accidentals;
    setAccidentals(next);
    setChords(window.makeChordPassage(tier, 8, next));
    setPlayheadIdx(0);
    setSelected(new Set());
    setFeedback(null);
  };

  const onKey = (pitch) => {
    window.playNote(pitch);
    if (isDone || feedback) return; // Block input while feedback is showing.
    const midi = window.pitchToMidi(pitch);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(midi)) next.delete(midi);
      else next.add(midi);
      return next;
    });
  };

  const onKeyRef = React.useRef(null);
  onKeyRef.current = onKey;
  React.useEffect(() => {
    window.registerMidiCallback((pitch) => onKeyRef.current(pitch));
    return () => window.registerMidiCallback(null);
  }, []);

  const clearSelection = () => {
    if (feedback) return;
    setSelected(new Set());
  };

  const check = () => {
    if (isDone || feedback || selected.size === 0) return;
    const result = window.validateChord(selected, current);
    setFeedback(result);
    setTimeout(() => {
      if (result.ok) {
        setChords(prev => prev.map((c, i) =>
          i === playheadIdx ? { ...c, status: 'correct' } : c
        ));
        setPlayheadIdx(i => Math.min(i + 1, chords.length));
      } else {
        setChords(prev => prev.map((c, i) =>
          i === playheadIdx ? { ...c, status: 'pending' } : c
        ));
      }
      setSelected(new Set());
      setFeedback(null);
    }, 1200);
  };

  // Build the keyboard `highlighted` map. In the idle state, selected keys get
  // the `selected` style. During feedback, we replace it with correct/incorrect/
  // missing states. Missing tones are rendered on the canonical middle-C voicing.
  const highlighted = {};
  if (!feedback) {
    selected.forEach(midi => {
      highlighted[window.midiToName(midi)] = 'selected';
    });
    if (showHint && !isDone && current) {
      current.pitchClasses.forEach(pc => {
        const midi = 60 + pc;
        const name = window.midiToName(midi);
        if (!highlighted[name]) highlighted[name] = 'active';
      });
      if (current.bass) {
        const bassMidi = 48 + current.bassPitchClass;
        const name = window.midiToName(bassMidi);
        if (!highlighted[name]) highlighted[name] = 'active';
      }
    }
  } else if (!feedback.empty) {
    selected.forEach(midi => {
      const pc = ((midi % 12) + 12) % 12;
      const name = window.midiToName(midi);
      if (feedback.selectedPcsCorrect.has(pc)) highlighted[name] = 'correct';
      else highlighted[name] = 'incorrect';
    });
    // Missing tones: show on canonical voicing (C4..B4 octave for most tones,
    // falling back to C3 octave only if above keyboard range).
    feedback.missingPcs.forEach(pc => {
      // Prefer octave 4 (midi 60..71) for missing PCs.
      const midi = 60 + pc;
      const name = window.midiToName(midi);
      if (!highlighted[name]) highlighted[name] = 'missing';
    });
  }

  return (
    <div className="pane wide practice-pane">
      <div className="practice-hud">
        <div>
          <div className="hud-exercise">Chords · Tier {tier}</div>
          <div className="hud-counter">
            {isDone
              ? `${correct} of ${chords.length} correct`
              : `Chord ${playheadIdx + 1} of ${chords.length} · ${correct}/${attempted} correct`}
          </div>
        </div>
        <div className="hud-right">
          <div className={'device ' + (midiConnected ? 'connected' : 'disconnected')}>
            <span className="device-dot" />
            {midiConnected ? (midiDeviceName || 'MIDI device') : 'No MIDI device'}
          </div>
          <div className="clef-toggle">
            {[1, 2, 3, 4, 5, 6].map(t => (
              <button key={t}
                className={'clef-btn' + (tier === t ? ' active' : '')}
                onClick={() => changeTier(t)}>
                {t}
              </button>
            ))}
          </div>
          {tier === 1 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)', userSelect: 'none' }}>
              <div className={'toggle' + (accidentals ? ' on' : '')} onClick={toggleAccidentals} />
              ♯♭
            </label>
          )}
        </div>
      </div>

      <div className="chord-prompt-wrap">
        <div className="chord-prompt">
          {isDone ? (
            <span className="chord-prompt-done mono">
              {correct} of {chords.length} correct
            </span>
          ) : (
            <span className="chord-prompt-name">{current.displayName}</span>
          )}
        </div>
        {!isDone && current && (
          <button
            className={'hint-toggle' + (showHint ? ' on' : '')}
            onClick={() => setShowHint(h => !h)}
            title={showHint ? 'Hide hint' : 'Show hint'}
          >
            ?
          </button>
        )}
      </div>

      {showHint && !isDone && current && <ChordHintPanel chord={current} />}

      <TwoOctaveKeyboard highlighted={highlighted} onKey={onKey} />

      <div className="practice-actions">
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)', userSelect: 'none' }}>
          <div className={'toggle' + (muted ? ' on' : '')} onClick={() => { const v = !muted; setMuted(v); window.setMuted(v); }} />
          Mute
        </label>
        <div className="spacer" />
        <button className="btn btn-secondary btn-sm" onClick={clearSelection} disabled={isDone || !!feedback}>Clear</button>
        <button className="btn btn-primary btn-sm"   onClick={check}          disabled={isDone || !!feedback || selected.size === 0}>Check</button>
        <button className="btn btn-secondary btn-sm" onClick={newPassage} disabled={!!feedback}>New passage</button>
      </div>
    </div>
  );
}

window.ChordsView = ChordsView;
