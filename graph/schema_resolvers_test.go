package graph

import (
	"context"
	"testing"
	"time"

	"github.com/Gratheon/telemetry-api/graph/model"
	"github.com/Gratheon/telemetry-api/internal/telemetry"
)

type resolverStoreMock struct {
	readMetricsArgs     []interface{}
	readPopulationDays  int
	writePopulationArgs []interface{}
	readMetricsResult   []telemetry.MetricPoint
	readPopulation      []telemetry.PopulationMetricRecord
}

func (m *resolverStoreMock) Ping(context.Context) error { return nil }
func (m *resolverStoreMock) Close() error               { return nil }
func (m *resolverStoreMock) ReadMetrics(_ context.Context, hiveID string, rangeMin int, field string, maxPoints *int) ([]telemetry.MetricPoint, error) {
	m.readMetricsArgs = []interface{}{hiveID, rangeMin, field, maxPoints}
	return m.readMetricsResult, nil
}
func (m *resolverStoreMock) WriteBeehiveMetrics(context.Context, telemetry.IoTMetricInput) error {
	return nil
}
func (m *resolverStoreMock) WriteBatchBeehiveMetrics(context.Context, []telemetry.IoTMetricInput) error {
	return nil
}
func (m *resolverStoreMock) ReadAggregatedMetricsFromToday(context.Context, string, string) (telemetry.BeeMovementAggregate, error) {
	return telemetry.BeeMovementAggregate{}, nil
}
func (m *resolverStoreMock) ReadEntranceMovement(context.Context, string, *string, time.Time, time.Time) ([]telemetry.EntranceMovementRecord, error) {
	return nil, nil
}
func (m *resolverStoreMock) WriteEntranceMovement(context.Context, telemetry.EntranceMovementInput) error {
	return nil
}
func (m *resolverStoreMock) WriteBatchEntranceMovement(context.Context, []telemetry.EntranceMovementInput) error {
	return nil
}
func (m *resolverStoreMock) ReadAggregatedWeightMetrics(context.Context, string, int, string) ([]telemetry.MetricPoint, error) {
	return nil, nil
}
func (m *resolverStoreMock) ReadPopulationMetrics(context.Context, string, int) ([]telemetry.PopulationMetricRecord, error) {
	m.readPopulationDays = 90
	return m.readPopulation, nil
}
func (m *resolverStoreMock) WritePopulationMetrics(_ context.Context, hiveID string, fields telemetry.PopulationMetricFields, inspectionID *string, timestamp *time.Time) error {
	m.writePopulationArgs = []interface{}{hiveID, fields, inspectionID, timestamp}
	return nil
}

func TestTemperatureCelsiusRejectsInvalidRange(t *testing.T) {
	resolver := &queryResolver{&Resolver{Store: &resolverStoreMock{}}}
	result, err := resolver.TemperatureCelsius(context.Background(), "hive-1", intPtr(0), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	telemetryErr, ok := result.(*model.TelemetryError)
	if !ok || telemetryErr.Message == nil || *telemetryErr.Message != "Time range must be positive" {
		t.Fatalf("expected telemetry error, got %#v", result)
	}
}

func TestTemperatureCelsiusReturnsMetricList(t *testing.T) {
	store := &resolverStoreMock{
		readMetricsResult: []telemetry.MetricPoint{{T: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC), V: float64Ptr(21.5)}},
	}
	resolver := &queryResolver{&Resolver{Store: store}}

	result, err := resolver.TemperatureCelsius(context.Background(), "hive-1", intPtr(15), nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	list, ok := result.(*model.MetricFloatList)
	if !ok || len(list.Metrics) != 1 || *list.Metrics[0].V != 21.5 {
		t.Fatalf("unexpected metric list: %#v", result)
	}
}

func TestAddPopulationMetricRejectsEmptyFields(t *testing.T) {
	resolver := &mutationResolver{&Resolver{Store: &resolverStoreMock{}}}
	result, err := resolver.AddPopulationMetric(context.Background(), "hive-1", model.PopulationMetricInput{}, nil, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	telemetryErr, ok := result.(*model.TelemetryError)
	if !ok || telemetryErr.Message == nil || *telemetryErr.Message != "Fields are required" {
		t.Fatalf("expected telemetry error, got %#v", result)
	}
}

func intPtr(v int) *int             { return &v }
func float64Ptr(v float64) *float64 { return &v }
