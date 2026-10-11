/**
 * Night landscape behind the hub (public/home/landscape.png, styled by `.home-landscape`).
 * Fixed to the viewport, so it covers the whole page behind the cards while scrolling; purely decorative.
 */
export function HomeLandscape() {
  return <div aria-hidden className="home-landscape pointer-events-none fixed inset-0 z-0" />;
}
