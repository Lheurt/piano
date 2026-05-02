// ChordsView.jsx — chord identification practice.

function TierInfoPanel({ onClose }) {
  const t = window.t;
  return (
    <div className="tier-info-panel">
      <button className="tier-info-close" onClick={onClose} aria-label={t('chords.tier_info.close')}>×</button>
      <div className="tier-info-head">{t('chords.tier_info.title')}</div>
      <div className="tier-info-body">
        {[1, 2, 3, 4, 5, 6].map(n => (
          <div className="tier-info-row" key={n}>
            <span className="tier-info-num">{n}</span>
            <div className="tier-info-text">
              <div className="tier-info-title">{t('chords.tier.' + n + '.title')}</div>
              <div className="tier-info-body-text">{t('chords.tier.' + n + '.body')}</div>
            </div>
          </div>
        ))}
        <div className="tier-info-note">{t('chords.tier_info.note')}</div>
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
  window.useNamingMode();
  const t = window.t;
  const e = window.chordExplanation(chord);
  const fmt = window.formatNoteName;
  const qualityLabel = t('chord.quality.' + chord.quality + '.label');
  const prose = t('chord.quality.' + chord.quality + '.prose');
  return (
    <div className="chord-hint-panel">
      <ChordStack root={chord.root} quality={chord.quality} bass={chord.bass} />
      <div className="chord-hint-body">
        <div className="chord-hint-row">
          <span className="chord-hint-label">{t('chord_hint.root')}</span>
          <span className="chord-hint-val">{fmt(e.root)}</span>
        </div>
        <div className="chord-hint-row">
          <span className="chord-hint-label">{t('chord_hint.quality')}</span>
          <span className="chord-hint-val">{qualityLabel} <span className="mono chord-hint-sym">({e.qualitySymbol || t('chord_hint.maj_fallback')})</span></span>
        </div>
        {e.bass && (
          <div className="chord-hint-row">
            <span className="chord-hint-label">{t('chord_hint.inversion')}</span>
            <span className="chord-hint-val">{t('chord_hint.in_the_bass', { tone: fmt(e.bass) })}</span>
          </div>
        )}
        <div className="chord-hint-section-head mono">{t('chord_hint.built_from')}</div>
        <div className="chord-hint-intervals">
          {e.intervals.map((iv, i) => (
            <div className="chord-hint-interval" key={i}>
              <span className="chord-hint-iv-name">{t('chord.interval.' + iv.semitones)}</span>
              <span className="chord-hint-iv-semis mono">+{iv.semitones}</span>
              <span className="chord-hint-iv-tone">{fmt(iv.tone)}</span>
            </div>
          ))}
        </div>
        <div className="chord-hint-prose">{prose}</div>
      </div>
    </div>
  );
}

function ChordsView() {
  window.useNamingMode();
  const t = window.t;
  const [narrow, setNarrow] = React.useState(() => window.innerWidth < 900);
  React.useEffect(() => {
    const onR = () => setNarrow(window.innerWidth < 900);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  const [tier, setTier] = React.useState(1);
  const [chords, setChords] = React.useState(() => window.makeChordPassage(1, 8));
  const [playheadIdx, setPlayheadIdx] = React.useState(0);
  const [selected, setSelected] = React.useState(() => new Set());
  const [muted, setMuted] = React.useState(false);
  // When truthy, this is the latest validateChord() result; used to render feedback.
  const [feedback, setFeedback] = React.useState(null);
  const [showHint, setShowHint] = React.useState(false);
  const [showTierInfo, setShowTierInfo] = React.useState(false);
  // Transient MIDI for the most recent rejected (wrong-PC) note: lights red
  // briefly then clears. Only used in mic/MIDI sequential mode.
  const [rejected, setRejected] = React.useState(null);
  const [micEnabled, setMicEnabled] = React.useState(() =>
    !!(window.micStore && window.micStore.getState().enabled)
  );
  React.useEffect(() => {
    if (!window.micStore) return;
    return window.micStore.subscribe((s) => setMicEnabled(s.enabled));
  }, []);

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

  // Sequential single-note validation, used when mic (or MIDI) drives input.
  // Each note is validated against the current chord on arrival:
  //   - PC in chord and not already played → add to selected (lights green)
  //   - PC in chord but already played → no-op (octave duplicate)
  //   - PC not in chord → flash red briefly, do NOT add
  // When all required PCs are present, validate the whole chord and advance.
  const sequentialNote = (midi) => {
    if (isDone || feedback) return;
    if (!current) return;

    const pc = ((midi % 12) + 12) % 12;
    const required = current.pitchClasses;

    if (required.indexOf(pc) === -1) {
      setRejected(midi);
      setTimeout(() => setRejected((r) => (r === midi ? null : r)), 350);
      return;
    }

    let pcAlreadyPlayed = false;
    selected.forEach((m) => {
      if (((m % 12) + 12) % 12 === pc) pcAlreadyPlayed = true;
    });
    if (pcAlreadyPlayed) return;

    const next = new Set(selected);
    next.add(midi);
    setSelected(next);

    const playedPcs = new Set();
    next.forEach((m) => playedPcs.add(((m % 12) + 12) % 12));
    const allCovered = required.every((p) => playedPcs.has(p));
    if (!allCovered) return;

    // All required pitch classes are present — run the full validator (which
    // also checks bass-note correctness for inversions) and advance.
    const result = window.validateChord(next, current);
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

  // Manual click flow (mic off): toggle selection; user hits Check.
  // Sequential flow (mic on): every input — click, MIDI, mic — runs through
  // sequentialNote so the experience is consistent across input sources.
  const onKey = (pitch) => {
    window.playNote(pitch);
    if (isDone || feedback) return;
    const midi = window.pitchToMidi(pitch);
    if (micEnabled) {
      sequentialNote(midi);
      return;
    }
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

  // Mic input is sequential by definition — bypass the click toggle so a
  // mic-detected note is always validated against the current chord (no
  // synth playback either; the acoustic instrument provides its own).
  const sequentialNoteRef = React.useRef(null);
  sequentialNoteRef.current = sequentialNote;
  React.useEffect(() => {
    if (!window.registerMicCallback) return;
    window.registerMicCallback((_pitch, midi) => {
      if (midi == null) return;
      sequentialNoteRef.current(midi);
    });
    return () => window.registerMicCallback(null);
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
    if (isDone || feedback) return;
    if (selected.size === 0) return;
    playSelection();
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

  // Build the keyboard `highlighted` map.
  //   Mic off, no feedback: selected keys are `selected` (gray) — manual mode.
  //   Mic on, no feedback:  selected keys are `correct` (green) since each
  //                          one was already validated as it came in. The
  //                          most recently rejected note (if any) shows
  //                          `incorrect` (red) for ~350 ms.
  //   During feedback (chord-complete): correct/incorrect/missing as before.
  const highlighted = {};
  if (!feedback) {
    const idleStyle = micEnabled ? 'correct' : 'selected';
    selected.forEach(midi => {
      highlighted[window.midiToName(midi)] = idleStyle;
    });
    if (rejected != null) {
      highlighted[window.midiToName(rejected)] = 'incorrect';
    }
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
          <div className="hud-exercise">{t('chords.hud.title', { tier })}</div>
          <div className="hud-counter">
            {isDone
              ? t('chords.hud.counter_done', { correct, total: chords.length })
              : t('chords.hud.counter', { n: playheadIdx + 1, total: chords.length, correct, attempted })}
          </div>
        </div>
        <div className="hud-right">
          <span className="tier-label">{t('chords.tier_label')}</span>
          <button
            className={'tier-info-btn' + (showTierInfo ? ' on' : '')}
            onClick={() => setShowTierInfo(v => !v)}
            aria-label={t('chords.tier_about')}
            title={t('chords.tier_about')}
          >?</button>
          <div className="clef-toggle">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <button key={n}
                className={'clef-btn' + (tier === n ? ' active' : '')}
                onClick={() => changeTier(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showTierInfo && <TierInfoPanel onClose={() => setShowTierInfo(false)} />}

      <div className={'chord-prompt' + (feedback && feedback.ok ? ' correct' : '')}>
        {isDone ? (
          <span className="chord-prompt-done mono">
            {t('chords.hud.counter_done', { correct, total: chords.length })}
          </span>
        ) : (
          <>
            <span className="chord-prompt-name">{window.formatNoteName(current.displayName)}</span>
            <button
              className={'explain-link' + (showHint ? ' on' : '')}
              onClick={() => setShowHint(h => !h)}
            >
              {showHint ? t('chords.explain.hide') : t('chords.explain.show')}
            </button>
          </>
        )}
        {feedback && feedback.ok && <CheckBadge />}
      </div>

      {showHint && !isDone && current && <ChordHintPanel chord={current} />}

      <PannableKeyboard
        lo={36} hi={84}
        defaultLeftC={narrow ? 60 : 36}
        visibleSemi={narrow ? 12 : 48}
        highlighted={highlighted}
        focusMidis={[]}
        onKey={onKey}
        autoCenterMode="prompt"
        mapVariant="full"
      />

      <div className="practice-actions">
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)', userSelect: 'none' }}>
          <div className={'toggle' + (muted ? ' on' : '')} onClick={() => { const v = !muted; setMuted(v); window.setMuted(v); }} />
          {t('practice.action.mute')}
        </label>
        <div className="spacer" />
        <button className="btn btn-secondary btn-sm" onClick={playSelection}  disabled={isDone || !!feedback || selected.size === 0}>{t('chords.action.play')}</button>
        <button className="btn btn-secondary btn-sm" onClick={clearSelection} disabled={isDone || !!feedback}>{t('chords.action.clear')}</button>
        {!micEnabled && (
          <button
            className="btn btn-primary btn-sm"
            onClick={check}
            disabled={isDone || !!feedback || selected.size === 0}
          >
            {t('chords.action.check')}
          </button>
        )}
        <button className="btn btn-secondary btn-sm" onClick={newPassage} disabled={!!feedback}>{t('chords.action.new')}</button>
      </div>
    </div>
  );
}

window.ChordsView = ChordsView;
