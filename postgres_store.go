package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/Gratheon/telemetry-api/internal/telemetry"
	telemetrymetrics "github.com/Gratheon/telemetry-api/internal/telemetry/metrics"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
)

type postgresStore struct {
	db *sqlx.DB
}

func newPostgresStore(cfg postgresConfig) (*postgresStore, error) {
	db, err := sqlx.Connect("pgx", cfg.ConnectionString())
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetConnMaxIdleTime(2 * time.Minute)

	return &postgresStore{db: db}, nil
}

func (s *postgresStore) SQLDB() *sql.DB {
	return s.db.DB
}

func (s *postgresStore) Close() error {
	return s.db.Close()
}

func (s *postgresStore) Ping(ctx context.Context) error {
	return s.db.PingContext(ctx)
}

func recordDBQuery(queryName string, start time.Time, err error) {
	status := "success"
	if err != nil {
		status = "error"
	}
	telemetrymetrics.RecordDBQuery(queryName, status, time.Since(start).Seconds())
}

func (s *postgresStore) ReadMetrics(ctx context.Context, hiveID string, rangeMin int, field string, maxPoints *int) ([]telemetry.MetricPoint, error) {
	start := time.Now()

	fieldMapping := map[string]string{
		"temperatureCelsius": "temperature_celsius",
		"humidityPercent":    "humidity_percent",
		"weightKg":           "weight_kg",
	}
	column, ok := fieldMapping[field]
	if !ok {
		err := fmt.Errorf("invalid field: %s", field)
		recordDBQuery("read_metrics", start, err)
		return nil, err
	}

	rangeTime := time.Now().UTC().Add(-time.Duration(rangeMin) * time.Minute)
	points := []telemetry.MetricPoint{}

	var err error
	if maxPoints != nil && *maxPoints > 0 {
		query := fmt.Sprintf(`
			SELECT
				date_bin(
					make_interval(secs => GREATEST(1, CEIL(($1 * 60)::numeric / $2)::int)),
					time,
					TIMESTAMPTZ '2001-01-01'
				) AS t,
				AVG(%s) AS v
			FROM beehive_metrics
			WHERE hive_id = $3 AND time >= $4 AND %s IS NOT NULL
			GROUP BY t
			ORDER BY t ASC
		`, column, column)
		err = s.db.SelectContext(ctx, &points, query, rangeMin, *maxPoints, hiveID, rangeTime)
		recordDBQuery("read_metrics_bucketed", start, err)
		return points, err
	}

	query := fmt.Sprintf(`
		SELECT time AS t, %s AS v
		FROM beehive_metrics
		WHERE hive_id = $1 AND time >= $2 AND %s IS NOT NULL
		ORDER BY time ASC
	`, column, column)
	err = s.db.SelectContext(ctx, &points, query, hiveID, rangeTime)
	recordDBQuery("read_metrics", start, err)
	return points, err
}

func (s *postgresStore) WriteBeehiveMetrics(ctx context.Context, input telemetry.IoTMetricInput) error {
	start := time.Now()
	query := `
		WITH dedupe_insert AS (
			INSERT INTO beehive_metric_dedupe (hive_id, dedupe_key)
			SELECT $1, $2
			WHERE $2 IS NOT NULL
			ON CONFLICT (hive_id, dedupe_key) DO NOTHING
			RETURNING 1
		)
		INSERT INTO beehive_metrics
			(hive_id, temperature_celsius, humidity_percent, weight_kg, dedupe_key, time)
		SELECT
			$1, $3, $4, $5, $2, $6
		WHERE $2 IS NULL OR EXISTS (SELECT 1 FROM dedupe_insert)
	`
	_, err := s.db.ExecContext(ctx, query, input.HiveID, input.DedupeKey, input.Fields.TemperatureCelsius, input.Fields.HumidityPercent, input.Fields.WeightKg, input.Timestamp)
	recordDBQuery("write_beehive_metrics", start, err)
	return err
}

func (s *postgresStore) WriteBatchBeehiveMetrics(ctx context.Context, inputs []telemetry.IoTMetricInput) error {
	start := time.Now()
	payload := make([]map[string]interface{}, 0, len(inputs))
	for _, input := range inputs {
		payload = append(payload, map[string]interface{}{
			"hive_id":             input.HiveID,
			"temperature_celsius": input.Fields.TemperatureCelsius,
			"humidity_percent":    input.Fields.HumidityPercent,
			"weight_kg":           input.Fields.WeightKg,
			"dedupe_key":          input.DedupeKey,
			"time":                input.Timestamp.UTC().Format(time.RFC3339Nano),
		})
	}

	rawPayload, err := json.Marshal(payload)
	if err != nil {
		recordDBQuery("write_batch_beehive_metrics", start, err)
		return err
	}

	_, err = s.db.ExecContext(ctx, `SELECT ingest_beehive_metrics_batch($1::jsonb)`, string(rawPayload))
	recordDBQuery("write_batch_beehive_metrics", start, err)
	return err
}

func (s *postgresStore) ReadAggregatedMetricsFromToday(ctx context.Context, hiveID, boxID string) (telemetry.BeeMovementAggregate, error) {
	start := time.Now()
	today := time.Now().UTC().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)

	var result telemetry.BeeMovementAggregate
	err := s.db.GetContext(ctx, &result, `
		SELECT
			SUM(bees_in) AS "beesIn",
			SUM(bees_out) AS "beesOut",
			SUM(net_flow) AS "netFlow",
			AVG(avg_speed_px_per_frame) AS "avgSpeed",
			AVG(p95_speed_px_per_frame) AS "p95Speed",
			SUM(stationary_bees_count) AS "stationaryBees",
			SUM(detected_bees) AS "detectedBees",
			SUM(bee_interactions) AS "beeInteractions",
			MAX(time) AS time
		FROM entrance_observer
		WHERE hive_id = $1 AND box_id = $2 AND time >= $3 AND time < $4
	`, hiveID, boxID, today, tomorrow)
	recordDBQuery("read_aggregated_metrics_today", start, err)
	if err != nil {
		return telemetry.BeeMovementAggregate{}, err
	}

	return result, nil
}

func (s *postgresStore) ReadEntranceMovement(ctx context.Context, hiveID string, boxID *string, timeFrom, timeTo time.Time) ([]telemetry.EntranceMovementRecord, error) {
	start := time.Now()
	rows := []telemetry.EntranceMovementRecord{}
	query := `
		SELECT
			id,
			hive_id AS hive_id,
			box_id AS box_id,
			bees_out AS bees_out,
			bees_in AS bees_in,
			time,
			net_flow AS net_flow,
			avg_speed_px_per_frame AS avg_speed,
			p95_speed_px_per_frame AS p95_speed,
			stationary_bees_count AS stationary_bees,
			detected_bees AS detected_bees,
			bee_interactions AS bee_interactions
		FROM entrance_observer
		WHERE hive_id = $1 AND time >= $2 AND time <= $3
	`
	args := []interface{}{hiveID, timeFrom, timeTo}
	if boxID != nil {
		query += ` AND box_id = $4`
		args = append(args, *boxID)
	}
	query += ` ORDER BY time ASC`

	err := s.db.SelectContext(ctx, &rows, query, args...)
	recordDBQuery("read_entrance_movement", start, err)
	return rows, err
}

func (s *postgresStore) WriteEntranceMovement(ctx context.Context, input telemetry.EntranceMovementInput) error {
	start := time.Now()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO entrance_observer
			(hive_id, box_id, bees_out, bees_in, net_flow, avg_speed_px_per_frame, p95_speed_px_per_frame, stationary_bees_count, detected_bees, bee_interactions, time)
		VALUES
			($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`, input.HiveID, input.BoxID, input.BeesOut, input.BeesIn, input.NetFlow, input.AvgSpeed, input.P95Speed, input.StationaryBees, input.DetectedBees, input.BeeInteractions, input.Timestamp)
	recordDBQuery("write_entrance_movement", start, err)
	return err
}

func (s *postgresStore) WriteBatchEntranceMovement(ctx context.Context, inputs []telemetry.EntranceMovementInput) error {
	start := time.Now()
	payload := make([]map[string]interface{}, 0, len(inputs))
	for _, input := range inputs {
		payload = append(payload, map[string]interface{}{
			"hive_id":                input.HiveID,
			"box_id":                 input.BoxID,
			"bees_out":               input.BeesOut,
			"bees_in":                input.BeesIn,
			"net_flow":               input.NetFlow,
			"avg_speed_px_per_frame": input.AvgSpeed,
			"p95_speed_px_per_frame": input.P95Speed,
			"stationary_bees_count":  input.StationaryBees,
			"detected_bees":          input.DetectedBees,
			"bee_interactions":       input.BeeInteractions,
			"time":                   input.Timestamp.UTC().Format(time.RFC3339Nano),
		})
	}

	rawPayload, err := json.Marshal(payload)
	if err != nil {
		recordDBQuery("write_batch_entrance_movement", start, err)
		return err
	}

	_, err = s.db.ExecContext(ctx, `SELECT ingest_entrance_movement_batch($1::jsonb)`, string(rawPayload))
	recordDBQuery("write_batch_entrance_movement", start, err)
	return err
}

func (s *postgresStore) ReadAggregatedWeightMetrics(ctx context.Context, hiveID string, days int, aggregation string) ([]telemetry.MetricPoint, error) {
	start := time.Now()
	rangeTime := time.Now().UTC().AddDate(0, 0, -days)

	aggregationFunc := "AVG"
	switch aggregation {
	case "DAILY_MAX":
		aggregationFunc = "MAX"
	case "DAILY_MIN":
		aggregationFunc = "MIN"
	}

	query := fmt.Sprintf(`
		SELECT date_trunc('day', time) AS t, %s(weight_kg) AS v
		FROM beehive_metrics
		WHERE hive_id = $1 AND time >= $2 AND weight_kg IS NOT NULL
		GROUP BY date_trunc('day', time)
		ORDER BY t ASC
	`, aggregationFunc)
	rows := []telemetry.MetricPoint{}
	err := s.db.SelectContext(ctx, &rows, query, hiveID, rangeTime)
	recordDBQuery("read_aggregated_weight_metrics", start, err)
	return rows, err
}

func (s *postgresStore) ReadPopulationMetrics(ctx context.Context, hiveID string, days int) ([]telemetry.PopulationMetricRecord, error) {
	start := time.Now()
	rangeTime := time.Now().UTC().AddDate(0, 0, -days)
	rows := []telemetry.PopulationMetricRecord{}
	err := s.db.SelectContext(ctx, &rows, `
		SELECT
			time AS t,
			bee_count AS bee_count,
			drone_count AS drone_count,
			varroa_mite_count AS varroa_mite_count,
			inspection_id AS inspection_id
		FROM population_metrics
		WHERE hive_id = $1 AND time >= $2
		ORDER BY time ASC
	`, hiveID, rangeTime)
	recordDBQuery("read_population_metrics", start, err)
	return rows, err
}

func (s *postgresStore) WritePopulationMetrics(ctx context.Context, hiveID string, fields telemetry.PopulationMetricFields, inspectionID *string, timestamp *time.Time) error {
	start := time.Now()
	recordedAt := time.Now().UTC()
	if timestamp != nil {
		recordedAt = timestamp.UTC()
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO population_metrics
			(hive_id, bee_count, drone_count, varroa_mite_count, inspection_id, time)
		VALUES
			($1, $2, $3, $4, $5, $6)
	`, hiveID, fields.BeeCount, fields.DroneCount, fields.VarroaMiteCount, inspectionID, recordedAt)
	recordDBQuery("write_population_metrics", start, err)
	return err
}
