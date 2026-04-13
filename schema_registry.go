package main

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	logger "github.com/Gratheon/log-lib-go"
)

type schemaRegistryPayload struct {
	Name     string `json:"name"`
	URL      string `json:"url"`
	Version  string `json:"version"`
	TypeDefs string `json:"type_defs"`
}

func registerSchema(ctx context.Context, cfg config, schema string) {
	if strings.TrimSpace(cfg.SchemaRegistryURL) == "" || cfg.EnvironmentID == "test" {
		return
	}

	sum := sha1.Sum([]byte(schema))
	version := hex.EncodeToString(sum[:])
	if cfg.EnvironmentID == "dev" {
		version = "latest"
	}

	payload, err := json.Marshal(schemaRegistryPayload{
		Name:     "telemetry-api",
		URL:      cfg.SelfURL,
		Version:  version,
		TypeDefs: schema,
	})
	if err != nil {
		logger.Error("failed to marshal schema registry payload", map[string]interface{}{"error": err.Error()})
		return
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, strings.TrimRight(cfg.SchemaRegistryURL, "/")+"/schema/push", bytes.NewReader(payload))
	if err != nil {
		logger.Error("failed to build schema registry request", map[string]interface{}{"error": err.Error()})
		return
	}
	request.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		logger.Error("failed to register schema", map[string]interface{}{"error": err.Error()})
		return
	}
	defer response.Body.Close()

	if response.StatusCode >= 300 {
		logger.Warn("schema registry returned non-success status", map[string]interface{}{"status": response.StatusCode})
		return
	}

	logger.Info("schema registered", map[string]interface{}{"version": version})
}
