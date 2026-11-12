-- OPTIONAL REFERENCE ONLY.
-- Not Gridlock's schema, and not a requirement.
-- Inspect Gridlock Scout and Tally models first, then map into those models.
-- event_type examples: elim, kill, point_won, penalty.
-- refresh.py does not populate this table.

CREATE TABLE IF NOT EXISTS game_tallies (
  tally_id INTEGER PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES games,
  entry_id TEXT REFERENCES event_entries,
  point_no INTEGER,
  player_person_id TEXT REFERENCES people,
  event_type TEXT NOT NULL,
  bunker TEXT,
  timestamp TEXT,
  source TEXT,
  confidence TEXT
);
