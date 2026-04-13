package telemetry

import "time"

type MetricFields struct {
	TemperatureCelsius *float64 `json:"temperatureCelsius"`
	HumidityPercent    *float64 `json:"humidityPercent"`
	WeightKg           *float64 `json:"weightKg"`
}

func (f MetricFields) Empty() bool {
	return f.TemperatureCelsius == nil && f.HumidityPercent == nil && f.WeightKg == nil
}

type PopulationMetricFields struct {
	BeeCount        *int `json:"beeCount"`
	DroneCount      *int `json:"droneCount"`
	VarroaMiteCount *int `json:"varroaMiteCount"`
}

func (f PopulationMetricFields) Empty() bool {
	return f.BeeCount == nil && f.DroneCount == nil && f.VarroaMiteCount == nil
}

type MetricPoint struct {
	T time.Time `db:"t"`
	V *float64  `db:"v"`
}

type IoTMetricInput struct {
	HiveID    string
	Fields    MetricFields
	Timestamp time.Time
	DedupeKey *string
}

type EntranceMovementInput struct {
	HiveID          string
	BoxID           string
	BeesOut         *float64
	BeesIn          *float64
	NetFlow         *float64
	AvgSpeed        *float64
	P95Speed        *float64
	StationaryBees  *int
	DetectedBees    *int
	BeeInteractions *int
	Timestamp       time.Time
}

type BeeMovementAggregate struct {
	BeesIn          *float64   `db:"beesIn"`
	BeesOut         *float64   `db:"beesOut"`
	NetFlow         *float64   `db:"netFlow"`
	AvgSpeed        *float64   `db:"avgSpeed"`
	P95Speed        *float64   `db:"p95Speed"`
	StationaryBees  *int       `db:"stationaryBees"`
	DetectedBees    *int       `db:"detectedBees"`
	BeeInteractions *int       `db:"beeInteractions"`
	Time            *time.Time `db:"time"`
}

type EntranceMovementRecord struct {
	ID              int64     `db:"id"`
	HiveID          string    `db:"hive_id"`
	BoxID           string    `db:"box_id"`
	BeesOut         *float64  `db:"bees_out"`
	BeesIn          *float64  `db:"bees_in"`
	Time            time.Time `db:"time"`
	NetFlow         *float64  `db:"net_flow"`
	AvgSpeed        *float64  `db:"avg_speed"`
	P95Speed        *float64  `db:"p95_speed"`
	StationaryBees  *int      `db:"stationary_bees"`
	DetectedBees    *int      `db:"detected_bees"`
	BeeInteractions *int
}

type PopulationMetricRecord struct {
	T               time.Time `db:"t"`
	BeeCount        *int      `db:"bee_count"`
	DroneCount      *int      `db:"drone_count"`
	VarroaMiteCount *int      `db:"varroa_mite_count"`
	InspectionID    *string   `db:"inspection_id"`
}
