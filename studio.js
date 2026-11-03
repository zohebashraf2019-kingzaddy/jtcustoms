/* JT Custom Autos — Starlight Studio
   Renders a car cabin from the rear seat looking forward & up, with a
   fiber-optic star headliner in true perspective. Pure canvas, no deps. */
(function () {
  'use strict';

  const COLORS = [
    { name: 'Warm white', c: '#fff4dc' },
    { name: 'Ice white', c: '#e8f4ff' },
    { name: 'Gold', c: '#ffcf6b' },
    { name: 'Sky blue', c: '#5fc8ff' },
    { name: 'Royal blue', c: '#3d6bff' },
    { name: 'Purple', c: '#b46bff' },
    { name: 'Pink', c: '#ff6bd0' },
    { name: 'Red', c: '#ff3b4a' },
    { name: 'Orange', c: '#ff8a3b' },
    { name: 'Green', c: '#3bff8a' },
    { name: 'Teal', c: '#2ee6d6' }
  ];
  const MULTI = ['#ff3b4a', '#3bff8a', '#3d6bff', '#b46bff', '#fff4dc', '#ffcf6b', '#5fc8ff', '#ff6bd0'];

  // depth range (z) of the roof, roof width, curvature, roof height
  const BODIES = {
    sedan: { label: 'Sedan', z0: 0.85, z1: 1.95, w: 2.0, curve: 0.26, h: 0.86 },
    coupe: { label: 'Coupe', z0: 0.85, z1: 1.65, w: 1.9, curve: 0.3, h: 0.8 },
    suv:   { label: 'SUV', z0: 0.85, z1: 2.65, w: 2.2, curve: 0.18, h: 0.95 },
    truck: { label: 'Truck', z0: 0.85, z1: 1.9, w: 2.2, curve: 0.18, h: 0.95 },
    van:   { label: 'Van', z0: 0.85, z1: 3.6, w: 2.4, curve: 0.1, h: 1.05 }
  };
  const SIZE_MIX = {
    fine:  [[0.75, 0.8], [1.0, 0.2]],
    mixed: [[0.75, 0.55], [1.0, 0.33], [1.5, 0.12]],
    bold:  [[1.0, 0.45], [1.5, 0.4], [2.0, 0.15]]
  };
  const MATS = { black: ['#16131b', '#0b0a0e'], grey: ['#2b2a30', '#18171c'], oem: ['#4a4741', '#2c2a27'] };

  const state = {
    body: 'sedan', vehicle: '', count: 600, size: 'mixed', bright: 80,
    mode: 'twotone', a: '#b46bff', b: '#5fc8ff',
    twinkle: true, speed: 4, shoot: true, ambient: true, amb: '#b46bff',
    mat: 'black', sunroof: false, halo: false, text: '', seed: 7
  };

  // ---------- helpers ----------
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hsl2hex(h, s, l) {
    s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))).toString(16).padStart(2, '0');
    return '#' + f(0) + f(8) + f(4);
  }
  const spriteCache = new Map();
  function sprite(hex) {
    let s = spriteCache.get(hex); if (s) return s;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const [r, gg, b] = hexRgb(hex);
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.1, `rgba(${Math.min(255, r + 120)},${Math.min(255, gg + 120)},${Math.min(255, b + 120)},1)`);
    grd.addColorStop(0.22, `rgba(${r},${gg},${b},.75)`);
    grd.addColorStop(0.5, `rgba(${r},${gg},${b},.14)`);
    grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    spriteCache.set(hex, c); return c;
  }

  // ---------- star layout ----------
  let stars = [], textStars = [], haloStars = [];
  const roof = { u0: 0.33, u1: 0.67, v0: 0.5, v1: 0.84 };
  function inRoof(u, v, pad = 0.025) { return state.sunroof && u > roof.u0 - pad && u < roof.u1 + pad && v > roof.v0 - pad && v < roof.v1 + pad; }

  function layout() {
    const R = rng(state.seed * 9973 + 1);
    const B = BODIES[state.body];
    const aspect = (B.z1 - B.z0) / B.w; // physical depth/width
    const pts = [];
    const n = state.count;
    // best-candidate sampling → even but organic spacing
    const cell = Math.sqrt(1 / n) * 0.9;
    const grid = new Map();
    const key = (u, v) => ((u / cell) | 0) + ',' + (((v * aspect) / cell) | 0);
    let guard = 0;
    while (pts.length < n && guard++ < n * 40) {
      let best = null, bestD = -1;
      for (let k = 0; k < 7; k++) {
        const u = 0.02 + R() * 0.96, v = 0.015 + R() * 0.97;
        if (inRoof(u, v)) continue;
        let d = 9;
        const gx = (u / cell) | 0, gy = ((v * aspect) / cell) | 0;
        for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
          const arr = grid.get((gx + i) + ',' + (gy + j)); if (!arr) continue;
          for (const p of arr) { const du = p.u - u, dv = (p.v - v) * aspect; const dd = du * du + dv * dv; if (dd < d) d = dd; }
        }
        if (d > bestD) { bestD = d; best = { u, v }; }
      }
      if (!best) continue;
      const k2 = key(best.u, best.v); if (!grid.has(k2)) grid.set(k2, []); grid.get(k2).push(best);
      pts.push(best);
    }
    const mix = SIZE_MIX[state.size];
    stars = pts.map((p, i) => {
      let r = R(), size = mix[0][0];
      for (const [s, w] of mix) { if (r < w) { size = s; break; } r -= w; }
      return {
        u: p.u, v: p.v, size,
        tw: R() < 0.5, ph: R() * Math.PI * 2, rate: 0.6 + R() * 1.4,
        base: 0.65 + R() * 0.35,
        group: R() < 0.5 ? 0 : 1, multi: MULTI[(R() * MULTI.length) | 0]
      };
    });
    buildHalo(); buildText();
  }

  function buildHalo() {
    haloStars = [];
    if (!(state.sunroof && state.halo)) return;
    const pad = 0.035, { u0, u1, v0, v1 } = roof;
    const edges = [[u0 - pad, v0 - pad, u1 + pad, v0 - pad], [u1 + pad, v0 - pad, u1 + pad, v1 + pad], [u1 + pad, v1 + pad, u0 - pad, v1 + pad], [u0 - pad, v1 + pad, u0 - pad, v0 - pad]];
    for (const [a, b, c, d] of edges) {
      const steps = 26;
      for (let i = 0; i < steps; i++) { const t = i / steps; haloStars.push({ u: a + (c - a) * t, v: b + (d - b) * t, size: 1.0, ph: i * 0.5, tw: false, base: 1, rate: 1, group: 0, multi: '#fff' }); }
    }
  }

  function buildText() {
    textStars = [];
    const txt = state.text.trim().toUpperCase(); if (!txt) return;
    const c = document.createElement('canvas'); const W = 360, H = 90; c.width = W; c.height = H;
    const g = c.getContext('2d'); g.fillStyle = '#fff';
    g.font = '900 78px "Arial Black", Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const m = g.measureText(txt).width; const scale = Math.min(1, (W - 10) / m);
    g.setTransform(scale, 0, 0, 1, W / 2, H / 2); g.fillText(txt, 0, 4);
    const data = g.getImageData(0, 0, W, H).data;
    const step = 3, raw = [];
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (data[(y * W + x) * 4 + 3] > 128) raw.push([x, y]);
    if (!raw.length) return;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    raw.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    // place text across the roof; top of letters points to the front so it reads from the rear seat
    const tw = Math.min(0.5, 0.075 * txt.length + 0.05), th = 0.2;
    const cv = state.sunroof ? 0.36 : 0.42;
    // thin out so density stays star-like
    const keep = raw.length > 220 ? 220 / raw.length : 1;
    const R = rng(txt.length * 31 + 3);
    for (const [x, y] of raw) {
      if (R() > keep) continue;
      const u = 0.5 - tw / 2 + ((x - x0) / Math.max(1, x1 - x0)) * tw;
      const v = cv + th / 2 - ((y - y0) / Math.max(1, y1 - y0)) * th;
      textStars.push({ u, v, size: 1.0, tw: false, ph: x * 0.05, base: 1, rate: 1, group: 0, multi: '#fff' });
    }
  }

  // ---------- render ----------
  const canvas = document.getElementById('studioCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, DPR = 1, f = 0, cx = 0, cy = 0;
  const cam = { x: 0, y: 0, tx: 0, ty: 0 };
  let shooters = [], nextShoot = 1.2;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    const r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
  }

  function proj(u, v, B, lift = 0) {
    const z = B.z0 + v * (B.z1 - B.z0);
    const X = (u - 0.5) * B.w;
    const Y = B.h - B.curve * Math.pow((u - 0.5) * 2, 2) - lift;
    return [cx + (X * f) / z, cy - (Y * f) / z, z];
  }

  function roofPath(B) {
    ctx.beginPath();
    const N = 30;
    for (let i = 0; i <= N; i++) { const p = proj(i / N, 1, B); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    for (let i = 0; i <= N; i++) { const p = proj(1, 1 - i / N, B); ctx.lineTo(p[0], p[1]); }
    for (let i = 0; i <= N; i++) { const p = proj(1 - i / N, 0, B); ctx.lineTo(p[0], p[1]); }
    for (let i = 0; i <= N; i++) { const p = proj(0, i / N, B); ctx.lineTo(p[0], p[1]); }
    ctx.closePath();
  }

  function quad(B, u0, v0, u1, v1) {
    ctx.beginPath();
    const N = 10;
    for (let i = 0; i <= N; i++) { const p = proj(u0 + (u1 - u0) * i / N, v1, B); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
    for (let i = 0; i <= N; i++) { const p = proj(u1, v1 - (v1 - v0) * i / N, B); ctx.lineTo(p[0], p[1]); }
    for (let i = 0; i <= N; i++) { const p = proj(u1 - (u1 - u0) * i / N, v0, B); ctx.lineTo(p[0], p[1]); }
    for (let i = 0; i <= N; i++) { const p = proj(u0, v0 + (v1 - v0) * i / N, B); ctx.lineTo(p[0], p[1]); }
    ctx.closePath();
  }

  function glowLine(pts, color, width, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    for (const [w, a] of [[width * 7, 0.07], [width * 3.2, 0.18], [width, 0.9]]) {
      ctx.globalAlpha = a * alpha; ctx.lineWidth = w; ctx.beginPath();
      pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
      ctx.stroke();
    }
    ctx.restore();
  }

  function starColor(s, t) {
    if (state.mode === 'single') return state.a;
    if (state.mode === 'twotone') return s.group ? state.b : state.a;
    if (state.mode === 'multi') return s.multi;
    const hue = Math.round(((t * 22 + s.u * 140 + s.v * 90) % 360) / 10) * 10;
    return hsl2hex(hue, 95, 62);
  }

  function draw(t, dt) {
    const B = BODIES[state.body];
    cam.x += (cam.tx - cam.x) * 0.05; cam.y += (cam.ty - cam.y) * 0.05;
    const wide = W / H > 1.1;
    cy = H * (wide ? 0.72 : 0.64) + cam.y * H * 0.03;
    // focal length: wide enough to frame the cabin, and the near roof edge always above the frame
    f = Math.max(W * 0.5, ((H * (wide ? 0.72 : 0.64)) + H * 0.05) * B.z0 / B.h);
    cx = W / 2 + cam.x * W * 0.04;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // cabin darkness
    ctx.fillStyle = '#030305'; ctx.fillRect(0, 0, W, H);

    const amb = state.ambient ? state.amb : null;
    const bright = state.bright / 100;

    // windshield (night scene)
    const fl = proj(0, 1, B), fr = proj(1, 1, B);
    const dashY = cy + f * 0.03;
    const wsL = [cx + (fl[0] - cx) * 1.2, dashY], wsR = [cx + (fr[0] - cx) * 1.2, dashY];
    ctx.save();
    ctx.beginPath(); ctx.moveTo(fl[0], fl[1]); ctx.lineTo(fr[0], fr[1]); ctx.lineTo(wsR[0], wsR[1]); ctx.lineTo(wsL[0], wsL[1]); ctx.closePath();
    const sky = ctx.createLinearGradient(0, fl[1], 0, dashY);
    sky.addColorStop(0, '#05060c'); sky.addColorStop(0.7, '#0c1020'); sky.addColorStop(1, '#1b1a26');
    ctx.fillStyle = sky; ctx.fill(); ctx.clip();
    // city lights on horizon
    const R = rng(42);
    const hy = dashY - (dashY - fl[1]) * 0.18;
    ctx.fillStyle = '#07070b';
    ctx.beginPath(); ctx.moveTo(wsL[0], dashY);
    for (let x = wsL[0]; x < wsR[0]; x += 14) ctx.lineTo(x, hy - R() * (dashY - fl[1]) * 0.12);
    ctx.lineTo(wsR[0], dashY); ctx.fill();
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = ['#ffcf6b', '#fff4dc', '#ff8a3b'][i % 3];
      ctx.globalAlpha = 0.25 + R() * 0.5;
      ctx.fillRect(wsL[0] + R() * (wsR[0] - wsL[0]), hy + R() * (dashY - hy) * 0.6, 1.5, 1.5);
    }
    ctx.restore();

    // rear-view mirror
    { const mx = cx, my = fl[1] + (dashY - fl[1]) * 0.18, mw = f * 0.16, mh = f * 0.045;
      ctx.fillStyle = '#050507'; ctx.fillRect(mx - 2, fl[1], 4, my - fl[1]);
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(mx - mw / 2, my, mw, mh, mh / 2); else ctx.rect(mx - mw / 2, my, mw, mh); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1; ctx.stroke(); }

    // side windows (dark glass) & pillars
    const nl = proj(0, 0, B), nr = proj(1, 0, B);
    for (const side of [0, 1]) {
      const near = side ? nr : nl, far = side ? fr : fl, ws = side ? wsR : wsL;
      const edgeX = side ? W + 40 : -40;
      ctx.beginPath(); ctx.moveTo(near[0], near[1]); ctx.lineTo(far[0], far[1]); ctx.lineTo(ws[0], ws[1]);
      ctx.lineTo(edgeX, H * 0.95); ctx.lineTo(edgeX, near[1]); ctx.closePath();
      const g = ctx.createLinearGradient(far[0], 0, edgeX, 0);
      g.addColorStop(0, '#0a0b11'); g.addColorStop(1, '#040406');
      ctx.fillStyle = g; ctx.fill();
      // A-pillar
      ctx.beginPath(); ctx.moveTo(far[0], far[1]); ctx.lineTo(ws[0], ws[1]);
      ctx.lineTo(ws[0] + (side ? 26 : -26), ws[1]); ctx.lineTo(far[0] + (side ? 16 : -16), far[1]); ctx.closePath();
      ctx.fillStyle = '#060608'; ctx.fill();
      // door ambient line
      if (amb) {
        const y0 = ws[1] + f * 0.05;
        glowLine([[ws[0] + (side ? 30 : -30), y0], [side ? W * 1.02 : -W * 0.02, H * 0.9]], amb, 2, bright);
      }
    }

    // headliner surface
    roofPath(B);
    const mat = MATS[state.mat];
    const hg = ctx.createLinearGradient(0, nl[1], 0, fl[1]);
    hg.addColorStop(0, mat[0]); hg.addColorStop(1, mat[1]);
    ctx.fillStyle = hg; ctx.fill();
    // soft ambient bounce onto headliner
    ctx.save(); roofPath(B); ctx.clip();
    if (amb) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.07 * bright;
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.7);
      rg.addColorStop(0, amb); rg.addColorStop(1, 'transparent');
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    // suede edge shading
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    const eg = ctx.createLinearGradient(nl[0], 0, nr[0], 0);
    eg.addColorStop(0, 'rgba(0,0,0,.65)'); eg.addColorStop(0.18, 'rgba(0,0,0,0)'); eg.addColorStop(0.82, 'rgba(0,0,0,0)'); eg.addColorStop(1, 'rgba(0,0,0,.65)');
    ctx.fillStyle = eg; ctx.fillRect(0, 0, W, H);
    // dome light / console at front
    const dl = proj(0.44, 0.93, B), dr = proj(0.56, 0.99, B);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(dl[0], dl[1], dr[0] - dl[0], (dr[1] - dl[1]) * 0.6 + 6, 4) : ctx.rect(dl[0], dl[1], dr[0] - dl[0], 8); ctx.fill();
    ctx.restore();

    // sunroof
    if (state.sunroof) {
      quad(B, roof.u0, roof.v0, roof.u1, roof.v1);
      const p0 = proj(0.5, roof.v0, B), p1 = proj(0.5, roof.v1, B);
      const sg = ctx.createLinearGradient(0, p0[1], 0, p1[1]);
      sg.addColorStop(0, '#070912'); sg.addColorStop(1, '#0c1222');
      ctx.fillStyle = sg; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1.5; ctx.stroke();
      // real stars through the glass
      ctx.save(); quad(B, roof.u0, roof.v0, roof.u1, roof.v1); ctx.clip();
      const r2 = rng(5);
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 60; i++) { ctx.globalAlpha = r2() * 0.5; const q = proj(roof.u0 + r2() * (roof.u1 - roof.u0), roof.v0 + r2() * (roof.v1 - roof.v0), B); ctx.fillRect(q[0], q[1], 1, 1); }
      ctx.restore(); ctx.globalAlpha = 1;
    }

    // stars
    ctx.globalCompositeOperation = 'lighter';
    const spd = state.speed / 4;
    const scale = f * 0.0085;
    const drawSet = (arr, colorFn) => {
      for (const s of arr) {
        const p = proj(s.u, s.v, B);
        if (p[1] < -20 || p[0] < -20 || p[0] > W + 20) continue;
        let a = s.base;
        if (state.twinkle && s.tw && !reduce) a *= 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.rate * spd * 1.6 + s.ph));
        const r = (s.size * scale) / p[2];
        const d = Math.max(2.4, r * 6);
        ctx.globalAlpha = Math.min(1, a * bright * (1.25 - (p[2] - B.z0) / (B.z1 - B.z0) * 0.35));
        ctx.drawImage(sprite(colorFn(s)), p[0] - d / 2, p[1] - d / 2, d, d);
      }
    };
    drawSet(stars, s => starColor(s, t));
    drawSet(haloStars, s => (state.mode === 'twotone' ? state.b : starColor(s, t)));
    drawSet(textStars, s => (state.mode === 'single' ? '#ffffff' : state.mode === 'twotone' ? state.b : starColor(s, t)));

    // shooting stars
    if (state.shoot && !reduce) {
      nextShoot -= dt;
      if (nextShoot <= 0) {
        const R2 = Math.random;
        const dir = R2() < 0.5 ? 1 : -1;
        shooters.push({ u: dir > 0 ? 0.08 + R2() * 0.35 : 0.57 + R2() * 0.35, v: 0.15 + R2() * 0.7, du: dir * (0.42 + R2() * 0.2), dv: (R2() - 0.5) * 0.35, life: 0, dur: 1.1 + R2() * 0.5 });
        nextShoot = 1.6 + Math.random() * 2.6;
      }
      shooters = shooters.filter(sh => (sh.life += dt) < sh.dur);
      for (const sh of shooters) {
        const k = sh.life / sh.dur, head = Math.min(1, k * 1.4), tail = Math.max(0, head - 0.35);
        const fade = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
        const col = state.mode === 'single' ? state.a : state.mode === 'twotone' ? state.a : '#ffffff';
        const pts = [];
        for (let i = 0; i <= 12; i++) { const q = tail + (head - tail) * i / 12; pts.push(proj(sh.u + sh.du * q, sh.v + sh.dv * q, B)); }
        ctx.lineCap = 'round';
        for (let i = 1; i < pts.length; i++) {
          ctx.globalAlpha = (i / pts.length) * fade * bright;
          ctx.strokeStyle = col; ctx.lineWidth = Math.max(0.6, (i / pts.length) * scale * 1.6 / pts[i][2]);
          ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
        }
        const hp = pts[pts.length - 1], d = (scale * 9) / hp[2];
        ctx.globalAlpha = fade * bright; ctx.drawImage(sprite(col), hp[0] - d / 2, hp[1] - d / 2, d, d);
      }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

    // dashboard
    ctx.beginPath();
    ctx.moveTo(-20, H); ctx.lineTo(-20, dashY + f * 0.1);
    ctx.quadraticCurveTo(wsL[0], dashY - 4, cx, dashY - 2);
    ctx.quadraticCurveTo(wsR[0], dashY - 4, W + 20, dashY + f * 0.1);
    ctx.lineTo(W + 20, H); ctx.closePath();
    const dg = ctx.createLinearGradient(0, dashY, 0, H); dg.addColorStop(0, '#0a0a0e'); dg.addColorStop(1, '#030304');
    ctx.fillStyle = dg; ctx.fill();
    if (amb) glowLine([[wsL[0] + 20, dashY + 10], [cx, dashY + 7], [wsR[0] - 20, dashY + 10]], amb, 1.6, bright);
    // infotainment glow
    ctx.fillStyle = 'rgba(80,120,200,.18)';
    ctx.fillRect(cx - f * 0.07, dashY + f * 0.05, f * 0.14, f * 0.07);

    // front seats (silhouettes)
    const seatW = f * 0.4, seatTop = dashY - f * 0.02;
    for (const sx of [cx - f * 0.3, cx + f * 0.3]) {
      ctx.fillStyle = '#020203';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(sx - seatW / 2, seatTop + f * 0.11, seatW, H, [seatW * 0.28, seatW * 0.28, 0, 0]); else ctx.rect(sx - seatW / 2, seatTop + f * 0.11, seatW, H);
      ctx.fill();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(sx - seatW * 0.27, seatTop - f * 0.02, seatW * 0.54, f * 0.17, seatW * 0.16); else ctx.rect(sx - seatW * 0.27, seatTop, seatW * 0.54, f * 0.15);
      ctx.fill();
      // rim light from stars
      ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1; ctx.stroke();
    }

    // vignette
    const vg = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.3, W / 2, H * 0.5, Math.max(W, H) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  let last = performance.now(), running = true, visible = true;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible) draw(now / 1000, dt);
    requestAnimationFrame(loop);
  }

  // ---------- UI ----------
  const $ = id => document.getElementById(id);
  const toast = msg => { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2600); };

  function guessBody(str) {
    const s = str.toLowerCase();
    if (/sprinter|transit|promaster|express|savana|odyssey|sienna|pacifica|carnival|\bvan\b|metris/.test(s)) return 'van';
    if (/silverado|sierra|f-?150|f-?250|f-?350|\bram\b|1500|2500|tacoma|tundra|titan|frontier|ranger|colorado|canyon|gladiator|ridgeline|cybertruck|maverick|truck/.test(s)) return 'truck';
    if (/tahoe|suburban|yukon|escalade|explorer|expedition|durango|4runner|sequoia|highlander|rav4|cr-?v|pilot|model y|model x|wrangler|grand cherokee|cherokee|range rover|g-?wagon|g-?class|gl[es]|x[3-7]|q[5-8]|navigator|bronco|telluride|palisade|traverse|blazer|equinox|tucson|santa fe|cx-?\d|rx|gx|lx|urus|cayenne|suv/.test(s)) return 'suv';
    if (/mustang|camaro|challenger|corvette|370z|350z|brz|86|supra|m2|m4|rc ?f|gt-?r|911|coupe|2-?door|miata|genesis coupe|cayman|boxster/.test(s)) return 'coupe';
    return 'sedan';
  }

  function setOn(container, attr, val) { container.querySelectorAll('[' + attr + ']').forEach(b => b.classList.toggle('is-on', b.getAttribute(attr) == val)); }
  function fill(r) { r.style.setProperty('--fill', ((r.value - r.min) / (r.max - r.min)) * 100 + '%'); }

  function buildSwatches(el, key, onPick) {
    el.innerHTML = '';
    COLORS.forEach(c => {
      const b = document.createElement('button'); b.className = 'sw'; b.style.setProperty('--c', c.c); b.title = c.name; b.setAttribute('aria-label', c.name); b.dataset.c = c.c;
      b.onclick = () => { state[key] = c.c; onPick(); };
      el.appendChild(b);
    });
    const p = document.createElement('label'); p.className = 'sw picker'; p.title = 'Custom color';
    const inp = document.createElement('input'); inp.type = 'color'; inp.value = state[key]; inp.setAttribute('aria-label', 'Custom color');
    inp.oninput = () => { state[key] = inp.value; onPick(); };
    p.appendChild(inp); el.appendChild(p);
  }
  function markSwatches(el, val) { el.querySelectorAll('.sw').forEach(b => b.classList.toggle('is-on', b.dataset.c === val || (b.classList.contains('picker') && !COLORS.some(c => c.c === val)))); }

  const SPEED_NAMES = ['', 'Still', 'Slow', 'Slow', 'Calm', 'Calm', 'Lively', 'Lively', 'Fast', 'Fast', 'Sparkle'];
  function colorName(h) { const c = COLORS.find(x => x.c === h); return c ? c.name.toLowerCase() : 'custom ' + h; }

  function sync(relayout) {
    if (relayout) layout();
    setOn($('bodyChips'), 'data-body', state.body);
    setOn($('sizeChips'), 'data-size', state.size);
    setOn($('modeChips'), 'data-mode', state.mode);
    setOn($('matChips'), 'data-mat', state.mat);
    setOn($('kitTicks'), 'data-count', state.count);
    $('starCount').value = state.count; fill($('starCount'));
    $('brightness').value = state.bright; fill($('brightness'));
    $('twinkleSpeed').value = state.speed; fill($('twinkleSpeed'));
    $('countOut').textContent = state.count; $('labelCount').textContent = state.count + textStars.length + haloStars.length;
    $('brightOut').textContent = state.bright + '%';
    $('speedOut').textContent = SPEED_NAMES[state.speed];
    $('optTwinkle').checked = state.twinkle; $('optShooting').checked = state.shoot; $('optAmbient').checked = state.ambient;
    $('optSunroof').checked = state.sunroof; $('optHalo').checked = state.halo; $('optHalo').disabled = !state.sunroof;
    $('optHalo').closest('.toggle').style.opacity = state.sunroof ? 1 : 0.45;
    $('customText').value = state.text;
    markSwatches($('swatchA'), state.a); markSwatches($('swatchB'), state.b); markSwatches($('swatchAmb'), state.amb);
    const showA = state.mode === 'single' || state.mode === 'twotone';
    $('swatchA').style.display = showA ? '' : 'none'; $('colorALabel').style.display = showA ? '' : 'none';
    $('colorALabel').textContent = state.mode === 'twotone' ? 'First tone' : 'Star color';
    $('colorBWrap').style.display = state.mode === 'twotone' ? '' : 'none';
    $('swatchAmb').style.display = state.ambient ? '' : 'none';
    $('labelVehicle').textContent = state.vehicle || 'Your ' + BODIES[state.body].label;

    const modeTxt = { single: colorName(state.a), twotone: 'two-tone ' + colorName(state.a) + ' / ' + colorName(state.b), multi: 'multicolor', cycle: 'color-flow RGB' }[state.mode];
    const fx = [state.twinkle && 'twinkle', state.shoot && 'shooting stars', state.sunroof && (state.halo ? 'sunroof outline' : 'sunroof'), state.ambient && 'ambient lighting', state.text.trim() && `custom “${state.text.trim()}”`].filter(Boolean);
    $('summaryText').textContent = `${state.vehicle || BODIES[state.body].label} · ${state.count} stars · ${modeTxt}${fx.length ? ' · ' + fx.join(', ') : ''}`;
  }

  function encode() {
    const o = { ...state }; return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/=+$/, '');
  }
  function decode(h) { try { const o = JSON.parse(decodeURIComponent(escape(atob(h)))); Object.keys(state).forEach(k => { if (k in o) state[k] = o[k]; }); return true; } catch (e) { return false; } }

  function bind() {
    // tabs
    document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
      document.querySelectorAll('.tab').forEach(x => { x.classList.toggle('is-on', x === t); x.setAttribute('aria-selected', x === t); });
      document.querySelectorAll('.pane').forEach(p => p.classList.toggle('is-on', p.dataset.pane === t.dataset.tab));
    });
    $('bodyChips').onclick = e => { const b = e.target.closest('[data-body]'); if (!b) return; state.body = b.dataset.body; sync(true); };
    $('quickPicks').onclick = e => { const b = e.target.closest('[data-pick]'); if (!b) return; state.vehicle = b.dataset.pick; state.body = guessBody(state.vehicle); sync(true); };
    $('btnCustom').onclick = () => { const f = $('customForm'); f.hidden = !f.hidden; if (!f.hidden) $('cvYear').focus(); };
    $('customForm').onsubmit = e => {
      e.preventDefault();
      const v = [$('cvYear').value, $('cvMake').value, $('cvModel').value].map(s => s.trim()).filter(Boolean).join(' ');
      if (!v) { toast('Enter your year, make and model'); return; }
      state.vehicle = v.replace(/\b\w/g, c => c.toUpperCase()); state.body = guessBody(v);
      sync(true); toast('Showing your ' + state.vehicle + ' · ' + BODIES[state.body].label + ' cabin');
      document.getElementById('stage').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    $('optSunroof').onchange = e => { state.sunroof = e.target.checked; if (!state.sunroof) state.halo = false; sync(true); };
    $('optHalo').onchange = e => { state.halo = e.target.checked; sync(true); };
    let tmr;
    $('starCount').oninput = e => { state.count = +e.target.value; fill(e.target); $('countOut').textContent = state.count; clearTimeout(tmr); tmr = setTimeout(() => sync(true), 40); };
    $('kitTicks').onclick = e => { const b = e.target.closest('[data-count]'); if (!b) return; state.count = +b.dataset.count; sync(true); };
    $('sizeChips').onclick = e => { const b = e.target.closest('[data-size]'); if (!b) return; state.size = b.dataset.size; sync(true); };
    $('brightness').oninput = e => { state.bright = +e.target.value; sync(); };
    $('modeChips').onclick = e => { const b = e.target.closest('[data-mode]'); if (!b) return; state.mode = b.dataset.mode; sync(); };
    $('optTwinkle').onchange = e => { state.twinkle = e.target.checked; sync(); };
    $('twinkleSpeed').oninput = e => { state.speed = +e.target.value; sync(); };
    $('optShooting').onchange = e => { state.shoot = e.target.checked; sync(); };
    $('optAmbient').onchange = e => { state.ambient = e.target.checked; sync(); };
    $('matChips').onclick = e => { const b = e.target.closest('[data-mat]'); if (!b) return; state.mat = b.dataset.mat; sync(); };
    $('customText').oninput = e => { state.text = e.target.value; buildText(); sync(); };
    buildSwatches($('swatchA'), 'a', () => sync());
    buildSwatches($('swatchB'), 'b', () => sync());
    buildSwatches($('swatchAmb'), 'amb', () => sync());

    $('btnShuffle').onclick = () => { state.seed = (Math.random() * 1e6) | 0; sync(true); };
    $('btnFull').onclick = () => {
      const st = $('stage');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (st.requestFullscreen) st.requestFullscreen(); else if (st.webkitRequestFullscreen) st.webkitRequestFullscreen(); else toast('Full screen isn’t supported on this device');
    };
    document.addEventListener('fullscreenchange', () => setTimeout(resize, 60));

    const shareUrl = () => location.origin + location.pathname + '#build=' + encode();
    const copy = txt => (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).catch(() => {
      const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { } ta.remove();
    });
    $('btnShare').onclick = () => { copy(shareUrl()).then(() => toast('Share link copied ✦')); history.replaceState(null, '', '#build=' + encode()); };
    $('btnRequest').onclick = () => {
      const msg = `Hi JT! I'd like a quote for this starlight build:\n${$('summaryText').textContent}\nPreview: ${shareUrl()}`;
      copy(msg).then(() => toast('Build copied — paste it in the Instagram DM'));
      setTimeout(() => window.open('https://ig.me/m/jtcustomautos', '_blank', 'noopener'), 700);
    };

    // parallax
    const st = $('stage');
    st.addEventListener('pointermove', e => { const r = st.getBoundingClientRect(); cam.tx = ((e.clientX - r.left) / r.width - 0.5) * -2; cam.ty = ((e.clientY - r.top) / r.height - 0.5) * -2; });
    st.addEventListener('pointerleave', () => { cam.tx = 0; cam.ty = 0; });

    // only animate when visible
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(st);
    new ResizeObserver(resize).observe(st);
  }

  // public: apply a preset from package cards
  window.JTStudio = {
    apply(p) {
      if (p.count) state.count = p.count;
      if (p.mode) state.mode = p.mode;
      if (p.a) state.a = p.a; if (p.b) state.b = p.b;
      if (p.size) state.size = p.size;
      if ('shoot' in p) state.shoot = p.shoot;
      sync(true);
      const tab = document.querySelector('.tab[data-tab="stars"]'); tab && tab.click();
    }
  };

  // init
  const m = location.hash.match(/build=([^&]+)/);
  if (m) decode(m[1]);
  resize(); bind(); sync(true);
  requestAnimationFrame(loop);
})();
