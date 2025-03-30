CREATE TABLE IF NOT EXISTS beehive_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hive_id VARCHAR(50) NOT NULL,
    temperature_celsius FLOAT,
    humidity_percent FLOAT,
    weight_kg FLOAT,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_hive_id (hive_id),
    INDEX idx_time (time)
);

CREATE TABLE IF NOT EXISTS entrance_observer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hive_id VARCHAR(50) NOT NULL,
    box_id VARCHAR(50) NOT NULL,
    bees_out FLOAT,
    bees_in FLOAT,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_hive_box (hive_id, box_id),
    INDEX idx_time (time)
);
