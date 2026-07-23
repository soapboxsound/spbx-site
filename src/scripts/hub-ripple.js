const rippleCanvas = document.getElementById('ripple');
if (rippleCanvas) {
  const rCtx = rippleCanvas.getContext('2d');

  function resize() {
    rippleCanvas.width = window.innerWidth;
    rippleCanvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function isLightTheme() {
    return document.body.classList.contains('theme-light');
  }

  const drops = [
    { x:0.12, y:0.08, maxR:220, delay:0    },
    { x:0.85, y:0.06, maxR:280, delay:1800 },
    { x:0.55, y:0.15, maxR:180, delay:3500 },
    { x:0.25, y:0.45, maxR:240, delay:800  },
    { x:0.78, y:0.55, maxR:200, delay:5000 },
    { x:0.92, y:0.30, maxR:160, delay:2600 },
    { x:0.08, y:0.70, maxR:260, delay:4200 },
    { x:0.45, y:0.80, maxR:190, delay:1200 },
    { x:0.68, y:0.88, maxR:220, delay:6000 },
    { x:0.30, y:0.20, maxR:170, delay:3000 },
  ];

  let rippleStart = null;
  function drawRipple(ts) {
    requestAnimationFrame(drawRipple);
    if (!rippleStart) rippleStart = ts;
    const elapsed = ts - rippleStart;
    const W = rippleCanvas.width;
    const H = rippleCanvas.height;
    const light = isLightTheme();
    const outerAlpha = light ? 0.10 : 0.09;
    const innerAlpha = light ? 0.05 : 0.05;
    rCtx.clearRect(0, 0, W, H);
    for (const d of drops) {
      const t = ((elapsed - d.delay) % 9000) / 9000;
      if (t < 0) continue;
      const r = t * d.maxR;
      const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;
      rCtx.beginPath();
      rCtx.arc(d.x * W, d.y * H, r, 0, Math.PI * 2);
      rCtx.strokeStyle = `rgba(168,135,74,${alpha * outerAlpha})`;
      rCtx.lineWidth = 1.5;
      rCtx.stroke();
      if (r > 30) {
        rCtx.beginPath();
        rCtx.arc(d.x * W, d.y * H, r * 0.65, 0, Math.PI * 2);
        rCtx.strokeStyle = `rgba(168,135,74,${alpha * innerAlpha})`;
        rCtx.lineWidth = 1;
        rCtx.stroke();
      }
    }
  }
  requestAnimationFrame(drawRipple);
}
