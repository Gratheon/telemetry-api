package metrics

import "testing"

func TestRecordDBQuery(t *testing.T) {
	ResetForTests()

	RecordDBQuery("read_population_metrics", "success", 0.123)

	metricFamilies, err := registry.Gather()
	if err != nil {
		t.Fatalf("gather metrics: %v", err)
	}

	found := false
	for _, family := range metricFamilies {
		if family.GetName() != "telemetry_api_db_query_calls_total" {
			continue
		}
		for _, metric := range family.GetMetric() {
			labels := map[string]string{}
			for _, label := range metric.GetLabel() {
				labels[label.GetName()] = label.GetValue()
			}
			if labels["query_name"] == "read_population_metrics" && labels["status"] == "success" {
				found = true
			}
		}
	}

	if !found {
		t.Fatalf("expected db query metric to be recorded")
	}
}
