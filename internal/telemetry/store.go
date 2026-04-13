package telemetry

import (
	"context"
	"time"
)

type Store interface {
	Ping(context.Context) error
	Close() error
	ReadMetrics(ctx context.Context, hiveID string, rangeMin int, field string, maxPoints *int) ([]MetricPoint, error)
	WriteBeehiveMetrics(ctx context.Context, input IoTMetricInput) error
	WriteBatchBeehiveMetrics(ctx context.Context, inputs []IoTMetricInput) error
	ReadAggregatedMetricsFromToday(ctx context.Context, hiveID, boxID string) (BeeMovementAggregate, error)
	ReadEntranceMovement(ctx context.Context, hiveID string, boxID *string, timeFrom, timeTo time.Time) ([]EntranceMovementRecord, error)
	WriteEntranceMovement(ctx context.Context, input EntranceMovementInput) error
	WriteBatchEntranceMovement(ctx context.Context, inputs []EntranceMovementInput) error
	ReadAggregatedWeightMetrics(ctx context.Context, hiveID string, days int, aggregation string) ([]MetricPoint, error)
	ReadPopulationMetrics(ctx context.Context, hiveID string, days int) ([]PopulationMetricRecord, error)
	WritePopulationMetrics(ctx context.Context, hiveID string, fields PopulationMetricFields, inspectionID *string, timestamp *time.Time) error
}
