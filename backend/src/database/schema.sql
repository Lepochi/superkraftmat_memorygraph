-- Superkraft Memory System v2.0 Database Schema
-- SQLite implementation with performance optimizations

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Entities table - Core memory units
CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('person', 'concept', 'event', 'task', 'insight', 'goal')),
    name TEXT NOT NULL,
    description TEXT,
    importance_score REAL DEFAULT 0.5 CHECK(importance_score >= 0 AND importance_score <= 1),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    last_accessed INTEGER NOT NULL DEFAULT (unixepoch()),
    access_count INTEGER DEFAULT 0,
    metadata TEXT -- JSON for additional properties
);

-- Relations table - Connections between entities
CREATE TABLE IF NOT EXISTS relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('relates_to', 'causes', 'prevents', 'supports', 'contradicts', 'requires', 'part_of')),
    strength REAL DEFAULT 0.5 CHECK(strength >= 0 AND strength <= 1),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    metadata TEXT, -- JSON for additional properties
    FOREIGN KEY (source_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES entities(id) ON DELETE CASCADE,
    UNIQUE(source_id, target_id, type)
);

-- Observations table - Time-based context
CREATE TABLE IF NOT EXISTS observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
    context TEXT, -- JSON for session/conversation context
    importance REAL DEFAULT 0.5 CHECK(importance >= 0 AND importance <= 1),
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

-- Scores table - Temporal importance tracking
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id TEXT NOT NULL,
    score_type TEXT NOT NULL CHECK(score_type IN ('importance', 'relevance', 'decay')),
    value REAL NOT NULL CHECK(value >= 0 AND value <= 1),
    calculated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    factors TEXT, -- JSON explaining score calculation
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_importance ON entities(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_entities_updated ON entities(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_entities_accessed ON entities(last_accessed DESC);

CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_id);
CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_id);
CREATE INDEX IF NOT EXISTS idx_relations_type ON relations(type);

CREATE INDEX IF NOT EXISTS idx_observations_entity ON observations(entity_id);
CREATE INDEX IF NOT EXISTS idx_observations_timestamp ON observations(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_scores_entity ON scores(entity_id);
CREATE INDEX IF NOT EXISTS idx_scores_type ON scores(score_type);
CREATE INDEX IF NOT EXISTS idx_scores_calculated ON scores(calculated_at DESC);

-- Triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_entity_timestamp
AFTER UPDATE ON entities
BEGIN
    UPDATE entities SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Trigger for access tracking
CREATE TRIGGER IF NOT EXISTS track_entity_access
AFTER UPDATE OF last_accessed ON entities
BEGIN
    UPDATE entities SET access_count = access_count + 1 WHERE id = NEW.id;
END;