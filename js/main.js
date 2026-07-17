/* ═══════════════════════════════════════════════════════════
   HANA-X // AGENTIC OS — interaction core
   GSAP ScrollTrigger scroll-scrub · zero-latency module cards
   ═══════════════════════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger);

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ═══════════ BOOT PRELOADER ═══════════ */

const BOOT_LINES = [
  ['HANA-X BIOS v5.0.1 — AGENTIC OS', 0],
  ['MEM CHECK ................ 1.2PB OK', 120],
  ['MOUNT /dev/context ....... OK', 90],
  ['LOAD vector_store ........ OK', 90],
  ['LOAD infra_fabric ........ OK', 80],
  ['LOAD context_engine ...... OK', 80],
  ['LOCAL_INFERENCE .......... ONLINE', 110],
  ['OPERATOR LINK ............ ESTABLISHED', 100],
  ['&gt; SYSTEM READY_', 200],
];

function boot() {
  const linesEl = $('#bootLines');
  const fill = $('#bootBarFill');
  const pct = $('#bootPct');
  let i = 0, t = 0;

  BOOT_LINES.forEach(([text, delay], idx) => {
    t += delay;
    setTimeout(() => {
      const div = document.createElement('div');
      const isLast = idx === BOOT_LINES.length - 1;
      div.innerHTML = text.replace(/OK|ONLINE|ESTABLISHED|READY_/g, m => `<span class="ok">${m}</span>`);
      linesEl.appendChild(div);
      const p = Math.round(((idx + 1) / BOOT_LINES.length) * 100);
      fill.style.width = p + '%';
      pct.textContent = String(p).padStart(3, '0') + '%';
      if (isLast) setTimeout(dismiss, 420);
    }, t);
  });

  function dismiss() {
    $('#preloader').classList.add('done');
    document.dispatchEvent(new Event('hana:booted'));
  }
}

if (REDUCED) {
  $('#preloader').classList.add('done');
  document.dispatchEvent(new Event('hana:booted'));
} else {
  boot();
}

/* ═══════════ LIVE UPTIME TRACKER (ms) ═══════════ */

const uptimeEl = $('#uptime');
const t0 = performance.now();
function fmtUptime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  const mm = Math.floor(ms % 1000);
  return `T+${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(mm).padStart(3, '0')}`;
}
(function tickUptime() {
  uptimeEl.textContent = fmtUptime(performance.now() - t0);
  requestAnimationFrame(tickUptime);
})();

/* ═══════════ SCROLL % HUD ═══════════ */

const scrollPctEl = $('#scrollPct');
ScrollTrigger.create({
  trigger: document.body, start: 0, end: 'max',
  onUpdate: self => {
    scrollPctEl.textContent = 'SCROLL ' + String(Math.round(self.progress * 100)).padStart(3, '0') + '%';
  },
});

/* ═══════════ CUSTOM CURSOR ═══════════ */

if (FINE_POINTER && !REDUCED) {
  document.body.classList.add('no-cursor');
  const dot = $('#cursor');
  const ring = $('#cursorRing');
  const setDotX = gsap.quickSetter(dot, 'x', 'px');
  const setDotY = gsap.quickSetter(dot, 'y', 'px');
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' });
  window.addEventListener('pointermove', e => {
    setDotX(e.clientX - 3); setDotY(e.clientY - 3);
    ringX(e.clientX - 17); ringY(e.clientY - 17);
  }, { passive: true });
  $$('a, button, .card').forEach(el => {
    el.addEventListener('pointerenter', () => ring.classList.add('hot'));
    el.addEventListener('pointerleave', () => ring.classList.remove('hot'));
  });
}

/* ═══════════ SECTION 1 — HERO SCROLL-SCRUB ═══════════ */

const heroVideo = $('#heroVideo');
const heroMedia = $('#heroMedia');
const timecodeEl = $('#heroTimecode');
let heroDuration = 12; // fallback until metadata arrives
let heroReady = false;
let scrubTarget = 0;
let scrubCurrent = 0;

heroVideo.addEventListener('loadedmetadata', () => {
  if (isFinite(heroVideo.duration) && heroVideo.duration > 0) heroDuration = heroVideo.duration;
  heroReady = true;
});
heroVideo.addEventListener('error', initHeroFallback);
// belt & braces: if the file 404s some browsers only fire error on the <source>
setTimeout(() => { if (heroVideo.readyState === 0 && !heroVideo.currentSrc) initHeroFallback(); }, 3000);

ScrollTrigger.create({
  trigger: '#hero',
  start: 'top top',
  end: 'bottom bottom',
  scrub: true,
  onUpdate: self => { scrubTarget = self.progress; },
});

// Lerp-smoothed frame scrubbing — keeps seeks cheap and butter-smooth
(function scrubLoop() {
  if (heroReady && !REDUCED) {
    scrubCurrent += (scrubTarget - scrubCurrent) * 0.14;
    const t = Math.min(scrubCurrent * heroDuration, heroDuration - 0.05);
    if (Math.abs(heroVideo.currentTime - t) > 0.01) {
      heroVideo.currentTime = t;
    }
    timecodeEl.textContent =
      'FRAME ' + String(Math.round(t * 24)).padStart(4, '0') +
      ' / ' + t.toFixed(2).padStart(5, '0') + 's';
  }
  requestAnimationFrame(scrubLoop);
})();

// Headline choreography tied to the same scroll span
if (!REDUCED) {
  const heroTl = gsap.timeline({
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
  });
  heroTl
    .to('#heroHint', { autoAlpha: 0, y: 20, duration: 0.04 }, 0)
    .to('.hero-eyebrow', { autoAlpha: 0, y: -30, duration: 0.08 }, 0.02)
    .to('.h1-inner', { yPercent: -6, scale: 1.06, transformOrigin: '50% 50%', duration: 0.3, stagger: 0.02 }, 0)
    .to('.hero-sub', { autoAlpha: 0, duration: 0.06 }, 0.08)
    .to('#heroCopy', { autoAlpha: 0, scale: 1.12, filter: 'blur(14px)', duration: 0.22 }, 0.16)
    .fromTo('#heroPhase2', { autoAlpha: 0, x: -40 }, { autoAlpha: 1, x: 0, duration: 0.12 }, 0.52)
    .to('#heroPhase2', { autoAlpha: 0, x: 30, duration: 0.1 }, 0.86)
    .fromTo('.hero-grid', { opacity: 0.16 }, { opacity: 0.05, duration: 0.5 }, 0.4)
    .fromTo(heroMedia, { scale: 1.06 }, { scale: 1, duration: 1, ease: 'none' }, 0);
} else {
  gsap.set('#heroPhase2', { autoAlpha: 0 });
}

// Hero fallback — procedural particle field if the cinematic is missing
function initHeroFallback() {
  heroMedia.classList.add('fallback');
  heroReady = false;
  const cv = $('#heroFallback');
  const ctx = cv.getContext('2d');
  const P = [];
  const resize = () => { cv.width = cv.clientWidth; cv.height = cv.clientHeight; };
  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 140; i++) {
    P.push({ x: Math.random(), y: Math.random(), z: Math.random() * 0.8 + 0.2, v: Math.random() * 0.0006 + 0.0002 });
  }
  (function draw() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const drift = scrubCurrent * 0.35;
    for (const p of P) {
      p.y -= p.v * (1 + scrubTarget * 6);
      if (p.y < 0) p.y = 1;
      const x = ((p.x + drift * p.z) % 1) * cv.width;
      const y = p.y * cv.height;
      ctx.fillStyle = `rgba(0,255,0,${0.15 + p.z * 0.5})`;
      ctx.fillRect(x, y, p.z * 2.4, p.z * 2.4);
    }
    scrubCurrent += (scrubTarget - scrubCurrent) * 0.14;
    requestAnimationFrame(draw);
  })();
}

/* ═══════════ POINTER-DRIVEN HORIZONTAL CANVAS SHIFT ═══════════ */

if (FINE_POINTER && !REDUCED) {
  const panHero = gsap.quickTo(heroMedia, 'x', { duration: 1.1, ease: 'power3.out' });
  const panGrid = gsap.quickTo('#pillarGrid', 'x', { duration: 1.4, ease: 'power3.out' });
  window.addEventListener('pointermove', e => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1; // -1 … 1
    panHero(nx * -28);
    panGrid(nx * -12);
  }, { passive: true });
}

/* ═══════════ HORIZON MARQUEES — velocity-reactive ═══════════ */

if (!REDUCED) {
  $$('.marquee').forEach(mq => {
    const track = $('.marquee-track', mq);
    const dir = Number(mq.dataset.speed) || 1;
    // 4 identical spans → content is periodic every 25%; a 0→-50 sweep loops seamlessly
    gsap.set(track, { xPercent: dir > 0 ? 0 : -50 });
    const tween = gsap.to(track, {
      xPercent: dir > 0 ? -50 : 0,
      duration: 18,
      ease: 'none',
      repeat: -1,
    });
    // scroll velocity accelerates the strip (never reverses — avoids repeat-boundary stall)
    ScrollTrigger.create({
      onUpdate: self => {
        const boost = 1 + Math.min(3, Math.abs(self.getVelocity()) / 900);
        gsap.to(tween, { timeScale: boost, duration: 0.4, overwrite: true });
      },
    });
  });
}

/* ═══════════ SECTION 2 — MODULE CARDS ═══════════ */

const DEPLOY_SEQS = [
  ['&gt; allocating vector shards', '&gt; warming embedding cache', '&gt; retrieval mesh: <span class="ok">LIVE ✓</span>'],
  ['&gt; rendering execution plan', '&gt; idempotency check: <span class="ok">PASS</span>', '&gt; fabric locked: <span class="ok">STABLE ✓</span>'],
  ['&gt; compiling context graph', '&gt; layering signal matrices', '&gt; engine spun up: <span class="ok">OPTIMAL ✓</span>'],
];

$$('.card').forEach(card => {
  const video = $('video', card);
  const stateEl = $('[data-state]', card);
  const btn = $('.deploy', card);
  const logEl = $('.deploy-log', card);
  const idx = Number(card.dataset.idx);
  let deployed = false;
  let videoOk = true;

  video.addEventListener('error', () => { videoOk = false; });

  // Zero-latency hover-to-play: decoder pre-warmed by priming pass below
  const play = () => {
    if (!videoOk) return;
    const p = video.play();
    if (p) p.catch(() => {});
    card.classList.add('playing');
    if (!deployed) stateEl.textContent = 'SPINNING';
  };
  const stop = () => {
    if (!videoOk) return;
    video.pause();
    card.classList.remove('playing');
    if (!deployed) stateEl.textContent = 'STANDBY';
  };

  card.addEventListener('pointerenter', play);
  card.addEventListener('pointerleave', stop);
  // touch: tap toggles
  card.addEventListener('touchstart', () => (video.paused ? play() : stop()), { passive: true });

  // 3D tilt
  if (FINE_POINTER && !REDUCED) {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      rx(py * -6); ry(px * 6);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }

  // Deploy sequence
  btn.addEventListener('click', () => {
    if (deployed) return;
    deployed = true;
    logEl.classList.add('open');
    stateEl.textContent = 'DEPLOYING';
    const seq = DEPLOY_SEQS[idx] || DEPLOY_SEQS[0];
    seq.forEach((line, i) => {
      setTimeout(() => {
        const div = document.createElement('div');
        div.innerHTML = line;
        logEl.appendChild(div);
        if (i === seq.length - 1) {
          stateEl.textContent = 'DEPLOYED';
          btn.classList.add('done');
          $('.deploy-label', btn).textContent = 'MODULE ACTIVE';
          $('.deploy-arrow', btn).textContent = '✓';
        }
      }, 380 * (i + 1));
    });
  });

  // card entrance
  if (!REDUCED) {
    gsap.from(card, {
      y: 90, autoAlpha: 0, duration: 1.1, ease: 'power3.out',
      scrollTrigger: { trigger: card, start: 'top 88%' },
      delay: idx * 0.08,
    });
  }
});

// Prime every module video once after boot so first hover starts instantly
document.addEventListener('hana:booted', () => {
  $$('.card video').forEach(v => {
    const p = v.play();
    if (p) p.then(() => { v.pause(); v.currentTime = 0; }).catch(() => {});
  });
}, { once: true });

/* ═══════════ SECTION 3 — MANIFESTO ═══════════ */

const manifestoVideo = $('#manifestoVideo');
new IntersectionObserver(entries => {
  entries.forEach(en => {
    if (en.isIntersecting) { const p = manifestoVideo.play(); if (p) p.catch(() => {}); }
    else manifestoVideo.pause();
  });
}, { threshold: 0.05 }).observe($('#manifesto'));

if (!REDUCED) {
  gsap.fromTo('.m-inner',
    { yPercent: 115 },
    {
      yPercent: 0, stagger: 0.12, ease: 'power4.out', duration: 1.2,
      scrollTrigger: { trigger: '#manifestoText', start: 'top 78%' },
    });
  gsap.from('.manifesto-sig', {
    autoAlpha: 0, y: 24, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: '.manifesto-sig', start: 'top 92%' },
  });
  // slow parallax drift on the macro loop
  gsap.fromTo('.manifesto-media', { yPercent: -8 }, {
    yPercent: 8, ease: 'none',
    scrollTrigger: { trigger: '#manifesto', start: 'top bottom', end: 'bottom top', scrub: true },
  });
}

/* ═══════════ HOUSEKEEPING ═══════════ */

window.addEventListener('load', () => ScrollTrigger.refresh());
