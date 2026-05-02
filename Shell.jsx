// Shell.jsx — app chrome: header + side nav

function Header({ midiConnected, midiDeviceName }) {
  const t = window.t;
  return (
    <header className="shell-header">
      <div className="wm">Fermata<span className="dot">.</span></div>
      <div className="header-meta">
        <span>{t('shell.tagline')}</span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        <MicButton />
        <div className={'device ' + (midiConnected ? 'connected' : 'disconnected')}>
          <span className="device-dot" />
          {midiConnected ? (midiDeviceName || t('shell.midi_device')) : t('shell.no_midi_device')}
        </div>
      </div>
    </header>
  );
}

function MicButton() {
  const [state, setState] = React.useState(() => window.micStore.getState());
  React.useEffect(() => window.micStore.subscribe(setState), []);

  const onClick = () => {
    if (state.enabled) window.fermataMic.disable();
    else window.fermataMic.enable();
  };

  const cls =
    state.status === 'error' ? 'mic-btn error' :
    state.enabled            ? 'mic-btn on' :
                               'mic-btn';

  // VU line scales x to [0, 1] of the button width. RMS rarely exceeds 0.3
  // in practice; clamp + amplify for visibility.
  const vu = Math.min(1, state.level * 4);

  const t = window.t;
  return (
    <button className={cls} onClick={onClick}
            title={state.status === 'error' ? (state.error || t('mic.tooltip_error')) :
                   state.enabled ? t('mic.tooltip_on') :
                                   t('mic.tooltip_off')}>
      <span className="mic-btn-icon">●</span>
      <span>{t('mic.label')}</span>
      {state.enabled && (
        <span className="mic-btn-vu" style={{ transform: `scaleX(${vu})` }} />
      )}
    </button>
  );
}

function SideNav({ view, setView }) {
  const t = window.t;
  const items = [
    { group: t('nav.group.study'), entries: [
      { id: 'practice', label: t('nav.practice') },
      { id: 'chords',   label: t('nav.chords') },
    ]},
    { group: t('nav.group.setup'), entries: [
      { id: 'devices',  label: t('nav.devices') },
      { id: 'settings', label: t('nav.settings') },
    ]},
    { group: t('nav.group.reference'), entries: [
      { id: 'help',     label: t('nav.help') },
    ]},
  ];
  return (
    <nav className="shell-nav">
      {items.map(g => (
        <div key={g.group} className="nav-group">
          <div className="nav-group-title">{g.group}</div>
          {g.entries.map(e => (
            <div
              key={e.id}
              className={'nav-item' + (view === e.id ? ' active' : '')}
              onClick={() => setView(e.id)}
            >
              <span>{e.label}</span>
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}

window.Header = Header;
window.MicButton = MicButton;
window.SideNav = SideNav;
