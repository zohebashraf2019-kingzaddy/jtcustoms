(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // nav
  const nav = $('nav'), links = $('navLinks'), tog = $('navToggle');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 30);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  tog.onclick = () => { const o = links.classList.toggle('open'); tog.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; };
  links.querySelectorAll('a').forEach(a => a.onclick = () => { links.classList.remove('open'); tog.setAttribute('aria-expanded', false); document.body.style.overflow = ''; });

  // twinkling sky canvases (hero + booking)
  function sky(canvas, density, gold) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, stars = [], shooting = null, next = 3, visible = true, last = performance.now();
    function size() {
      const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      W = r.width; H = r.height; canvas.width = W * d; canvas.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0);
      const n = Math.round((W * H) / density);
      stars = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() < 0.08 ? 1.6 : Math.random() * 1.1 + 0.3, p: Math.random() * 6.28, s: 0.5 + Math.random() * 1.5, g: Math.random() < gold }));
    }
    function draw(t, dt) {
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        const a = reduce ? 0.7 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
        ctx.globalAlpha = a;
        ctx.fillStyle = s.g ? '#f3dca0' : '#ffffff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
        if (s.r > 1.4) { ctx.globalAlpha = a * 0.25; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.5, 0, 6.283); ctx.fill(); }
      }
      if (!reduce) {
        next -= dt;
        if (next < 0 && !shooting) { shooting = { x: Math.random() * W * 0.7 + W * 0.2, y: Math.random() * H * 0.4, l: 0 }; next = 4 + Math.random() * 5; }
        if (shooting) {
          shooting.l += dt;
          const k = shooting.l / 1.1, len = 160;
          const hx = shooting.x - k * W * 0.35, hy = shooting.y + k * W * 0.17;
          const g = ctx.createLinearGradient(hx, hy, hx + len, hy - len * 0.48);
          g.addColorStop(0, 'rgba(243,220,160,' + (1 - k) + ')'); g.addColorStop(1, 'rgba(243,220,160,0)');
          ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + len, hy - len * 0.48); ctx.stroke();
          if (k >= 1) shooting = null;
        }
      }
      ctx.globalAlpha = 1;
    }
    function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (visible) draw(now / 1000, dt); requestAnimationFrame(loop); }
    new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(e => visible = e[0].isIntersecting).observe(canvas);
    size(); requestAnimationFrame(loop);
  }
  sky($('heroSky'), 2600, 0.25);
  sky($('bookSky'), 3200, 0.3);

  // lazy autoplay videos
  const vids = document.querySelectorAll('video[data-lazy]');
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { v.preload = 'auto'; const p = v.play(); p && p.catch(() => { }); } else v.pause();
  }), { threshold: 0.35 });
  vids.forEach(v => vio.observe(v));

  // before / after
  const ba = $('ba'), bar = $('baRange');
  if (ba && bar) bar.oninput = () => ba.style.setProperty('--pos', bar.value + '%');

  // package previews → studio
  document.querySelectorAll('.pkg').forEach(card => {
    card.querySelector('button').onclick = () => {
      try { window.JTStudio && window.JTStudio.apply(JSON.parse(card.dataset.preset)); } catch (e) { }
      document.getElementById('studio').scrollIntoView({ behavior: 'smooth' });
    };
  });

  // reveal on scroll
  const rv = document.querySelectorAll('.sec-head, .svc, .pkg, .reel, .steps li, .ba, .book-card, .faq details, .studio-shell');
  rv.forEach(el => el.classList.add('reveal'));
  const rio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rio.unobserve(e.target); } }), { threshold: 0.12 });
  rv.forEach((el, i) => { el.style.transitionDelay = (i % 5) * 60 + 'ms'; rio.observe(el); });

  $('yr').textContent = new Date().getFullYear();
})();
