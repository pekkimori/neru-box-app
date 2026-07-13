// Minimal SVG primitives for the completed-task network.

import { Circle, G, Line } from 'react-native-svg';
import { GalaxyPalette } from './galaxy-theme';
import type { GalaxyStar } from './galaxy-geometry';
import type { GalaxyEdge } from './galaxy-edges';

export function NetworkNodes({
  stars,
  highlightedDomainId,
}: {
  stars: GalaxyStar[];
  highlightedDomainId: string | null;
}) {
  return (
    <G>
      {stars.map((star) => {
        const key = `${star.starId}:${star.completionDate}:${star.completionOrder}`;
        const selected = highlightedDomainId === star.constellationId;
        const subdued = highlightedDomainId !== null && !selected;
        return (
        <G key={key}>
          {selected && (
            <Circle
              cx={star.x}
              cy={star.y}
              r={16}
              fill="none"
              stroke={star.domainColor}
              strokeWidth={1.5}
              opacity={0.72}
            />
          )}
          <Circle
            cx={star.x}
            cy={star.y}
            r={selected ? 13 : 11}
            fill={star.domainColor}
            opacity={subdued ? 0.035 : selected ? 0.28 : 0.15}
          />
          <Circle
            cx={star.x}
            cy={star.y}
            r={selected ? 6.5 : 5.5}
            fill={star.domainColor}
            opacity={subdued ? 0.22 : 1}
          />
        </G>
        );
      })}
    </G>
  );
}

export function NetworkEdges({
  edges,
  highlightedDomainId,
}: {
  edges: GalaxyEdge[];
  highlightedDomainId: string | null;
}) {
  return (
    <G>
      {edges.filter((edge) => edge.kind !== 'domain-repeat').map((edge) => (
        <Line
          key={edge.key}
          x1={edge.from.x}
          y1={edge.from.y}
          x2={edge.to.x}
          y2={edge.to.y}
          stroke={GalaxyPalette.dayEdge}
          strokeWidth={1.15}
          opacity={highlightedDomainId === null
            ? 1
            : edge.from.constellationId === highlightedDomainId
              || edge.to.constellationId === highlightedDomainId
              ? 0.72
              : 0.16}
        />
      ))}
      {edges.filter((edge) => edge.kind === 'domain-repeat').map((edge) => (
        <Line
          key={edge.key}
          x1={edge.from.x}
          y1={edge.from.y}
          x2={edge.to.x}
          y2={edge.to.y}
          stroke={edge.color}
          strokeWidth={2}
          opacity={highlightedDomainId === null
            ? 0.62
            : edge.from.constellationId === highlightedDomainId
              ? 0.92
              : 0.1}
        />
      ))}
    </G>
  );
}
