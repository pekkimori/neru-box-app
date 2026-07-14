export function GalaxyHoverStyles() {
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
        outline: 2px solid rgba(245,242,234,.88);
        outline-offset: 3px;
      }

      .galaxy-hover-sensor > .galaxy-hover-popup {
        pointer-events: auto;
        opacity: 0;
        visibility: hidden;
        transform: translateY(9px) scale(.965);
        transform-origin: center;
        transition:
          opacity 150ms ease,
          transform 240ms cubic-bezier(.16, 1, .3, 1),
          visibility 150ms;
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
      .galaxy-hover-sensor:hover > .galaxy-hover-popup,
      .galaxy-hover-sensor:focus-within > .galaxy-hover-popup,
      .galaxy-hover-sensor.is-pinned > .galaxy-hover-popup {
        opacity: 1;
        visibility: visible;
        transform: translateY(0) scale(1);
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
      .galaxy-popup-connector {
        opacity: 0;
        transform: scaleX(.25);
        transform-origin: right center;
        transition: opacity 160ms 40ms ease, transform 240ms 40ms cubic-bezier(.16, 1, .3, 1);
      }
      .galaxy-hover-popup[data-side="right"] .galaxy-popup-connector { transform-origin: left center; }
      .galaxy-hover-sensor:hover .galaxy-popup-connector,
      .galaxy-hover-sensor:focus-within .galaxy-popup-connector,
      .galaxy-hover-sensor.is-pinned .galaxy-popup-connector {
        opacity: 1;
        transform: scaleX(1);
      }

      .galaxy-popup-clip { position: absolute; inset: 0; overflow: hidden; border-radius: 17px; }
      .galaxy-popup-arc {
        position: absolute;
        width: 128px;
        height: 128px;
        top: -78px;
        right: -40px;
        border: 1px solid;
        border-radius: 50%;
      }
      .galaxy-popup-accent {
        position: absolute;
        left: 0;
        top: 20px;
        bottom: 20px;
        width: 3px;
        border-radius: 0 3px 3px 0;
      }
      .galaxy-popup-content { position: relative; height: 100%; padding: 16px 16px 12px 20px; box-sizing: border-box; }
      .galaxy-popup-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 24px; }
      .galaxy-popup-record { color: #747B8B; font-size: 9px; font-weight: 800; letter-spacing: 1.35px; white-space: nowrap; }
      .galaxy-popup-heading-actions { display: flex; align-items: center; gap: 5px; min-width: 0; }
      .galaxy-popup-domain {
        display: flex;
        align-items: center;
        max-width: 105px;
        gap: 6px;
        padding: 4px 8px;
        border: 1px solid;
        border-radius: 999px;
      }
      .galaxy-popup-domain > span { width: 6px; height: 6px; flex: 0 0 auto; border-radius: 50%; }
      .galaxy-popup-domain > strong { overflow: hidden; color: #A8ADBA; font-size: 10px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
      .galaxy-popup-close {
        width: 24px;
        height: 24px;
        padding: 0 0 2px;
        border: 1px solid rgba(255,255,255,.11);
        border-radius: 50%;
        background: rgba(8,10,14,.35);
        color: #A8ADBA;
        font: 600 17px/20px system-ui, sans-serif;
        cursor: pointer;
      }
      .galaxy-popup-close:hover { border-color: rgba(255,255,255,.24); color: #F5F2EA; }
      .galaxy-popup-title { margin-top: 11px; max-width: 242px; color: #F5F2EA; font-size: 18px; line-height: 22px; font-weight: 800; letter-spacing: -.25px; }
      .galaxy-popup-date { margin-top: 3px; color: #747B8B; font-size: 11px; font-weight: 600; }
      .galaxy-popup-stats { display: flex; gap: 7px; margin-top: 12px; }
      .galaxy-popup-stat {
        display: flex;
        min-width: 0;
        flex: 1;
        flex-direction: column;
        gap: 3px;
        padding: 7px 8px;
        border: 1px solid rgba(255,255,255,.075);
        border-radius: 8px;
        background: rgba(255,255,255,.035);
      }
      .galaxy-popup-stat > span { color: #747B8B; font-size: 8px; font-weight: 800; letter-spacing: .8px; }
      .galaxy-popup-stat > strong { overflow: hidden; color: #D9DCE5; font-size: 10px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }

      .galaxy-popup-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 36px;
        gap: 8px;
        margin-top: 11px;
        padding-top: 9px;
        border-top: 1px solid rgba(255,255,255,.075);
      }
      .galaxy-popup-footer.is-confirming { align-items: flex-end; }
      .galaxy-popup-pin-hint { display: flex; align-items: center; min-width: 0; gap: 6px; color: #747B8B; font-size: 9px; font-weight: 650; white-space: nowrap; }
      .galaxy-popup-pin-dot { width: 5px; height: 5px; flex: 0 0 auto; border-radius: 50%; }
      .galaxy-popup-exclude,
      .galaxy-popup-cancel,
      .galaxy-popup-exclude-confirm {
        min-height: 28px;
        padding: 0 9px;
        border-radius: 7px;
        font: 750 9px/26px system-ui, sans-serif;
        cursor: pointer;
      }
      .galaxy-popup-exclude { border: 1px solid rgba(251,113,133,.24); background: rgba(251,113,133,.055); color: #CE8794; }
      .galaxy-popup-exclude:hover { border-color: rgba(251,113,133,.5); background: rgba(251,113,133,.11); color: #FB9AAC; }
      .galaxy-popup-confirm-copy { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
      .galaxy-popup-confirm-copy > strong { color: #F5F2EA; font-size: 10px; font-weight: 800; }
      .galaxy-popup-confirm-copy > span { color: #747B8B; font-size: 8px; font-weight: 600; white-space: nowrap; }
      .galaxy-popup-confirm-actions { display: flex; gap: 5px; }
      .galaxy-popup-cancel { border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.035); color: #A8ADBA; }
      .galaxy-popup-exclude-confirm { border: 1px solid #BE123C; background: #BE123C; color: #fff; }
      .galaxy-popup-cancel:disabled,
      .galaxy-popup-exclude-confirm:disabled { cursor: default; opacity: .55; }

      @media (pointer: coarse) {
        /* Let the canvas choose the nearest star on touch so overlapping DOM
           hit areas never select an adjacent node. The pinned card stays live. */
        .galaxy-node-button { pointer-events: none; }
      }

      @media (max-width: 600px) {
        .galaxy-hover-sensor > .galaxy-hover-popup {
          position: fixed !important;
          left: 10px !important;
          right: 10px !important;
          top: auto !important;
          bottom: max(10px, env(safe-area-inset-bottom)) !important;
          width: auto !important;
          height: auto !important;
          min-height: 292px;
          border-radius: 22px !important;
          transform: translateY(16px) scale(.985);
          transform-origin: bottom center;
        }
        .galaxy-hover-sensor:hover > .galaxy-hover-popup,
        .galaxy-hover-sensor:focus-within > .galaxy-hover-popup,
        .galaxy-hover-sensor.is-pinned > .galaxy-hover-popup {
          transform: translateY(0) scale(1);
        }
        .galaxy-popup-connector { display: none; }
        .galaxy-popup-clip { border-radius: 21px; }
        .galaxy-popup-content { padding: 17px 18px 14px 20px; }
        .galaxy-popup-heading { min-height: 40px; }
        .galaxy-popup-record { font-size: 10px; }
        .galaxy-popup-domain { max-width: 120px; padding: 6px 9px; }
        .galaxy-popup-close { width: 38px; height: 38px; font-size: 20px; line-height: 34px; }
        .galaxy-popup-title { margin-top: 9px; font-size: 22px; line-height: 26px; }
        .galaxy-popup-date { font-size: 12px; }
        .galaxy-popup-stats { margin-top: 14px; gap: 8px; }
        .galaxy-popup-stat { min-height: 52px; justify-content: center; padding: 9px 10px; border-radius: 10px; }
        .galaxy-popup-stat > span { font-size: 9px; }
        .galaxy-popup-stat > strong { margin-top: 2px; font-size: 11px; }
        .galaxy-popup-footer { min-height: 53px; margin-top: 13px; padding-top: 10px; }
        .galaxy-popup-pin-hint { font-size: 10px; }
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

      @media (prefers-reduced-motion: reduce) {
        .galaxy-hover-sensor > .galaxy-hover-popup,
        .galaxy-hover-sensor > .galaxy-hover-orbit,
        .galaxy-hover-sensor > .galaxy-hover-ring,
        .galaxy-popup-connector { transition-duration: 0ms; }
      }
    `}</style>
  );
}
