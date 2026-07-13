export function GalaxyHoverStyles() {
  return (
    <style>{`
      .galaxy-hover-sensor > .galaxy-hover-popup {
        opacity: 0;
        visibility: hidden;
        transform: translateY(4px);
        transition: opacity 120ms ease, transform 120ms ease;
      }
      .galaxy-hover-sensor:hover > .galaxy-hover-popup,
      .galaxy-hover-sensor:focus-visible > .galaxy-hover-popup {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
    `}</style>
  );
}
