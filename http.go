package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/playground"
	logger "github.com/Gratheon/log-lib-go"
	"github.com/Gratheon/telemetry-api/graph"
	"github.com/Gratheon/telemetry-api/graph/generated"
	"github.com/Gratheon/telemetry-api/internal/telemetry"
	telemetrymetrics "github.com/Gratheon/telemetry-api/internal/telemetry/metrics"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/rs/cors"
)

type userIDContextKey struct{}

func newHTTPHandler(cfg config, store telemetry.Store) http.Handler {
	router := chi.NewRouter()
	router.Use(chimiddleware.RequestID)
	router.Use(telemetrymetrics.HTTPMiddleware)
	router.Use(cors.AllowAll().Handler)
	router.Use(logger.NewStructuredLogger(logger.New(logger.LoggerConfig{LogLevel: logger.LogLevel(cfg.LogLevel)})))

	router.Get("/", rootHandler)
	router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := store.Ping(ctx); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "database unavailable"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"hello": "world"})
	})
	router.Handle("/metrics", telemetrymetrics.Handler())

	resolver := &graph.Resolver{Store: store}
	server := handler.NewDefaultServer(generated.NewExecutableSchema(generated.Config{Resolvers: resolver}))
	server.AroundFields(telemetrymetrics.GraphQLResolverMiddleware)

	router.Handle("/graphql", server)
	router.Get("/graphql", playground.Handler("GraphQL playground", "/graphql"))

	router.With(func(next http.Handler) http.Handler {
		return authenticateAPIToken(cfg, next)
	}).Post("/iot/v1/metrics", func(w http.ResponseWriter, r *http.Request) {
		handleRESTMetrics(w, r, store)
	})

	router.With(func(next http.Handler) http.Handler {
		return authenticateAPIToken(cfg, next)
	}).Post("/entrance/v1/movement", func(w http.ResponseWriter, r *http.Request) {
		handleRESTEntranceMovement(w, r, store)
	})

	return router
}

func handleRESTMetrics(w http.ResponseWriter, r *http.Request, store telemetry.Store) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	payloads, err := decodeMetricPayloads(body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if err := telemetry.AddIoTMetrics(r.Context(), store, payloads); err != nil {
		handleRESTError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "OK"})
}

func handleRESTEntranceMovement(w http.ResponseWriter, r *http.Request, store telemetry.Store) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	payloads, err := decodeEntranceMovementPayloads(body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid request body"})
		return
	}

	if err := telemetry.AddEntranceMovement(r.Context(), store, payloads); err != nil {
		handleRESTError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "OK"})
}

func decodeMetricPayloads(body []byte) ([]telemetry.RESTMetricInput, error) {
	var payloads []telemetry.RESTMetricInput
	if err := json.Unmarshal(body, &payloads); err == nil {
		return payloads, nil
	}

	var payload telemetry.RESTMetricInput
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	return []telemetry.RESTMetricInput{payload}, nil
}

func decodeEntranceMovementPayloads(body []byte) ([]telemetry.RESTEntranceMovementInput, error) {
	var payloads []telemetry.RESTEntranceMovementInput
	if err := json.Unmarshal(body, &payloads); err == nil {
		return payloads, nil
	}

	var payload telemetry.RESTEntranceMovementInput
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, err
	}
	return []telemetry.RESTEntranceMovementInput{payload}, nil
}

func handleRESTError(w http.ResponseWriter, err error) {
	var telemetryErr *telemetry.ServerError
	if errors.As(err, &telemetryErr) {
		writeTelemetryError(w, telemetryErr)
		return
	}

	logger.Error("unexpected rest handler error", map[string]interface{}{"error": err.Error()})
	writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal Server Error"})
}

func writeTelemetryError(w http.ResponseWriter, err *telemetry.ServerError) {
	status := err.HTTPStatus
	if status == 0 {
		status = http.StatusBadRequest
	}
	writeJSON(w, status, map[string]string{"error": err.Message})
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
