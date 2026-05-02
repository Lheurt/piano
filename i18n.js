// i18n.js — locale store + t(key, params) translator. App-wide language.
// Catalog lives in locales.js (window.LOCALES + window.LOCALE_CATALOG).
// Exposes: window.i18n, window.t, window.useLocale.
//
// Lookup order in t(): current locale → 'en' fallback → the key itself
// (so missing entries surface visibly without crashing).

(function () {
  var STORAGE_KEY = 'fermata.lang';
  var DEFAULT_LOCALE = 'en';

  function knownLocales() {
    var L = window.LOCALES;
    if (!L || !L.length) return [DEFAULT_LOCALE];
    // Accept either ['en','fr'] or [{code,label},…] forms.
    return L.map(function (e) { return typeof e === 'string' ? e : e.code; });
  }

  function loadLocale() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (knownLocales().indexOf(v) >= 0) return v;
    } catch (_) {}
    return DEFAULT_LOCALE;
  }

  var locale = loadLocale();
  var listeners = new Set();

  function format(s, params) {
    if (!params || typeof s !== 'string') return s;
    return s.replace(/\{(\w+)\}/g, function (_, k) {
      return params[k] != null ? params[k] : '{' + k + '}';
    });
  }

  function t(key, params) {
    var cat = (window.LOCALE_CATALOG || {});
    var s = (cat[locale] && cat[locale][key]);
    if (s == null) s = (cat[DEFAULT_LOCALE] && cat[DEFAULT_LOCALE][key]);
    if (s == null) s = key;
    return format(s, params);
  }

  // Pluralization helper: pick `one` for n === 1, `other` otherwise.
  // Both keys receive {n} interpolation by default.
  function tn(oneKey, otherKey, n, params) {
    var p = Object.assign({ n: n }, params || {});
    return t(n === 1 ? oneKey : otherKey, p);
  }

  var i18n = {
    getLocale: function () { return locale; },
    setLocale: function (l) {
      if (knownLocales().indexOf(l) < 0) return;
      if (l === locale) return;
      locale = l;
      try { localStorage.setItem(STORAGE_KEY, l); } catch (_) {}
      listeners.forEach(function (fn) { fn(l); });
    },
    subscribe: function (fn) {
      listeners.add(fn);
      return function () { listeners.delete(fn); };
    },
    locales: knownLocales,
    t: t,
    tn: tn,
  };

  function useLocale() {
    var st = React.useState(function () { return locale; });
    React.useEffect(function () { return i18n.subscribe(st[1]); }, []);
    return st[0];
  }

  window.i18n = i18n;
  window.t = t;
  window.tn = tn;
  window.useLocale = useLocale;
}());
