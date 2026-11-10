/* The whole site's behaviour: inertia scroll, things rising in once, clips that play only
   while visible, and a header that steps aside when you scroll down. */
import Lenis from 'lenis';

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
(window as unknown as { __siteReady: boolean }).__siteReady = true;

if (!reduce) {
  const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.95, anchors: { offset: -90 } });
  const frame = (t: number): void => { lenis.raf(t); requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
}

/* Rise in once. Children of [data-rise-group] stagger. */
document.querySelectorAll<HTMLElement>('[data-rise-group]').forEach((g) => [...g.children].forEach((c, i) => { c.setAttribute('data-rise', ''); (c as HTMLElement).style.setProperty('--i', String(Math.min(i, 8))); }));
const rise = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); rise.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-rise]').forEach((el) => rise.observe(el));

/* Clips: play while on screen. With reduced motion they stay on their poster, with controls. */
const videos = [...document.querySelectorAll<HTMLVideoElement>('video[data-clip]')];
if (reduce) videos.forEach((v) => { v.controls = true; v.loop = false; });
else {
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    const v = e.target as HTMLVideoElement;
    if (e.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
  }), { threshold: 0.25 });
  videos.forEach((v) => io.observe(v));
}

/* Header hides on the way down, returns on the way up. */
const nav = document.querySelector<HTMLElement>('[data-nav]');
let last = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  if (Math.abs(y - last) < 6 || !nav) return;
  nav.classList.toggle('is-hidden', y > 400 && y > last);
  last = y;
}, { passive: true });
nav?.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

root.classList.add('is-ready');
