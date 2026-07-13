import { useState } from 'react';
import { formatCompletionDate, type GalaxyStar } from './galaxy-geometry';
import { GalaxyPalette } from './galaxy-theme';

const CARD_WIDTH = 232;
const CARD_HEIGHT = 238;
const TARGET_SIZE = 36;
const GAP = 18;
const MARGIN = 12;

interface Props {
  targetKey: string;
  star: GalaxyStar;
  x: number;
  y: number;
  canvasW: number;
  canvasH: number;
  onSelect: () => void;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

/** Native DOM + CSS hover avoids conflicts with React Native's PanResponder. */
export function GalaxyHoverTarget({ targetKey, star, x, y, canvasW, canvasH, onSelect }: Props) {
  const [photoError, setPhotoError] = useState(false);
  const targetLeft = x - TARGET_SIZE / 2;
  const targetTop = y - TARGET_SIZE / 2;
  const preferredCardLeft = x + GAP + CARD_WIDTH <= canvasW - MARGIN
    ? x + GAP
    : x - CARD_WIDTH - GAP;
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
  const hasPhoto = Boolean(star.completionPhotoUri) && !photoError;

  return (
    <div
      className="galaxy-hover-sensor"
      data-testid={`galaxy-node-hover-${targetKey}`}
      tabIndex={0}
      role="button"
      aria-label={`Show details for ${star.label}`}
      onClick={onSelect}
      style={{
        position: 'absolute',
        zIndex: 10,
        left: targetLeft,
        top: targetTop,
        width: TARGET_SIZE,
        height: TARGET_SIZE,
        borderRadius: TARGET_SIZE / 2,
        cursor: 'pointer',
      }}
    >
      <div
        className="galaxy-hover-popup"
        data-testid={`galaxy-node-popup-${targetKey}`}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          left: cardLeft - targetLeft,
          top: cardTop - targetTop,
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          boxSizing: 'border-box',
          padding: 12,
          overflow: 'hidden',
          borderRadius: 10,
          border: `1px solid ${GalaxyPalette.border}`,
          borderTop: `3px solid ${star.domainColor}`,
          background: GalaxyPalette.surfaceRaised,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.42)',
          color: GalaxyPalette.text,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 8, height: 8, flex: '0 0 auto', borderRadius: 4, background: star.domainColor }} />
          <span style={{ overflow: 'hidden', color: GalaxyPalette.textDim, fontSize: 11, fontWeight: 700, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {star.constellationName}
          </span>
        </div>
        <div style={{ marginTop: 7, fontSize: 15, lineHeight: '19px', fontWeight: 800 }}>
          {star.label}
        </div>
        <div style={{ marginTop: 3, color: GalaxyPalette.textMuted, fontSize: 11, fontWeight: 600 }}>
          {formatCompletionDate(star.completionDate)}
        </div>
        <div style={{ height: 143, marginTop: 10, overflow: 'hidden', borderRadius: 7, border: `1px solid ${GalaxyPalette.border}`, background: GalaxyPalette.bg }}>
          {hasPhoto ? (
            <img
              src={star.completionPhotoUri}
              alt="Completion"
              onError={() => setPhotoError(true)}
              style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: GalaxyPalette.textMuted, fontSize: 11, fontWeight: 600 }}>
              No completion photo
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
