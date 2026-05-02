// naming.js — note-naming convention (English C-D-E vs Solfège Do-Ré-Mi).
// Exposes: window.namingStore, window.formatNoteName, window.useNamingMode.
//
// Translates only the leading note letter and any letter following a "/"
// (slash-chord bass). Octaves, accidentals (#, ♯, b, ♭), and quality
// suffixes (m, maj7, m7♭5, …) pass through untouched.

(function () {
  var STORAGE_KEY = 'fermata.naming';
  var SOLFEGE = { C: 'Do', D: 'Ré', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };

  function loadMode() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return v === 'solfege' ? 'solfege' : 'english';
    } catch (_) { return 'english'; }
  }

  var mode = loadMode();
  var listeners = new Set();

  var namingStore = {
    getMode: function () { return mode; },
    setMode: function (m) {
      if (m !== 'english' && m !== 'solfege') return;
      if (m === mode) return;
      mode = m;
      try { localStorage.setItem(STORAGE_KEY, m); } catch (_) {}
      listeners.forEach(function (fn) { fn(m); });
    },
    subscribe: function (fn) {
      listeners.add(fn);
      return function () { listeners.delete(fn); };
    },
  };

  function formatNoteName(name, opts) {
    var m = (opts && opts.mode) || mode;
    if (m !== 'solfege' || typeof name !== 'string') return name;
    var out = name.replace(/^([A-G])/, function (_, l) { return SOLFEGE[l]; });
    out = out.replace(/\/([A-G])/, function (_, l) { return '/' + SOLFEGE[l]; });
    return out;
  }

  function useNamingMode() {
    var st = React.useState(function () { return namingStore.getMode(); });
    React.useEffect(function () { return namingStore.subscribe(st[1]); }, []);
    return st[0];
  }

  window.namingStore = namingStore;
  window.formatNoteName = formatNoteName;
  window.useNamingMode = useNamingMode;
}());
