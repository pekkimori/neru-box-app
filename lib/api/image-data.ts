/** Small cross-platform encoder; avoids Buffer and browser-only FileReader. */
export function imageDataUri(data: Uint8Array, mime: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const chunks: string[] = [];
  let chunk = '';
  for (let i = 0; i < data.length; i += 3) {
    const a = data[i];
    const b = data[i + 1];
    const c = data[i + 2];
    chunk += alphabet[a >> 2] + alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)]
      + (b === undefined ? '=' : alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)])
      + (c === undefined ? '=' : alphabet[c & 63]);
    if (chunk.length >= 16384) { chunks.push(chunk); chunk = ''; }
  }
  chunks.push(chunk);
  return `data:${mime};base64,${chunks.join('')}`;
}
