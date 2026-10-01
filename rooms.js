(function () {
  const views = {
    home: document.getElementById('view-home'),
    about: document.getElementById('view-about'),
    contact: document.getElementById('view-contact'),
    booth: document.getElementById('view-booth'),
    work: document.getElementById('view-work')
  };
  if (!views.home || !views.about || !views.contact || !views.booth || !views.work) return;

  const order = { about: 0, home: 1, contact: 2 };
  const titles = {
    home: 'SPBX Sound | Be Seen. Be Heard. Be Understood.',
    about: 'About | SPBX Sound',
    contact: 'Contact | SPBX Sound',
    booth: 'The Booth | SPBX Sound',
    work: 'The Work | SPBX Sound'
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SHOWCASE_READY = document.body.getAttribute('data-showcase') === 'on';

  let current = null;
  let first = true;

  function roomFromHash() {
    const h = (location.hash || '#home').replace('#', '');
    if (h === 'work' && !SHOWCASE_READY) {
      try { history.replaceState(null, '', location.pathname + location.search + '#home'); } catch (e) {}
      return 'home';
    }
    return views[h] ? h : 'home';
  }

  function go(next) {
    if (typeof window.closeStems === 'function') window.closeStems();
    if (!views[next] || next === current) {
      syncChrome(next);
      return;
    }
    const prev = current;
    const dir = prev == null || order[next] == null || order[prev] == null
      ? 0
      : order[next] - order[prev];
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
    document.body.classList.toggle('is-booth', room === 'booth');
    document.body.classList.toggle('is-work', room === 'work');
    document.querySelectorAll('.cta-row [data-room]').forEach((el) => {
      el.classList.toggle('is-here', el.getAttribute('data-room') === room);
    });
    if (typeof window.spbxBooth === 'function') window.spbxBooth(room === 'booth');
    if (typeof window.spbxReel === 'function') window.spbxReel(room === 'work');
  }

  function setRoom(room) {
    if (typeof window.closeStems === 'function') window.closeStems();
    const hash = '#' + room;
    if (location.hash !== hash) location.hash = hash;
    else go(room);
  }

  document.querySelectorAll('[data-room]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const room = el.getAttribute('data-room');
      if (!views[room]) return;
      if (room === 'work' && !SHOWCASE_READY) return;
      e.preventDefault();
      const showcase = el.hasAttribute('data-showcase');
      setRoom(room);
      if (showcase && room === 'work') {
        window.setTimeout(() => {
          if (typeof window.spbxReelBegin === 'function') window.spbxReelBegin();
        }, 160);
      }
    });
  });

  document.querySelectorAll('a[href^="mailto:"]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.location.href = el.href;
    });
  });

  window.spbxRoom = setRoom;

  window.addEventListener('hashchange', () => go(roomFromHash()));
  go(roomFromHash());
})();
