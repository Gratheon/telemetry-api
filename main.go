package main

import (
	"context"
	"fmt"
	"net/http"
	"time"

	logger "github.com/Gratheon/log-lib-go"
)

func main() {
	cfg, err := readConfig()
	if err != nil {
		panic(err)
	}

	logger.Configure(logger.LoggerConfig{
		LogLevel: logger.LogLevel(cfg.LogLevel),
	})

	store, err := newPostgresStore(cfg.Postgres)
	if err != nil {
		logger.Fatal("failed to connect to postgres", map[string]interface{}{"error": err.Error()})
	}
	defer store.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := runMigrations(ctx, store.SQLDB()); err != nil {
		logger.Fatal("failed to run migrations", map[string]interface{}{"error": err.Error()})
	}

	registerSchema(context.Background(), cfg, graphqlSchema)

	server := &http.Server{
		Addr:              ":" + itoa(cfg.Port),
		Handler:           newHTTPHandler(cfg, store),
		ReadHeaderTimeout: 5 * time.Second,
	}

	logger.Info("telemetry-api listening", map[string]interface{}{"addr": server.Addr})
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Fatal("server failed", map[string]interface{}{"error": err.Error()})
	}
}

func itoa(value int) string {
	return fmt.Sprintf("%d", value)
}
