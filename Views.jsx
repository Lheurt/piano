// Views.jsx — Practice, Sessions, Devices, Settings panes.

const EyeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeOffIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

function PaneHeader({ eyebrow, title, sub, right }) {
  return (
    <div className="pane-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ---------- Practice — the primary surface ---------- */

function useNarrow() {
  const [narrow, setNarrow] = React.useState(() => window.innerWidth < 900);
  React.useEffect(() => {
    const onR = () => setNarrow(window.innerWidth < 900);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  return narrow;
}

function PracticeView() {
  const narrow = useNarrow();
  const [clef, setClef] = React.useState('grand');
  const [accidentals, setAccidentals] = React.useState(false);
  const [notes, setNotes] = React.useState(() => window.makePassage('grand'));
  const [playheadIdx, setPlayheadIdx] = React.useState(0);
  const [played, setPlayed] = React.useState(null);
  const [showHint, setShowHint] = React.useState(false);
  const [muted, setMuted] = React.useState(false);

  const isDone  = playheadIdx >= notes.length;
  const current = notes[playheadIdx];
  const correct = notes.filter(n => n.status === 'correct').length;
  const attempted = notes.filter(n => n.status !== 'pending').length;

  const onKeyRef = React.useRef(null);

  const onKey = (pitch, opts) => {
    const fromMic = opts && opts.fromMic;
    if (!fromMic) window.playNote(pitch);
    if (isDone || !current || current.status !== 'pending') return;
    setPlayed(pitch);
    const isCorrect = window.pitchToMidi(pitch) === window.pitchToMidi(current.pitch);
    setNotes(prev => prev.map((n, i) =>
      i === playheadIdx ? { ...n, status: isCorrect ? 'correct' : 'incorrect' } : n
    ));
    if (isCorrect) {
      setTimeout(() => { setPlayheadIdx(i => Math.min(i + 1, notes.length)); setPlayed(null); }, 180);
    } else {
      setTimeout(() => {
        setNotes(prev => prev.map((n, i) => i === playheadIdx ? { ...n, status: 'pending' } : n));
        setPlayed(null);
      }, 420);
    }
  };

  const changeClef = (c) => {
    setClef(c);
    setNotes(window.makePassage(c, 8, accidentals));
    setPlayheadIdx(0);
    setPlayed(null);
  };

  const toggleAccidentals = () => {
    const next = !accidentals;
    setAccidentals(next);
    setNotes(window.makePassage(clef, 8, next));
    setPlayheadIdx(0);
    setPlayed(null);
  };

  const reset = () => {
    setNotes(window.makePassage(clef, 8, accidentals));
    setPlayheadIdx(0);
    setPlayed(null);
  };

  onKeyRef.current = onKey;
  React.useEffect(() => {
    window.registerMidiCallback((pitch) => onKeyRef.current(pitch));
    return () => window.registerMidiCallback(null);
  }, []);
  React.useEffect(() => {
    if (!window.registerMicCallback) return;
    window.registerMicCallback((pitch /*, midi */) => {
      if (!pitch) return;
      onKeyRef.current(pitch, { fromMic: true });
    });
    return () => window.registerMicCallback(null);
  }, []);

  const highlighted = {};
  if (showHint && !isDone && current && current.status === 'pending') {
    highlighted[window.midiToName(window.pitchToMidi(current.pitch))] = 'active';
  }
  if (played) {
    highlighted[played] = window.pitchToMidi(played) === window.pitchToMidi(current?.pitch) ? 'correct' : 'incorrect';
  }

  return (
    <div className="pane wide practice-pane">
      <div className="practice-hud">
        <div>
          <div className="hud-exercise">
            Sight-reading · {clef === 'grand' ? 'grand staff' : clef + ' clef'}
          </div>
          <div className="hud-counter">
            {isDone
              ? `${correct} of ${notes.length} correct`
              : `Note ${playheadIdx + 1} of ${notes.length} · ${correct}/${attempted} correct`}
          </div>
        </div>
        <div className="hud-right">
          <div className="clef-toggle">
            {['grand','treble','bass'].map(c => (
              <button key={c}
                className={'clef-btn' + (clef === c ? ' active' : '')}
                onClick={() => changeClef(c)}>
                {c === 'grand' ? 'Grand' : c === 'treble' ? '𝄞 Treble' : '𝄢 Bass'}
              </button>
            ))}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)', userSelect: 'none' }}>
            <div className={'toggle' + (accidentals ? ' on' : '')} onClick={toggleAccidentals} />
            ♯♭
          </label>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <GrandStaff notes={notes} playheadIndex={playheadIdx} clef={clef} width={760} narrow={narrow} showPlayhead={showHint} />
        <button
          className={'hint-toggle' + (showHint ? ' on' : '')}
          onClick={() => setShowHint(h => !h)}
          title={showHint ? 'Hide hint' : 'Show hint'}
        >
          {showHint ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      </div>

      <div className="practice-prompt">
        {isDone ? (
          <>
            {correct} of {notes.length} correct.
            {correct === notes.length
              ? <span className="mono" style={{ color: 'var(--consonance)' }}> Perfect.</span>
              : <span className="mono"> {notes.length - correct} incorrect.</span>}
          </>
        ) : null}
      </div>

      {(() => {
        // Underlying range matches the clef's full 2-octave staff range so all
        // prompts are reachable. On mobile the visible window stays at 1 octave
        // (pan to scroll); on desktop the full 2 octaves fit at once.
        const kb =
          clef === 'treble' ? { lo: 60, hi: 84,
                                visibleSemi: narrow ? 12 : 24,
                                defaultLeftC: 60 } :
          clef === 'bass'   ? { lo: 36, hi: 60,
                                visibleSemi: narrow ? 12 : 24,
                                defaultLeftC: narrow ? 48 : 36 } :
                              { lo: 36, hi: 84,
                                visibleSemi: narrow ? 12 : 48,
                                defaultLeftC: narrow ? 60 : 36 };
        return (
          <PannableKeyboard
            {...kb}
            highlighted={highlighted}
            focusMidis={current ? [window.nameToMidi(current.pitch)].filter(m => m != null) : []}
            onKey={onKey}
            autoCenterMode="prompt"
            mapVariant="full"
          />
        );
      })()}

      <div className="practice-actions">
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)', userSelect: 'none' }}>
          <div className={'toggle' + (muted ? ' on' : '')} onClick={() => { const v = !muted; setMuted(v); window.setMuted(v); }} />
          Mute
        </label>
        <div className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={reset}>New passage</button>
      </div>
    </div>
  );
}

/* ---------- Devices — MIDI ---------- */
function DevicesView({ midiConnected, midiDeviceName }) {
  return (
    <div className="pane">
      <PaneHeader
        eyebrow="Input"
        title="Devices"
        sub="Connect a USB or Bluetooth MIDI keyboard. Note input is evaluated identically whether it comes from a physical key or an on-screen tap."
      />

      <div className="device-panel">
        <div className="device-row">
          <div className="device-info">
            <div className={'device-name ' + (midiConnected ? 'connected' : 'disconnected')}>
              <span className="device-dot" />
              {midiConnected ? (midiDeviceName || 'MIDI device') : 'No MIDI device connected'}
            </div>
            <div className="device-sub mono">
              {midiConnected ? 'USB · Channel 1 · plug and play' : 'Plug in a USB keyboard or enable Bluetooth MIDI'}
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, marginTop: 36, marginBottom: 8 }}>
        Permissions
      </h3>
      <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--fg-muted)', margin: '0 0 16px', fontSize: 14 }}>
        Fermata uses the Web MIDI API. The first time you connect a device, your browser will ask for permission.
      </p>
      <div className="perm-row">
        <div className="perm-label">Web MIDI access</div>
        <div className="perm-status granted mono">GRANTED</div>
      </div>
      <div className="perm-row">
        <div className="perm-label">Audio output</div>
        <div className="perm-status granted mono">GRANTED</div>
      </div>

      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, marginTop: 36, marginBottom: 8 }}>
        Troubleshooting
      </h3>
      <ul className="tshoot">
        <li>If your device is connected but not detected, unplug and reconnect it, then press <em>Scan</em>.</li>
        <li>On Chrome, MIDI is supported on the desktop app only. Mobile Chrome does not expose Web MIDI.</li>
        <li>Bluetooth MIDI requires macOS or Android. On Windows, use a USB connection.</li>
      </ul>

      <hr style={{ margin: '32px 0', border: 0, borderTop: '1px solid var(--paper-3)' }} />
      <MicSettings />
    </div>
  );
}

/* ---------- Mic settings block (used inside DevicesView) ---------- */
function MicSettings() {
  const [state, setState] = React.useState(() => window.micStore.getState());
  React.useEffect(() => window.micStore.subscribe(setState), []);

  const onToggle = () => {
    if (state.enabled) window.fermataMic.disable();
    else window.fermataMic.enable();
  };

  const statusLabel =
    state.status === 'error'   ? (state.error || 'Microphone error') :
    state.status === 'loading' ? 'Loading detector…' :
    state.enabled              ? 'Listening' :
                                 'Off';

  return (
    <>
      <PaneHeader
        eyebrow="Devices"
        title="Microphone"
        sub="Optional. Use any unplugged piano — the app listens via your computer's microphone and matches detected pitches against the on-screen prompt."
      />
      <div className="device-panel">
        <div className="device-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div className="device-info">
            <div className={'device-name ' + (state.enabled ? 'connected' : 'disconnected')}>
              <span className="device-dot" />
              {state.enabled ? 'Microphone listening' : 'Microphone off'}
            </div>
            <div className="device-sub mono">{statusLabel}</div>
          </div>
          <button className={'btn btn-sm ' + (state.enabled ? 'btn-primary' : '')}
                  onClick={onToggle}>
            {state.enabled ? 'Turn off' : 'Turn on'}
          </button>
        </div>
      </div>

      <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--fg-muted)', margin: '16px 0 0', fontSize: 14 }}>
        Audio stays on your device — Fermata does not record or upload anything. The browser will ask for permission the first time you turn the mic on.
      </p>

      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, marginTop: 36, marginBottom: 8 }}>
        Notes
      </h3>
      <ul className="tshoot">
        <li>Requires HTTPS (or <code>localhost</code>) — modern browsers block <code>getUserMedia</code> over plain HTTP.</li>
        <li>Single-note matching uses on-device pitch detection (YIN) and runs continuously while the mic is on.</li>
        <li>Chord validation downloads a small machine-learning model the first time you use it in the Chords view.</li>
        <li>If permission is denied, click the lock icon in your address bar → Permissions → Microphone → Allow, then reload.</li>
      </ul>
    </>
  );
}

/* ---------- Settings ---------- */
function SettingsView() {
  const [sound, setSound] = React.useState(true);
  const namingMode = window.useNamingMode();
  const solfege = namingMode === 'solfege';
  const [showHints, setShowHints] = React.useState(true);
  const [strict, setStrict] = React.useState(false);

  return (
    <div className="pane">
      <PaneHeader eyebrow="Preferences" title="Settings" sub="Adjust display, note names, and evaluation strictness." />

      <div className="settings-section">
        <h3>Display</h3>
        <p>How the staff and keyboard render.</p>
        <div className="setting-row">
          <div className="label">Note names</div>
          <div className="help">Use Do-Ré-Mi (solfège) instead of C-D-E. Affects keyboard labels and prompts.</div>
          <div className="control"><div className={'toggle' + (solfege ? ' on' : '')} onClick={() => window.namingStore.setMode(solfege ? 'english' : 'solfege')} /></div>
        </div>
        <div className="setting-row">
          <div className="label">Show note labels</div>
          <div className="help">Label each C on the on-screen keyboard.</div>
          <div className="control"><div className={'toggle' + (showHints ? ' on' : '')} onClick={() => setShowHints(v => !v)} /></div>
        </div>
        <div className="setting-row">
          <div className="label">Default clef</div>
          <div className="help">What the Practice view opens to.</div>
          <div className="control">
            <select defaultValue="grand">
              <option value="grand">Grand staff</option>
              <option value="treble">Treble only</option>
              <option value="bass">Bass only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Evaluation</h3>
        <p>How Fermata grades your playing.</p>
        <div className="setting-row">
          <div className="label">Strict mode</div>
          <div className="help">Incorrect notes block advancement until the right note is played.</div>
          <div className="control"><div className={'toggle' + (strict ? ' on' : '')} onClick={() => setStrict(v => !v)} /></div>
        </div>
        <div className="setting-row">
          <div className="label">Timing</div>
          <div className="help">Ignored by default. Turn on to also evaluate tempo against a metronome.</div>
          <div className="control">
            <select defaultValue="off">
              <option value="off">Off</option>
              <option value="loose">Loose</option>
              <option value="strict">Strict</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Audio</h3>
        <p>Sampled piano, metronome.</p>
        <div className="setting-row">
          <div className="label">Sound on</div>
          <div className="help">Plays a sampled piano when notes are played.</div>
          <div className="control"><div className={'toggle' + (sound ? ' on' : '')} onClick={() => setSound(v => !v)} /></div>
        </div>
        <div className="setting-row">
          <div className="label">Metronome</div>
          <div className="help">Audible pulse. Tempo in BPM.</div>
          <div className="control"><input type="number" defaultValue={72} style={{ width: 100 }} /></div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Help & legend ---------- */
function HelpView() {
  window.useNamingMode();
  const fmt = window.formatNoteName;
  return (
    <div className="pane help-pane">
      <PaneHeader
        eyebrow="Reference"
        title="Help & legend"
        sub="How the sections work and what the notation means."
      />

      <h3 className="help-h">How the sections work</h3>

      <div className="help-block">
        <div className="help-block-title">Sight-reading</div>
        <p>Read the note on the staff, then play it on the keyboard (on-screen or via MIDI). Pick a clef — Grand, Treble, or Bass — and toggle ♯♭ to include accidentals. The playhead advances when your note is correct.</p>
      </div>

      <div className="help-block">
        <div className="help-block-title">Chords</div>
        <p>Play the named chord by selecting its notes on the keyboard (any octave) and pressing <em>Check</em>. Pick a tier (1–6) to set difficulty; the <span className="help-inline-btn">?</span> next to the tier buttons explains each level. The <span className="help-inline-btn">?</span> next to the chord name opens a hint for that specific chord. Slash chords (e.g., <span className="mono">{fmt('C/E')}</span>) require the bass note to be the lowest pitch you play.</p>
      </div>

      <div className="help-block">
        <div className="help-block-title">Devices</div>
        <p>Connection status and troubleshooting for your MIDI keyboard. Input is treated identically whether you tap on screen or play a physical key.</p>
      </div>

      <div className="help-block">
        <div className="help-block-title">Settings</div>
        <p>Display, note names, and evaluation strictness.</p>
      </div>

      <h3 className="help-h">Chord quality symbols</h3>
      <p className="help-lead">Shown as a suffix after the root note — e.g., <span className="mono">C</span>, <span className="mono">Cm</span>, <span className="mono">Cmaj7</span>.</p>
      <div className="legend-grid">
        {[
          ['(none)', 'major',                  'C'],
          ['m',      'minor',                  'Cm'],
          ['°',      'diminished',             'C°'],
          ['+',      'augmented',              'C+'],
          ['maj7',   'major seventh',          'Cmaj7'],
          ['m7',     'minor seventh',          'Cm7'],
          ['7',      'dominant seventh',       'C7'],
          ['m7♭5',   'half-diminished',        'Cm7♭5'],
          ['°7',     'fully diminished 7',     'C°7'],
          ['sus2',   'suspended 2nd',          'Csus2'],
          ['sus4',   'suspended 4th',          'Csus4'],
          ['add9',   'added 9th',              'Cadd9'],
          ['6',      'major sixth',            'C6'],
          ['m6',     'minor sixth',            'Cm6'],
          ['9',      'dominant ninth',         'C9'],
          ['maj9',   'major ninth',            'Cmaj9'],
          ['m9',     'minor ninth',            'Cm9'],
          ['11',     'eleventh',               'C11'],
          ['13',     'thirteenth',             'C13'],
        ].map(([sym, name, ex], i) => (
          <div className="legend-row" key={i}>
            <span className="legend-sym mono">{sym}</span>
            <span className="legend-name">{name}</span>
            <span className="legend-ex mono">{fmt(ex)}</span>
          </div>
        ))}
      </div>

      <h3 className="help-h">Other notation</h3>
      <div className="legend-grid">
        <div className="legend-row">
          <span className="legend-sym mono">X/Y</span>
          <span className="legend-name">slash chord — chord X with Y as the lowest note</span>
          <span className="legend-ex mono">{fmt('C/E')}</span>
        </div>
        <div className="legend-row">
          <span className="legend-sym mono">♯</span>
          <span className="legend-name">sharp — raised a semitone</span>
          <span className="legend-ex mono">{fmt('F♯')}</span>
        </div>
        <div className="legend-row">
          <span className="legend-sym mono">♭</span>
          <span className="legend-name">flat — lowered a semitone</span>
          <span className="legend-ex mono">{fmt('B♭')}</span>
        </div>
      </div>

      <h3 className="help-h">Keyboard highlights</h3>
      <div className="legend-grid">
        <div className="legend-row">
          <span className="legend-swatch swatch-selected" />
          <span className="legend-name"><strong>Selected</strong> — a key you picked for the current chord</span>
          <span />
        </div>
        <div className="legend-row">
          <span className="legend-swatch swatch-active" />
          <span className="legend-name"><strong>Target / hint</strong> — note the app is asking for, or revealing as a hint</span>
          <span />
        </div>
        <div className="legend-row">
          <span className="legend-swatch swatch-correct" />
          <span className="legend-name"><strong>Correct</strong> — your note matches the target</span>
          <span />
        </div>
        <div className="legend-row">
          <span className="legend-swatch swatch-incorrect" />
          <span className="legend-name"><strong>Incorrect</strong> — your note does not belong to the chord</span>
          <span />
        </div>
        <div className="legend-row">
          <span className="legend-swatch swatch-missing" />
          <span className="legend-name"><strong>Missing</strong> — a tone from the chord you did not play</span>
          <span />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PracticeView, DevicesView, SettingsView, HelpView, PaneHeader });
