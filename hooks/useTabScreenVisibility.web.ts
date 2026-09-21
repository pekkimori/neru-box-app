import { useLayoutEffect } from 'react';

/**
 * React Navigation keeps web tab scenes mounted. Hide inactive DOM frames from
 * assistive technology without shipping browser globals in the native bundle.
 */
export function useTabScreenVisibility(activeIndex: number, routeCount: number) {
  useLayoutEffect(() => {
    const tabBar = document.getElementById('neru-floating-tab-bar');
    const screens = tabBar?.parentElement?.children[0];
    if (!screens) return;

    const frames = Array.from(screens.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement,
    );

    frames.forEach((frame) => {
      const inactive = window.getComputedStyle(frame).zIndex === '-1';
      frame.style.visibility = inactive ? 'hidden' : 'visible';
      if (inactive) {
        frame.setAttribute('aria-hidden', 'true');
        frame.setAttribute('inert', '');
      } else {
        frame.removeAttribute('aria-hidden');
        frame.removeAttribute('inert');
      }
    });

    return () => {
      frames.forEach((frame) => {
        frame.style.visibility = '';
        frame.removeAttribute('aria-hidden');
        frame.removeAttribute('inert');
      });
    };
  }, [activeIndex, routeCount]);
}
