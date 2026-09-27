(function () {
  const overlay = document.getElementById('gameOverlay');
  const panel = document.getElementById('gamePanel');
  const canvas = document.getElementById('gameCanvas');
  const trigger = document.getElementById('gameTrigger');
  const closeBtn = document.getElementById('gameClose');
  const scoreEl = document.getElementById('gameScore');
  const bestEl = document.getElementById('gameBest');
  const msgEl = document.getElementById('gameMsg');
  if (!overlay || !canvas || !trigger) return;

  const ctx = canvas.getContext('2d');
  const GOLD = [184, 151, 58];
  const BLUE = [74, 127, 165];
  const INK = [36, 37, 40];
  const PALETTE = [GOLD, BLUE, INK];
  const NOTES = [196, 220, 261.63, 293.66, 329.63, 392, 440, 523.25];
  const UNIT = 10;
  const BEST_KEY = 'spbx-stack-best';

  let open = false;
  let raf = 0;
  let audio;
  let layers = [];
  let moving = null;
  let alive = false;
  let started = false;
  let best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
  bestEl.textContent = String(best);

  function tint(rgb, m) {
    return `rgb(${Math.round(rgb[0] * m)},${Math.round(rgb[1] * m)},${Math.round(rgb[2] * m)})`;
  }

  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audio) audio = new AC();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  function tone(freq, dur, gain, type) {
    const ac = ensureAudio();
    if (!ac) return;
    const t = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const filt = ac.createBiquadFilter();
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(1800, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filt);
    filt.connect(g);
    g.connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function chord(perfect, layer) {
    const n = NOTES[layer % NOTES.length];
    tone(n, perfect ? 0.38 : 0.22, perfect ? 0.07 : 0.045, layer % 3 === 2 ? 'sine' : 'triangle');
    if (perfect) tone(n * 1.5, 0.32, 0.03, 'sine');
  }

  function thud() {
    tone(70, 0.45, 0.06, 'sine');
    tone(48, 0.5, 0.04, 'triangle');
  }

  function reset() {
    layers = [{ x: 0, z: 0, w: UNIT, d: UNIT, color: 0 }];
    moving = spawn(layers[0], 0);
    alive = true;
    started = true;
    launch(moving, layers[0]);
    scoreEl.textContent = '0';
    msgEl.textContent = 'Tap to place.';
  }

  function spawn(prev, index) {
    const axis = index % 2 === 0 ? 'x' : 'z';
    return {
      x: prev.x,
      z: prev.z,
      w: prev.w,
      d: prev.d,
      color: (index + 1) % PALETTE.length,
      axis,
      dir: index % 4 < 2 ? 1 : -1,
      speed: 0,
      min: 0,
      max: 0,
      parked: true
    };
  }

  function launch(piece, prev) {
    const from = prev || layers[layers.length - 1];
    const size = piece.axis === 'x' ? piece.w : piece.d;
    const travel = size * 0.92 + 1.2;
    const period = Math.max(0.72, 1.28 - Math.min(layers.length, 18) * 0.03);
    piece.parked = false;
    if (piece.axis === 'x') {
      piece.min = from.x - travel;
      piece.max = from.x + from.w - piece.w + travel;
      piece.z = from.z;
      piece.x = piece.dir > 0 ? piece.min : piece.max;
    } else {
      piece.min = from.z - travel;
      piece.max = from.z + from.d - piece.d + travel;
      piece.x = from.x;
      piece.z = piece.dir > 0 ? piece.min : piece.max;
    }
    const span = Math.max(2.4, piece.max - piece.min);
    piece.speed = span / (period * 60);
  }

  function iso(x, z, y, ox, oy, iw, ih, lh) {
    return {
      x: ox + (x - z) * iw,
      y: oy + (x + z) * ih - y * lh
    };
  }

  function drawBox(box, y, ox, oy, iw, ih, lh) {
    const c = PALETTE[box.color];
    const p = [
      iso(box.x, box.z, y, ox, oy, iw, ih, lh),
      iso(box.x + box.w, box.z, y, ox, oy, iw, ih, lh),
      iso(box.x + box.w, box.z + box.d, y, ox, oy, iw, ih, lh),
      iso(box.x, box.z + box.d, y, ox, oy, iw, ih, lh),
      iso(box.x, box.z, y + 1, ox, oy, iw, ih, lh),
      iso(box.x + box.w, box.z, y + 1, ox, oy, iw, ih, lh),
      iso(box.x + box.w, box.z + box.d, y + 1, ox, oy, iw, ih, lh),
      iso(box.x, box.z + box.d, y + 1, ox, oy, iw, ih, lh)
    ];
    ctx.beginPath();
    ctx.moveTo(p[7].x, p[7].y);
    ctx.lineTo(p[4].x, p[4].y);
    ctx.lineTo(p[0].x, p[0].y);
    ctx.lineTo(p[3].x, p[3].y);
    ctx.closePath();
    ctx.fillStyle = tint(c, 0.48);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(p[4].x, p[4].y);
    ctx.lineTo(p[5].x, p[5].y);
    ctx.lineTo(p[1].x, p[1].y);
    ctx.lineTo(p[0].x, p[0].y);
    ctx.closePath();
    ctx.fillStyle = tint(c, 0.32);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(p[4].x, p[4].y);
    ctx.lineTo(p[5].x, p[5].y);
    ctx.lineTo(p[6].x, p[6].y);
    ctx.lineTo(p[7].x, p[7].y);
    ctx.closePath();
    ctx.fillStyle = tint(c, box.color === 2 ? 0.7 : 1);
    ctx.fill();
  }

  function draw() {
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);
    const iw = w / 28;
    const ih = iw * 0.52;
    const lh = 13;
    const ox = w * 0.5;
    const stackH = layers.length + (moving ? 1 : 0);
    const oy = h * 0.62 + Math.max(0, stackH - 6) * lh * 0.55;
    layers.forEach((box, i) => drawBox(box, i, ox, oy, iw, ih, lh));
    if (moving) drawBox(moving, layers.length, ox, oy, iw, ih, lh);
  }

  function tick() {
    if (!open) return;
    if (alive && started && moving && !moving.parked) {
      const pos = moving.axis === 'x' ? 'x' : 'z';
      moving[pos] += moving.dir * moving.speed;
      if (moving[pos] >= moving.max) {
        moving[pos] = moving.max;
        moving.dir = -1;
      } else if (moving[pos] <= moving.min) {
        moving[pos] = moving.min;
        moving.dir = 1;
      }
    }
    draw();
    raf = requestAnimationFrame(tick);
  }

  function place() {
    if (!open) return;
    if (!alive || !moving) {
      reset();
      return;
    }
    const prev = layers[layers.length - 1];
    let nx = moving.x;
    let nz = moving.z;
    let nw = moving.w;
    let nd = moving.d;
    if (moving.axis === 'x') {
      const left = Math.max(moving.x, prev.x);
      const right = Math.min(moving.x + moving.w, prev.x + prev.w);
      nw = right - left;
      if (nw <= 0.12) return fail();
      nx = left;
      nz = prev.z;
      nd = prev.d;
    } else {
      const near = Math.max(moving.z, prev.z);
      const far = Math.min(moving.z + moving.d, prev.z + prev.d);
      nd = far - near;
      if (nd <= 0.12) return fail();
      nz = near;
      nx = prev.x;
      nw = prev.w;
    }
    const perfect = Math.abs(nx - prev.x) < 0.18 && Math.abs(nz - prev.z) < 0.18 &&
      Math.abs(nw - prev.w) < 0.18 && Math.abs(nd - prev.d) < 0.18;
    if (perfect) {
      nx = prev.x;
      nz = prev.z;
      nw = prev.w;
      nd = prev.d;
    }
    layers.push({ x: nx, z: nz, w: nw, d: nd, color: moving.color });
    const score = layers.length - 1;
    scoreEl.textContent = String(score);
    if (score > best) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = String(best);
    }
    chord(perfect, score);
    msgEl.textContent = perfect ? 'Locked.' : 'Cut.';
    moving = spawn(layers[layers.length - 1], score);
    launch(moving, layers[layers.length - 1]);
  }

  function fail() {
    alive = false;
    moving = null;
    thud();
    msgEl.textContent = 'Miss. Tap to stack again.';
  }

  function openStack() {
    if (typeof window.closeSeq === 'function') window.closeSeq();
    if (typeof window.closeStems === 'function') window.closeStems();
    overlay.classList.add('open');
    open = true;
    reset();
    cancelAnimationFrame(raf);
    requestAnimationFrame(() => {
      sizeCanvas();
      raf = requestAnimationFrame(tick);
    });
  }

  function closeStack() {
    overlay.classList.remove('open');
    open = false;
    alive = false;
    cancelAnimationFrame(raf);
  }

  window.openStack = openStack;
  window.closeStack = closeStack;

  trigger.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ensureAudio();
    openStack();
  });
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeStack();
  });
  panel.addEventListener('pointerdown', (e) => {
    if (e.target === closeBtn || closeBtn.contains(e.target)) return;
    e.preventDefault();
    ensureAudio();
    place();
  });
  window.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      ensureAudio();
      place();
    }
  });
  window.addEventListener('resize', () => {
    if (open) sizeCanvas();
  });
})();
