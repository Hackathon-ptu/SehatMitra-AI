import { flushSync } from 'react-dom';

/**
 * Circular theme reveal.
 *
 * The new theme grows out of the clicked toggle as an expanding circle, and a
 * glowing white ring rides the circle's edge until it has covered the page.
 * Built on the View Transitions API: the browser snapshots the old page, we
 * apply the theme synchronously, then clip the live new page to a growing
 * circle. Browsers without the API (or users who prefer reduced motion) get an
 * instant switch.
 *
 * Performance notes:
 *  - The ring is a viewport-sized SVG (never a huge scaled element), so its
 *    view-transition snapshot stays small and never needs re-rastering mid-way.
 *  - Glow is drawn with layered strokes instead of blurred shadows.
 *  - The ring radius is read from the clip animation's own eased progress each
 *    frame, so the two stay perfectly in sync.
 */

const DURATION_MS = 700;
const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const SVG_NS = 'http://www.w3.org/2000/svg';

type ViewTransitionLike = { ready: Promise<void>; finished: Promise<void> };
type DocumentWithVT = Document & {
  startViewTransition?: (update: () => void) => ViewTransitionLike;
};

interface RevealOrigin {
  clientX?: number;
  clientY?: number;
  currentTarget?: EventTarget | null;
}

function resolveOrigin(e?: RevealOrigin): { x: number; y: number } {
  // Pointer clicks carry coordinates; keyboard activation reports 0,0, so fall
  // back to the centre of the toggle button (or the top-right corner).
  if (e && (e.clientX || e.clientY)) return { x: e.clientX!, y: e.clientY! };
  const el = e?.currentTarget as Element | null | undefined;
  if (el && 'getBoundingClientRect' in el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { x: window.innerWidth - 40, y: 32 };
}

// Concentric strokes: soft outer halo, faint teal glow, crisp white core.
const RING_LAYERS: Array<{ width: number; color: string }> = [
  { width: 22, color: 'rgba(255, 255, 255, 0.14)' },
  { width: 10, color: 'rgba(45, 212, 191, 0.30)' },
  { width: 5, color: 'rgba(255, 255, 255, 0.55)' },
  { width: 2.5, color: 'rgba(255, 255, 255, 1)' },
];

function createRing(x: number, y: number): { svg: SVGSVGElement; circles: SVGCircleElement[] } {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'theme-reveal-ring');
  svg.setAttribute('aria-hidden', 'true');
  const circles = RING_LAYERS.map(({ width, color }) => {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', String(x));
    c.setAttribute('cy', String(y));
    c.setAttribute('r', '0');
    c.setAttribute('fill', 'none');
    c.setAttribute('stroke', color);
    c.setAttribute('stroke-width', String(width));
    svg.appendChild(c);
    return c;
  });
  return { svg, circles };
}

export function toggleThemeWithReveal(e: RevealOrigin | undefined, applyTheme: () => void): void {
  const doc = document as DocumentWithVT;
  const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (!doc.startViewTransition || prefersReduced) {
    applyTheme();
    return;
  }

  const { x, y } = resolveOrigin(e);
  // Radius that reaches the farthest viewport corner from the origin.
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const { svg, circles } = createRing(x, y);

  const root = document.documentElement;
  // Freeze colour transitions so the new snapshot shows the final theme at once.
  root.classList.add('theme-switching');

  const transition = doc.startViewTransition(() => {
    flushSync(applyTheme);
    document.body.appendChild(svg);
  });

  let rafId = 0;

  transition.ready
    .then(() => {
      const clip = root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: DURATION_MS, easing: EASING, fill: 'both', pseudoElement: '::view-transition-new(root)' },
      );

      // Drive the ring from the clip animation's eased progress (one clock).
      const tick = () => {
        const progress = clip.effect?.getComputedTiming().progress ?? 1;
        const r = String(progress * radius);
        for (const c of circles) c.setAttribute('r', r);
        // Fade the ring out over the last stretch as it leaves the viewport.
        svg.style.opacity = String(progress < 0.82 ? 1 : Math.max(0, (1 - progress) / 0.18));
        if (clip.playState !== 'finished') rafId = requestAnimationFrame(tick);
      };
      tick();
    })
    .catch(() => { /* transition skipped — theme is already applied */ });

  transition.finished.finally(() => {
    cancelAnimationFrame(rafId);
    svg.remove();
    root.classList.remove('theme-switching');
  });
}
