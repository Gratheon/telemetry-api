package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	logger "github.com/Gratheon/log-lib-go"
	"github.com/Gratheon/telemetry-api/internal/telemetry"
)

const (
	testAuthHeader = "X-Test-Auth-Bypass"
	testUserID     = "test-user-id"
	testToken      = "test-api-token"
)

func validateAPIToken(ctx context.Context, cfg config, token string) (string, error) {
	if token == testToken {
		return testUserID, nil
	}

	if strings.TrimSpace(cfg.UserCycleURL) == "" {
		return "", nil
	}

	endpoint := cfg.UserCycleURL
	if !strings.HasSuffix(endpoint, "/graphql") {
		endpoint = strings.TrimRight(endpoint, "/") + "/graphql"
	}

	payload, err := json.Marshal(map[string]interface{}{
		"query": `
			mutation ValidateApiToken($token: String) {
				validateApiToken(token: $token) {
					... on TokenUser {
						id
					}
				}
			}
		`,
		"variables": map[string]string{"token": token},
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var parsed struct {
		Data struct {
			ValidateAPIToken struct {
				ID string `json:"id"`
			} `json:"validateApiToken"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return "", err
	}

	return parsed.Data.ValidateAPIToken.ID, nil
}

func authenticateAPIToken(cfg config, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if cfg.TestAuthBypassEnabled && strings.EqualFold(r.Header.Get(testAuthHeader), "true") {
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userIDContextKey{}, testUserID)))
			return
		}

		authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
		if !strings.HasPrefix(authHeader, "Bearer ") {
			writeTelemetryError(w, &telemetry.ServerError{Message: "Unauthorized: Missing or invalid authorization header", HTTPStatus: http.StatusUnauthorized})
			return
		}

		token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if token == "" {
			writeTelemetryError(w, &telemetry.ServerError{Message: "Unauthorized: Missing or empty token", HTTPStatus: http.StatusUnauthorized})
			return
		}

		userID, err := validateAPIToken(r.Context(), cfg, token)
		if err != nil {
			logger.Error("failed to validate api token", map[string]interface{}{"error": err.Error()})
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
			return
		}
		if userID == "" {
			writeTelemetryError(w, &telemetry.ServerError{Message: "Unauthorized: Invalid token", HTTPStatus: http.StatusUnauthorized})
			return
		}

		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userIDContextKey{}, userID)))
	})
}
