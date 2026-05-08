// NoteNameView.jsx — staff → letter flashcard drill.
//   Prompt: NoteFlash (single notehead on staff).
//   Answer bar: 7 letter buttons C..B. Tap matches by letter alone.
//   Wrong tap: red flash, prompt stays. Right tap: green flash, advance.
//   Stats: first-try correct over completed prompts. No persistence.

const NOTENAME_TIER_KEY = 'fermata.notename.tier';
const NOTENAME_CLEF_KEY = 'fermata.notename.clef';

function loadNotenameTier() {
  if (typeof localStorage === 'undefined') return 1;
  const v = parseInt(localStorage.getItem(NOTENAME_TIER_KEY), 10);
  return (v >= 1 && v <= 3) ? v : 1;
}
function saveNotenameTier(v) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(NOTENAME_TIER_KEY, String(v));
}
function loadNotenameClef() {
  if (typeof localStorage === 'undefined') return 'treble';
  const v = localStorage.getItem(NOTENAME_CLEF_KEY);
  return v === 'bass' ? 'bass' : 'treble';
}
function saveNotenameClef(v) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(NOTENAME_CLEF_KEY, v);
}

// Letters in Do-Re-Mi order. Solfège mapping happens at render via formatNoteName.
const LETTERS_C_TO_B = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

function NoteNameTierInfoPanel({ onClose }) {
  const t = window.t;
  return (
    <div className="tier-info-panel">
      <button className="tier-info-close" onClick={onClose} aria-label={t('notename.tier_info.close')}>×</button>
      <div className="tier-info-head">{t('notename.tier_info.title')}</div>
      <div className="tier-info-body">
        {[1, 2, 3].map(n => (
          <div className="tier-info-row" key={n}>
            <span className="tier-info-num">{n}</span>
            <div className="tier-info-text">
              <div className="tier-info-title">{t('notename.tier.' + n + '.title')}</div>
              <div className="tier-info-body-text">{t('notename.tier.' + n + '.body')}</div>
            </div>
          </div>
        ))}
        <div className="tier-info-note">{t('notename.tier_info.note')}</div>
      </div>
    </div>
  );
}

function NoteNameView() {
  window.useNamingMode();   // re-render when English ↔ Solfège toggles
  const t = window.t;

  const [tier, setTier] = React.useState(loadNotenameTier);
  const [clef, setClef] = React.useState(loadNotenameClef);
  const [current, setCurrent] = React.useState(() =>
    window.makeNoteFlash(loadNotenameTier(), loadNotenameClef())
  );
  const [correct, setCorrect] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [missed, setMissed] = React.useState(false);
  const [feedback, setFeedback] = React.useState(null);  // { kind, letter } | null
  const [showTierInfo, setShowTierInfo] = React.useState(false);

  const changeTier = (n) => {
    setTier(n);
    saveNotenameTier(n);
    setCurrent(window.makeNoteFlash(n, clef));
    setMissed(false);
    setFeedback(null);
  };

  const changeClef = (c) => {
    setClef(c);
    saveNotenameClef(c);
    setCurrent(window.makeNoteFlash(tier, c));
    setMissed(false);
    setFeedback(null);
  };

  const onLetterTap = (letter) => {
    if (feedback) return;       // ignore taps during the 250ms flash
    if (letter === current.letter) {
      setFeedback({ kind: 'right', letter });
      window.playNote(current.displayPitch);
      setTimeout(() => {
        setTotal(t => t + 1);
        if (!missed) setCorrect(c => c + 1);
        setCurrent(window.makeNoteFlash(tier, clef, current.midi));
        setMissed(false);
        setFeedback(null);
      }, 250);
    } else {
      setMissed(true);
      setFeedback({ kind: 'wrong', letter });
      setTimeout(() => setFeedback(null), 250);
    }
  };

  const resetStats = () => {
    setCorrect(0);
    setTotal(0);
    setMissed(false);
  };

  const fmt = window.formatNoteName;

  return (
    <div className="pane wide notename-pane">
      <div className="practice-hud">
        <div>
          <div className="hud-exercise">{t('notename.hud.title', { tier })}</div>
          <div className="hud-counter">{t('notename.hud.counter', { correct, total })}</div>
        </div>
        <div className="hud-right">
          <span className="tier-label">{t('notename.tier_label')}</span>
          <button
            className={'tier-info-btn' + (showTierInfo ? ' on' : '')}
            onClick={() => setShowTierInfo(v => !v)}
            aria-label={t('notename.tier_about')}
            title={t('notename.tier_about')}
          >?</button>
          <div className="clef-toggle">
            {[1, 2, 3].map(n => (
              <button key={n}
                className={'clef-btn' + (tier === n ? ' active' : '')}
                onClick={() => changeTier(n)}>
                {n}
              </button>
            ))}
          </div>
          <div className="clef-toggle" style={{ marginLeft: 8 }}>
            <button className={'clef-btn' + (clef === 'treble' ? ' active' : '')}
                    onClick={() => changeClef('treble')}>{t('clef.btn.treble')}</button>
            <button className={'clef-btn' + (clef === 'bass' ? ' active' : '')}
                    onClick={() => changeClef('bass')}>{t('clef.btn.bass')}</button>
          </div>
        </div>
      </div>

      {showTierInfo && <NoteNameTierInfoPanel onClose={() => setShowTierInfo(false)} />}

      <NoteFlash pitch={current.displayPitch} clef={clef} />

      <div className="note-answer-bar">
        {LETTERS_C_TO_B.map(L => {
          const isFlash = feedback && feedback.letter === L;
          const cls = 'note-answer-btn'
            + (isFlash && feedback.kind === 'right' ? ' flash-right' : '')
            + (isFlash && feedback.kind === 'wrong' ? ' flash-wrong' : '');
          return (
            <button key={L} className={cls} onClick={() => onLetterTap(L)}>
              {fmt(L)}
            </button>
          );
        })}
      </div>

      <div className="practice-actions">
        <div className="spacer" />
        <button className="btn btn-secondary btn-sm" onClick={resetStats}
                disabled={total === 0 && correct === 0}>
          {t('notename.action.reset')}
        </button>
      </div>
    </div>
  );
}

window.NoteNameView = NoteNameView;
