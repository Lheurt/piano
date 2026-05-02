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

const PRACTICE_TIER_KEY = 'fermata.practice.tier';
const PRACTICE_DEFAULT_TIER = 3;

function loadPracticeTier() {
  if (typeof localStorage === 'undefined') return PRACTICE_DEFAULT_TIER;
  const raw = localStorage.getItem(PRACTICE_TIER_KEY);
  const n = parseInt(raw, 10);
  return (n >= 1 && n <= 4) ? n : PRACTICE_DEFAULT_TIER;
}

function PracticeTierInfoPanel({ onClose }) {
  const t = window.t;
  return (
    <div className="tier-info-panel">
      <button className="tier-info-close" onClick={onClose} aria-label={t('practice.tier_info.close')}>×</button>
      <div className="tier-info-head">{t('practice.tier_info.title')}</div>
      <div className="tier-info-body">
        {[1, 2, 3, 4].map(n => (
          <div className="tier-info-row" key={n}>
            <span className="tier-info-num">{n}</span>
            <div className="tier-info-text">
              <div className="tier-info-title">{t('practice.tier.' + n + '.title')}</div>
              <div className="tier-info-body-text">{t('practice.tier.' + n + '.body')}</div>
            </div>
          </div>
        ))}
        <div className="tier-info-note">{t('practice.tier_info.note')}</div>
      </div>
    </div>
  );
}

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
  const t = window.t;
  const narrow = useNarrow();
  const [clef, setClef] = React.useState('grand');
  const [tier, setTier] = React.useState(loadPracticeTier);
  const [showTierInfo, setShowTierInfo] = React.useState(false);
  const [notes, setNotes] = React.useState(() => window.makePassage('grand', 8, loadPracticeTier()));
  const [playheadIdx, setPlayheadIdx] = React.useState(0);
  const [played, setPlayed] = React.useState(null);
  const [showHint, setShowHint] = React.useState(false);
  const [muted, setMuted] = React.useState(false);

  React.useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PRACTICE_TIER_KEY, String(tier));
    }
  }, [tier]);

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
    setNotes(window.makePassage(c, 8, tier));
    setPlayheadIdx(0);
    setPlayed(null);
  };

  const changeTier = (n) => {
    setTier(n);
    setNotes(window.makePassage(clef, 8, n));
    setPlayheadIdx(0);
    setPlayed(null);
  };

  const reset = () => {
    setNotes(window.makePassage(clef, 8, tier));
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
            {t('practice.exercise', { clef: t('clef.' + clef) })}
          </div>
          <div className="hud-counter">
            {isDone
              ? t('practice.counter_done', { correct, total: notes.length })
              : t('practice.counter', { n: playheadIdx + 1, total: notes.length, correct, attempted })}
          </div>
        </div>
        <div className="hud-right">
          <div className="clef-toggle">
            {['grand','treble','bass'].map(c => (
              <button key={c}
                className={'clef-btn' + (clef === c ? ' active' : '')}
                onClick={() => changeClef(c)}>
                {t('clef.btn.' + c)}
              </button>
            ))}
          </div>
          <span className="tier-label">{t('practice.tier_label')}</span>
          <button
            className={'tier-info-btn' + (showTierInfo ? ' on' : '')}
            onClick={() => setShowTierInfo(v => !v)}
            aria-label={t('practice.tier_about')}
            title={t('practice.tier_about')}
          >?</button>
          <div className="clef-toggle">
            {[1, 2, 3, 4].map(n => (
              <button key={n}
                className={'clef-btn' + (tier === n ? ' active' : '')}
                onClick={() => changeTier(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showTierInfo && <PracticeTierInfoPanel onClose={() => setShowTierInfo(false)} />}

      <div style={{ position: 'relative' }}>
        <GrandStaff notes={notes} playheadIndex={playheadIdx} clef={clef} width={760} narrow={narrow} showPlayhead={showHint} />
        <button
          className={'hint-toggle' + (showHint ? ' on' : '')}
          onClick={() => setShowHint(h => !h)}
          title={showHint ? t('practice.hint.hide') : t('practice.hint.show')}
        >
          {showHint ? <EyeIcon /> : <EyeOffIcon />}
        </button>
      </div>

      <div className="practice-prompt">
        {isDone ? (
          <>
            {t('practice.prompt_done', { correct, total: notes.length })}
            {correct === notes.length
              ? <span className="mono" style={{ color: 'var(--consonance)' }}> {t('practice.prompt_perfect')}</span>
              : <span className="mono"> {window.tn('practice.prompt_incorrect.one', 'practice.prompt_incorrect.other', notes.length - correct)}</span>}
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
        // On desktop, keep per-key width constant across clefs: grand shows 29
        // whites across the full pane; single-clef shows 15. Constrain the
        // single-clef keyboard to 15/29 of the pane and center it so its keys
        // match grand-mode width instead of stretching.
        const constrain = !narrow && clef !== 'grand';
        const wrapStyle = constrain
          ? { maxWidth: 'calc(100% * 15 / 29)', margin: '0 auto' }
          : undefined;
        return (
          <div style={wrapStyle}>
            <PannableKeyboard
              {...kb}
              highlighted={highlighted}
              focusMidis={current ? [window.nameToMidi(current.pitch)].filter(m => m != null) : []}
              onKey={onKey}
              autoCenterMode="prompt"
              mapVariant="full"
            />
          </div>
        );
      })()}

      <div className="practice-actions">
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--fg-muted)', userSelect: 'none' }}>
          <div className={'toggle' + (muted ? ' on' : '')} onClick={() => { const v = !muted; setMuted(v); window.setMuted(v); }} />
          {t('practice.action.mute')}
        </label>
        <div className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={reset}>{t('practice.action.new')}</button>
      </div>
    </div>
  );
}

/* ---------- Devices — MIDI ---------- */
function DevicesView({ midiConnected, midiDeviceName }) {
  const t = window.t;
  // Split tshoot.1 around the {scan} placeholder so the scan label can be
  // rendered as <em> while the surrounding sentence stays translatable.
  const tshoot1 = window.t('devices.tshoot.1').split('{scan}');
  return (
    <div className="pane">
      <PaneHeader
        eyebrow={t('devices.eyebrow')}
        title={t('devices.title')}
        sub={t('devices.sub')}
      />

      <div className="device-panel">
        <div className="device-row">
          <div className="device-info">
            <div className={'device-name ' + (midiConnected ? 'connected' : 'disconnected')}>
              <span className="device-dot" />
              {midiConnected ? (midiDeviceName || t('shell.midi_device')) : t('devices.midi_disconnected')}
            </div>
            <div className="device-sub mono">
              {midiConnected ? t('devices.midi_connected_sub') : t('devices.midi_disconnected_sub')}
            </div>
          </div>
        </div>
      </div>

      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, marginTop: 36, marginBottom: 8 }}>
        {t('devices.permissions')}
      </h3>
      <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--fg-muted)', margin: '0 0 16px', fontSize: 14 }}>
        {t('devices.permissions_lead')}
      </p>
      <div className="perm-row">
        <div className="perm-label">{t('devices.perm.web_midi')}</div>
        <div className="perm-status granted mono">{t('devices.perm.granted')}</div>
      </div>
      <div className="perm-row">
        <div className="perm-label">{t('devices.perm.audio')}</div>
        <div className="perm-status granted mono">{t('devices.perm.granted')}</div>
      </div>

      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, marginTop: 36, marginBottom: 8 }}>
        {t('devices.troubleshooting')}
      </h3>
      <ul className="tshoot">
        <li>{tshoot1[0]}<em>{t('devices.tshoot.scan')}</em>{tshoot1[1]}</li>
        <li>{t('devices.tshoot.2')}</li>
        <li>{t('devices.tshoot.3')}</li>
      </ul>

      <hr style={{ margin: '32px 0', border: 0, borderTop: '1px solid var(--paper-3)' }} />
      <MicSettings />
    </div>
  );
}

/* ---------- Mic settings block (used inside DevicesView) ---------- */
function MicSettings() {
  const t = window.t;
  const [state, setState] = React.useState(() => window.micStore.getState());
  React.useEffect(() => window.micStore.subscribe(setState), []);

  const onToggle = () => {
    if (state.enabled) window.fermataMic.disable();
    else window.fermataMic.enable();
  };

  const statusLabel =
    state.status === 'error'   ? (state.error || t('mic.status.error')) :
    state.status === 'loading' ? t('mic.status.loading') :
    state.enabled              ? t('mic.status.listening') :
                                 t('mic.status.off');

  // mic.notes.1 contains {localhost} and {gum} placeholders rendered as <code>.
  const notes1 = t('mic.notes.1').split(/\{localhost\}|\{gum\}/);
  return (
    <>
      <PaneHeader
        eyebrow={t('mic.eyebrow')}
        title={t('mic.title')}
        sub={t('mic.sub')}
      />
      <div className="device-panel">
        <div className="device-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div className="device-info">
            <div className={'device-name ' + (state.enabled ? 'connected' : 'disconnected')}>
              <span className="device-dot" />
              {state.enabled ? t('mic.listening') : t('mic.off')}
            </div>
            <div className="device-sub mono">{statusLabel}</div>
          </div>
          <button className={'btn btn-sm ' + (state.enabled ? 'btn-primary' : '')}
                  onClick={onToggle}>
            {state.enabled ? t('mic.btn.off') : t('mic.btn.on')}
          </button>
        </div>
      </div>

      <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--fg-muted)', margin: '16px 0 0', fontSize: 14 }}>
        {t('mic.privacy')}
      </p>

      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, marginTop: 36, marginBottom: 8 }}>
        {t('mic.notes_header')}
      </h3>
      <ul className="tshoot">
        <li>{notes1[0]}<code>localhost</code>{notes1[1]}<code>getUserMedia</code>{notes1[2]}</li>
        <li>{t('mic.notes.2')}</li>
        <li>{t('mic.notes.3')}</li>
        <li>{t('mic.notes.4')}</li>
      </ul>
    </>
  );
}

/* ---------- Settings ---------- */
function SettingsView() {
  const t = window.t;
  const [sound, setSound] = React.useState(true);
  const namingMode = window.useNamingMode();
  const solfege = namingMode === 'solfege';
  const locale = window.useLocale();
  const [showHints, setShowHints] = React.useState(true);
  const [strict, setStrict] = React.useState(false);

  return (
    <div className="pane">
      <PaneHeader eyebrow={t('settings.eyebrow')} title={t('settings.title')} sub={t('settings.sub')} />

      <div className="settings-section">
        <h3>{t('settings.section.display')}</h3>
        <p>{t('settings.section.display.sub')}</p>
        <div className="setting-row">
          <div className="label">{t('settings.row.language')}</div>
          <div className="help">{t('settings.row.language.help')}</div>
          <div className="control">
            <select value={locale} onChange={(e) => window.i18n.setLocale(e.target.value)}>
              {window.LOCALES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="setting-row">
          <div className="label">{t('settings.row.note_names')}</div>
          <div className="help">{t('settings.row.note_names.help')}</div>
          <div className="control"><div className={'toggle' + (solfege ? ' on' : '')} onClick={() => window.namingStore.setMode(solfege ? 'english' : 'solfege')} /></div>
        </div>
        <div className="setting-row">
          <div className="label">{t('settings.row.show_labels')}</div>
          <div className="help">{t('settings.row.show_labels.help')}</div>
          <div className="control"><div className={'toggle' + (showHints ? ' on' : '')} onClick={() => setShowHints(v => !v)} /></div>
        </div>
        <div className="setting-row">
          <div className="label">{t('settings.row.default_clef')}</div>
          <div className="help">{t('settings.row.default_clef.help')}</div>
          <div className="control">
            <select defaultValue="grand">
              <option value="grand">{t('clef.opt.grand')}</option>
              <option value="treble">{t('clef.opt.treble')}</option>
              <option value="bass">{t('clef.opt.bass')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>{t('settings.section.evaluation')}</h3>
        <p>{t('settings.section.evaluation.sub')}</p>
        <div className="setting-row">
          <div className="label">{t('settings.row.strict')}</div>
          <div className="help">{t('settings.row.strict.help')}</div>
          <div className="control"><div className={'toggle' + (strict ? ' on' : '')} onClick={() => setStrict(v => !v)} /></div>
        </div>
        <div className="setting-row">
          <div className="label">{t('settings.row.timing')}</div>
          <div className="help">{t('settings.row.timing.help')}</div>
          <div className="control">
            <select defaultValue="off">
              <option value="off">{t('settings.timing.off')}</option>
              <option value="loose">{t('settings.timing.loose')}</option>
              <option value="strict">{t('settings.timing.strict')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>{t('settings.section.audio')}</h3>
        <p>{t('settings.section.audio.sub')}</p>
        <div className="setting-row">
          <div className="label">{t('settings.row.sound')}</div>
          <div className="help">{t('settings.row.sound.help')}</div>
          <div className="control"><div className={'toggle' + (sound ? ' on' : '')} onClick={() => setSound(v => !v)} /></div>
        </div>
        <div className="setting-row">
          <div className="label">{t('settings.row.metronome')}</div>
          <div className="help">{t('settings.row.metronome.help')}</div>
          <div className="control"><input type="number" defaultValue={72} style={{ width: 100 }} /></div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Help & legend ---------- */
function HelpView() {
  window.useNamingMode();
  const t = window.t;
  const fmt = window.formatNoteName;
  const QUALITY_SYMBOLS = ['', 'm', '°', '+', 'maj7', 'm7', '7', 'm7♭5', '°7',
                           'sus2', 'sus4', 'add9', '6', 'm6', '9', 'maj9', 'm9', '11', '13'];
  const qualitiesLead = t('help.qualities.lead').split(/\{ex\d\}/);
  return (
    <div className="pane help-pane">
      <PaneHeader
        eyebrow={t('help.eyebrow')}
        title={t('help.title')}
        sub={t('help.sub')}
      />

      <h3 className="help-h">{t('help.h.how')}</h3>

      <div className="help-block">
        <div className="help-block-title">{t('help.block.sight_reading.title')}</div>
        <p>{t('help.block.sight_reading.body')}</p>
      </div>

      <div className="help-block">
        <div className="help-block-title">{t('help.block.chords.title')}</div>
        <p>
          {t('help.block.chords.body.before')}
          <em>{t('help.block.chords.body.check')}</em>
          {t('help.block.chords.body.middle')}
          <span className="help-inline-btn">{t('help.block.chords.body.q1')}</span>
          {t('help.block.chords.body.middle2')}
          <span className="help-inline-btn">{t('help.block.chords.body.q2')}</span>
          {t('help.block.chords.body.middle3')}
          <span className="mono">{fmt('C/E')}</span>
          {t('help.block.chords.body.after')}
        </p>
      </div>

      <div className="help-block">
        <div className="help-block-title">{t('help.block.devices.title')}</div>
        <p>{t('help.block.devices.body')}</p>
      </div>

      <div className="help-block">
        <div className="help-block-title">{t('help.block.settings.title')}</div>
        <p>{t('help.block.settings.body')}</p>
      </div>

      <h3 className="help-h">{t('help.h.qualities')}</h3>
      <p className="help-lead">
        {qualitiesLead[0]}<span className="mono">{fmt('C')}</span>
        {qualitiesLead[1]}<span className="mono">{fmt('Cm')}</span>
        {qualitiesLead[2]}<span className="mono">{fmt('Cmaj7')}</span>
        {qualitiesLead[3]}
      </p>
      <div className="legend-grid">
        {QUALITY_SYMBOLS.map((sym, i) => (
          <div className="legend-row" key={i}>
            <span className="legend-sym mono">{sym === '' ? '(none)' : sym}</span>
            <span className="legend-name">{t('chord.quality.' + sym + '.label')}</span>
            <span className="legend-ex mono">{fmt('C' + sym)}</span>
          </div>
        ))}
      </div>

      <h3 className="help-h">{t('help.h.other')}</h3>
      <div className="legend-grid">
        <div className="legend-row">
          <span className="legend-sym mono">X/Y</span>
          <span className="legend-name">{t('help.legend.slash')}</span>
          <span className="legend-ex mono">{fmt('C/E')}</span>
        </div>
        <div className="legend-row">
          <span className="legend-sym mono">♯</span>
          <span className="legend-name">{t('help.legend.sharp')}</span>
          <span className="legend-ex mono">{fmt('F♯')}</span>
        </div>
        <div className="legend-row">
          <span className="legend-sym mono">♭</span>
          <span className="legend-name">{t('help.legend.flat')}</span>
          <span className="legend-ex mono">{fmt('B♭')}</span>
        </div>
      </div>

      <h3 className="help-h">{t('help.h.highlights')}</h3>
      <div className="legend-grid">
        {['selected', 'active', 'correct', 'incorrect', 'missing'].map(k => (
          <div className="legend-row" key={k}>
            <span className={'legend-swatch swatch-' + k} />
            <span className="legend-name"><strong>{t('help.highlight.' + k + '.bold')}</strong> — {t('help.highlight.' + k)}</span>
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { PracticeView, DevicesView, SettingsView, HelpView, PaneHeader });
