// ChordsView.jsx — chord identification practice.

function ChordsView({ midiConnected, midiDeviceName }) {
  const [tier, setTier] = React.useState(1);
  const [chords, setChords] = React.useState(() => window.makeChordPassage(1, 8, true));
  const [playheadIdx, setPlayheadIdx] = React.useState(0);

  const isDone = playheadIdx >= chords.length;
  const current = chords[playheadIdx];
  const correct = chords.filter(c => c.status === 'correct').length;
  const attempted = chords.filter(c => c.status !== 'pending').length;

  const changeTier = (t) => {
    setTier(t);
    setChords(window.makeChordPassage(t, 8, true));
    setPlayheadIdx(0);
  };

  const newPassage = () => {
    setChords(window.makeChordPassage(tier, 8, true));
    setPlayheadIdx(0);
  };

  // Temporary "skip" advance until Task 7 wires Check.
  const skip = () => setPlayheadIdx(i => Math.min(i + 1, chords.length));

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

      <div className="practice-actions">
        <div className="spacer" />
        <button className="btn btn-secondary btn-sm" onClick={skip} disabled={isDone}>Skip</button>
        <button className="btn btn-primary btn-sm" onClick={newPassage}>New passage</button>
      </div>
    </div>
  );
}

window.ChordsView = ChordsView;
