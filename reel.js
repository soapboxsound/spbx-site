(function () {
  const brandEl = document.getElementById('reelBrand');
  const titleEl = document.getElementById('reelTitle');
  const creditsEl = document.getElementById('reelCredits');
  const indexEl = document.getElementById('reelIndex');
  const watchBtn = document.getElementById('reelWatch');
  const cube = document.querySelector('[data-cube]');
  const player = document.getElementById('reelPlayer');
  const frame = document.getElementById('reelFrame');
  const frameBrand = document.getElementById('reelFrameBrand');
  const frameTitle = document.getElementById('reelFrameTitle');
  const playBtn = document.getElementById('reelPlay');
  const pauseBtn = document.getElementById('reelPause');
  const prevBtn = document.getElementById('reelPrev');
  const nextBtn = document.getElementById('reelNext');
  const closeBtn = document.getElementById('reelClose');
  const timeEl = document.getElementById('reelTime');
  const durEl = document.getElementById('reelDur');
  const track = document.getElementById('reelTrack');
  const fill = document.getElementById('reelFill');
  const morph = document.getElementById('reelMorph');
  const morphVid = document.getElementById('reelMorphVid');
  if (!titleEl || !watchBtn || !cube || !player || !frame || !playBtn || !pauseBtn || !prevBtn || !nextBtn || !closeBtn || !timeEl || !durEl || !track || !fill || !morph || !morphVid) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const REST_SPEED = cube.dataset.speed || '0.28';
  const REEL_SPEED = '-0.2';
  const FACE_ORDER = ['front', 'right', 'back', 'left'];
  const FACE_CYCLE = ['front', 'right', 'back', 'left'];
  const FACE_CLASS = {
    front: 'cf-front',
    right: 'cf-right',
    back: 'cf-back',
    left: 'cf-left'
  };
  const PIECES = [
    { id: 'brunch', brand: 'American Express', title: 'Brunch.', song: '', artist: '', company: '', composer: '', agency: '', src: 'reel-private/brunch.mp4' },
    { id: 'homecoming', brand: 'American Express', title: 'Homecoming.', song: '', artist: '', company: '', composer: '', agency: '', src: 'reel-private/homecoming.mp4' },
    { id: 'neworleans', brand: 'American Express', title: 'New Orleans.', song: '', artist: '', company: '', composer: '', agency: '', src: 'reel-private/neworleans.mp4' },
    { id: 'puppy', brand: 'American Express', title: 'Puppy.', song: '', artist: '', company: '', composer: '', agency: '', src: 'reel-private/puppy.mp4' },
    { id: 'exxon', brand: 'ExxonMobil', title: 'Exxon.', song: '', artist: '', company: '', composer: '', agency: '', src: 'reel-private/exxon.mp4' }
  ];
  const COUNT = PIECES.length;
  const SLOTS = Math.min(4, COUNT);
  if (!COUNT) return;

  let active = false;
  let live = false;
  let framed = false;
  let peeling = false;
  let framedIndex = 0;
  let titleRaf = 0;
  let idleTimer = 0;
  let switching = false;
  let scrubbing = false;
  let lastRy = 32;
  let spinTravel = 0;
  let hopLock = 0;
  let speedTimer = 0;
  let spinQuarters = 0;
  let evolveReady = false;
  let morphGuard = 0;

  function wrap(i) {
    return ((i % COUNT) + COUNT) % COUNT;
  }

  function wrap180(a) {
    return ((a + 180) % 360 + 360) % 360 - 180;
  }

  function mark(i) {
    return (i + 1) + ' / ' + COUNT;
  }

  function pieceAt(i) {
    return PIECES[wrap(i)];
  }

  function creditLines(piece) {
    if (!piece) return [];
    const lines = [];
    const song = [piece.song, piece.artist].filter(Boolean).join(' — ');
    if (song) lines.push(song);
    const house = [piece.company, piece.composer].filter(Boolean).join(' / ');
    if (house) lines.push(house);
    if (piece.agency) lines.push(piece.agency);
    if (piece.info) lines.push(piece.info);
    return lines;
  }

  function paintCredits(el, piece) {
    if (!el) return;
    el.replaceChildren();
    creditLines(piece).forEach((line) => {
      const p = document.createElement('p');
      p.textContent = line;
      el.appendChild(p);
    });
  }

  function paintMeta(piece, index, forFrame) {
    const brand = forFrame ? frameBrand : brandEl;
    const title = forFrame ? frameTitle : titleEl;
    const credits = forFrame ? null : creditsEl;
    const idx = forFrame ? null : indexEl;
    if (brand) brand.textContent = piece && piece.brand ? piece.brand : '';
    if (title) title.textContent = piece ? piece.title : 'The work.';
    paintCredits(credits, piece);
    if (idx) idx.textContent = piece && typeof index === 'number' ? mark(index) : '';
  }

  function videoForFace(face) {
    return cube.querySelector('.' + FACE_CLASS[face] + ' video');
  }

  function indexOnFace(face) {
    const vid = videoForFace(face);
    if (!vid || vid.dataset.index == null || vid.dataset.index === '') return -1;
    return Number(vid.dataset.index);
  }

  function faceOf(index) {
    const want = wrap(index);
    return FACE_ORDER.find((face) => indexOnFace(face) === want) || null;
  }

  function facingFace() {
    return typeof window.spbxFacingFace === 'function' ? window.spbxFacingFace() : 'front';
  }

  function facingIndex() {
    const index = indexOnFace(facingFace());
    return index < 0 ? 0 : index;
  }

  function videoForIndex(index) {
    const face = faceOf(index);
    return face ? videoForFace(face) : null;
  }

  function fmt(t) {
    if (!isFinite(t) || t < 0) return '0:00';
    const s = Math.floor(t);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function hiddenFace() {
    const depth = typeof window.spbxFaceDepth === 'function' ? window.spbxFaceDepth() : null;
    if (!depth) return FACE_ORDER[0];
    return FACE_ORDER.slice().sort((a, b) => depth[a] - depth[b])[0];
  }

  function ensureVid(face) {
    const faceEl = cube.querySelector('.' + FACE_CLASS[face]);
    if (!faceEl) return null;
    let vid = faceEl.querySelector('video');
    if (vid) return vid;
    vid = document.createElement('video');
    vid.className = 'cf-vid';
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.preload = 'auto';
    vid.setAttribute('playsinline', '');
    vid.addEventListener('loadeddata', () => {
      if (vid.currentTime === 0) vid.currentTime = 0.05;
    });
    faceEl.appendChild(vid);
    return vid;
  }

  function assignFace(face, index) {
    const piece = pieceAt(index);
    const vid = ensureVid(face);
    if (!vid) return;
    vid.dataset.index = String(wrap(index));
    if (vid.dataset.id === piece.id) return;
    vid.dataset.id = piece.id;
    vid.src = piece.src;
    vid.muted = true;
    const play = vid.play();
    if (play && play.catch) play.catch(() => {});
  }

  function takenIndices() {
    const taken = new Set();
    FACE_ORDER.forEach((face) => {
      const i = indexOnFace(face);
      if (i >= 0) taken.add(i);
    });
    return taken;
  }

  function uniqueStep(from, step) {
    const taken = takenIndices();
    taken.delete(wrap(from));
    const dir = step > 0 ? 1 : -1;
    let n = wrap(from + step);
    let guard = 0;
    while (taken.has(n) && guard < COUNT) {
      n = wrap(n + dir);
      guard += 1;
    }
    return n;
  }

  function spinCycle(from) {
    const start = FACE_CYCLE.indexOf(from);
    const i = start < 0 ? 0 : start;
    return [0, 1, 2, 3].map((k) => FACE_CYCLE[(i + k) % 4]);
  }

  function paintWindow() {
    spinCycle(facingFace()).forEach((face, slot) => {
      if (slot < SLOTS) assignFace(face, slot);
    });
  }

  function playMuted() {
    FACE_ORDER.forEach((face) => {
      const vid = videoForFace(face);
      if (!vid) return;
      vid.style.opacity = '';
      vid.muted = true;
      const play = vid.play();
      if (play && play.catch) play.catch(() => {});
    });
  }

  function pauseCube() {
    cube.querySelectorAll('.cf-vid').forEach((vid) => vid.pause());
  }

  function unmount() {
    cube.querySelectorAll('.cf-vid').forEach((vid) => {
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
      vid.remove();
    });
    evolveReady = false;
    spinTravel = 0;
    spinQuarters = 0;
  }

  function ensureOnCube(index) {
    if (faceOf(index)) return;
    assignFace(hiddenFace(), index);
  }

  function evolveCube() {
    if (hopLock || !live || framed || peeling || !evolveReady || COUNT <= 4) return;
    if (!window.spbxPose) return;
    const ry = window.spbxPose.ry;
    const d = wrap180(ry - lastRy);
    lastRy = ry;
    if (Math.abs(d) < 0.01) return;
    spinTravel += d;
    const q = Math.floor(Math.abs(spinTravel) / 90);
    const step = spinTravel < 0 ? 4 : -4;
    while (spinQuarters < q) {
      spinQuarters += 1;
      if (spinQuarters < 2) continue;
      const hidden = hiddenFace();
      const cur = indexOnFace(hidden);
      if (cur >= 0) {
        const next = uniqueStep(cur, step);
        if (next !== cur) assignFace(hidden, next);
      }
    }
  }

  function setTitle() {
    if (framed || peeling) return;
    if (!live) {
      paintMeta(null);
      watchBtn.textContent = 'Showcase.';
      watchBtn.classList.remove('is-on');
      return;
    }
    const index = facingIndex();
    paintMeta(pieceAt(index), index);
    watchBtn.textContent = 'Play.';
    watchBtn.classList.add('is-on');
  }

  function tickTitle() {
    if (!active || !live || framed) return;
    evolveCube();
    setTitle();
    titleRaf = requestAnimationFrame(tickTitle);
  }

  function duration() {
    return isFinite(frame.duration) && frame.duration > 0 ? frame.duration : 0;
  }

  function syncChrome() {
    playBtn.classList.toggle('is-dim', !frame.paused);
    pauseBtn.classList.toggle('is-dim', frame.paused);
  }

  function syncBar() {
    if (scrubbing) return;
    const d = duration();
    const t = isFinite(frame.currentTime) ? frame.currentTime : 0;
    timeEl.textContent = fmt(t);
    durEl.textContent = fmt(d);
    fill.style.width = d ? ((t / d) * 100) + '%' : '0%';
    track.setAttribute('aria-valuemax', String(Math.round(d)));
    track.setAttribute('aria-valuenow', String(Math.round(t)));
  }

  function seekAt(clientX) {
    const d = duration();
    if (!d) return;
    const r = track.getBoundingClientRect();
    const x = r.width ? Math.min(1, Math.max(0, (clientX - r.left) / r.width)) : 0;
    try { frame.currentTime = x * d; } catch (err) {}
    timeEl.textContent = fmt(x * d);
    fill.style.width = (x * 100) + '%';
  }

  function loadPiece(index, at) {
    framedIndex = wrap(index);
    const piece = pieceAt(framedIndex);
    const start = typeof at === 'number' ? at : 0;
    paintMeta(piece, framedIndex, true);
    if (frame.dataset.id !== piece.id) {
      switching = true;
      frame.dataset.id = piece.id;
      frame.src = piece.src;
    }
    const seek = () => {
      try { frame.currentTime = start; } catch (err) {}
      const play = frame.play();
      if (play && play.catch) play.catch(() => {});
    };
    if (frame.readyState >= 1) seek();
    else frame.addEventListener('loadedmetadata', seek, { once: true });
    frame.addEventListener('playing', () => { switching = false; }, { once: true });
    syncChrome();
    syncBar();
  }

  function faceBox(face) {
    const el = cube.querySelector('.' + FACE_CLASS[face]);
    return el ? el.getBoundingClientRect() : null;
  }

  function placeMorph(rect, radius) {
    morph.style.left = rect.left + 'px';
    morph.style.top = rect.top + 'px';
    morph.style.width = rect.width + 'px';
    morph.style.height = rect.height + 'px';
    morph.style.borderRadius = radius;
  }

  function cardBox() {
    const wrap = player.querySelector('.reel-frame-wrap');
    if (wrap) {
      const r = wrap.getBoundingClientRect();
      if (r.width > 40) return r;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let width = Math.min(vw * 0.92, 1040);
    let height = width * 9 / 16;
    const maxH = vh * 0.62;
    if (height > maxH) {
      height = maxH;
      width = height * 16 / 9;
    }
    return {
      left: (vw - width) / 2,
      top: (vh - height) / 2 - 28,
      width,
      height
    };
  }

  function faceRadius() {
    const el = cube.querySelector('.cf-front');
    const r = el ? getComputedStyle(el).borderRadius : '';
    return r && r !== '0px' ? r.split(' ')[0] : '22px';
  }

  function syncMorph(piece, time, play) {
    if (!piece) return;
    if (morphVid.dataset.id !== piece.id) {
      morphVid.dataset.id = piece.id;
      morphVid.src = piece.src;
    }
    morphVid.muted = true;
    morphVid.loop = true;
    const seek = () => {
      if (isFinite(time) && Math.abs((morphVid.currentTime || 0) - time) > 0.08) {
        try { morphVid.currentTime = time; } catch (err) {}
      }
      if (play) {
        const p = morphVid.play();
        if (p && p.catch) p.catch(() => {});
      } else morphVid.pause();
    };
    if (morphVid.readyState >= 2) seek();
    else morphVid.addEventListener('loadeddata', seek, { once: true });
  }

  function hideMorph() {
    morph.classList.remove('is-on', 'is-full', 'is-docking');
    document.body.classList.remove('is-peel', 'is-dock');
  }

  function clearMorph() {
    hideMorph();
    morphVid.pause();
    morphVid.removeAttribute('src');
    morphVid.load();
    delete morphVid.dataset.id;
  }

  function fillMorph() {
    placeMorph(cardBox(), '16px');
  }

  function onMorphWidth(fn) {
    const token = ++morphGuard;
    const done = () => {
      if (token !== morphGuard) return;
      morph.removeEventListener('transitionend', onEnd);
      fn();
    };
    const onEnd = (e) => {
      if (e.target !== morph) return;
      if (e.propertyName !== 'width') return;
      done();
    };
    morph.addEventListener('transitionend', onEnd);
    window.setTimeout(done, 700);
  }

  function showPlayer(index, at) {
    framed = true;
    peeling = false;
    cancelAnimationFrame(titleRaf);
    pauseCube();
    document.body.classList.add('is-frame');
    document.body.classList.remove('is-peel', 'is-dock');
    player.classList.add('open');
    frame.muted = false;
    loadPiece(index, at);
    syncChrome();
    hideMorph();
    const cubeVid = videoForIndex(index);
    if (cubeVid) cubeVid.style.opacity = '';
  }

  function openIndex(index) {
    if (!live) begin();
    if (framed || peeling) return;
    const face = faceOf(index) || facingFace();
    const cubeVid = videoForFace(face);
    const rect = faceBox(face);
    const start = 0;
    if (reduce || !rect || rect.width < 8) {
      showPlayer(index, start);
      return;
    }
    peeling = true;
    cancelAnimationFrame(titleRaf);
    cube.dataset.speed = '0';
    player.classList.add('open', 'is-measure');
    const dest = cardBox();
    player.classList.remove('open', 'is-measure');
    const piece = pieceAt(index);
    syncMorph(piece, start, true);
    placeMorph(rect, faceRadius());
    morph.classList.remove('is-full', 'is-docking');
    morph.classList.add('is-on');
    if (cubeVid) cubeVid.style.opacity = '0';
    document.body.classList.add('is-peel');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        morph.classList.add('is-full');
        placeMorph(dest, '16px');
      });
    });
    onMorphWidth(() => showPlayer(index, morphVid.currentTime || start));
  }

  function openFace(face) {
    const index = indexOnFace(face);
    if (index < 0) {
      if (!live) begin();
      return;
    }
    openIndex(index);
  }

  function closeFrame() {
    if (!framed && !peeling) return;
    window.clearTimeout(idleTimer);
    const token = ++morphGuard;
    const index = framedIndex;
    const piece = pieceAt(index);
    const t = isFinite(frame.currentTime) ? frame.currentTime : 0;
    framed = false;
    peeling = true;
    cube.dataset.speed = '0';
    ensureOnCube(index);
    const face = faceOf(index) || facingFace();
    const cubeVid = videoForFace(face);
    if (cubeVid) {
      cubeVid.style.opacity = '';
      if (isFinite(t)) {
        try { cubeVid.currentTime = t; } catch (err) {}
      }
      const play = cubeVid.play();
      if (play && play.catch) play.catch(() => {});
    }

    const finish = () => {
      if (token !== morphGuard) return;
      peeling = false;
      player.classList.remove('open', 'is-idle');
      document.body.classList.remove('is-frame', 'is-peel', 'is-dock');
      frame.pause();
      frame.muted = true;
      frame.removeAttribute('src');
      frame.removeAttribute('data-id');
      delete frame.dataset.id;
      frame.load();
      hideMorph();
      if (cubeVid) cubeVid.style.opacity = '';
      if (live) {
        cube.dataset.speed = REEL_SPEED;
        playMuted();
        tickTitle();
      }
    };

    const dest = faceBox(face);
    if (reduce || !dest || dest.width < 8) {
      finish();
      return;
    }

    syncMorph(piece, t, true);
    fillMorph();
    morph.classList.remove('is-docking');
    morph.classList.add('is-on', 'is-full');
    void morph.offsetWidth;
    player.classList.remove('open', 'is-idle');
    document.body.classList.remove('is-frame', 'is-peel');
    document.body.classList.add('is-dock');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (token !== morphGuard) return;
        const liveFace = faceBox(face) || dest;
        morph.classList.remove('is-full');
        morph.classList.add('is-docking');
        placeMorph(liveFace, faceRadius());
      });
    });
    window.setTimeout(finish, 720);
  }

  function begin() {
    if (live) return;
    live = true;
    document.body.classList.add('is-reel');
    cube.dataset.speed = REEL_SPEED;
    paintWindow();
    lastRy = window.spbxPose ? window.spbxPose.ry : 32;
    spinTravel = 0;
    spinQuarters = 0;
    evolveReady = true;
    window.setTimeout(playMuted, reduce ? 0 : 280);
    watchBtn.textContent = 'Play.';
    tickTitle();
  }

  window.spbxReelBegin = function () {
    if (!active) window.spbxReel(true);
    begin();
  };

  function stop() {
    morphGuard += 1;
    closeFrame();
    cancelAnimationFrame(titleRaf);
    live = false;
    window.clearTimeout(hopLock);
    hopLock = 0;
    window.clearTimeout(speedTimer);
    speedTimer = 0;
    document.body.classList.remove('is-reel', 'is-peel', 'is-frame');
    cube.dataset.speed = REST_SPEED;
    unmount();
    clearMorph();
    paintMeta(null);
    watchBtn.textContent = 'Showcase.';
    watchBtn.classList.remove('is-on');
  }

  window.spbxReelFace = function (el) {
    if (!active || framed || peeling) return;
    const map = { 'cf-front': 'front', 'cf-right': 'right', 'cf-back': 'back', 'cf-left': 'left' };
    const key = Object.keys(map).find((name) => el && el.classList && el.classList.contains(name));
    if (!key) {
      if (!live) begin();
      return;
    }
    if (!live) {
      begin();
      return;
    }
    openFace(map[key]);
  };

  window.spbxReel = function (on) {
    active = !!on;
    if (!active) stop();
  };

  watchBtn.addEventListener('click', () => {
    if (!live) begin();
    else openIndex(facingIndex());
  });

  playBtn.addEventListener('click', () => {
    const play = frame.play();
    if (play && play.catch) play.catch(() => {});
  });
  pauseBtn.addEventListener('click', () => frame.pause());
  prevBtn.addEventListener('click', () => hopPlaylist(-1));
  nextBtn.addEventListener('click', () => hopPlaylist(1));
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeFrame();
  });
  frame.addEventListener('click', () => {
    if (frame.paused) {
      const play = frame.play();
      if (play && play.catch) play.catch(() => {});
    } else frame.pause();
  });
  frame.addEventListener('play', syncChrome);
  frame.addEventListener('pause', syncChrome);
  frame.addEventListener('timeupdate', syncBar);
  frame.addEventListener('loadedmetadata', syncBar);
  frame.addEventListener('ended', () => {
    if (!framed || switching) return;
    hopPlaylist(1);
  });
  track.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    scrubbing = true;
    seekAt(e.clientX);
    try { track.setPointerCapture(e.pointerId); } catch (err) {}
  });
  track.addEventListener('pointermove', (e) => {
    if (!scrubbing) return;
    seekAt(e.clientX);
  });
  track.addEventListener('pointerup', () => { scrubbing = false; syncBar(); });
  track.addEventListener('pointercancel', () => { scrubbing = false; syncBar(); });
  player.addEventListener('click', (e) => {
    if (e.target === player) closeFrame();
  });

  function faceFromRy(ry) {
    const rest = parseFloat(cube.dataset.start || '32');
    const offset = ((ry - rest) % 360 + 360) % 360;
    const q = ((Math.round(offset / 90) % 4) + 4) % 4;
    return ['front', 'left', 'back', 'right'][q];
  }

  function hopPlaylist(dir) {
    if (peeling || !live || hopLock) return;
    const step = dir > 0 ? 1 : -1;
    const cur = window.spbxPose ? window.spbxPose.ry : 32;
    const rest = parseFloat(cube.dataset.start || '32');
    const from = framed ? framedIndex : facingIndex();
    const fromFace = faceFromRy(cur);
    const i = FACE_CYCLE.indexOf(fromFace);
    const face = FACE_CYCLE[((i < 0 ? 0 : i) + (step > 0 ? 1 : 3)) % 4];
    const target = wrap(from + step);
    assignFace(face, target);
    const want = rest - FACE_CYCLE.indexOf(face) * 90;
    let dest = want + Math.round((cur - want) / 360) * 360;
    if (step > 0 && dest >= cur) dest -= 360;
    if (step < 0 && dest <= cur) dest += 360;
    const d = dest - cur;
    hopLock = window.setTimeout(() => { hopLock = 0; }, 480);
    cube.dataset.speed = '0';
    window.clearTimeout(speedTimer);
    if (Math.abs(d) >= 8 && typeof window.spbxTurn === 'function') window.spbxTurn(d, true);
    if (!framed) {
      speedTimer = window.setTimeout(() => {
        if (live && !framed) cube.dataset.speed = REEL_SPEED;
      }, 520);
    }
    if (framed) loadPiece(target, 0);
  }

  document.addEventListener('keydown', (e) => {
    if (!live) return;
    if (document.querySelector('.game-overlay.open, .seq-overlay.open, .stem-overlay.open')) return;
    if (e.key === 'Escape' && framed) {
      e.preventDefault();
      closeFrame();
      return;
    }
    if (e.key === ' ' && framed) {
      e.preventDefault();
      if (frame.paused) {
        const play = frame.play();
        if (play && play.catch) play.catch(() => {});
      } else frame.pause();
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (e.repeat) return;
      hopPlaylist(e.key === 'ArrowRight' ? 1 : -1);
    }
  });

  if (document.body.classList.contains('is-work')) window.spbxReel(true);
})();
