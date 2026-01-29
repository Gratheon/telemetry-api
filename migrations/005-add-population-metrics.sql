CREATE TABLE IF NOT EXISTS population_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hive_id VARCHAR(50) NOT NULL,
    inspection_id VARCHAR(50),
    bee_count INT,
    drone_count INT,
    varroa_mite_count INT,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_hive_id (hive_id),
    INDEX idx_time (time),
    INDEX idx_inspection_id (inspection_id)
);

