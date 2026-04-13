package metrics

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/99designs/gqlgen/graphql"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/vektah/gqlparser/v2/ast"
)

var registry = prometheus.NewRegistry()
var registerer = prometheus.WrapRegistererWith(prometheus.Labels{"service": "telemetry-api"}, registry)

var HTTPRequestsTotal = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "telemetry_api_http_requests_total",
		Help: "Total number of HTTP requests",
	},
	[]string{"method", "route", "status_code"},
)

var HTTPRequestDurationSeconds = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "telemetry_api_http_request_duration_seconds",
		Help:    "HTTP request duration in seconds",
		Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10},
	},
	[]string{"method", "route", "status_code"},
)

var GraphQLResolverCallsTotal = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "telemetry_api_graphql_resolver_calls_total",
		Help: "Total number of GraphQL resolver calls",
	},
	[]string{"operation_type", "resolver_name", "status"},
)

var GraphQLResolverDurationSeconds = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "telemetry_api_graphql_resolver_duration_seconds",
		Help:    "GraphQL resolver duration in seconds",
		Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10},
	},
	[]string{"operation_type", "resolver_name", "status"},
)

var DBQueryCallsTotal = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "telemetry_api_db_query_calls_total",
		Help: "Total number of database query calls",
	},
	[]string{"query_name", "status"},
)

var DBQueryDurationSeconds = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "telemetry_api_db_query_duration_seconds",
		Help:    "Database query duration in seconds",
		Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10},
	},
	[]string{"query_name", "status"},
)

func init() {
	registerer.MustRegister(
		HTTPRequestsTotal,
		HTTPRequestDurationSeconds,
		GraphQLResolverCallsTotal,
		GraphQLResolverDurationSeconds,
		DBQueryCallsTotal,
		DBQueryDurationSeconds,
	)
}

func Handler() http.Handler {
	return promhttp.HandlerFor(registry, promhttp.HandlerOpts{})
}

func RecordHTTPRequest(method, route string, statusCode int, durationSeconds float64) {
	labels := prometheus.Labels{
		"method":      method,
		"route":       route,
		"status_code": strconv.Itoa(statusCode),
	}
	HTTPRequestsTotal.With(labels).Inc()
	HTTPRequestDurationSeconds.With(labels).Observe(durationSeconds)
}

func RecordGraphQLResolverCall(operationType, resolverName, status string, durationSeconds float64) {
	GraphQLResolverCallsTotal.WithLabelValues(operationType, resolverName, status).Inc()
	GraphQLResolverDurationSeconds.WithLabelValues(operationType, resolverName, status).Observe(durationSeconds)
}

func RecordDBQuery(queryName, status string, durationSeconds float64) {
	DBQueryCallsTotal.WithLabelValues(queryName, status).Inc()
	DBQueryDurationSeconds.WithLabelValues(queryName, status).Observe(durationSeconds)
}

func HTTPMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		wrapped := chimiddleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(wrapped, r)

		route := r.URL.Path
		if routeContext := chi.RouteContext(r.Context()); routeContext != nil {
			if pattern := routeContext.RoutePattern(); pattern != "" {
				route = pattern
			}
		}

		statusCode := wrapped.Status()
		if statusCode == 0 {
			statusCode = http.StatusOK
		}

		RecordHTTPRequest(r.Method, route, statusCode, time.Since(start).Seconds())
	})
}

func GraphQLResolverMiddleware(ctx context.Context, next graphql.Resolver) (res interface{}, err error) {
	start := time.Now()
	operationType := "unknown"
	resolverName := "unknown"

	if operationContext := graphql.GetOperationContext(ctx); operationContext != nil && operationContext.Operation != nil {
		switch operationContext.Operation.Operation {
		case ast.Query:
			operationType = "query"
		case ast.Mutation:
			operationType = "mutation"
		case ast.Subscription:
			operationType = "subscription"
		}
	}

	if fieldContext := graphql.GetFieldContext(ctx); fieldContext != nil {
		if fieldContext.Object != "" && fieldContext.Field.Name != "" {
			resolverName = fieldContext.Object + "." + fieldContext.Field.Name
		} else if fieldContext.Field.Name != "" {
			resolverName = fieldContext.Field.Name
		}
	}

	defer func() {
		status := "success"
		if recoverValue := recover(); recoverValue != nil {
			status = "error"
			RecordGraphQLResolverCall(operationType, resolverName, status, time.Since(start).Seconds())
			panic(recoverValue)
		}
		if err != nil {
			status = "error"
		}
		RecordGraphQLResolverCall(operationType, resolverName, status, time.Since(start).Seconds())
	}()

	res, err = next(ctx)
	return res, err
}

func ResetForTests() {
	HTTPRequestsTotal.Reset()
	HTTPRequestDurationSeconds.Reset()
	GraphQLResolverCallsTotal.Reset()
	GraphQLResolverDurationSeconds.Reset()
	DBQueryCallsTotal.Reset()
	DBQueryDurationSeconds.Reset()
}
