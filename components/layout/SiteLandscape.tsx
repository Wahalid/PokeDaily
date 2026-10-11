/**
 * Night landscape behind every page (public/home/landscape.png, styled by
 * `.site-landscape` in globals.css). Rendered once by the site layout and
 * fixed to the viewport, so long pages scroll over it without stretching or
 * repeating it, and client navigations never reload it. Game pages dim it
 * with a scrim (see `[data-game-page]` in globals.css). Purely decorative.
 */
export function SiteLandscape() {
  return <div aria-hidden className="site-landscape pointer-events-none fixed inset-0 -z-10" />;
}
