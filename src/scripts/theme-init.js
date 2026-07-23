(function () {
  var KEY = 'spbx-theme';
  var stored = localStorage.getItem(KEY);
  var theme = stored || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'theme-light' : 'theme-dark');
  document.body.classList.add(theme);
  document.documentElement.style.colorScheme = theme === 'theme-light' ? 'light' : 'dark';
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'theme-light' ? '#F8F8F6' : '#111111');
})();
