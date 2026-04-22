// ChordsView.jsx — chord identification practice.

const TIER_DESCRIPTIONS = [
  { tier: 1, title: 'Major & minor triads',   body: 'Roots: C, D, E, F, G, A, B (white keys). Qualities: major and minor.' },
  { tier: 2, title: 'Diminished & augmented', body: 'Adds ° (diminished) and + (augmented) triads. All 12 roots, including sharps and flats.' },
  { tier: 3, title: 'Seventh chords',         body: 'Adds maj7, m7, 7 (dominant), m7♭5 (half-diminished), and °7 (fully diminished).' },
  { tier: 4, title: 'Suspensions & colorations', body: 'Adds sus2, sus4, add9, 6, and m6.' },
  { tier: 5, title: 'Inversions',             body: 'Same qualities as tier 4, but ~1/3 of chords now have a non-root bass note (slash chords like C/E).' },
  { tier: 6, title: 'Extended chords',        body: 'Adds 9, maj9, m9, 11, and 13 — chords that reach beyond the octave.' },
];

function TierInfoPanel({ onClose }) {
  return (
    <div className="tier-info-panel">
      <button className="tier-info-close" onClick={onClose} aria-label="Close">×</button>
      <div className="tier-info-head">Difficulty tiers</div>
      <div className="tier-info-body">
        {TIER_DESCRIPTIONS.map(t => (
          <div className="tier-info-row" key={t.tier}>
            <span className="tier-info-num">{t.tier}</span>
            <div className="tier-info-text">
              <div className="tier-info-title">{t.title}</div>
              <div className="tier-info-body-text">{t.body}</div>
            </div>
          </div>
        ))}
        <div className="tier-info-note">Each tier is cumulative — higher tiers include everything from lower tiers.</div>
      </div>
    </div>
  );
}

function CheckBadge() {
  return (
    <svg className="check-badge" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
      <circle className="check-badge-circle" cx="16" cy="16" r="14"
              fill="none" stroke="currentColor" strokeWidth="2.5"
              pathLength="100" strokeDasharray="100" />
      <path className="check-badge-mark" d="M10 16.5 L14.5 21 L23 12"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            pathLength="100" strokeDasharray="100" />
    </svg>
  );
}

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

function ChordsView() {
  const [tier, setTier] = React.useState(1);
  const [chords, setChords] = React.useState(() => window.makeChordPassage(1, 8));
  const [playheadIdx, setPlayheadIdx] = React.useState(0);
  const [selected, setSelected] = React.useState(() => new Set());
  const [muted, setMuted] = React.useState(false);
  // When truthy, this is the latest validateChord() result; used to render feedback.
  const [feedback, setFeedback] = React.useState(null);
  const [showHint, setShowHint] = React.useState(false);
  const [showTierInfo, setShowTierInfo] = React.useState(false);

  const isDone = playheadIdx >= chords.length;
  const current = chords[playheadIdx];
  const correct = chords.filter(c => c.status === 'correct').length;
  const attempted = chords.filter(c => c.status !== 'pending').length;

  const changeTier = (t) => {
    setTier(t);
    setChords(window.makeChordPassage(t, 8));
    setPlayheadIdx(0);
    setSelected(new Set());
    setFeedback(null);
    setShowHint(false);
  };

  const newPassage = () => {
    setChords(window.makeChordPassage(tier, 8));
    setPlayheadIdx(0);
    setSelected(new Set());
    setFeedback(null);
    setShowHint(false);
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
    setShowHint(false);
  };

  const playSelection = () => {
    if (selected.size === 0) return;
    const sorted = Array.from(selected).sort((a, b) => a - b);
    sorted.forEach((midi, i) => {
      setTimeout(() => window.playNote(window.midiToName(midi)), i * 18);
    });
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
        setShowHint(false);
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
          <span className="tier-label">Tier</span>
          <button
            className={'tier-info-btn' + (showTierInfo ? ' on' : '')}
            onClick={() => setShowTierInfo(v => !v)}
            aria-label="About difficulty tiers"
            title="About difficulty tiers"
          >?</button>
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

      {showTierInfo && <TierInfoPanel onClose={() => setShowTierInfo(false)} />}

      <div className={'chord-prompt' + (feedback && feedback.ok ? ' correct' : '')}>
        {isDone ? (
          <span className="chord-prompt-done mono">
            {correct} of {chords.length} correct
          </span>
        ) : (
          <>
            <span className="chord-prompt-name">{current.displayName}</span>
            <button
              className={'explain-link' + (showHint ? ' on' : '')}
              onClick={() => setShowHint(h => !h)}
            >
              {showHint ? 'Hide explanation' : 'Explain this chord'}
            </button>
          </>
        )}
        {feedback && feedback.ok && <CheckBadge />}
      </div>

      {showHint && !isDone && current && <ChordHintPanel chord={current} />}

      <TwoOctaveKeyboard highlighted={highlighted} onKey={onKey} />

      <div className="practice-actions">
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)', userSelect: 'none' }}>
          <div className={'toggle' + (muted ? ' on' : '')} onClick={() => { const v = !muted; setMuted(v); window.setMuted(v); }} />
          Mute
        </label>
        <div className="spacer" />
        <button className="btn btn-secondary btn-sm" onClick={playSelection}  disabled={isDone || !!feedback || selected.size === 0}>▸ Play</button>
        <button className="btn btn-secondary btn-sm" onClick={clearSelection} disabled={isDone || !!feedback}>Clear</button>
        <button className="btn btn-primary btn-sm"   onClick={check}          disabled={isDone || !!feedback || selected.size === 0}>Check</button>
        <button className="btn btn-secondary btn-sm" onClick={newPassage} disabled={!!feedback}>New passage</button>
      </div>
    </div>
  );
}

window.ChordsView = ChordsView;
