ALTER TABLE entrance_observer
ADD COLUMN net_flow FLOAT,
ADD COLUMN avg_speed_px_per_frame FLOAT,
ADD COLUMN p95_speed_px_per_frame FLOAT,
ADD COLUMN stationary_bees_count INT;
