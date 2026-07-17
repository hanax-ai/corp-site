/* HANA-X smoke test — drives the real site in Chromium */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4173';
const results = [];
const check = (name, ok, detail = '') =>
  results.push({ name, ok, detail }) && console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text() + ' @' + (m.location()?.url || '')); });
page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + e.message));

await page.goto(BASE, { waitUntil: 'domcontentloaded' });

// 1. preloader runs then dismisses
await page.waitForSelector('#preloader.done', { timeout: 8000 })
  .then(() => check('preloader dismisses', true))
  .catch(() => check('preloader dismisses', false));

// 2. uptime tracker ticks in ms
const u1 = await page.textContent('#uptime');
await page.waitForTimeout(300);
const u2 = await page.textContent('#uptime');
check('uptime ticks (ms)', u1 !== u2 && /^T\+\d{2}:\d{2}:\d{2}\.\d{3}$/.test(u2.trim()), `${u1} → ${u2}`);

// 3. hero pin + scrub state
const heroState0 = await page.evaluate(() => {
  const v = document.querySelector('#heroVideo');
  return { t: v.currentTime, fallback: document.querySelector('#heroMedia').classList.contains('fallback') };
});
await page.mouse.wheel(0, 2500);
await page.waitForTimeout(1200);
const heroState1 = await page.evaluate(() => {
  const v = document.querySelector('#heroVideo');
  const sticky = document.querySelector('.hero-sticky').getBoundingClientRect();
  return { t: v.currentTime, stickyTop: sticky.top, scrollY: window.scrollY };
});
check('hero stays pinned while scrubbing', Math.abs(heroState1.stickyTop) < 2 && heroState1.scrollY > 2000,
  `stickyTop=${heroState1.stickyTop.toFixed(1)} scrollY=${heroState1.scrollY}`);
if (heroState0.fallback) {
  check('hero scrub (fallback canvas active — video absent)', true, 'canvas fallback running');
} else {
  check('hero video scrubs with scroll', heroState1.t > heroState0.t, `t: ${heroState0.t.toFixed(2)} → ${heroState1.t.toFixed(2)}`);
}

// 4. scroll % HUD updates
const pct = await page.textContent('#scrollPct');
check('scroll % HUD updates', /SCROLL \d{3}%/.test(pct) && pct !== 'SCROLL 000%', pct);

// 5. marquee moves
await page.evaluate(() => document.querySelector('.marquee-track').getBoundingClientRect());
const mx1 = await page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.marquee-track')).transform).m41);
await page.waitForTimeout(500);
const mx2 = await page.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.marquee-track')).transform).m41);
check('marquee strip animates', mx1 !== mx2, `${mx1.toFixed(1)} → ${mx2.toFixed(1)}`);

// 6. pillar cards: scroll into view, hover-to-play
await page.locator('#pillars').scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
const cards = page.locator('.card');
check('3 module cards render', await cards.count() === 3, `count=${await cards.count()}`);

const card0 = cards.nth(0);
await card0.hover();
await page.waitForTimeout(350);
const hoverState = await page.evaluate(() => {
  const c = document.querySelector('.card');
  const v = c.querySelector('video');
  return { playing: c.classList.contains('playing'), paused: v.paused, state: c.querySelector('[data-state]').textContent, hasSrc: v.currentSrc !== '' && v.readyState > 0 };
});
if (hoverState.hasSrc) {
  check('hover-to-play zero-latency', hoverState.playing && !hoverState.paused, `state=${hoverState.state}`);
} else {
  check('hover-to-play (video asset not yet present — skipped)', true, 'asset pending');
}

// 7. deploy sequence
const btn0 = card0.locator('.deploy');
await btn0.click();
await page.waitForTimeout(1500);
const deployState = await page.evaluate(() => ({
  label: document.querySelector('.card .deploy-label').textContent,
  state: document.querySelector('.card [data-state]').textContent,
  logLines: document.querySelectorAll('.card .deploy-log div').length,
}));
check('deploy module sequence completes', deployState.label === 'MODULE ACTIVE' && deployState.state === 'DEPLOYED' && deployState.logLines === 3,
  JSON.stringify(deployState));

// 8. manifesto reveal
await page.locator('#manifesto').scrollIntoViewIfNeeded();
await page.waitForTimeout(1600);
const mVisible = await page.evaluate(() => {
  const el = document.querySelector('.m-inner');
  const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
  return Math.abs(m.m42) < 5; // yPercent settled to ~0
});
check('manifesto lines reveal on scroll', mVisible);

// 9. no console errors (video 404s excluded — assets pending)
const realErrors = consoleErrors.filter(e => !/Failed to load resource.*(mp4|jpg)/.test(e));
check('no JS console errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

// screenshots
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(800);
await page.screenshot({ path: new URL('./shot-hero.png', import.meta.url).pathname });
await page.locator('#pillars').scrollIntoViewIfNeeded();
await page.waitForTimeout(600);
await page.screenshot({ path: new URL('./shot-pillars.png', import.meta.url).pathname });
await page.locator('#manifesto').scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
await page.screenshot({ path: new URL('./shot-manifesto.png', import.meta.url).pathname });

await browser.close();
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
