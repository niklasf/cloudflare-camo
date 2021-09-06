# camo

A Cloudflare worker to proxy images for privacy, to avoid mixed content,
and to add headers.

## Usage

```
https://camo.lichess.workers.dev/<sha256-hmac>/<hex-url>
https://camo.lichess.workers.dev/<sha256-hmac>?url=<url>
```

## Setup

1. `npm exec wrangler secret put CAMO_KEY`
2. Define `CAMO_HEADER_VIA` environment variable in worker settings
3. `npm run prod`

## Alternatives

- https://github.com/atmos/camo
- https://github.com/cactus/go-camo
