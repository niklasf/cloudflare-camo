import { acceptableMimeType } from './mime';

const CAMO_HEADER_VIA = 'Camo Asset Proxy';

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

  return proxyImage(
    'https://preview.redd.it/zin69hb06vl71.jpg?width=4624&format=pjpg&auto=webp&s=4c982611ef6f1c45806830fe4d736392cc8fc034'
  );
}

async function proxyImage(url: string, request: Request): Promise<Response> {
  const transferredHeader = (name: string, fallback?: string) => {
    const value = request.headers.get(name) || fallback;
    return value ? { [name]: value } : {};
  };

  let proxied: Response;
  try {
    proxied = await fetch(url, {
      headers: {
        Via: CAMO_HEADER_VIA,
        'User-Agent': CAMO_HEADER_VIA,
        ...transferredHeader('Accept', 'image/*'),
        ...transferredHeader('Accept-Encoding'),
      },
    });
  } catch (err) {
    return notFound(`Fetch error: ${err}`);
  }

  if (![200, 304].includes(proxied.status)) return notFound(`Unexpected status code: ${proxied.status}`);

  const contentType = proxied.headers.get('Content-Type');
  if (!contentType || !acceptableMimeType(contentType)) return notFound(`Content-Type not supported: ${contentType}`);

  const originalHeader = (name: string, fallback?: string) => {
    const value = proxied.headers.get(name) || fallback;
    return value ? { [name]: value } : {};
  };

  return new Response(proxied.body, {
    headers: {
      ...(contentType ? { 'Content-Type': contentType } : {}),
      ...originalHeader('Cache-Control', 'public, max-age=31536000'),
      ...originalHeader('ETag'),
      ...originalHeader('Expires'),
      ...originalHeader('Last-Modified'),
      ...originalHeader('Content-Length'),
      ...originalHeader('Transfer-Encoding'),
      ...originalHeader('Content-Encoding'),
      'Content-Security-Policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'",
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
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
