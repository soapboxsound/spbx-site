(function () {
  var KEY = 'spbx-theme';

  function currentTheme() {
    return document.body.classList.contains('theme-light') ? 'theme-light' : 'theme-dark';
  }

  function setTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(theme);
    document.documentElement.style.colorScheme = theme === 'theme-light' ? 'light' : 'dark';
    localStorage.setItem(KEY, theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'theme-light' ? '#F8F8F6' : '#111111');
    syncToggleButtons();
  }

  function syncToggleButtons() {
    var isLight = currentTheme() === 'theme-light';
    document.querySelectorAll('.theme-toggle').forEach(function (btn) {
      btn.setAttribute('aria-label', isLight ? 'Switch to dark mode' : 'Switch to light mode');
      btn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
    });
  }

  document.addEventListener('click', function (event) {
    var toggle = event.target.closest('.theme-toggle');
    if (!toggle) return;
    setTheme(currentTheme() === 'theme-dark' ? 'theme-light' : 'theme-dark');
  });

  var navToggle = document.querySelector('.hub-nav-toggle');
  var navMenu = document.getElementById('hub-nav-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      var open = navMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });

    navMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open menu');
      });
    });
  }

  syncToggleButtons();
})();
