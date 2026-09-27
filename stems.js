(function () {
  const overlay = document.getElementById('stemOverlay');
  const panel = document.getElementById('stemPanel');
  const tray = document.getElementById('stemTray');
  const bedsRoot = document.getElementById('stemBeds');
  const closeBtn = document.getElementById('stemClose');
  const msgEl = document.getElementById('stemMsg');
  if (!overlay || !tray || !bedsRoot || !closeBtn) return;

  const BEDS = [
    { id: 'gold', name: 'Warmth' },
    { id: 'blue', name: 'Air' },
    { id: 'ink', name: 'Weight' }
  ];

  let open = false;
  let audio;
  let graph = null;
  let queue = [];
  let locked = {};
  let current = null;
  let drag = null;
  let audition = false;

  function shuffle(list) {
    const next = list.slice();
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = next[i];
      next[i] = next[j];
      next[j] = t;
    }
    return next;
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
    osc.type = type || 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function buildGraph(ac) {
    const master = ac.createGain();
    master.gain.value = 0.0001;
    master.connect(ac.destination);

    const gold = ac.createGain();
    const blue = ac.createGain();
    const ink = ac.createGain();
    gold.connect(master);
    blue.connect(master);
    ink.connect(master);

    const warm = ac.createOscillator();
    const warm3 = ac.createOscillator();
    const warm5 = ac.createOscillator();
    const warmFilter = ac.createBiquadFilter();
    const warmAmp = ac.createGain();
    warm.type = 'triangle';
    warm3.type = 'triangle';
    warm5.type = 'sine';
    warm.frequency.value = 196;
    warm3.frequency.value = 246.94;
    warm5.frequency.value = 293.66;
    warmFilter.type = 'lowpass';
    warmFilter.frequency.value = 740;
    warmFilter.Q.value = 1.6;
    warmAmp.gain.value = 0.22;
    const warmLfo = ac.createOscillator();
    const warmLfoGain = ac.createGain();
    warmLfo.frequency.value = 0.08;
    warmLfoGain.gain.value = 90;
    warmLfo.connect(warmLfoGain);
    warmLfoGain.connect(warmFilter.frequency);
    warm.connect(warmFilter);
    warm3.connect(warmFilter);
    warm5.connect(warmFilter);
    warmFilter.connect(warmAmp);
    warmAmp.connect(gold);

    const air = ac.createOscillator();
    const air2 = ac.createOscillator();
    const airFilter = ac.createBiquadFilter();
    const airAmp = ac.createGain();
    const delay = ac.createDelay();
    const delayGain = ac.createGain();
    air.type = 'sine';
    air2.type = 'sine';
    air.frequency.value = 587.33;
    air2.frequency.value = 784;
    airFilter.type = 'highpass';
    airFilter.frequency.value = 420;
    airAmp.gain.value = 0.09;
    delay.delayTime.value = 0.36;
    delayGain.gain.value = 0.42;
    air.connect(airFilter);
    air2.connect(airFilter);
    airFilter.connect(airAmp);
    airAmp.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(delay);
    delayGain.connect(blue);
    airAmp.connect(blue);

    const sub = ac.createOscillator();
    const sub5 = ac.createOscillator();
    const subFilter = ac.createBiquadFilter();
    const inkAmp = ac.createGain();
    sub.type = 'sine';
    sub5.type = 'sine';
    sub.frequency.value = 49;
    sub5.frequency.value = 73.42;
    subFilter.type = 'lowpass';
    subFilter.frequency.value = 130;
    inkAmp.gain.value = 0.15;
    const pulse = ac.createOscillator();
    const pulseGain = ac.createGain();
    pulse.frequency.value = 1.4;
    pulseGain.gain.value = 0.11;
    pulse.connect(pulseGain);
    pulseGain.connect(inkAmp.gain);
    sub.connect(subFilter);
    sub5.connect(subFilter);
    subFilter.connect(inkAmp);
    inkAmp.connect(ink);

    [warm, warm3, warm5, warmLfo, air, air2, sub, sub5, pulse].forEach((osc) => osc.start());
    return { master, stems: { gold, blue, ink } };
  }

  function mixFor() {
    if (!graph || !audio) return;
    const done = Object.keys(locked).length === 3;
    BEDS.forEach((bed) => {
      let val = 0.0001;
      if (done) val = 0.22;
      else if (locked[bed.id]) val = 0.16;
      if (audition && current === bed.id) val = 0.36;
      graph.stems[bed.id].gain.setTargetAtTime(val, audio.currentTime, 0.06);
    });
  }

  function fadeMaster(on) {
    if (!graph || !audio) return;
    graph.master.gain.cancelScheduledValues(audio.currentTime);
    graph.master.gain.setTargetAtTime(on ? 0.26 : 0.0001, audio.currentTime, on ? 0.12 : 0.08);
  }

  function hearCurrent() {
    if (!current || locked[current]) return;
    const ac = ensureAudio();
    if (ac && !graph) graph = buildGraph(ac);
    audition = true;
    fadeMaster(true);
    mixFor();
    if (Object.keys(locked).length) msgEl.textContent = 'Now this one.';
    else msgEl.textContent = 'Warmth, air, or weight.';
  }

  function render() {
    tray.innerHTML = '';
    bedsRoot.innerHTML = '';
    if (current) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'stem-chip';
      chip.dataset.stem = current;
      chip.setAttribute('aria-label', 'Stem. Hold to hear.');
      chip.innerHTML = '<span class="stem-chip-bars" aria-hidden="true"><i></i><i></i><i></i></span>';
      tray.appendChild(chip);
      bindChip(chip);
    }
    BEDS.forEach((bed) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'stem-bed' + (locked[bed.id] ? ' is-locked' : '');
      el.dataset.bed = bed.id;
      el.setAttribute('aria-label', bed.name);
      el.innerHTML = '<span class="stem-bed-face"></span><span class="stem-bed-name">' + bed.name + '</span>';
      el.addEventListener('click', () => {
        if (!current || locked[bed.id] || drag) return;
        place(current, bed.id);
      });
      bedsRoot.appendChild(el);
    });
  }

  function place(stemId, bedId) {
    if (!open || !stemId || locked[bedId]) return;
    if (bedId !== stemId) {
      tone(70, 0.28, 0.05, 'sine');
      msgEl.textContent = 'Different stem.';
      hearCurrent();
      return;
    }
    locked[stemId] = true;
    audition = false;
    const next = queue.find((id) => !locked[id]) || null;
    current = next;
    if (!next) {
      mixFor();
      tone(196, 0.42, 0.06, 'triangle');
      tone(247, 0.42, 0.04, 'sine');
      tone(330, 0.5, 0.05, 'sine');
      msgEl.textContent = 'The bed.';
    } else {
      msgEl.textContent = 'In. Next stem.';
      mixFor();
    }
    render();
  }

  function dropAt(stemId, x, y) {
    const bed = BEDS.find((item) => {
      const el = bedsRoot.querySelector('[data-bed="' + item.id + '"]');
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
    if (!bed) {
      mixFor();
      return;
    }
    place(stemId, bed.id);
  }

  function bindChip(chip) {
    chip.addEventListener('pointerdown', (e) => {
      if (e.button && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      hearCurrent();
      const ghost = chip.cloneNode(true);
      ghost.classList.add('is-drag');
      ghost.style.width = chip.offsetWidth + 'px';
      ghost.style.height = chip.offsetHeight + 'px';
      document.body.appendChild(ghost);
      chip.classList.add('is-origin');
      const shiftX = chip.offsetWidth / 2;
      const shiftY = chip.offsetHeight / 2;
      ghost.style.left = (e.clientX - shiftX) + 'px';
      ghost.style.top = (e.clientY - shiftY) + 'px';
      drag = { stemId: chip.dataset.stem, ghost, chip, shiftX, shiftY, moved: false };
      try { chip.setPointerCapture(e.pointerId); } catch (err) {}

      function move(ev) {
        if (!drag) return;
        if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) > 6) drag.moved = true;
        drag.ghost.style.left = (ev.clientX - drag.shiftX) + 'px';
        drag.ghost.style.top = (ev.clientY - drag.shiftY) + 'px';
        bedsRoot.querySelectorAll('.stem-bed').forEach((el) => {
          const r = el.getBoundingClientRect();
          const over = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
          el.classList.toggle('is-over', over && !el.classList.contains('is-locked'));
        });
      }
      function up(ev) {
        chip.removeEventListener('pointermove', move);
        chip.removeEventListener('pointerup', up);
        chip.removeEventListener('pointercancel', up);
        if (!drag) return;
        const held = drag;
        drag = null;
        held.ghost.remove();
        held.chip.classList.remove('is-origin');
        bedsRoot.querySelectorAll('.stem-bed').forEach((el) => el.classList.remove('is-over'));
        if (held.moved) dropAt(held.stemId, ev.clientX, ev.clientY);
      }
      chip.addEventListener('pointermove', move);
      chip.addEventListener('pointerup', up);
      chip.addEventListener('pointercancel', up);
    });
  }

  function reset() {
    queue = shuffle(BEDS.map((bed) => bed.id));
    locked = {};
    current = queue[0];
    drag = null;
    audition = false;
    msgEl.textContent = 'Hold the stem. Find its face.';
    render();
    mixFor();
  }

  function openStems() {
    if (typeof window.closeSeq === 'function') window.closeSeq();
    if (typeof window.closeStack === 'function') window.closeStack();
    overlay.classList.add('open');
    open = true;
    const ac = ensureAudio();
    if (ac && !graph) graph = buildGraph(ac);
    fadeMaster(false);
    reset();
  }

  function closeStems() {
    overlay.classList.remove('open');
    open = false;
    audition = false;
    if (drag) {
      drag.ghost.remove();
      drag = null;
    }
    document.querySelectorAll('.stem-chip.is-drag').forEach((n) => n.remove());
    fadeMaster(false);
  }

  window.openStems = openStems;
  window.closeStems = closeStems;

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeStems();
  });
  if (panel) {
    panel.addEventListener('pointerdown', () => ensureAudio());
  }
  window.addEventListener('keydown', (e) => {
    if (open && e.key === 'Escape') closeStems();
  });
})();
