import { useCallback, useEffect, useRef, useState } from 'react';
import { playTapFeedback } from '@/utils/interaction-feedback';
import { formatCompletionDate, type GalaxyStar } from './galaxy-geometry';
import { GalaxyPalette } from './galaxy-theme';

const CARD_WIDTH = 286;
const CARD_HEIGHT = 212;
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
  const anchorY = clamp(y - cardTop, 22, CARD_HEIGHT - 22);
  const recordNumber = String(star.completionOrder + 1).padStart(2, '0');

  const handleDismiss = useCallback(() => {
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && sensorRef.current?.contains(focused)) focused.blur();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!pinned) {
      setConfirmExclude(false);
      setExcludeError(false);
    }
  }, [pinned]);

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
          border: `1px solid ${star.domainColor}42`,
          background: `linear-gradient(140deg, ${star.domainColor}18 0%, rgba(31, 35, 44, 0.97) 42%, rgba(25, 28, 35, 0.98) 100%)`,
          boxShadow: `0 24px 64px rgba(0, 0, 0, 0.52), 0 0 34px ${star.domainColor}18, inset 0 1px 0 rgba(255,255,255,.08)`,
          color: GalaxyPalette.text,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
        }}
      >
        <div
          className="galaxy-popup-connector"
          style={{
            position: 'absolute',
            top: anchorY - 0.5,
            left: opensRight ? -GAP : 'auto',
            right: opensRight ? 'auto' : -GAP,
            width: GAP,
            height: 1,
            background: `linear-gradient(${opensRight ? '90deg' : '270deg'}, ${star.domainColor}00, ${star.domainColor}B8)`,
          }}
        />
        <div className="galaxy-popup-clip">
          <div
            className="galaxy-popup-arc"
            style={{ borderColor: `${star.domainColor}30`, boxShadow: `0 0 48px ${star.domainColor}1A` }}
          />
          <div
            className="galaxy-popup-accent"
            style={{ background: star.domainColor, boxShadow: `0 0 14px ${star.domainColor}` }}
          />

          <div className="galaxy-popup-content">
            <div className="galaxy-popup-heading">
              <div className="galaxy-popup-record">ARCHIVE SIGNAL · {recordNumber}</div>
              <div className="galaxy-popup-heading-actions">
                <div
                  className="galaxy-popup-domain"
                  style={{ borderColor: `${star.domainColor}3D`, background: `${star.domainColor}12` }}
                >
                  <span style={{ background: star.domainColor, boxShadow: `0 0 8px ${star.domainColor}` }} />
                  <strong>{star.constellationName}</strong>
                </div>
                {pinned && (
                  <button
                    type="button"
                    className="galaxy-popup-close"
                    aria-label={`Close pinned record for ${star.label}`}
                    onClick={(event) => { event.stopPropagation(); handleDismiss(); }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="galaxy-popup-title">{star.label}</div>
            <div className="galaxy-popup-date">Captured {formatCompletionDate(star.completionDate)}</div>

            <div className="galaxy-popup-stats">
              <div className="galaxy-popup-stat">
                <span>WEEK</span>
                <strong>{star.isoWeek.split('-')[1]}</strong>
              </div>
              <div className="galaxy-popup-stat">
                <span>REWARD</span>
                <strong>+{star.coinsEarned} coins</strong>
              </div>
              <div className="galaxy-popup-stat">
                <span>MEMORY</span>
                <strong>{star.completionPhotoUri ? 'Secured' : 'None'}</strong>
              </div>
            </div>

            <div className={`galaxy-popup-footer${confirmExclude ? ' is-confirming' : ''}`}>
              {confirmExclude ? (
                <>
                  <div className="galaxy-popup-confirm-copy">
                    <strong>{excludeError ? 'Could not exclude' : 'Exclude this star?'}</strong>
                    <span>{excludeError ? 'Please try again.' : 'Task and coins stay safe.'}</span>
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
                <>
                  <span className="galaxy-popup-pin-hint">
                    <span className="galaxy-popup-pin-dot" style={{ background: pinned ? star.domainColor : GalaxyPalette.textMuted }} />
                    {pinned ? 'Pinned · click outside to close' : 'Click node to pin'}
                  </span>
                  <button
                    type="button"
                    className="galaxy-popup-exclude"
                    aria-label={`Exclude ${star.label} from Archive`}
                    onClick={(event) => { event.stopPropagation(); handleExcludeRequest(); }}
                  >
                    <span>⊘</span> Exclude
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
