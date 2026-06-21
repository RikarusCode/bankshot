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

## Features

- Daily puzzle mode with local attempt tracking and streaks.
- Custom puzzle import through JSON paste.
- Puzzle editor with exportable data structures.
- Pure TypeScript simulation engine for grid movement, bumpers, blocks, cracked
  pieces, one-way gates, misses, wins, and loops.
