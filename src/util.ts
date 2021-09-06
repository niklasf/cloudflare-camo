export function decodeHex(hex: string): Uint8Array {
  const out = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < hex.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

export function nonEmpty(record: Record<string, string | null | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(record)) {
    if (val) out[key] = val;
  }
  return out;
}
