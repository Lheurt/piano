// Shell.jsx — app chrome: header + side nav

function Header({ midiConnected, midiDeviceName }) {
  return (
    <header className="shell-header">
      <div className="wm">Fermata<span className="dot">.</span></div>
      <div className="header-meta">
        <span>Sight-reading trainer</span>
      </div>
      <div style={{ marginLeft: 'auto' }} className={'device ' + (midiConnected ? 'connected' : 'disconnected')}>
        <span className="device-dot" />
        {midiConnected ? (midiDeviceName || 'MIDI device') : 'No MIDI device'}
      </div>
    </header>
  );
}

function SideNav({ view, setView }) {
  const items = [
    { group: 'Study', entries: [
      { id: 'practice', label: 'Sight-reading' },
      { id: 'chords',   label: 'Chords' },
    ]},
    { group: 'Setup', entries: [
      { id: 'devices',  label: 'Devices' },
      { id: 'settings', label: 'Settings' },
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
window.SideNav = SideNav;
