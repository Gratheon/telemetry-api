-- +goose Up
ALTER TABLE entrance_observer
ADD COLUMN IF NOT EXISTS detected_bees INT;

-- +goose Down
ALTER TABLE entrance_observer
DROP COLUMN IF EXISTS detected_bees;
