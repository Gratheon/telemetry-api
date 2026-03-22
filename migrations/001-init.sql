CREATE TABLE IF NOT EXISTS beehive_metrics (
    id BIGSERIAL PRIMARY KEY,
    hive_id VARCHAR(50) NOT NULL,
    temperature_celsius REAL,
    humidity_percent REAL,
    weight_kg REAL,
    time TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beehive_metrics_hive_id ON beehive_metrics (hive_id);
CREATE INDEX IF NOT EXISTS idx_beehive_metrics_time ON beehive_metrics (time);

CREATE TABLE IF NOT EXISTS entrance_observer (
    id BIGSERIAL PRIMARY KEY,
    hive_id VARCHAR(50) NOT NULL,
    box_id VARCHAR(50) NOT NULL,
    bees_out REAL,
    bees_in REAL,
    time TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entrance_observer_hive_box ON entrance_observer (hive_id, box_id);
CREATE INDEX IF NOT EXISTS idx_entrance_observer_time ON entrance_observer (time);
