package main

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/Gratheon/telemetry-api/internal/telemetry"
)

func TestPostgresStoreRoundTrip(t *testing.T) {
	dsn := os.Getenv("TEST_DB_DSN")
	if dsn == "" {
		t.Skip("TEST_DB_DSN is not set")
	}

	store, err := newPostgresStore(postgresConfig{DSN: dsn})
	if err != nil {
		t.Fatalf("connect postgres: %v", err)
	}
	defer store.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := runMigrations(ctx, store.SQLDB()); err != nil {
		t.Fatalf("run migrations: %v", err)
	}

	now := time.Now().UTC().Add(-5 * time.Minute)
	if err := store.WriteBeehiveMetrics(ctx, telemetry.IoTMetricInput{
		HiveID: "integration-hive",
		Fields: telemetry.MetricFields{
			TemperatureCelsius: postgresFloat64Ptr(24.5),
		},
		Timestamp: now,
	}); err != nil {
		t.Fatalf("write metric: %v", err)
	}

	points, err := store.ReadMetrics(ctx, "integration-hive", 60, "temperatureCelsius", nil)
	if err != nil {
		t.Fatalf("read metrics: %v", err)
	}
	if len(points) == 0 {
		t.Fatalf("expected at least one metric point")
	}
}

func postgresFloat64Ptr(v float64) *float64 { return &v }
