export function decodeHex(hex: string): string {
  const out: string[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    out.push(String.fromCharCode(parseInt(hex.substr(i, 2), 16)));
  }
  return out.join('');
}
