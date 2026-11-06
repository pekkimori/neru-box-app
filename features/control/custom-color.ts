export type HsvColor = { hue: number; saturation: number; brightness: number };

export function hsvToHex({ hue, saturation, brightness }: HsvColor): string {
  const channel = (offset: number) => {
    const k = (offset + hue / 60) % 6;
    const value = brightness * (1 - saturation * Math.max(0, Math.min(k, 4 - k, 1)));
    return Math.round(value * 255).toString(16).padStart(2, '0');
  };
  return `#${channel(5)}${channel(3)}${channel(1)}`.toUpperCase();
}

export function hexToHsv(hex: string): HsvColor {
  const [red, green, blue] = hex.slice(1).match(/.{2}/g)!.map(channel => parseInt(channel, 16) / 255);
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const hue = delta === 0 ? 0 : max === red ? ((green - blue) / delta + 6) % 6 : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  return { hue: hue * 60, saturation: max === 0 ? 0 : delta / max, brightness: max };
}
