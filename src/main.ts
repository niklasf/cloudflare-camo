import { acceptableMimeType } from './mime';
import { decodeHex, nonEmpty } from './util';

declare global {
  const CAMO_KEY: string;
  const CAMO_HEADER_VIA: string | undefined;
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request: Request): Promise<Response> {
  // Check request method.
  if (request.method !== 'GET')
    return new Response('Method not allowed', {
      status: 405,
      headers: {
        Allow: 'GET',
      },
    });

  // Extract parameters.
  const requestUrl = new URL(request.url);
  const components = requestUrl.pathname.split('/');
  if (components[0] || components.length > 3) return notFound('Not found');

  // Determine digest and target URL.
  const digest = decodeHex(components[1]);
  const url =
    components.length == 3 ? new TextDecoder().decode(decodeHex(components[2])) : requestUrl.searchParams.get('url');
  if (!url) return notFound('Not found: Missing URL parameter or path component');

  // Limiting length also prevents recursion.
  if (url.length > 2048) return new Response('URI too long', { status: 414 });

  // Verify signature.
  const hmac = { name: 'HMAC', hash: 'SHA-256' };
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(CAMO_KEY), hmac, false, ['verify']);
  if (!(await crypto.subtle.verify(hmac, key, digest, new TextEncoder().encode(url))))
    return new Response('Access denied: Invalid signature', { status: 403 });

  return proxyImage(url, request);
}

async function proxyImage(url: string, original: Request): Promise<Response> {
  // Make request to target URL.
  let proxied: Response;
  try {
    proxied = await fetch(url, {
      headers: nonEmpty({
        Via: CAMO_HEADER_VIA,
        'User-Agent': CAMO_HEADER_VIA,
        Accept: original.headers.get('Accept') || 'image/*',
        'Accept-Encoding': original.headers.get('Accept-Encoding'),
        'If-Modified-Since': original.headers.get('If-Modified-Since'),
        'If-None-Match': original.headers.get('If-None-Match'),
      }),
    });
  } catch (err) {
    return notFound(`Fetch error: ${err}`);
  }

  // Forward sanitized response.
  if (proxied.status == 304) {
    return new Response(null, { status: 304 });
  } else if (proxied.status == 200) {
    const contentType = proxied.headers.get('Content-Type');
    if (!contentType || !acceptableMimeType(contentType)) return notFound(`Content-Type not supported: ${contentType}`);
    return new Response(proxied.body, {
      status: proxied.status,
      headers: nonEmpty({
        'Content-Type': contentType,
        'Cache-Control': proxied.headers.get('Cache-Control') || 'public, max-age=1209600',
        Date: proxied.headers.get('Date'),
        ETag: proxied.headers.get('ETag'),
        Expires: proxied.headers.get('Expires'),
        Vary: proxied.headers.get('Vary'),
        'Last-Modified': proxied.headers.get('Last-Modified'),
        'Content-Length': proxied.headers.get('Content-Length'),
        'Transfer-Encoding': proxied.headers.get('Transfer-Encoding'),
        'Content-Encoding': proxied.headers.get('Content-Encoding'),
        'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'",
        'Cross-Origin-Resource-Policy': 'cross-origin',
      }),
    });
  } else {
    return notFound(`Unexpected status code: ${proxied.status}`);
  }
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
