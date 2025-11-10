
(function () {
  const KEY = "pref-theme";
  function setTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    try { localStorage.setItem(KEY, mode); } catch (_) {}
  }
  function initial() {
    try { const t = localStorage.getItem(KEY); if (t) return t; } catch (_){}
    return (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  setTheme(initial());
  window.__toggleTheme = function () {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(cur === 'dark' ? 'light' : 'dark');
  };
})();
