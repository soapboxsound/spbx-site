(function () {
  const views = {
    home: document.getElementById('view-home'),
    about: document.getElementById('view-about'),
    contact: document.getElementById('view-contact')
  };
  if (!views.home || !views.about || !views.contact) return;

  const order = { about: 0, home: 1, contact: 2 };
  const titles = {
    home: 'SPBX Sound | Be Seen. Be Heard. Be Understood.',
    about: 'About | SPBX Sound',
    contact: 'Contact | SPBX Sound'
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const navAbout = document.querySelector('.nav-dot-left');
  const navContact = document.querySelector('.nav-dot-right');

  let current = null;
  let first = true;

  function roomFromHash() {
    const h = (location.hash || '#home').replace('#', '');
    return views[h] ? h : 'home';
  }

  function go(next) {
    if (!views[next] || next === current) {
      syncChrome(next);
      return;
    }
    const prev = current;
    const dir = prev == null ? 0 : order[next] - order[prev];
    const incoming = views[next];
    const outgoing = prev ? views[prev] : null;
    const animate = !first && !reduce && outgoing && dir !== 0;

    if (animate) {
      const enter = dir < 0 ? 'from-left' : 'from-right';
      const leave = dir < 0 ? 'to-right' : 'to-left';
      incoming.classList.add(enter);
      incoming.offsetWidth;
      outgoing.classList.remove('is-on');
      outgoing.classList.add(leave);
      incoming.classList.add('is-on');
      incoming.classList.remove(enter);
      window.setTimeout(() => {
        outgoing.classList.remove('to-left', 'to-right');
      }, 720);
      if (typeof window.spbxTurn === 'function') {
        window.spbxTurn(dir < 0 ? -150 : 150);
      }
    } else {
      Object.keys(views).forEach((key) => {
        views[key].classList.remove('is-on', 'from-left', 'from-right', 'to-left', 'to-right');
      });
      incoming.classList.add('is-on');
    }

    current = next;
    first = false;
    syncChrome(next);
    Object.keys(views).forEach((key) => {
      views[key].setAttribute('aria-hidden', key === next ? 'false' : 'true');
    });
  }

  function syncChrome(room) {
    document.title = titles[room] || titles.home;
    navAbout.classList.toggle('is-here', room === 'about');
    navContact.classList.toggle('is-here', room === 'contact');
  }

  function setRoom(room) {
    const hash = '#' + room;
    if (location.hash !== hash) location.hash = hash;
    else go(room);
  }

  document.querySelectorAll('[data-room]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const room = el.getAttribute('data-room');
      if (!views[room]) return;
      e.preventDefault();
      setRoom(room);
    });
  });

  window.addEventListener('hashchange', () => go(roomFromHash()));
  go(roomFromHash());
})();
