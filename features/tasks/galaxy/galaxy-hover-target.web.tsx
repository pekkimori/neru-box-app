import { useCallback, useEffect, useRef, useState } from 'react';
import { playTapFeedback } from '@/utils/interaction-feedback';
import { formatCompletionDate, type GalaxyStar } from './galaxy-geometry';
import { GalaxyPalette } from './galaxy-theme';

const CARD_WIDTH = 760;
const CARD_HEIGHT = 600;
const TARGET_SIZE = 40;
const GAP = 22;
const MARGIN = 14;

interface Props {
  targetKey: string;
  star: GalaxyStar;
  x: number;
  y: number;
  canvasW: number;
  canvasH: number;
  pinned: boolean;
  onPin: () => void;
  onClose: () => void;
  onExclude: () => Promise<void>;
  onPopupInteraction: () => void;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

/** Native DOM + CSS hover avoids conflicts with React Native's PanResponder. */
export function GalaxyHoverTarget({
  targetKey,
  star,
  x,
  y,
  canvasW,
  canvasH,
  pinned,
  onPin,
  onClose,
  onExclude,
  onPopupInteraction,
}: Props) {
  const sensorRef = useRef<HTMLDivElement>(null);
  const [confirmExclude, setConfirmExclude] = useState(false);
  const [excluding, setExcluding] = useState(false);
  const [excludeError, setExcludeError] = useState(false);
  const [photoUnavailable, setPhotoUnavailable] = useState(false);
  const [wasPinned, setWasPinned] = useState(pinned);
  if (wasPinned !== pinned) {
    setWasPinned(pinned);
    if (!pinned) {
      setConfirmExclude(false);
      setExcludeError(false);
      setPhotoUnavailable(false);
    }
  }
  const targetLeft = x - TARGET_SIZE / 2;
  const targetTop = y - TARGET_SIZE / 2;
  const opensRight = x + GAP + CARD_WIDTH <= canvasW - MARGIN;
  const preferredCardLeft = opensRight ? x + GAP : x - CARD_WIDTH - GAP;
  const cardLeft = clamp(
    preferredCardLeft,
    MARGIN,
    Math.max(MARGIN, canvasW - CARD_WIDTH - MARGIN),
  );
  const cardTop = clamp(
    y - CARD_HEIGHT / 2,
    MARGIN,
    Math.max(MARGIN, canvasH - CARD_HEIGHT - MARGIN),
  );
  const recordNumber = String(star.completionOrder + 1).padStart(2, '0');

  const handleDismiss = useCallback(() => {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && sensorRef.current?.contains(focused)) focused.blur();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!pinned) return undefined;

    const closeFromOutside = (event: PointerEvent) => {
      if (!sensorRef.current?.contains(event.target as Node)) handleDismiss();
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleDismiss();
    };

    document.addEventListener('pointerdown', closeFromOutside, true);
    document.addEventListener('keydown', closeFromKeyboard);
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside, true);
      document.removeEventListener('keydown', closeFromKeyboard);
    };
  }, [handleDismiss, pinned]);

  const handlePin = () => {
    playTapFeedback();
    onPin();
  };

  const handleExcludeRequest = () => {
    playTapFeedback();
    onPin();
    setConfirmExclude(true);
    setExcludeError(false);
  };

  const handleExclude = async () => {
    setExcluding(true);
    setExcludeError(false);
    try {
      await onExclude();
      handleDismiss();
    } catch {
      setExcluding(false);
      setExcludeError(true);
    }
  };

  return (
    <div
      ref={sensorRef}
      className={`galaxy-hover-sensor${pinned ? ' is-pinned' : ''}`}
      style={{
        position: 'absolute',
        zIndex: pinned ? 50 : 10,
        left: targetLeft,
        top: targetTop,
        width: TARGET_SIZE,
        height: TARGET_SIZE,
        borderRadius: TARGET_SIZE / 2,
      }}
      onPointerDown={(event) => {
        onPopupInteraction();
        event.stopPropagation();
      }}
    >
      <button
        type="button"
        className="galaxy-node-button"
        data-testid={`galaxy-node-hover-${targetKey}`}
        aria-label={`${pinned ? 'Pinned archive record' : 'Pin archive record'} for ${star.label}, completed ${formatCompletionDate(star.completionDate)}`}
        aria-expanded={pinned}
        onClick={handlePin}
      />

      <div
        className="galaxy-hover-orbit"
        style={{
          position: 'absolute',
          inset: 2,
          borderRadius: '50%',
          border: `1px solid ${star.domainColor}70`,
        }}
      >
        <span style={{ background: star.domainColor }} />
      </div>
      <div
        className="galaxy-hover-ring"
        style={{
          position: 'absolute',
          inset: 8,
          borderRadius: '50%',
          border: `1px solid ${star.domainColor}`,
          background: `${star.domainColor}18`,
          boxShadow: `0 0 16px ${star.domainColor}55`,
        }}
      />

      {pinned && (
        <div
          className="galaxy-drawer-backdrop"
          aria-hidden="true"
          onClick={(event) => { event.stopPropagation(); handleDismiss(); }}
        />
      )}

      <div
        className="galaxy-hover-popup"
        data-side={opensRight ? 'right' : 'left'}
        data-testid={`galaxy-node-popup-${targetKey}`}
        data-pinned={pinned ? 'true' : 'false'}
        style={{
          position: 'absolute',
          left: cardLeft - targetLeft,
          top: cardTop - targetTop,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          boxSizing: 'border-box',
          overflow: 'visible',
          borderRadius: 18,
          border: 0,
          background: GalaxyPalette.translucentSurface,
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.28)',
          color: GalaxyPalette.text,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        <div className="galaxy-popup-clip">
          <div className="galaxy-drawer-handle" />
          <div className="galaxy-popup-content">
            <div className="galaxy-popup-heading">
              <div className="galaxy-popup-heading-copy">
                <div className="galaxy-popup-record">COMPLETED TASK</div>
                <div
                  className="galaxy-popup-domain"
                  style={{ borderColor: `${star.domainColor}3D`, background: `${star.domainColor}12` }}
                >
                  <span style={{ background: star.domainColor, boxShadow: `0 0 8px ${star.domainColor}` }} />
                  <strong>{star.constellationName}</strong>
                </div>
              </div>
            </div>

            <div className="galaxy-popup-title">{star.label}</div>
            <div className="galaxy-popup-date">Completed {formatCompletionDate(star.completionDate)}</div>

            <div className="galaxy-popup-photo">
              {star.completionPhotoUri && !photoUnavailable ? (
                <img
                  src={star.completionPhotoUri}
                  alt={`Completion proof for ${star.label}`}
                  onError={() => setPhotoUnavailable(true)}
                />
              ) : (
                <div className="galaxy-popup-photo-empty">
                  <span className="galaxy-popup-photo-icon" style={{ color: star.domainColor, background: `${star.domainColor}18` }}>▧</span>
                  <strong>{photoUnavailable ? 'Photo unavailable' : 'No completion photo'}</strong>
                  <span>{photoUnavailable ? 'This image could not be loaded.' : 'This task was completed without an image.'}</span>
                </div>
              )}
              <div className="galaxy-popup-photo-label">▣ &nbsp; TASK PROOF</div>
            </div>

            <div className="galaxy-popup-reward">
              <span className="galaxy-popup-reward-icon" style={{ color: star.domainColor, background: `${star.domainColor}18` }}>✦</span>
              <span className="galaxy-popup-reward-copy">
                <small>REWARD EARNED</small>
                <strong>+{star.coinsEarned} coins</strong>
              </span>
              <span className="galaxy-popup-order">#{recordNumber}</span>
            </div>

            <div className={`galaxy-popup-footer${confirmExclude ? ' is-confirming' : ''}`}>
              {confirmExclude ? (
                <>
                  <div className="galaxy-popup-confirm-copy">
                    <strong>{excludeError ? 'Could not exclude' : 'Exclude this task?'}</strong>
                    <span>{excludeError ? 'Please try again.' : 'The task and coins stay safe.'}</span>
                  </div>
                  <div className="galaxy-popup-confirm-actions">
                    <button
                      type="button"
                      className="galaxy-popup-cancel"
                      disabled={excluding}
                      onClick={(event) => { event.stopPropagation(); setConfirmExclude(false); setExcludeError(false); }}
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      className="galaxy-popup-exclude-confirm"
                      disabled={excluding}
                      onClick={(event) => { event.stopPropagation(); void handleExclude(); }}
                    >
                      {excluding ? 'Excluding…' : 'Exclude'}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="galaxy-popup-exclude"
                  aria-label={`Exclude ${star.label} from Sky Observer`}
                  onClick={(event) => { event.stopPropagation(); handleExcludeRequest(); }}
                >
                  <span>◉̸</span> Exclude from Sky Observer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
