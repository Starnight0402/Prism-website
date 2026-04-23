/**
 * Dispatches a 'prism:ripple' custom event consumed by the 3D scene.
 * The ripple radiates violet light across the world and "levels" any data spikes.
 */
export function ripple(x, y, kind = 'rectify') {
  window.dispatchEvent(
    new CustomEvent('prism:ripple', {
      detail: { x, y, kind, t: performance.now() },
    })
  );
}
