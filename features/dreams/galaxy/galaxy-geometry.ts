// Pure deterministic geometry for the completed-task network.

import type { GalaxyEdge } from './galaxy-edges';

const DOMAIN_COLORS = [
  '#7DD3FC', '#F9A8D4', '#86EFAC', '#FCD34D',
  '#C4B5FD', '#FDA4AF', '#5EEAD4', '#FDBA74',
  '#93C5FD', '#D8B4FE', '#A3E635', '#FB7185',
] as const;

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GalaxyStar {
  starId: string;
  label: string;
  constellationId: string;
  constellationName: string;
  constellationIcon: string;
  completionDate: string;
  completedAt?: string;
  completionOrder: number;
  isoWeek: string;
  weekLabel: string;
  coinsEarned: number;
  completionPhotoUri?: string;
  domainColor: string;
  x: number;
  y: number;
}

export interface GalaxyDomain {
  constellationId: string;
  name: string;
  icon: string;
  color: string;
  cx: number;
  cy: number;
  weekCount: number;
  starCount: number;
}

export interface GalaxyWeekLabel {
  isoWeek: string;
  label: string;
}

export interface GalaxyLayout {
  positioned: GalaxyStar[];
  domains: GalaxyDomain[];
  weekLabels: GalaxyWeekLabel[];
}

interface SimulatedWeek {
  stars: GalaxyStar[];
  width: number;
  height: number;
}

/** ISO 8601 week number for a local-calendar Date. */
export function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function deterministicHash(str: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

function parseLocalDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function startOfISOWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() - (result.getDay() || 7) + 1);
  return result;
}

function formatWeekRange(date: string): string {
  const start = startOfISOWeek(parseLocalDate(date));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${end.getDate()}, ${end.getFullYear()}`;
}

export function formatCompletionDate(date: string): string {
  return parseLocalDate(date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function starKey(star: GalaxyStar): string {
  return `${star.starId}:${star.completionDate}:${star.completionOrder}`;
}

function colorDistance(a: string, b: string): number {
  const channels = (color: string) => [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  return (ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2;
}

function assignDomainColors(ids: string[]): Map<string, string> {
  const colors = new Map<string, string>();
  const used = new Set<number>();
  for (const id of [...ids].sort()) {
    const preferred = deterministicHash(id, 17) % DOMAIN_COLORS.length;
    let index = preferred;
    if (used.size < DOMAIN_COLORS.length) {
      const candidates = DOMAIN_COLORS.map((_, candidate) => candidate)
        .filter((candidate) => !used.has(candidate));
      if (used.size > 0) {
        index = candidates.sort((a, b) => {
          const minDistance = (candidate: number) => Math.min(
            ...[...used].map((taken) => colorDistance(DOMAIN_COLORS[candidate], DOMAIN_COLORS[taken])),
          );
          return minDistance(b) - minDistance(a)
            || ((a - preferred + DOMAIN_COLORS.length) % DOMAIN_COLORS.length)
              - ((b - preferred + DOMAIN_COLORS.length) % DOMAIN_COLORS.length);
        })[0];
      }
      used.add(index);
    }
    colors.set(id, DOMAIN_COLORS[index]);
  }
  return colors;
}

function simulateWeek(stars: GalaxyStar[], edges: GalaxyEdge[]): SimulatedWeek {
  const sorted = [...stars].sort((a, b) => starKey(a).localeCompare(starKey(b)));
  const count = sorted.length;
  const radius = Math.max(110, Math.sqrt(count) * 80);
  const nodes = sorted.map((star, index) => {
    const offset = (deterministicHash(starKey(star), 31) % 1000) / 1000;
    const angle = (index / Math.max(count, 1)) * Math.PI * 2 + offset * 0.35;
    return {
      ...star,
      x: count === 1 ? 0 : Math.cos(angle) * radius,
      y: count === 1 ? 0 : Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
    };
  });
  const indexByKey = new Map(nodes.map((node, index) => [starKey(node), index]));
  const localEdges = edges.flatMap((edge) => {
    const from = indexByKey.get(starKey(edge.from));
    const to = indexByKey.get(starKey(edge.to));
    return from == null || to == null ? [] : [{ from, to, kind: edge.kind }];
  });

  for (let iteration = 0; iteration < 220; iteration++) {
    const fx = new Array<number>(count).fill(0);
    const fy = new Array<number>(count).fill(0);

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        if (Math.abs(dx) + Math.abs(dy) < 0.01) {
          const angle = (deterministicHash(`${starKey(nodes[i])}:${starKey(nodes[j])}`, 43) % 360) * Math.PI / 180;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
        }
        const distanceSq = Math.max(dx * dx + dy * dy, 225);
        const distance = Math.sqrt(distanceSq);
        const force = 7200 / distanceSq;
        const pushX = (dx / distance) * force;
        const pushY = (dy / distance) * force;
        fx[i] += pushX;
        fy[i] += pushY;
        fx[j] -= pushX;
        fy[j] -= pushY;
      }
    }

    for (const edge of localEdges) {
      const from = nodes[edge.from];
      const to = nodes[edge.to];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const distance = Math.max(Math.hypot(dx, dy), 1);
      const desired = edge.kind === 'domain-repeat'
        ? 125
        : edge.kind === 'daily-sequence'
          ? 155
          : 185;
      const force = (distance - desired) * 0.032;
      const pullX = (dx / distance) * force;
      const pullY = (dy / distance) * force;
      fx[edge.from] += pullX;
      fy[edge.from] += pullY;
      fx[edge.to] -= pullX;
      fy[edge.to] -= pullY;
    }

    for (let i = 0; i < count; i++) {
      fx[i] -= nodes[i].x * 0.008;
      fy[i] -= nodes[i].y * 0.008;
      nodes[i].vx = (nodes[i].vx + fx[i]) * 0.82;
      nodes[i].vy = (nodes[i].vy + fy[i]) * 0.82;
      const speed = Math.max(Math.hypot(nodes[i].vx, nodes[i].vy), 1);
      const scale = Math.min(1, 10 / speed);
      nodes[i].x += nodes[i].vx * scale;
      nodes[i].y += nodes[i].vy * scale;
    }
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const maxX = Math.max(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  const maxY = Math.max(...nodes.map((node) => node.y));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return {
    stars: nodes.map(({ vx: _vx, vy: _vy, ...star }) => ({
      ...star, x: star.x - centerX, y: star.y - centerY,
    })),
    width: Math.max(maxX - minX, 180),
    height: Math.max(maxY - minY, 180),
  };
}

/** Deterministic force-directed layout, packed as one cluster per ISO week. */
export function computeGalaxyPositions(stars: GalaxyStar[], edges: GalaxyEdge[]): GalaxyLayout {
  if (stars.length === 0) return { positioned: [], domains: [], weekLabels: [] };

  const domainEntries = [...new Map(stars.map((star) => [star.constellationId, {
    id: star.constellationId, name: star.constellationName, icon: star.constellationIcon,
  }])).values()].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const colors = assignDomainColors(domainEntries.map((domain) => domain.id));
  const colored = stars.map((star) => ({
    ...star, domainColor: colors.get(star.constellationId) ?? DOMAIN_COLORS[0],
  }));
  const weeks = [...new Set(colored.map((star) => star.isoWeek))].sort();
  const simulated = weeks.map((week) => simulateWeek(
    colored.filter((star) => star.isoWeek === week),
    edges.filter((edge) => edge.from.isoWeek === week && edge.to.isoWeek === week),
  ));
  const columns = Math.max(1, Math.ceil(Math.sqrt(simulated.length)));
  const cellWidth = Math.max(620, ...simulated.map((week) => week.width + 260));
  const cellHeight = Math.max(520, ...simulated.map((week) => week.height + 240));
  const positioned = simulated.flatMap((week, index) => {
    const centerX = cellWidth / 2 + (index % columns) * cellWidth;
    const centerY = cellHeight / 2 + Math.floor(index / columns) * cellHeight;
    return week.stars.map((star) => ({
      ...star, x: star.x + centerX, y: star.y + centerY,
    }));
  });

  const domains: GalaxyDomain[] = domainEntries.map((domain) => {
    const domainStars = positioned.filter((star) => star.constellationId === domain.id);
    return {
      constellationId: domain.id,
      name: domain.name,
      icon: domain.icon,
      color: colors.get(domain.id) ?? DOMAIN_COLORS[0],
      cx: domainStars.reduce((sum, star) => sum + star.x, 0) / domainStars.length,
      cy: domainStars.reduce((sum, star) => sum + star.y, 0) / domainStars.length,
      weekCount: new Set(domainStars.map((star) => star.isoWeek)).size,
      starCount: domainStars.length,
    };
  });
  const weekLabels = weeks.map((isoWeek) => ({
    isoWeek,
    label: formatWeekRange(colored.find((star) => star.isoWeek === isoWeek)!.completionDate),
  }));

  return { positioned, domains, weekLabels };
}
