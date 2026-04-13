-- +goose Up
ALTER TABLE entrance_observer
ADD COLUMN IF NOT EXISTS net_flow FLOAT;

ALTER TABLE entrance_observer
ADD COLUMN IF NOT EXISTS avg_speed_px_per_frame FLOAT;

ALTER TABLE entrance_observer
ADD COLUMN IF NOT EXISTS p95_speed_px_per_frame FLOAT;

ALTER TABLE entrance_observer
ADD COLUMN IF NOT EXISTS stationary_bees_count INT;

-- +goose Down
ALTER TABLE entrance_observer
DROP COLUMN IF EXISTS stationary_bees_count,
DROP COLUMN IF EXISTS p95_speed_px_per_frame,
DROP COLUMN IF EXISTS avg_speed_px_per_frame,
DROP COLUMN IF EXISTS net_flow;
