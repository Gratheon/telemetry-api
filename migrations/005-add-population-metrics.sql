CREATE TABLE IF NOT EXISTS population_metrics (
    id BIGSERIAL PRIMARY KEY,
    hive_id VARCHAR(50) NOT NULL,
    inspection_id VARCHAR(50),
    bee_count INT,
    drone_count INT,
    varroa_mite_count INT,
    time TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_population_metrics_hive_id ON population_metrics (hive_id);
CREATE INDEX IF NOT EXISTS idx_population_metrics_time ON population_metrics (time);
CREATE INDEX IF NOT EXISTS idx_population_metrics_inspection_id ON population_metrics (inspection_id);
