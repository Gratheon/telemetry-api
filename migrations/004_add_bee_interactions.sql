-- +goose Up
ALTER TABLE entrance_observer
ADD COLUMN IF NOT EXISTS bee_interactions INT;

-- +goose Down
ALTER TABLE entrance_observer DROP COLUMN IF EXISTS bee_interactions;
