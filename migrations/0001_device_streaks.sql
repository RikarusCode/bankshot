CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_solves (
  device_id TEXT NOT NULL,
  puzzle_date TEXT NOT NULL,
  puzzle_id TEXT NOT NULL,
  puzzle_number INTEGER,
  attempts INTEGER NOT NULL,
  solved_at TEXT NOT NULL,
  PRIMARY KEY (device_id, puzzle_date),
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE INDEX IF NOT EXISTS idx_daily_solves_device_date
  ON daily_solves(device_id, puzzle_date);
