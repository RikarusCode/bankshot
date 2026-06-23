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
- Environment variables:
  - `BANKSHOT_ADMIN_PASSWORD`: password for the Archive edit tools
  - `BANKSHOT_ADMIN_SESSION_SECRET`: long random string used to sign admin sessions
  - `BANKSHOT_TIME_ZONE`: `America/Los_Angeles`

Optional command-line deploy:

```bash
npm run deploy:cloudflare
```

The app includes:

- `wrangler.toml` for Cloudflare Pages output configuration.
- `public/_redirects` so direct navigation falls back to the React app.
- `public/_headers` for basic security headers and long-lived asset caching.
- Cloudflare Pages Functions for daily puzzle loading, archive redaction, and
  password-protected puzzle uploads.

### Daily Puzzle Storage

Official daily puzzles are stored in Cloudflare KV instead of the public React
bundle. Create a KV namespace in Cloudflare, bind it to the Pages project as
`PUZZLES_KV`, then put the namespace IDs into the commented `kv_namespaces`
section in `wrangler.toml`.

The public app reads:

- `GET /api/daily` for today's puzzle.
- `GET /api/archive` for the archive list. Future puzzle JSON is redacted.
- `GET /api/archive/:date` for public past/current archive puzzles.

The Archive tab has password-protected admin tools:

- Unlock with `BANKSHOT_ADMIN_PASSWORD`.
- Use `New/Edit Date` to paste a full puzzle JSON for any date.
- Saving writes the puzzle into KV and updates the schedule index.
- Future puzzles stay locked publicly until their date arrives.

## Features

- Daily puzzle mode loaded from private Cloudflare KV with local attempt tracking
  and streaks.
- Archive mode with public past puzzles, locked future placeholders, and admin
  JSON upload/editing.
- Custom puzzle import through JSON paste.
- Puzzle editor with exportable data structures.
- Pure TypeScript simulation engine for grid movement, bumpers, blocks, glass
  pieces, one-way gates, wins, and loops.
