import { acceptableMimeType } from './mime';
import { decodeHex, nonEmpty } from './util';

const hmac = { name: 'HMAC', hash: 'SHA-256' };

const CAMO_HEADER_VIA = 'Camo Asset Proxy';
const CAMO_KEY = crypto.subtle.importKey('raw', new TextEncoder().encode('secret'), hmac, false, ['verify']);

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request): Promise<Response> {
  if (request.method !== 'GET')
    return new Response('Method not allowed', {
      status: 405,
      headers: {
        Allow: 'GET',
      },
    });

  const requestUrl = new URL(request.url);
  const components = requestUrl.pathname.split('/');
  if (components[0] || components.length > 3) return notFound('Not found');

  const digest = decodeHex(components[1]);
  const url =
    components.length == 3 ? new TextDecoder().decode(decodeHex(components[2])) : requestUrl.searchParams.get('url');
  if (!url) return notFound('Missing URL parameter');

  if (url.length > 2048) return new Response('URI too long', { status: 414 });

  if (!(await crypto.subtle.verify(hmac, await CAMO_KEY, digest, new TextEncoder().encode(url))))
    return new Response('Invalid signature', { status: 403 });

  return proxyImage(url, request);
}

async function proxyImage(url: string, request: Request): Promise<Response> {
  let proxied: Response;
  try {
    proxied = await fetch(url, {
      headers: nonEmpty({
        Via: CAMO_HEADER_VIA,
        'User-Agent': CAMO_HEADER_VIA,
        Accept: request.headers.get('Accept') || 'image/*',
        'Accept-Encoding': request.headers.get('Accept-Encoding'),
        'If-Modified-Since': request.headers.get('If-Modified-Since'),
        'If-None-Match': request.headers.get('If-None-Match'),
      }),
    });
  } catch (err) {
    return notFound(`Fetch error: ${err}`);
  }

  if (![200, 304].includes(proxied.status)) return notFound(`Unexpected status code: ${proxied.status}`);

  const contentType = proxied.headers.get('Content-Type');
  if (!contentType || !acceptableMimeType(contentType)) return notFound(`Content-Type not supported: ${contentType}`);

  return new Response(proxied.body, {
    status: proxied.status,
    headers: nonEmpty({
      'Content-Type': contentType,
      'Cache-Control': proxied.headers.get('Cache-Control') || 'public, max-age=31536000',
      ETag: proxied.headers.get('ETag'),
      Expires: proxied.headers.get('Expires'),
      'Last-Modified': proxied.headers.get('Last-Modified'),
      'Content-Length': proxied.headers.get('Content-Length'),
      'Transfer-Encoding': proxied.headers.get('Transfer-Encoding'),
      'Content-Encoding': proxied.headers.get('Content-Encoding'),
      'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'",
      'Cross-Origin-Resource-Policy': 'cross-origin',
    }),
  });
}

function notFound(message: string): Response {
  return new Response(message, {
    status: 404,
    headers: {
      Expires: '0',
      'Cache-Control': 'no-cache, no-store, private, must-revalidate',
      'Content-Type': 'text/plain',
    },
  });
}
