PRAGMA foreign_keys=ON;
CREATE TABLE sources(source_id INTEGER PRIMARY KEY, url TEXT NOT NULL, retrieved_at TEXT NOT NULL, local_file TEXT NOT NULL, sha256 TEXT NOT NULL, http_status INTEGER);
CREATE TABLE events(event_id TEXT PRIMARY KEY, name TEXT NOT NULL, start_date TEXT, end_date TEXT, timezone TEXT NOT NULL, source_id INTEGER REFERENCES sources);
CREATE TABLE divisions(division_id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events, name TEXT NOT NULL, format_group TEXT, classification TEXT, format_rules TEXT, signed_up INTEGER, paid_summary INTEGER, registration_limit TEXT, listed_count INTEGER, source_id INTEGER REFERENCES sources);
CREATE TABLE teams(team_id TEXT PRIMARY KEY, name TEXT NOT NULL, source_id INTEGER REFERENCES sources);
CREATE TABLE event_entries(entry_id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events, division_id TEXT NOT NULL REFERENCES divisions, team_id TEXT NOT NULL REFERENCES teams, team_name_as_published TEXT NOT NULL, registration_status TEXT, roster_token TEXT, roster_url TEXT, bracket TEXT, bracket_source_id INTEGER REFERENCES sources, source_id INTEGER REFERENCES sources);
CREATE TABLE people(person_id TEXT PRIMARY KEY, name TEXT NOT NULL, source_id INTEGER REFERENCES sources);
CREATE TABLE roster_access(entry_id TEXT PRIMARY KEY REFERENCES event_entries, status TEXT NOT NULL, roster_kind TEXT, member_count INTEGER, http_status INTEGER, error TEXT, source_id INTEGER REFERENCES sources);
CREATE TABLE roster_memberships(membership_id INTEGER PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES event_entries, person_id TEXT REFERENCES people, name_as_published TEXT NOT NULL, role TEXT, section TEXT, checked_in TEXT, registration_fee_paid TEXT, jersey_number TEXT, person_event_link TEXT, source_id INTEGER REFERENCES sources, legacy_name_as_published TEXT, classification TEXT, age_as_published TEXT, legacy_source_id INTEGER REFERENCES sources);
CREATE TABLE team_location_observations(entry_id TEXT PRIMARY KEY REFERENCES event_entries, team_id TEXT NOT NULL REFERENCES teams,hometown_raw TEXT,hometown_city TEXT,hometown_region TEXT,hometown_country TEXT,home_field_name TEXT,home_field_location_raw TEXT,location_status TEXT NOT NULL,source_id INTEGER REFERENCES sources);
CREATE TABLE person_profile_observations(person_id TEXT PRIMARY KEY REFERENCES people,hometown_raw TEXT,hometown_city TEXT,hometown_region TEXT,hometown_country TEXT,hometown_status TEXT NOT NULL DEFAULT 'not_retrieved',history_status TEXT NOT NULL DEFAULT 'not_retrieved',source_id INTEGER REFERENCES sources);
CREATE TABLE person_team_history(history_id INTEGER PRIMARY KEY,person_id TEXT NOT NULL REFERENCES people,team_id TEXT,team_name TEXT NOT NULL,event_name TEXT,event_date TEXT,role TEXT,source_id INTEGER REFERENCES sources);
CREATE TABLE person_name_variants(person_id TEXT NOT NULL REFERENCES people,name TEXT NOT NULL,variant_kind TEXT NOT NULL,source_id INTEGER NOT NULL REFERENCES sources,UNIQUE(person_id,name,variant_kind,source_id));
CREATE TABLE authenticated_imports(entry_id TEXT NOT NULL REFERENCES event_entries,source_id INTEGER NOT NULL REFERENCES sources,kind TEXT NOT NULL,member_count INTEGER NOT NULL,PRIMARY KEY(entry_id,kind));
CREATE TABLE person_profile_access(person_id TEXT NOT NULL REFERENCES people,source_id INTEGER NOT NULL REFERENCES sources,status TEXT NOT NULL,page_kind TEXT,notes TEXT,PRIMARY KEY(person_id,source_id));
CREATE TABLE person_event_history(observation_id TEXT PRIMARY KEY,person_id TEXT NOT NULL REFERENCES people,event_date_as_published TEXT,event_date_iso TEXT,event_name TEXT,event_id TEXT,event_url TEXT,team_name TEXT,team_roster_url TEXT,division_as_published TEXT,place_as_published TEXT,classification_score_as_published TEXT,classification_context TEXT,role_at_historical_event TEXT,participation_basis TEXT NOT NULL,source_id INTEGER NOT NULL REFERENCES sources, extraction_status TEXT, raw_row_as_published TEXT, raw_layout_line_number INTEGER);
CREATE TABLE profile_text_sources(source_id INTEGER PRIMARY KEY REFERENCES sources,person_id TEXT NOT NULL REFERENCES people,raw_layout_text TEXT NOT NULL,extraction_status TEXT NOT NULL);
CREATE TABLE profile_canonical_evidence(person_id TEXT PRIMARY KEY REFERENCES people,source_id INTEGER NOT NULL REFERENCES sources,kind TEXT NOT NULL);
CREATE TABLE profile_capture_evidence(source_id INTEGER PRIMARY KEY REFERENCES sources,person_id TEXT NOT NULL REFERENCES people,capture_method TEXT NOT NULL,original_artifact_path TEXT NOT NULL,sha256 TEXT NOT NULL,page_count INTEGER,row_count INTEGER,zero_event_evidence INTEGER NOT NULL);
CREATE INDEX roster_by_person ON roster_memberships(person_id);
CREATE INDEX entries_by_division ON event_entries(division_id);
CREATE VIEW player_rosters AS SELECT e.entry_id,e.team_name_as_published AS team_name,d.name AS division,r.person_id,r.name_as_published AS player_name,r.jersey_number,r.checked_in,s.url AS source_url,s.retrieved_at FROM roster_memberships r JOIN event_entries e USING(entry_id) JOIN divisions d USING(division_id) JOIN sources s ON s.source_id=r.source_id WHERE r.role='Player';

-- BEGIN schedule/refresh.py objects
-- Schedule for event 9322. Maintained by schedule/refresh.py from the public
-- PBLeagues schedule page. Playoff slot labels have null entry/team ids.
CREATE TABLE IF NOT EXISTS games (
  game_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events,
  division_id TEXT REFERENCES divisions,
  division TEXT NOT NULL,
  day TEXT,
  date TEXT,
  time TEXT,
  field TEXT,
  pit INTEGER,
  round TEXT,
  home_entry_id TEXT REFERENCES event_entries,
  home_team_id TEXT REFERENCES teams,
  home_name TEXT NOT NULL,
  home_slot_label TEXT,
  away_entry_id TEXT REFERENCES event_entries,
  away_team_id TEXT REFERENCES teams,
  away_name TEXT NOT NULL,
  away_slot_label TEXT,
  score TEXT,
  status TEXT,
  source_url TEXT NOT NULL,
  retrieved_at TEXT NOT NULL
);
CREATE VIEW IF NOT EXISTS game_teams AS
SELECT g.game_id, g.event_id, g.division_id, g.division, g.day, g.date, g.time,
       g.field, g.pit, g.round, 'home' AS side,
       g.home_entry_id AS entry_id, g.home_team_id AS team_id,
       g.home_name AS team_name, g.home_slot_label AS slot_label,
       g.score, g.status, g.source_url, g.retrieved_at
  FROM games g
UNION ALL
SELECT g.game_id, g.event_id, g.division_id, g.division, g.day, g.date, g.time,
       g.field, g.pit, g.round, 'away' AS side,
       g.away_entry_id AS entry_id, g.away_team_id AS team_id,
       g.away_name AS team_name, g.away_slot_label AS slot_label,
       g.score, g.status, g.source_url, g.retrieved_at
  FROM games g;
-- PROPOSED scout/tally schema. Not populated by refresh.py.
-- event_type examples: elim, kill, point_won, penalty.
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
-- END schedule/refresh.py objects









