// ChordsView.jsx — chord identification practice.

function ChordsView({ midiConnected, midiDeviceName }) {
  const [tier, setTier] = React.useState(1);
  const [chords, setChords] = React.useState(() => window.makeChordPassage(1, 8, true));
  const [playheadIdx, setPlayheadIdx] = React.useState(0);
  // `selected` is a Set of MIDI numbers.
  const [selected, setSelected] = React.useState(() => new Set());
  const [muted, setMuted] = React.useState(false);

  const isDone = playheadIdx >= chords.length;
  const current = chords[playheadIdx];
  const correct = chords.filter(c => c.status === 'correct').length;
  const attempted = chords.filter(c => c.status !== 'pending').length;

  const changeTier = (t) => {
    setTier(t);
    setChords(window.makeChordPassage(t, 8, true));
    setPlayheadIdx(0);
    setSelected(new Set());
  };

  const newPassage = () => {
    setChords(window.makeChordPassage(tier, 8, true));
    setPlayheadIdx(0);
    setSelected(new Set());
  };

  const onKey = (pitch) => {
    window.playNote(pitch);
    if (isDone) return;
    const midi = window.pitchToMidi(pitch);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(midi)) next.delete(midi);
      else next.add(midi);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  // Convert `selected` (Set<midi>) to the `highlighted` map TwoOctaveKeyboard expects.
  const highlighted = {};
  selected.forEach(midi => {
    highlighted[window.midiToName(midi)] = 'selected';
  });

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
        </div>
      </div>

      <div className="chord-prompt">
        {isDone ? (
          <span className="chord-prompt-done mono">
            {correct} of {chords.length} correct
          </span>
        ) : (
          <span className="chord-prompt-name">{current.displayName}</span>
        )}
      </div>

      <TwoOctaveKeyboard highlighted={highlighted} onKey={onKey} />

      <div className="practice-actions">
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)', userSelect: 'none' }}>
          <div className={'toggle' + (muted ? ' on' : '')} onClick={() => { const v = !muted; setMuted(v); window.setMuted(v); }} />
          Mute
        </label>
        <div className="spacer" />
        <button className="btn btn-secondary btn-sm" onClick={clearSelection} disabled={isDone}>Clear</button>
        <button className="btn btn-primary btn-sm" onClick={newPassage}>New passage</button>
      </div>
    </div>
  );
}

window.ChordsView = ChordsView;
