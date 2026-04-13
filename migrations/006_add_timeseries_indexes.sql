-- +goose Up
-- Composite indexes for common time-range queries by hive and optional box
CREATE INDEX IF NOT EXISTS idx_beehive_metrics_hive_time_desc
ON beehive_metrics (hive_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_entrance_observer_hive_time_desc
ON entrance_observer (hive_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_entrance_observer_hive_box_time_desc
ON entrance_observer (hive_id, box_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_population_metrics_hive_time_desc
ON population_metrics (hive_id, time DESC);

-- Partial indexes for metric-specific reads that filter out NULL values
CREATE INDEX IF NOT EXISTS idx_beehive_metrics_temp_hive_time_desc
ON beehive_metrics (hive_id, time DESC)
WHERE temperature_celsius IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_beehive_metrics_humidity_hive_time_desc
ON beehive_metrics (hive_id, time DESC)
WHERE humidity_percent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_beehive_metrics_weight_hive_time_desc
ON beehive_metrics (hive_id, time DESC)
WHERE weight_kg IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_beehive_metrics_weight_hive_time_desc;
DROP INDEX IF EXISTS idx_beehive_metrics_humidity_hive_time_desc;
DROP INDEX IF EXISTS idx_beehive_metrics_temp_hive_time_desc;
DROP INDEX IF EXISTS idx_population_metrics_hive_time_desc;
DROP INDEX IF EXISTS idx_entrance_observer_hive_box_time_desc;
DROP INDEX IF EXISTS idx_entrance_observer_hive_time_desc;
DROP INDEX IF EXISTS idx_beehive_metrics_hive_time_desc;
