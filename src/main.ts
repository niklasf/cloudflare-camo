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

async function proxyImage(url: string): Promise<Response> {
  const proxied = await fetch(url, {
    headers: {
      Via: CAMO_HEADER_VIA,
      'User-Agent': CAMO_HEADER_VIA,
    },
  });

  const contentType = proxied.headers.get('Content-Type');

  const res = new Response(proxied.body, {
    headers: {
      ...(contentType ? { 'Content-Type': contentType } : {}),
    },
  });

  return res;
}