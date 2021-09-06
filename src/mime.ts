const whitelist = [
  'image/bmp',
  'image/gif',
  'image/jp2',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/svg+xml',
  'image/tiff',
  'image/webp',
];

export function acceptableMimeType(contentType: string): boolean {
  return whitelist.includes(contentType.split(';')[0]);
}
