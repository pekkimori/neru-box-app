import type { GalaxyStar } from './galaxy-geometry';

interface Props {
  targetKey: string;
  star: GalaxyStar;
  x: number;
  y: number;
  canvasW: number;
  canvasH: number;
  onSelect: () => void;
}

/** Touch platforms have no hover interaction. */
export function GalaxyHoverTarget(_props: Props) {
  return null;
}
