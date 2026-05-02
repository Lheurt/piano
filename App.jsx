// App.jsx — root component, responsive shell
function App() {
  window.useLocale();
  window.useNamingMode();
  const [narrow, setNarrow] = React.useState(() => window.innerWidth < 900);
  React.useEffect(() => {
    const onR = () => setNarrow(window.innerWidth < 900);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);

  const [view, setView] = React.useState('practice');
  const [midiConnected, setMidiConnected] = React.useState(false);
  const [midiDeviceName, setMidiDeviceName] = React.useState(null);

  React.useEffect(() => {
    window.initMIDI(
      (name) => { setMidiConnected(true);  setMidiDeviceName(name); },
      ()     => { setMidiConnected(false); setMidiDeviceName(null); }
    );
  }, []);

  const content =
    view === 'practice' ? <PracticeView /> :
    view === 'chords'   ? <ChordsView /> :
    view === 'devices'  ? <DevicesView  midiConnected={midiConnected} midiDeviceName={midiDeviceName} /> :
    view === 'help'     ? <HelpView /> :
                          <SettingsView />;

  if (narrow) {
    return (
      <div className="m-root">
        <div className="m-topbar">
          <div className="m-brand">
            <span className="m-brand-glyph">𝄐</span>
            <span className="m-brand-name">Fermata.</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <MicButton />
            <div className={'device ' + (midiConnected ? 'connected' : 'disconnected')}>
              <span className="device-dot" />
              {midiConnected ? (midiDeviceName || window.t('shell.midi')) : window.t('shell.no_midi')}
            </div>
          </div>
        </div>
        <div className="m-scroll">{content}</div>
        <div className="m-tabbar">
          {[
            { id: 'practice', label: window.t('m_tab.practice'), glyph: '♪' },
            { id: 'chords',   label: window.t('m_tab.chords'),    glyph: '♩' },
            { id: 'devices',  label: window.t('m_tab.devices'),   glyph: '◌' },
            { id: 'settings', label: window.t('m_tab.settings'),  glyph: '⚙' },
            { id: 'help',     label: window.t('m_tab.help'),      glyph: '?' },
          ].map(tab => (
            <button key={tab.id}
              className={'m-tab' + (view === tab.id ? ' active' : '')}
              onClick={() => setView(tab.id)}>
              <span className="m-tab-glyph">{tab.glyph}</span>
              <span className="m-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <Header midiConnected={midiConnected} midiDeviceName={midiDeviceName} />
      <SideNav view={view} setView={setView} />
      <main className="shell-main">{content}</main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
