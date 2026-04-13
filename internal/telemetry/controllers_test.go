package telemetry

import (
	"context"
	"testing"
	"time"
)

type controllerStoreMock struct {
	writeMetricCalled   bool
	writeBatchCalled    bool
	writeMovementCalled bool
}

func (m *controllerStoreMock) Ping(context.Context) error { return nil }
func (m *controllerStoreMock) Close() error               { return nil }
func (m *controllerStoreMock) ReadMetrics(context.Context, string, int, string, *int) ([]MetricPoint, error) {
	return nil, nil
}
func (m *controllerStoreMock) WriteBeehiveMetrics(context.Context, IoTMetricInput) error {
	m.writeMetricCalled = true
	return nil
}
func (m *controllerStoreMock) WriteBatchBeehiveMetrics(context.Context, []IoTMetricInput) error {
	m.writeBatchCalled = true
	return nil
}
func (m *controllerStoreMock) ReadAggregatedMetricsFromToday(context.Context, string, string) (BeeMovementAggregate, error) {
	return BeeMovementAggregate{}, nil
}
func (m *controllerStoreMock) ReadEntranceMovement(context.Context, string, *string, time.Time, time.Time) ([]EntranceMovementRecord, error) {
	return nil, nil
}
func (m *controllerStoreMock) WriteEntranceMovement(context.Context, EntranceMovementInput) error {
	m.writeMovementCalled = true
	return nil
}
func (m *controllerStoreMock) WriteBatchEntranceMovement(context.Context, []EntranceMovementInput) error {
	m.writeBatchCalled = true
	return nil
}
func (m *controllerStoreMock) ReadAggregatedWeightMetrics(context.Context, string, int, string) ([]MetricPoint, error) {
	return nil, nil
}
func (m *controllerStoreMock) ReadPopulationMetrics(context.Context, string, int) ([]PopulationMetricRecord, error) {
	return nil, nil
}
func (m *controllerStoreMock) WritePopulationMetrics(context.Context, string, PopulationMetricFields, *string, *time.Time) error {
	return nil
}

func TestAddIoTMetricsRejectsMissingHiveID(t *testing.T) {
	store := &controllerStoreMock{}

	err := AddIoTMetrics(context.Background(), store, []RESTMetricInput{{
		Fields: MetricFields{TemperatureCelsius: float64Ptr(20)},
	}})
	if err == nil || err.Error() != "Bad Request: hiveId not provided" {
		t.Fatalf("expected missing hiveId error, got %v", err)
	}
}

func TestAddIoTMetricsUsesBatchWrite(t *testing.T) {
	store := &controllerStoreMock{}

	err := AddIoTMetrics(context.Background(), store, []RESTMetricInput{
		{HiveID: "hive-1", Fields: MetricFields{TemperatureCelsius: float64Ptr(20)}},
		{HiveID: "hive-1", Fields: MetricFields{HumidityPercent: float64Ptr(55)}},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !store.writeBatchCalled {
		t.Fatalf("expected batch write to be used")
	}
}

func TestAddEntranceMovementRejectsNegativeValues(t *testing.T) {
	store := &controllerStoreMock{}

	err := AddEntranceMovement(context.Background(), store, []RESTEntranceMovementInput{{
		HiveID:  "hive-1",
		BoxID:   "box-1",
		BeesIn:  float64Ptr(5),
		BeesOut: float64Ptr(-1),
	}})
	if err == nil || err.Error() != "Bad Request: beesOut or beesIn cannot be negative" {
		t.Fatalf("expected negative values error, got %v", err)
	}
}

func float64Ptr(v float64) *float64 { return &v }
