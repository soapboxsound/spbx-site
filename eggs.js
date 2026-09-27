(function () {
  const ORDER = ['gold', 'blue', 'ink'];
  const NOTES = { gold: 196, blue: 247, ink: 330 };
  const sculpture = document.querySelector('.sculpture');
  const listenBtn = document.getElementById('boothListen');
  const FACE = {
    'cf-top': 'gold',
    'cf-bottom': 'gold',
    'cf-front': 'blue',
    'cf-back': 'blue',
    'cf-right': 'ink',
    'cf-left': 'ink'
  };

  let audio;
  let boothGraph = null;
  let boothOn = false;
  let seq = [];
  let seqTimer = 0;
  let typed = '';
  let typeTimer = 0;

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
    filt.frequency.setValueAtTime(1600, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filt);
    filt.connect(g);
    g.connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  function buildBooth(ac) {
    const master = ac.createGain();
    master.gain.value = 0.0001;
    master.connect(ac.destination);

    const sub = ac.createOscillator();
    const subGain = ac.createGain();
    sub.type = 'sine';
    sub.frequency.value = 55;
    subGain.gain.value = 0.18;
    sub.connect(subGain);
    subGain.connect(master);

    const pad = ac.createOscillator();
    const pad2 = ac.createOscillator();
    const padFilter = ac.createBiquadFilter();
    const padGain = ac.createGain();
    pad.type = 'triangle';
    pad2.type = 'triangle';
    pad.frequency.value = 110;
    pad2.frequency.value = 164.8;
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 380;
    padFilter.Q.value = 2.8;
    padGain.gain.value = 0.2;
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 0.06;
    lfoGain.gain.value = 160;
    lfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    pad.connect(padFilter);
    pad2.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(master);

    const air = ac.createOscillator();
    const airGain = ac.createGain();
    const delay = ac.createDelay();
    air.type = 'sine';
    air.frequency.value = 659.25;
    airGain.gain.value = 0.03;
    delay.delayTime.value = 0.42;
    air.connect(airGain);
    airGain.connect(delay);
    delay.connect(master);
    airGain.connect(master);

    [sub, pad, pad2, lfo, air].forEach((osc) => osc.start());
    return master;
  }

  function setBoothPlaying(on) {
    const ac = ensureAudio();
    if (!ac) return;
    if (!boothGraph) boothGraph = buildBooth(ac);
    boothOn = !!on;
    boothGraph.gain.cancelScheduledValues(ac.currentTime);
    boothGraph.gain.setTargetAtTime(boothOn ? 0.2 : 0.0001, ac.currentTime, boothOn ? 0.18 : 0.12);
    if (listenBtn) {
      listenBtn.classList.toggle('is-on', boothOn);
      listenBtn.textContent = boothOn ? 'Listening.' : 'Listen';
    }
  }

  window.spbxBooth = function (on) {
    if (on) {
      if (typeof window.closeSeq === 'function') window.closeSeq();
      if (typeof window.closeStack === 'function') window.closeStack();
      if (typeof window.closeStems === 'function') window.closeStems();
      setBoothPlaying(true);
    } else if (boothOn) {
      setBoothPlaying(false);
    }
  };

  function openBooth() {
    if (typeof window.spbxRoom === 'function') window.spbxRoom('booth');
    else location.hash = '#booth';
    ensureAudio();
  }

  window.openBooth = openBooth;

  if (listenBtn) {
    listenBtn.addEventListener('click', () => {
      ensureAudio();
      setBoothPlaying(!boothOn);
    });
  }

  function faceFrom(el) {
    if (!el || !el.classList) return null;
    const hit = Object.keys(FACE).find((name) => el.classList.contains(name));
    return hit ? FACE[hit] : null;
  }

  window.spbxFaceTap = function (el) {
    if (document.body.classList.contains('is-booth')) return;
    if (document.body.classList.contains('is-work')) {
      if (typeof window.spbxReelFace === 'function') window.spbxReelFace(el);
      return;
    }
    if (document.querySelector('.game-overlay.open, .seq-overlay.open, .stem-overlay.open')) return;
    const color = faceFrom(el);
    if (!color) return;
    const expect = ORDER[seq.length];
    if (color !== expect) {
      seq = color === ORDER[0] ? [color] : [];
      tone(64, 0.22, 0.04, 'sine');
      return;
    }
    seq.push(color);
    tone(NOTES[color], 0.28, 0.055, color === 'ink' ? 'sine' : 'triangle');
    window.clearTimeout(seqTimer);
    if (seq.length < ORDER.length) {
      seqTimer = window.setTimeout(() => { seq = []; }, 7000);
      return;
    }
    seq = [];
    tone(196, 0.5, 0.06, 'triangle');
    tone(247, 0.5, 0.04, 'sine');
    tone(392, 0.62, 0.05, 'sine');
    if (sculpture) {
      sculpture.classList.remove('is-lit');
      void sculpture.offsetWidth;
      sculpture.classList.add('is-lit');
      window.setTimeout(() => sculpture.classList.remove('is-lit'), 1800);
    }
    window.setTimeout(() => {
      if (typeof window.openStems === 'function') window.openStems();
    }, 720);
  };

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
    if (e.key === 'Escape') {
      if (typeof window.closeStems === 'function') window.closeStems();
      return;
    }
    const ch = e.key.length === 1 ? e.key.toLowerCase() : '';
    if (!ch || !/[a-z]/.test(ch)) return;
    typed += ch;
    if (typed.length > 4) typed = typed.slice(-4);
    window.clearTimeout(typeTimer);
    typeTimer = window.setTimeout(() => { typed = ''; }, 1600);
    if (typed === 'spbx') {
      typed = '';
      ensureAudio();
      openBooth();
    }
  });

  if (document.body.classList.contains('is-booth')) setBoothPlaying(true);
})();
