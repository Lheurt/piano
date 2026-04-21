// App.jsx — root component, responsive shell
function App() {
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
    view === 'practice' ? <PracticeView midiConnected={midiConnected} midiDeviceName={midiDeviceName} /> :
    view === 'devices'  ? <DevicesView  midiConnected={midiConnected} midiDeviceName={midiDeviceName} /> :
                          <SettingsView />;

  if (narrow) {
    return (
      <div className="m-root">
        <div className="m-topbar">
          <div className="m-brand">
            <span className="m-brand-glyph">𝄐</span>
            <span className="m-brand-name">Fermata.</span>
          </div>
          <div className={'device ' + (midiConnected ? 'connected' : 'disconnected')}>
            <span className="device-dot" />
            {midiConnected ? (midiDeviceName || 'MIDI') : 'No MIDI'}
          </div>
        </div>
        <div className="m-scroll">{content}</div>
        <div className="m-tabbar">
          {[
            { id: 'practice', label: 'Practice', glyph: '▶' },
            { id: 'devices',  label: 'Devices',  glyph: '◌' },
            { id: 'settings', label: 'Settings', glyph: '⚙' },
          ].map(t => (
            <button key={t.id}
              className={'m-tab' + (view === t.id ? ' active' : '')}
              onClick={() => setView(t.id)}>
              <span className="m-tab-glyph">{t.glyph}</span>
              <span className="m-tab-label">{t.label}</span>
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
