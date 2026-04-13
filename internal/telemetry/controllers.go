package telemetry

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
)

type JSONID string

func (id *JSONID) UnmarshalJSON(data []byte) error {
	var stringValue string
	if err := json.Unmarshal(data, &stringValue); err == nil {
		*id = JSONID(stringValue)
		return nil
	}

	var numberValue json.Number
	if err := json.Unmarshal(data, &numberValue); err == nil {
		*id = JSONID(numberValue.String())
		return nil
	}

	return fmt.Errorf("invalid id value")
}

type RESTMetricInput struct {
	HiveID    JSONID       `json:"hiveId"`
	Fields    MetricFields `json:"fields"`
	Timestamp *int64       `json:"timestamp"`
	DedupeKey *string      `json:"dedupeKey"`
}

type RESTEntranceMovementInput struct {
	HiveID          JSONID   `json:"hiveId"`
	BoxID           JSONID   `json:"boxId"`
	BeesOut         *float64 `json:"beesOut"`
	BeesIn          *float64 `json:"beesIn"`
	NetFlow         *float64 `json:"netFlow"`
	AvgSpeed        *float64 `json:"avgSpeed"`
	P95Speed        *float64 `json:"p95Speed"`
	StationaryBees  *int     `json:"stationaryBees"`
	DetectedBees    *int     `json:"detectedBees"`
	BeeInteractions *int     `json:"beeInteractions"`
	Timestamp       *int64   `json:"timestamp"`
}

func AddIoTMetrics(ctx context.Context, store Store, metrics []RESTMetricInput) error {
	if len(metrics) == 0 {
		return &ServerError{Message: "Bad Request: no metrics provided", ErrorCode: ErrorCodeFieldsMissing, HTTPStatus: 400}
	}

	validated := make([]IoTMetricInput, 0, len(metrics))
	for _, metric := range metrics {
		if metric.HiveID == "" {
			return &ServerError{Message: "Bad Request: hiveId not provided", ErrorCode: ErrorCodeHiveIDMissing, HTTPStatus: 400}
		}
		if metric.Fields.Empty() {
			return &ServerError{Message: "Bad Request: fields not provided", ErrorCode: ErrorCodeFieldsMissing, HTTPStatus: 400}
		}

		timestamp := time.Now().UTC()
		if metric.Timestamp != nil {
			timestamp = time.Unix(*metric.Timestamp, 0).UTC()
		}

		validated = append(validated, IoTMetricInput{
			HiveID:    string(metric.HiveID),
			Fields:    metric.Fields,
			Timestamp: timestamp,
			DedupeKey: metric.DedupeKey,
		})
	}

	if len(validated) == 1 {
		return store.WriteBeehiveMetrics(ctx, validated[0])
	}
	return store.WriteBatchBeehiveMetrics(ctx, validated)
}

func AddEntranceMovement(ctx context.Context, store Store, movements []RESTEntranceMovementInput) error {
	if len(movements) == 0 {
		return &ServerError{Message: "Bad Request: no movements provided", ErrorCode: ErrorCodeFieldsMissing, HTTPStatus: 400}
	}

	validated := make([]EntranceMovementInput, 0, len(movements))
	for _, movement := range movements {
		if movement.HiveID == "" {
			return &ServerError{Message: "Bad Request: hiveId not provided", ErrorCode: ErrorCodeHiveIDMissing, HTTPStatus: 400}
		}
		if movement.BoxID == "" {
			return &ServerError{Message: "Bad Request: boxId not provided", ErrorCode: ErrorCodeBoxIDMissing, HTTPStatus: 400}
		}
		if movement.BeesOut == nil || movement.BeesIn == nil {
			return &ServerError{Message: "Bad Request: beesOut or beesIn are not provided", ErrorCode: ErrorCodeFieldsMissing, HTTPStatus: 400}
		}
		if *movement.BeesOut < 0 || *movement.BeesIn < 0 {
			return &ServerError{Message: "Bad Request: beesOut or beesIn cannot be negative", ErrorCode: ErrorCodePositiveValuesOnly, HTTPStatus: 400}
		}

		timestamp := time.Now().UTC()
		if movement.Timestamp != nil {
			timestamp = time.Unix(*movement.Timestamp, 0).UTC()
		}

		validated = append(validated, EntranceMovementInput{
			HiveID:          string(movement.HiveID),
			BoxID:           string(movement.BoxID),
			BeesOut:         movement.BeesOut,
			BeesIn:          movement.BeesIn,
			NetFlow:         movement.NetFlow,
			AvgSpeed:        movement.AvgSpeed,
			P95Speed:        movement.P95Speed,
			StationaryBees:  movement.StationaryBees,
			DetectedBees:    movement.DetectedBees,
			BeeInteractions: movement.BeeInteractions,
			Timestamp:       timestamp,
		})
	}

	if len(validated) == 1 {
		return store.WriteEntranceMovement(ctx, validated[0])
	}
	return store.WriteBatchEntranceMovement(ctx, validated)
}
