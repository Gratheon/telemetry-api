package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	logger "github.com/Gratheon/log-lib-go"
	"github.com/Gratheon/telemetry-api/internal/telemetry"
)

type integrationStoreMock struct {
	metricPoints        []telemetry.MetricPoint
	aggregatedWeight    []telemetry.MetricPoint
	entranceMovements   []telemetry.EntranceMovementRecord
	entranceToday       telemetry.BeeMovementAggregate
	populationMetrics   []telemetry.PopulationMetricRecord
	writtenMetrics      []telemetry.IoTMetricInput
	writtenMovements    []telemetry.EntranceMovementInput
	writtenPopulations  []telemetry.PopulationMetricRecord
	lastReadMetricField string
	lastReadMetricRange int
	lastReadMaxPoints   *int
}

func (m *integrationStoreMock) Ping(context.Context) error { return nil }
func (m *integrationStoreMock) Close() error               { return nil }

func (m *integrationStoreMock) ReadMetrics(_ context.Context, _ string, rangeMin int, field string, maxPoints *int) ([]telemetry.MetricPoint, error) {
	m.lastReadMetricField = field
	m.lastReadMetricRange = rangeMin
	m.lastReadMaxPoints = maxPoints
	return m.metricPoints, nil
}

func (m *integrationStoreMock) WriteBeehiveMetrics(_ context.Context, input telemetry.IoTMetricInput) error {
	m.writtenMetrics = append(m.writtenMetrics, input)
	return nil
}

func (m *integrationStoreMock) WriteBatchBeehiveMetrics(_ context.Context, inputs []telemetry.IoTMetricInput) error {
	m.writtenMetrics = append(m.writtenMetrics, inputs...)
	return nil
}

func (m *integrationStoreMock) ReadAggregatedMetricsFromToday(context.Context, string, string) (telemetry.BeeMovementAggregate, error) {
	return m.entranceToday, nil
}

func (m *integrationStoreMock) ReadEntranceMovement(context.Context, string, *string, time.Time, time.Time) ([]telemetry.EntranceMovementRecord, error) {
	return m.entranceMovements, nil
}

func (m *integrationStoreMock) WriteEntranceMovement(_ context.Context, input telemetry.EntranceMovementInput) error {
	m.writtenMovements = append(m.writtenMovements, input)
	return nil
}

func (m *integrationStoreMock) WriteBatchEntranceMovement(_ context.Context, inputs []telemetry.EntranceMovementInput) error {
	m.writtenMovements = append(m.writtenMovements, inputs...)
	return nil
}

func (m *integrationStoreMock) ReadAggregatedWeightMetrics(context.Context, string, int, string) ([]telemetry.MetricPoint, error) {
	return m.aggregatedWeight, nil
}

func (m *integrationStoreMock) ReadPopulationMetrics(context.Context, string, int) ([]telemetry.PopulationMetricRecord, error) {
	result := make([]telemetry.PopulationMetricRecord, 0, len(m.populationMetrics)+len(m.writtenPopulations))
	result = append(result, m.populationMetrics...)
	result = append(result, m.writtenPopulations...)
	return result, nil
}

func (m *integrationStoreMock) WritePopulationMetrics(_ context.Context, _ string, fields telemetry.PopulationMetricFields, inspectionID *string, timestamp *time.Time) error {
	recordedAt := time.Now().UTC()
	if timestamp != nil {
		recordedAt = *timestamp
	}
	m.writtenPopulations = append(m.writtenPopulations, telemetry.PopulationMetricRecord{
		T:               recordedAt,
		BeeCount:        fields.BeeCount,
		DroneCount:      fields.DroneCount,
		VarroaMiteCount: fields.VarroaMiteCount,
		InspectionID:    inspectionID,
	})
	return nil
}

func newIntegrationServer(t *testing.T, store *integrationStoreMock) *httptest.Server {
	t.Helper()
	return httptest.NewServer(newHTTPHandler(config{
		TestAuthBypassEnabled: true,
		LogLevel:              "error",
	}, store, logger.New(logger.LoggerConfig{LogLevel: logger.LogLevelError})))
}

func doJSONRequest(t *testing.T, client *http.Client, method, url string, body interface{}, headers map[string]string) (*http.Response, []byte) {
	t.Helper()

	var payload []byte
	var err error
	if body != nil {
		payload, err = json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request: %v", err)
		}
	}

	req, err := http.NewRequest(method, url, bytes.NewReader(payload))
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("do request: %v", err)
	}
	defer resp.Body.Close()

	responseBody := new(bytes.Buffer)
	if _, err := responseBody.ReadFrom(resp.Body); err != nil {
		t.Fatalf("read response: %v", err)
	}

	return resp, responseBody.Bytes()
}

func graphqlRequest(t *testing.T, client *http.Client, baseURL, query string, variables map[string]interface{}) map[string]interface{} {
	t.Helper()

	resp, body := doJSONRequest(t, client, http.MethodPost, baseURL+"/graphql", map[string]interface{}{
		"query":     query,
		"variables": variables,
	}, map[string]string{})

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected graphql 200, got %d: %s", resp.StatusCode, string(body))
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(body, &parsed); err != nil {
		t.Fatalf("decode graphql response: %v", err)
	}
	return parsed
}

func TestHealthEndpoint(t *testing.T) {
	server := newIntegrationServer(t, &integrationStoreMock{})
	defer server.Close()

	resp, err := http.Get(server.URL + "/health")
	if err != nil {
		t.Fatalf("health request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestRESTIOTMetricsValidationAndSuccess(t *testing.T) {
	store := &integrationStoreMock{}
	server := newIntegrationServer(t, store)
	defer server.Close()

	testCases := []struct {
		name           string
		body           interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing hive id",
			body:           map[string]interface{}{},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Bad Request: hiveId not provided",
		},
		{
			name: "missing fields",
			body: map[string]interface{}{
				"hiveId": 196,
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Bad Request: fields not provided",
		},
		{
			name:           "empty array",
			body:           []interface{}{},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Bad Request: no metrics provided",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			resp, body := doJSONRequest(t, server.Client(), http.MethodPost, server.URL+"/iot/v1/metrics", tc.body, map[string]string{
				testAuthHeader: "true",
			})

			if resp.StatusCode != tc.expectedStatus {
				t.Fatalf("expected %d, got %d: %s", tc.expectedStatus, resp.StatusCode, string(body))
			}

			var parsed map[string]string
			if err := json.Unmarshal(body, &parsed); err != nil {
				t.Fatalf("decode error response: %v", err)
			}
			if parsed["error"] != tc.expectedError {
				t.Fatalf("expected error %q, got %q", tc.expectedError, parsed["error"])
			}
		})
	}

	t.Run("single metric success", func(t *testing.T) {
		resp, body := doJSONRequest(t, server.Client(), http.MethodPost, server.URL+"/iot/v1/metrics", map[string]interface{}{
			"hiveId": 196,
			"fields": map[string]interface{}{
				"temperatureCelsius": 12,
				"weightKg":           10,
				"humidityPercent":    45,
			},
		}, map[string]string{testAuthHeader: "true"})

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", resp.StatusCode, string(body))
		}
		if len(store.writtenMetrics) != 1 {
			t.Fatalf("expected 1 metric written, got %d", len(store.writtenMetrics))
		}
	})

	t.Run("batch metric success", func(t *testing.T) {
		store.writtenMetrics = nil

		resp, body := doJSONRequest(t, server.Client(), http.MethodPost, server.URL+"/iot/v1/metrics", []map[string]interface{}{
			{
				"hiveId": 196,
				"fields": map[string]interface{}{"temperatureCelsius": 12},
			},
			{
				"hiveId": 196,
				"fields": map[string]interface{}{"temperatureCelsius": 13},
			},
		}, map[string]string{testAuthHeader: "true"})

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", resp.StatusCode, string(body))
		}
		if len(store.writtenMetrics) != 2 {
			t.Fatalf("expected 2 metrics written, got %d", len(store.writtenMetrics))
		}
	})
}

func TestRESTEntranceMovementValidationAndSuccess(t *testing.T) {
	store := &integrationStoreMock{}
	server := newIntegrationServer(t, store)
	defer server.Close()

	testCases := []struct {
		name           string
		body           interface{}
		expectedStatus int
		expectedError  string
	}{
		{
			name:           "missing hive id",
			body:           map[string]interface{}{},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Bad Request: hiveId not provided",
		},
		{
			name: "missing box id",
			body: map[string]interface{}{
				"hiveId": 8,
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Bad Request: boxId not provided",
		},
		{
			name: "missing bees fields",
			body: map[string]interface{}{
				"hiveId": 8,
				"boxId":  19,
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Bad Request: beesOut or beesIn are not provided",
		},
		{
			name: "negative bees",
			body: map[string]interface{}{
				"hiveId":  8,
				"boxId":   19,
				"beesIn":  10,
				"beesOut": -1,
			},
			expectedStatus: http.StatusBadRequest,
			expectedError:  "Bad Request: beesOut or beesIn cannot be negative",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			resp, body := doJSONRequest(t, server.Client(), http.MethodPost, server.URL+"/entrance/v1/movement", tc.body, map[string]string{
				testAuthHeader: "true",
			})

			if resp.StatusCode != tc.expectedStatus {
				t.Fatalf("expected %d, got %d: %s", tc.expectedStatus, resp.StatusCode, string(body))
			}

			var parsed map[string]string
			if err := json.Unmarshal(body, &parsed); err != nil {
				t.Fatalf("decode error response: %v", err)
			}
			if parsed["error"] != tc.expectedError {
				t.Fatalf("expected error %q, got %q", tc.expectedError, parsed["error"])
			}
		})
	}

	t.Run("success", func(t *testing.T) {
		resp, body := doJSONRequest(t, server.Client(), http.MethodPost, server.URL+"/entrance/v1/movement", map[string]interface{}{
			"hiveId":          8,
			"boxId":           19,
			"beesIn":          25,
			"beesOut":         18,
			"netFlow":         7,
			"avgSpeed":        5.1,
			"p95Speed":        11.2,
			"stationaryBees":  3,
			"detectedBees":    43,
			"beeInteractions": 5,
		}, map[string]string{testAuthHeader: "true"})

		if resp.StatusCode != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", resp.StatusCode, string(body))
		}
		if len(store.writtenMovements) != 1 {
			t.Fatalf("expected 1 movement written, got %d", len(store.writtenMovements))
		}
	})
}

func TestGraphQLAddMetricValidation(t *testing.T) {
	server := newIntegrationServer(t, &integrationStoreMock{})
	defer server.Close()

	response := graphqlRequest(t, server.Client(), server.URL, `
		mutation($hiveId: ID!, $fields: MetricSetInput!) {
			addMetric(hiveId: $hiveId, fields: $fields) {
				__typename
				... on TelemetryError { message code }
				... on AddMetricMessage { message }
			}
		}
	`, map[string]interface{}{
		"hiveId": "7",
		"fields": map[string]interface{}{},
	})

	data := response["data"].(map[string]interface{})
	result := data["addMetric"].(map[string]interface{})

	if result["__typename"] != "TelemetryError" {
		t.Fatalf("expected TelemetryError, got %#v", result)
	}
	if result["message"] != "Bad Request: fields not provided" || result["code"] != "4002" {
		t.Fatalf("unexpected addMetric error payload: %#v", result)
	}
}

func TestGraphQLTemperatureQueries(t *testing.T) {
	store := &integrationStoreMock{
		metricPoints: []telemetry.MetricPoint{
			{T: time.Date(2025, 1, 1, 12, 0, 0, 0, time.UTC), V: float64Ptr(21.5)},
		},
	}
	server := newIntegrationServer(t, store)
	defer server.Close()

	t.Run("validation error", func(t *testing.T) {
		response := graphqlRequest(t, server.Client(), server.URL, `
			query($hiveId: ID!, $timeRangeMin: Int) {
				temperatureCelsius(hiveId: $hiveId, timeRangeMin: $timeRangeMin) {
					__typename
					... on MetricFloatList { metrics { t v } }
					... on TelemetryError { message code }
				}
			}
		`, map[string]interface{}{
			"hiveId":       "hive-1",
			"timeRangeMin": 0,
		})

		data := response["data"].(map[string]interface{})
		result := data["temperatureCelsius"].(map[string]interface{})
		if result["message"] != "Time range must be positive" || result["code"] != "4003" {
			t.Fatalf("unexpected validation payload: %#v", result)
		}
	})

	t.Run("success with maxPoints", func(t *testing.T) {
		response := graphqlRequest(t, server.Client(), server.URL, `
			query($hiveId: ID!, $timeRangeMin: Int, $maxPoints: Int) {
				temperatureCelsius(hiveId: $hiveId, timeRangeMin: $timeRangeMin, maxPoints: $maxPoints) {
					__typename
					... on MetricFloatList { metrics { t v } }
					... on TelemetryError { message code }
				}
			}
		`, map[string]interface{}{
			"hiveId":       "hive-1",
			"timeRangeMin": 15,
			"maxPoints":    100,
		})

		data := response["data"].(map[string]interface{})
		result := data["temperatureCelsius"].(map[string]interface{})
		if result["__typename"] != "MetricFloatList" {
			t.Fatalf("expected MetricFloatList, got %#v", result)
		}
		metrics := result["metrics"].([]interface{})
		if len(metrics) != 1 {
			t.Fatalf("expected one metric, got %#v", metrics)
		}
		if store.lastReadMetricField != "temperatureCelsius" || store.lastReadMetricRange != 15 || store.lastReadMaxPoints == nil || *store.lastReadMaxPoints != 100 {
			t.Fatalf("unexpected store read args: field=%s range=%d maxPoints=%v", store.lastReadMetricField, store.lastReadMetricRange, store.lastReadMaxPoints)
		}
	})
}

func TestGraphQLEntranceMovementQuery(t *testing.T) {
	store := &integrationStoreMock{
		entranceMovements: []telemetry.EntranceMovementRecord{
			{
				ID:      1,
				HiveID:  "10",
				BoxID:   "41",
				Time:    time.Date(2025, 2, 1, 10, 0, 0, 0, time.UTC),
				BeesIn:  float64Ptr(15),
				BeesOut: float64Ptr(10),
				NetFlow: float64Ptr(5),
			},
		},
	}
	server := newIntegrationServer(t, store)
	defer server.Close()

	response := graphqlRequest(t, server.Client(), server.URL, `
		query($hiveId: ID!, $boxId: ID!, $timeFrom: DateTime!, $timeTo: DateTime!) {
			entranceMovement(hiveId: $hiveId, boxId: $boxId, timeFrom: $timeFrom, timeTo: $timeTo) {
				__typename
				... on EntranceMovementList {
					metrics {
						time
						beesIn
						beesOut
						netFlow
					}
				}
				... on TelemetryError { message code }
			}
		}
	`, map[string]interface{}{
		"hiveId":   "10",
		"boxId":    "41",
		"timeFrom": time.Date(2025, 2, 1, 0, 0, 0, 0, time.UTC).Format(time.RFC3339),
		"timeTo":   time.Date(2025, 2, 2, 0, 0, 0, 0, time.UTC).Format(time.RFC3339),
	})

	data := response["data"].(map[string]interface{})
	result := data["entranceMovement"].(map[string]interface{})
	if result["__typename"] != "EntranceMovementList" {
		t.Fatalf("expected EntranceMovementList, got %#v", result)
	}
	metrics := result["metrics"].([]interface{})
	if len(metrics) != 1 {
		t.Fatalf("expected one movement metric, got %#v", metrics)
	}
}

func TestGraphQLPopulationMetricsMutationAndQuery(t *testing.T) {
	store := &integrationStoreMock{
		populationMetrics: []telemetry.PopulationMetricRecord{
			{
				T:        time.Date(2025, 1, 15, 0, 0, 0, 0, time.UTC),
				BeeCount: intPtr(35000),
			},
		},
	}
	server := newIntegrationServer(t, store)
	defer server.Close()

	mutationResponse := graphqlRequest(t, server.Client(), server.URL, `
		mutation($hiveId: ID!, $fields: PopulationMetricInput!, $inspectionId: String) {
			addPopulationMetric(hiveId: $hiveId, fields: $fields, inspectionId: $inspectionId) {
				__typename
				... on AddMetricMessage { message }
				... on TelemetryError { message code }
			}
		}
	`, map[string]interface{}{
		"hiveId": "199",
		"fields": map[string]interface{}{
			"beeCount":        40000,
			"droneCount":      500,
			"varroaMiteCount": 10,
		},
		"inspectionId": "test-inspection-123",
	})

	mutationData := mutationResponse["data"].(map[string]interface{})
	mutationResult := mutationData["addPopulationMetric"].(map[string]interface{})
	if mutationResult["__typename"] != "AddMetricMessage" || mutationResult["message"] != "OK" {
		t.Fatalf("unexpected addPopulationMetric payload: %#v", mutationResult)
	}

	queryResponse := graphqlRequest(t, server.Client(), server.URL, `
		query($hiveId: ID!, $days: Int) {
			populationMetrics(hiveId: $hiveId, days: $days) {
				__typename
				... on PopulationMetricsList {
					metrics {
						t
						beeCount
						droneCount
						varroaMiteCount
						inspectionId
					}
				}
				... on TelemetryError { message code }
			}
		}
	`, map[string]interface{}{
		"hiveId": "199",
		"days":   90,
	})

	queryData := queryResponse["data"].(map[string]interface{})
	queryResult := queryData["populationMetrics"].(map[string]interface{})
	if queryResult["__typename"] != "PopulationMetricsList" {
		t.Fatalf("expected PopulationMetricsList, got %#v", queryResult)
	}
	metrics := queryResult["metrics"].([]interface{})
	if len(metrics) < 2 {
		t.Fatalf("expected stored and newly written population metrics, got %#v", metrics)
	}
}

func TestGraphQLPopulationMetricsValidation(t *testing.T) {
	server := newIntegrationServer(t, &integrationStoreMock{})
	defer server.Close()

	response := graphqlRequest(t, server.Client(), server.URL, `
		query($hiveId: ID!, $days: Int) {
			populationMetrics(hiveId: $hiveId, days: $days) {
				__typename
				... on PopulationMetricsList { metrics { t beeCount } }
				... on TelemetryError { message code }
			}
		}
	`, map[string]interface{}{
		"hiveId": "199",
		"days":   1000,
	})

	data := response["data"].(map[string]interface{})
	result := data["populationMetrics"].(map[string]interface{})
	if result["message"] != "Days cannot exceed 730" || result["code"] != "4003" {
		t.Fatalf("unexpected populationMetrics validation payload: %#v", result)
	}
}

func float64Ptr(v float64) *float64 { return &v }
func intPtr(v int) *int             { return &v }
