# Bankshot

Bankshot is a browser-based billiards-inspired logic puzzle. Place a limited set
of diagonal bumpers on a square grid, press Shoot, and watch the 8-ball follow a
deterministic path into, or past, the pocket.

## Scripts

```bash
npm install
npm run dev
npm test
npm run build
```

## Cloudflare Pages

Bankshot is a static Vite app and can be hosted on Cloudflare Pages for free.

Use these settings when creating the Pages project from GitHub:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: leave blank unless the repo contains this app in a subfolder
- Environment variables: none required

Optional command-line deploy:

```bash
npm run deploy:cloudflare
```

The app includes:

- `wrangler.toml` for Cloudflare Pages output configuration.
- `public/_redirects` so direct navigation falls back to the React app.
- `public/_headers` for basic security headers and long-lived asset caching.

## Features

- Daily puzzle mode with local attempt tracking and streaks.
- Custom puzzle import through JSON paste.
- Puzzle editor with exportable data structures.
- Pure TypeScript simulation engine for grid movement, bumpers, blocks, glass
  pieces, one-way gates, wins, and loops.
