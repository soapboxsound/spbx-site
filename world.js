(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cubes = Array.from(document.querySelectorAll('[data-cube]'));
  const rig = document.getElementById('rig');
  const orbiters = Array.from(document.querySelectorAll('[data-orbit]'));
  if (!cubes.length && !rig && !orbiters.length) return;

  const GOLD = [184, 151, 58];
  const BLUE = [74, 127, 165];
  const INK = [32, 34, 38];
  const REST_X = -26;

  let px = 0, py = 0, cx = 0, cy = 0;
  let dragVel = 0;
  window.spbxDragging = false;
  window.spbxWash = { r: BLUE[0], g: BLUE[1], b: BLUE[2] };

  window.addEventListener('pointermove', (e) => {
    px = e.clientX / window.innerWidth - 0.5;
    py = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  const cubeY = cubes.map((el) => parseFloat(el.dataset.start || '32'));
  const cubeX = cubes.map(() => 0);
  const xVel = cubes.map(() => 0);
  const boost = cubes.map(() => 0);
  const t0 = performance.now();

  window.spbxTurn = function (deg, replace) {
    if (reduce || !cubes.length) return;
    if (replace) boost[0] = deg;
    else boost[0] += deg;
  };

  window.spbxSetY = function (ry) {
    if (!cubes.length) return;
    cubeY[0] = ry;
    boost[0] = 0;
  };

  window.spbxPose = { rx: REST_X, ry: 32 };

  window.spbxFacingFace = function () {
    const rx = window.spbxPose.rx;
    const ry = window.spbxPose.ry;
    const faces = [
      { key: 'front', z: visZ(0, 0, 1, rx, ry) },
      { key: 'right', z: visZ(1, 0, 0, rx, ry) },
      { key: 'back', z: visZ(0, 0, -1, rx, ry) },
      { key: 'left', z: visZ(-1, 0, 0, rx, ry) }
    ];
    faces.sort((a, b) => b.z - a.z);
    return faces[0].key;
  };

  window.spbxFaceVis = function () {
    const rx = window.spbxPose.rx;
    const ry = window.spbxPose.ry;
    return {
      front: visZ(0, 0, 1, rx, ry),
      right: visZ(1, 0, 0, rx, ry),
      back: visZ(0, 0, -1, rx, ry),
      left: visZ(-1, 0, 0, rx, ry)
    };
  };

  window.spbxFaceDepth = function () {
    const rx = window.spbxPose.rx;
    const ry = window.spbxPose.ry;
    return {
      front: faceZ(0, 0, 1, rx, ry),
      right: faceZ(1, 0, 0, rx, ry),
      back: faceZ(0, 0, -1, rx, ry),
      left: faceZ(-1, 0, 0, rx, ry)
    };
  };

  window.spbxSpin = function (dx, dy) {
    if (!cubes.length) return;
    boost[0] += dx * 0.62;
    dragVel += dx * 0.045;
    if (typeof dy === 'number' && !document.body.classList.contains('is-reel')) {
      xVel[0] += dy * 0.07;
    }
  };

  function wrap180(a) {
    return ((a + 180) % 360 + 360) % 360 - 180;
  }

  function visZ(nx, ny, nz, rxDeg, ryDeg) {
    return Math.max(0, faceZ(nx, ny, nz, rxDeg, ryDeg));
  }

  function faceZ(nx, ny, nz, rxDeg, ryDeg) {
    const rx = rxDeg * Math.PI / 180;
    const ry = ryDeg * Math.PI / 180;
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const x = nx * cy + nz * sy;
    const z = -nx * sy + nz * cy;
    const y = ny;
    return y * sx + z * cx;
  }

  function lightRoom(rx, ry) {
    const gold = visZ(0, 1, 0, rx, ry) + visZ(0, -1, 0, rx, ry);
    const blue = visZ(0, 0, 1, rx, ry) + visZ(0, 0, -1, rx, ry);
    const ink = visZ(1, 0, 0, rx, ry) + visZ(-1, 0, 0, rx, ry);
    const emit = gold + blue;
    let r, g, b;
    if (emit < 0.08) {
      r = INK[0]; g = INK[1]; b = INK[2];
    } else {
      r = (GOLD[0] * gold + BLUE[0] * blue) / emit;
      g = (GOLD[1] * gold + BLUE[1] * blue) / emit;
      b = (GOLD[2] * gold + BLUE[2] * blue) / emit;
      const dim = emit / (emit + ink * 0.55);
      r = INK[0] + (r - INK[0]) * dim;
      g = INK[1] + (g - INK[1]) * dim;
      b = INK[2] + (b - INK[2]) * dim;
    }
    window.spbxWash.r = r;
    window.spbxWash.g = g;
    window.spbxWash.b = b;
    const root = document.documentElement;
    root.style.setProperty('--wash-r', r.toFixed(1));
    root.style.setProperty('--wash-g', g.toFixed(1));
    root.style.setProperty('--wash-b', b.toFixed(1));
  }

  function tick(now) {
    cx += (px - cx) * 0.08;
    cy += (py - cy) * 0.08;
    const tiltY = cx * 32;
    const tiltX = cy * -22;
    dragVel *= 0.92;
    if (Math.abs(dragVel) < 0.02) dragVel = 0;
    const t = (now - t0) / 1000;
    const dragging = !!window.spbxDragging;

    cubes.forEach((el, i) => {
      if (!reduce) {
        cubeY[i] += parseFloat(el.dataset.speed || '0.4') + dragVel;
        cubeX[i] += xVel[i];
        if (dragging) {
          xVel[i] *= 0.96;
        } else {
          xVel[i] += -wrap180(cubeX[i]) * 0.032;
          xVel[i] *= 0.9;
        }
        if (Math.abs(xVel[i]) < 0.01) xVel[i] = 0;
      }
      if (boost[i]) {
        const step = boost[i] * 0.14;
        cubeY[i] += step;
        boost[i] -= step;
        if (Math.abs(boost[i]) < 0.3) boost[i] = 0;
      }
      const rx = REST_X + wrap180(cubeX[i]);
      const ry = cubeY[i];
      el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      if (i === 0) {
        window.spbxPose.rx = rx;
        window.spbxPose.ry = ry;
        lightRoom(rx, ry);
      }
    });

    if (rig) {
      rig.style.transform = `rotateX(${-8 + tiltX}deg) rotateY(${12 + tiltY}deg)`;
    }

    if (!reduce) {
      const scale = window.innerWidth < 700 ? 0.45 : 1;
      orbiters.forEach((el) => {
        const a = parseFloat(el.dataset.a) + t * parseFloat(el.dataset.spd || '18');
        const r = parseFloat(el.dataset.r || '280') * scale;
        const y = parseFloat(el.dataset.y || '0') * scale;
        el.style.transform = `rotateY(${a}deg) translateZ(${r}px) translateY(${y}px) rotateY(${-a}deg) translate(-50%, -50%)`;
      });
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
