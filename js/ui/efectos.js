"use strict";
// ---------- Efectos visuales: fondo de incendio, brillo en cards y aparición al hacer scroll ----------
(function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1) Fondo de incendio: resplandor y llamas en CSS, brasas que suben en un canvas
  const bg = document.createElement('div');
  bg.className = 'fire-bg';
  bg.setAttribute('aria-hidden', 'true');
  bg.innerHTML = '<div class="smoke"></div><div class="glow"></div>' +
    '<div class="flame f1"></div><div class="flame f2"></div><div class="flame f3"></div><div class="flame f4"></div><div class="flame f5"></div><canvas></canvas>';
  document.body.prepend(bg);

  if (!reduce) {
    const cv = bg.querySelector('canvas'), ctx = cv.getContext('2d');
    let W = 0, H = 0, parts = [];
    const spawn = (anywhere) => ({
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + 10,
      r: 0.6 + Math.random() * 1.8,
      vy: 0.25 + Math.random() * 0.9,
      vx: (Math.random() - 0.5) * 0.3,
      ph: Math.random() * Math.PI * 2,
      life: 0.4 + Math.random() * 0.6,
    });
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(90, W / 14));
      while (parts.length < n) parts.push(spawn(true));
      parts.length = n;
    };
    let last = 0;
    const tick = (t) => {
      requestAnimationFrame(tick);
      if (document.hidden || t - last < 30) return;   // ~33 cuadros por segundo alcanzan
      last = t;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        p.y -= p.vy; p.ph += 0.03;
        p.x += p.vx + Math.sin(p.ph) * 0.35;
        if (p.y < -10) Object.assign(p, spawn(false));
        const k = Math.max(0, Math.min(1, p.y / H)) * p.life;  // brillan abajo y se apagan al subir
        const R = p.r * 4;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
        g.addColorStop(0, 'rgba(255,200,110,' + (0.9 * k) + ')');
        g.addColorStop(0.4, 'rgba(255,110,30,' + (0.45 * k) + ')');
        g.addColorStop(1, 'rgba(255,60,10,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill();
      }
    };
    addEventListener('resize', resize);
    resize();
    requestAnimationFrame(tick);
  }

  // 2) Brillo de las cards que sigue al cursor
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest && e.target.closest('.card,.mapbox');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });

  // 3) Barra de progreso de lectura
  const bar = document.createElement('div');
  bar.className = 'readbar';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 4) Aparición al hacer scroll
  if (reduce || !('IntersectionObserver' in window)) return;
  const sel = 'section h2, section .lead, section .card, section .mapbox, section .toolbar, .flow .step, .callout, .letter, ol.sources li, header.hero .wrap > *';
  const els = [...document.querySelectorAll(sel)];
  els.forEach((el) => {
    el.classList.add('reveal');
    if (el.matches('.callout, .letter')) el.classList.add('from-left');
    // retraso escalonado entre hermanos (máximo 6 pasos)
    const sibs = [...el.parentElement.children].filter((c) => c.matches(sel));
    el.style.setProperty('--d', Math.min(sibs.indexOf(el), 6) * 0.08 + 's');
  });
  document.documentElement.classList.add('fx');
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((el) => io.observe(el));
})();
