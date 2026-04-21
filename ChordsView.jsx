// ChordsView.jsx — chord identification practice.
// Stub in Task 4; filled out across Tasks 5-11.

function ChordsView({ midiConnected, midiDeviceName }) {
  return (
    <div className="pane wide practice-pane">
      <div className="practice-hud">
        <div>
          <div className="hud-exercise">Chords</div>
          <div className="hud-counter mono">coming soon</div>
        </div>
        <div className="hud-right">
          <div className={'device ' + (midiConnected ? 'connected' : 'disconnected')}>
            <span className="device-dot" />
            {midiConnected ? (midiDeviceName || 'MIDI device') : 'No MIDI device'}
          </div>
        </div>
      </div>
    </div>
  );
}

window.ChordsView = ChordsView;
