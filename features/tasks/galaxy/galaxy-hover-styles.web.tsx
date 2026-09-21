import { useAppTheme } from '@/theme/app-theme';
import { GalaxyPalette } from './galaxy-theme';

export function GalaxyHoverStyles() {
  useAppTheme();
  return (
    <style>{`
      .galaxy-hover-sensor:hover,
      .galaxy-hover-sensor:focus-within,
      .galaxy-hover-sensor.is-pinned { z-index: 50 !important; }

      .galaxy-node-button {
        position: absolute;
        z-index: 2;
        inset: 0;
        width: 100%;
        height: 100%;
        padding: 0;
        border: 0;
        border-radius: 50%;
        outline: none;
        background: transparent;
        cursor: pointer;
      }
      .galaxy-node-button:focus-visible {
        outline: 2px solid ${GalaxyPalette.text};
        outline-offset: 3px;
      }

      .galaxy-hover-sensor > .galaxy-hover-popup {
        pointer-events: auto;
        opacity: 0;
        visibility: hidden;
        transform: translateY(100%);
        transform-origin: bottom center;
        transition:
          opacity 180ms ease,
          transform 300ms cubic-bezier(.16, 1, .3, 1),
          visibility 180ms;
      }
      .galaxy-hover-sensor > .galaxy-hover-orbit {
        pointer-events: none;
        opacity: 0;
        transform: rotate(-35deg) scale(.58);
        transition: opacity 140ms ease, transform 380ms cubic-bezier(.16, 1, .3, 1);
      }
      .galaxy-hover-sensor > .galaxy-hover-orbit > span {
        position: absolute;
        width: 4px;
        height: 4px;
        top: 1px;
        left: 7px;
        border-radius: 50%;
        box-shadow: 0 0 9px currentColor;
      }
      .galaxy-hover-sensor > .galaxy-hover-ring {
        pointer-events: none;
        opacity: 0;
        transform: scale(.45);
        transition: opacity 140ms ease, transform 300ms cubic-bezier(.2, .9, .2, 1.18);
      }
      .galaxy-hover-sensor.is-pinned > .galaxy-hover-popup {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
      .galaxy-hover-sensor:hover > .galaxy-hover-orbit,
      .galaxy-hover-sensor:focus-within > .galaxy-hover-orbit,
      .galaxy-hover-sensor.is-pinned > .galaxy-hover-orbit {
        opacity: .8;
        transform: rotate(18deg) scale(1.05);
      }
      .galaxy-hover-sensor:hover > .galaxy-hover-ring,
      .galaxy-hover-sensor:focus-within > .galaxy-hover-ring,
      .galaxy-hover-sensor.is-pinned > .galaxy-hover-ring {
        opacity: .9;
        transform: scale(1.16);
      }
      .galaxy-node-button:active ~ .galaxy-hover-ring {
        opacity: 1;
        transform: scale(.74);
      }
      .galaxy-drawer-backdrop {
        position: fixed;
        z-index: 48;
        inset: 0;
        background: ${GalaxyPalette.backdrop};
        animation: galaxy-drawer-backdrop-in 180ms ease both;
      }
      @keyframes galaxy-drawer-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
      .galaxy-popup-clip { position: absolute; inset: 0; overflow: hidden; border-radius: 18px 18px 0 0; }
      .galaxy-drawer-handle { position: absolute; z-index: 3; top: 14px; left: 50%; width: 38px; height: 4px; border-radius: 2px; background: ${GalaxyPalette.border}; transform: translateX(-50%); }
      .galaxy-popup-content { position: relative; height: 100%; padding: 38px 28px 22px; box-sizing: border-box; }
      .galaxy-popup-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 24px; }
      .galaxy-popup-heading-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; align-items: flex-start; gap: 6px; }
      .galaxy-popup-record { color: ${GalaxyPalette.textMuted}; font-size: 9px; font-weight: 800; letter-spacing: 1.35px; white-space: nowrap; }
      .galaxy-popup-domain {
        display: flex;
        align-items: center;
        max-width: 190px;
        gap: 6px;
        padding: 4px 8px;
        border: 1px solid;
        border-radius: 999px;
      }
      .galaxy-popup-domain > span { width: 6px; height: 6px; flex: 0 0 auto; border-radius: 50%; }
      .galaxy-popup-domain > strong { overflow: hidden; color: ${GalaxyPalette.textDim}; font-size: 10px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
      .galaxy-popup-title { margin-top: 16px; max-width: 620px; color: ${GalaxyPalette.text}; font-size: 26px; line-height: 31px; font-weight: 800; letter-spacing: -.25px; }
      .galaxy-popup-date { margin-top: 3px; color: ${GalaxyPalette.textMuted}; font-size: 11px; font-weight: 600; }
      .galaxy-popup-photo {
        position: relative;
        height: 294px;
        overflow: hidden;
        margin-top: 14px;
        border: 1px solid ${GalaxyPalette.subtleLine};
        border-radius: 12px;
        background: ${GalaxyPalette.photoSurface};
      }
      .galaxy-popup-photo > img { width: 100%; height: 100%; display: block; object-fit: cover; }
      .galaxy-popup-photo-empty { display: flex; width: 100%; height: 100%; flex-direction: column; align-items: center; justify-content: center; color: ${GalaxyPalette.textMuted}; }
      .galaxy-popup-photo-empty > .galaxy-popup-photo-icon { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 50%; font-size: 20px; }
      .galaxy-popup-photo-empty > strong { margin-top: 8px; color: ${GalaxyPalette.textDim}; font-size: 11px; }
      .galaxy-popup-photo-empty > span:last-child { margin-top: 3px; font-size: 9px; font-weight: 600; }
      .galaxy-popup-photo-label { position: absolute; top: 9px; left: 9px; padding: 5px 7px; border-radius: 7px; background: ${GalaxyPalette.proofLabel}; color: ${GalaxyPalette.textDim}; font-size: 8px; font-weight: 800; letter-spacing: .8px; }
      .galaxy-popup-reward { display: flex; min-height: 48px; align-items: center; gap: 9px; margin-top: 10px; padding: 7px 10px; box-sizing: border-box; border: 1px solid ${GalaxyPalette.subtleLine}; border-radius: 10px; background: ${GalaxyPalette.subtleFill}; }
      .galaxy-popup-reward-icon { display: grid; width: 31px; height: 31px; flex: 0 0 auto; place-items: center; border-radius: 50%; font-size: 16px; }
      .galaxy-popup-reward-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
      .galaxy-popup-reward-copy > small { color: ${GalaxyPalette.textMuted}; font-size: 8px; font-weight: 800; letter-spacing: .75px; }
      .galaxy-popup-reward-copy > strong { color: ${GalaxyPalette.text}; font-size: 11px; font-weight: 800; }
      .galaxy-popup-order { color: ${GalaxyPalette.textMuted}; font-size: 10px; font-weight: 800; }

      .galaxy-popup-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 43px;
        gap: 8px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid ${GalaxyPalette.subtleLine};
      }
      .galaxy-popup-footer.is-confirming { align-items: flex-end; }
      .galaxy-popup-exclude,
      .galaxy-popup-cancel,
      .galaxy-popup-exclude-confirm {
        min-height: 28px;
        padding: 0 9px;
        border-radius: 7px;
        font: 750 9px/26px system-ui, sans-serif;
        cursor: pointer;
      }
      .galaxy-popup-exclude { width: 100%; border: 1px solid rgba(251,113,133,.28); background: rgba(251,113,133,.075); color: #F0A0AE; }
      .galaxy-popup-exclude:hover { border-color: rgba(251,113,133,.5); background: rgba(251,113,133,.11); color: #FB9AAC; }
      .galaxy-popup-confirm-copy { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
      .galaxy-popup-confirm-copy > strong { color: ${GalaxyPalette.text}; font-size: 10px; font-weight: 800; }
      .galaxy-popup-confirm-copy > span { color: ${GalaxyPalette.textMuted}; font-size: 8px; font-weight: 600; white-space: nowrap; }
      .galaxy-popup-confirm-actions { display: flex; gap: 5px; }
      .galaxy-popup-cancel { border: 1px solid ${GalaxyPalette.subtleLine}; background: ${GalaxyPalette.subtleFill}; color: ${GalaxyPalette.textDim}; }
      .galaxy-popup-exclude-confirm { border: 1px solid #BE123C; background: #BE123C; color: #fff; }
      .galaxy-popup-cancel:disabled,
      .galaxy-popup-exclude-confirm:disabled { cursor: default; opacity: .55; }

      @media (pointer: coarse) {
        /* Let the canvas choose the nearest star on touch so overlapping DOM
           hit areas never select an adjacent node. The pinned card stays live. */
        .galaxy-node-button { pointer-events: none; }
      }

      @media (max-width: 600px) {
        .galaxy-popup-content { padding: 38px 20px max(18px, env(safe-area-inset-bottom)); }
        .galaxy-popup-heading { min-height: 40px; }
        .galaxy-popup-record { font-size: 10px; }
        .galaxy-popup-domain { max-width: 120px; padding: 6px 9px; }
        .galaxy-popup-title { margin-top: 9px; font-size: 22px; line-height: 26px; }
        .galaxy-popup-date { font-size: 12px; }
        .galaxy-popup-photo { height: min(230px, 31vh); margin-top: 15px; }
        .galaxy-popup-reward { min-height: 52px; margin-top: 11px; }
        .galaxy-popup-footer { min-height: 53px; margin-top: 13px; padding-top: 10px; }
        .galaxy-popup-exclude,
        .galaxy-popup-cancel,
        .galaxy-popup-exclude-confirm {
          min-height: 42px;
          padding: 0 13px;
          border-radius: 10px;
          font-size: 11px;
          line-height: 40px;
        }
        .galaxy-popup-confirm-copy > strong { font-size: 12px; }
        .galaxy-popup-confirm-copy > span { font-size: 10px; }
      }

      .galaxy-hover-sensor > .galaxy-hover-popup {
        position: fixed !important;
        z-index: 50;
        left: 50% !important;
        right: auto !important;
        top: auto !important;
        bottom: 0 !important;
        width: min(760px, 100vw) !important;
        height: min(600px, 86vh) !important;
        border-radius: 18px 18px 0 0 !important;
        transform: translate(-50%, 100%);
      }
      .galaxy-hover-sensor.is-pinned > .galaxy-hover-popup { transform: translate(-50%, 0); }
      @media (prefers-reduced-motion: reduce) {
        .galaxy-hover-sensor > .galaxy-hover-popup,
        .galaxy-hover-sensor > .galaxy-hover-orbit,
        .galaxy-hover-sensor > .galaxy-hover-ring { transition-duration: 0ms; }
      }
    `}</style>
  );
}
