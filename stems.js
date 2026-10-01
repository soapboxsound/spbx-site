(function () {
  const msgEl = document.getElementById('stemLexicon');
  const listEl = document.getElementById('stemOnList');
  const noteEl = document.getElementById('stemNote');
  if (!msgEl) return;

  // One bed. Each pad is a treatment of that bed, not a separate volume.
  // Later: a looping file in stems-private/ can replace the synth via BED_SRC.
  const BED_SRC = '';
  const STEMS = [
    { id: 'warmth', face: 'top', word: 'Warmth', note: 'Rounder, darker, more analog. The harmonic body.' },
    { id: 'bite', face: 'bottom', word: 'Bite', note: 'Brighter, sharper, more attack. Teeth in the track.' },
    { id: 'air', face: 'front', word: 'Air', note: 'Farther away. Space and shimmer on top.' },
    { id: 'close', face: 'back', word: 'Close', note: 'Near-mic. Dry, present, in the room with you.' },
    { id: 'weight', face: 'right', word: 'Weight', note: 'Heavier. Sub, chest, the floor of the mix.' },
    { id: 'pulse', face: 'left', word: 'Pulse', note: 'The heartbeat. Same music, now it moves in time.' }
  ];

  const FACE_CLASS = {
    top: 'cf-top',
    bottom: 'cf-bottom',
    front: 'cf-front',
    back: 'cf-back',
    right: 'cf-right',
    left: 'cf-left'
  };

  const BPM = 90;
  const SIXTEENTH = 60 / BPM / 4;

  let open = false;
  let audio;
  let graph = null;
  let clockTimer = 0;
  let nextTime = 0;
  let step = 0;
  let lastSay = '';
  let masterOn = false;
  let faderStem = null;
  let faderStartY = 0;
  let faderStartA = 0;
  let faderMoved = false;
  const amount = {};
  STEMS.forEach((stem) => { amount[stem.id] = 0; });

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audio) audio = new AC();
    if (audio.state === 'suspended') audio.resume();
    return audio;
  }

  function makeGain(ac, dest, value) {
    const g = ac.createGain();
    g.gain.value = value == null ? 0.0001 : value;
    if (dest) g.connect(dest);
    return g;
  }

  function shaperCurve(drive) {
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * drive);
    }
    return curve;
  }

  function buildBed(ac, dest) {
    if (BED_SRC) {
      const el = new Audio(BED_SRC);
      el.loop = true;
      el.preload = 'auto';
      const src = ac.createMediaElementSource(el);
      src.connect(dest);
      return el;
    }
    const oscs = [];
    function osc(type, freq) {
      const o = ac.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      oscs.push(o);
      return o;
    }
    const filt = ac.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 1400;
    filt.Q.value = 0.8;
    osc('triangle', 196).connect(filt);
    osc('sine', 233.08).connect(filt);
    osc('sine', 293.66).connect(filt);
    osc('triangle', 392).connect(filt);
    filt.connect(dest);
    oscs.forEach((o) => o.start());
    return null;
  }

  function buildTreatments(ac, bed, master) {
    const pulseGate = makeGain(ac, master, 1);
    bed.connect(pulseGate);

    const dry = makeGain(ac, master, 0.34);
    pulseGate.connect(dry);

    const warmSh = ac.createWaveShaper();
    const warmFilt = ac.createBiquadFilter();
    const warmGain = makeGain(ac, master, 0.0001);
    warmSh.curve = shaperCurve(2.4);
    warmFilt.type = 'lowpass';
    warmFilt.frequency.value = 3800;
    warmFilt.Q.value = 0.9;
    pulseGate.connect(warmSh);
    warmSh.connect(warmFilt);
    warmFilt.connect(warmGain);

    const biteSh = ac.createWaveShaper();
    const biteHip = ac.createBiquadFilter();
    const bitePeak = ac.createBiquadFilter();
    const biteGain = makeGain(ac, master, 0.0001);
    biteSh.curve = shaperCurve(6.5);
    biteHip.type = 'highpass';
    biteHip.frequency.value = 400;
    bitePeak.type = 'peaking';
    bitePeak.frequency.value = 3200;
    bitePeak.Q.value = 1.4;
    bitePeak.gain.value = 0;
    pulseGate.connect(biteSh);
    biteSh.connect(biteHip);
    biteHip.connect(bitePeak);
    bitePeak.connect(biteGain);

    const airHip = ac.createBiquadFilter();
    const airDelay = ac.createDelay();
    const airFb = makeGain(ac, airDelay, 0.42);
    const airGain = makeGain(ac, master, 0.0001);
    airHip.type = 'highpass';
    airHip.frequency.value = 1600;
    airDelay.delayTime.value = 0.38;
    pulseGate.connect(airHip);
    airHip.connect(airGain);
    airGain.connect(airDelay);
    airDelay.connect(airFb);
    airDelay.connect(master);

    const closePeak = ac.createBiquadFilter();
    const closeGain = makeGain(ac, master, 0.0001);
    closePeak.type = 'peaking';
    closePeak.frequency.value = 1250;
    closePeak.Q.value = 1.2;
    closePeak.gain.value = 0;
    pulseGate.connect(closePeak);
    closePeak.connect(closeGain);

    const weightShelf = ac.createBiquadFilter();
    const weightGain = makeGain(ac, master, 1);
    weightShelf.type = 'lowshelf';
    weightShelf.frequency.value = 110;
    weightShelf.gain.value = 0;
    pulseGate.connect(weightShelf);
    weightShelf.connect(weightGain);

    const sub = ac.createOscillator();
    const subGain = makeGain(ac, master, 0.0001);
    sub.type = 'sine';
    sub.frequency.value = 49;
    sub.connect(subGain);
    sub.start();

    return {
      pulseGate: pulseGate,
      dry: dry,
      warmth: { gain: warmGain, filt: warmFilt },
      bite: { gain: biteGain, hip: biteHip, peak: bitePeak },
      air: { gain: airGain },
      close: { gain: closeGain, peak: closePeak },
      weight: { shelf: weightShelf, sub: subGain }
    };
  }

  function scheduleStep(t, s) {
    if (!graph || !graph.fx) return;
    const depth = amount.pulse;
    let openAmt = 1;
    if (s === 0 || s === 8) openAmt = 1;
    else if (s === 4 || s === 12) openAmt = 0.52;
    else openAmt = 0.16;
    const val = Math.max(0.0001, 1 - depth * (1 - openAmt));
    graph.fx.pulseGate.gain.setValueAtTime(val, t);
  }

  function scheduler() {
    if (!open || !audio || !graph) return;
    const horizon = audio.currentTime + 0.12;
    while (nextTime < horizon) {
      scheduleStep(nextTime, step);
      nextTime += SIXTEENTH;
      step = (step + 1) % 16;
    }
  }

  function ensureClock() {
    if (!open || !audio || audio.state !== 'running' || clockTimer) return;
    if (!nextTime) nextTime = audio.currentTime + 0.04;
    scheduler();
    clockTimer = window.setInterval(scheduler, 25);
  }

  function stopClock() {
    if (clockTimer) window.clearInterval(clockTimer);
    clockTimer = 0;
    nextTime = 0;
    step = 0;
  }

  function ensureGraph() {
    const ac = ensureAudio();
    if (!ac) return null;
    if (graph) return graph;
    const master = ac.createGain();
    master.gain.value = 0.0001;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 2.4;
    comp.attack.value = 0.02;
    comp.release.value = 0.22;
    master.connect(comp);
    comp.connect(ac.destination);

    const bed = makeGain(ac, null, 0.62);
    const file = buildBed(ac, bed);
    const fx = buildTreatments(ac, bed, master);
    graph = { master: master, bed: bed, fx: fx, file: file };
    return graph;
  }

  function fadeMaster(on) {
    if (!graph || !audio) return;
    const want = !!on;
    if (want === masterOn) return;
    masterOn = want;
    graph.master.gain.cancelScheduledValues(audio.currentTime);
    graph.master.gain.setTargetAtTime(want ? 0.9 : 0.0001, audio.currentTime, want ? 0.08 : 0.12);
  }

  function faceEl(stem) {
    return document.querySelector('.' + FACE_CLASS[stem.face]);
  }

  function mix() {
    if (!graph || !audio || !graph.fx) return;
    const t = audio.currentTime;
    const a = amount;
    const fx = graph.fx;
    fx.dry.gain.setTargetAtTime(Math.max(0.08, 0.3 + a.close * 0.1 - a.air * 0.12), t, 0.05);
    fx.warmth.gain.gain.setTargetAtTime(Math.max(0.0001, a.warmth * 0.72), t, 0.05);
    fx.warmth.filt.frequency.setTargetAtTime(4000 - a.warmth * 3200, t, 0.08);
    fx.bite.gain.gain.setTargetAtTime(Math.max(0.0001, a.bite * 0.58), t, 0.05);
    fx.bite.hip.frequency.setTargetAtTime(220 + a.bite * 1400, t, 0.05);
    fx.bite.peak.gain.setTargetAtTime(a.bite * 11, t, 0.05);
    fx.air.gain.gain.setTargetAtTime(Math.max(0.0001, a.air * (1 - a.close * 0.7) * 0.7), t, 0.05);
    fx.close.gain.gain.setTargetAtTime(Math.max(0.0001, a.close * 0.6), t, 0.05);
    fx.close.peak.gain.setTargetAtTime(a.close * 9, t, 0.05);
    fx.weight.shelf.gain.setTargetAtTime(a.weight * 13, t, 0.05);
    fx.weight.sub.gain.setTargetAtTime(Math.max(0.0001, a.weight * 0.48), t, 0.05);
    fadeMaster(open);
    if (open) ensureClock();
  }

  function paint() {
    STEMS.forEach((stem) => {
      const el = faceEl(stem);
      if (!el) return;
      const a = amount[stem.id];
      el.classList.toggle('is-stem', a > 0.08);
      el.style.setProperty('--stem', a.toFixed(3));
      if (!open) {
        el.style.removeProperty('--stem');
        el.style.opacity = '';
      }
    });
    if (listEl) {
      const words = STEMS
        .filter((stem) => amount[stem.id] > 0.08)
        .sort((a, b) => amount[b.id] - amount[a.id])
        .map((stem) => stem.word);
      listEl.textContent = words.join('  ·  ');
    }
  }

  function idleCopy() {
    say('Same music.');
    if (noteEl) noteEl.textContent = 'Each word is a treatment. Tap Warmth, then Bite.';
  }

  function explain(stem) {
    say(stem.word + '.');
    if (noteEl) noteEl.textContent = stem.note;
  }

  function say(text) {
    if (text === lastSay) return;
    lastSay = text;
    msgEl.textContent = text;
  }

  function sayBlend() {
    const ranked = STEMS
      .map((stem) => ({ stem: stem, a: amount[stem.id] }))
      .filter((row) => row.a > 0.08)
      .sort((a, b) => b.a - a.a);
    if (!ranked.length) {
      idleCopy();
      return;
    }
    if (faderStem) {
      explain(faderStem);
      return;
    }
    say(ranked.slice(0, 3).map((row) => row.stem.word).join(' · '));
    if (noteEl) noteEl.textContent = ranked[0].stem.note;
  }

  function setAmount(stem, value) {
    amount[stem.id] = Math.max(0, Math.min(1, value));
    mix();
    paint();
  }

  function startFiles() {
    if (!graph || !graph.file) return;
    const play = graph.file.play();
    if (play && play.catch) play.catch(function () {});
  }

  function stopFiles() {
    if (!graph || !graph.file) return;
    graph.file.pause();
  }

  function armAudio() {
    const ac = ensureAudio();
    if (!ac) return;
    if (!graph) ensureGraph();
    startFiles();
    mix();
  }

  function openStems() {
    if (typeof window.closeSeq === 'function') window.closeSeq();
    if (typeof window.closeStack === 'function') window.closeStack();
    STEMS.forEach((stem) => { amount[stem.id] = 0; });
    open = true;
    lastSay = '';
    document.body.classList.add('is-stems');
    const cube = document.querySelector('[data-cube]');
    if (cube) cube.style.transform = '';
    idleCopy();
    paint();
    ensureGraph();
    fadeMaster(false);
  }

  function closeStems() {
    if (!open) return;
    open = false;
    faderStem = null;
    STEMS.forEach((stem) => { amount[stem.id] = 0; });
    document.body.classList.remove('is-stems');
    stopClock();
    paint();
    mix();
    stopFiles();
    fadeMaster(false);
    masterOn = false;
    lastSay = '';
    idleCopy();
  }

  window.openStems = openStems;
  window.closeStems = closeStems;
  window.spbxStemFace = function () {};

  window.addEventListener('keydown', (e) => {
    if (open && e.key === 'Escape') closeStems();
  });

  const brand = document.querySelector('.brand');
  if (brand) {
    brand.addEventListener('click', () => {
      if (open) closeStems();
    });
  }

  STEMS.forEach((stem) => {
    const el = faceEl(stem);
    if (!el) return;
    el.addEventListener('pointerdown', (e) => {
      if (!open) return;
      e.preventDefault();
      e.stopPropagation();
      armAudio();
      faderStem = stem;
      faderStartY = e.clientY;
      faderStartA = amount[stem.id];
      faderMoved = false;
      explain(stem);
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
    });
    el.addEventListener('pointermove', (e) => {
      if (!open || faderStem !== stem) return;
      const dy = e.clientY - faderStartY;
      if (Math.abs(dy) < 6) return;
      faderMoved = true;
      const h = el.getBoundingClientRect().height || 88;
      setAmount(stem, faderStartA - dy / h);
      explain(stem);
    });
    function endFader() {
      if (faderStem !== stem) return;
      if (!faderMoved && faderStartA < 0.12) setAmount(stem, 0.8);
      faderStem = null;
      faderMoved = false;
      if (amount[stem.id] > 0.08) explain(stem);
      else sayBlend();
    }
    el.addEventListener('pointerup', endFader);
    el.addEventListener('pointercancel', endFader);
  });
})();
