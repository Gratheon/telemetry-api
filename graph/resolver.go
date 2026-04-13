package graph

import "github.com/Gratheon/telemetry-api/internal/telemetry"

//go:generate go run github.com/99designs/gqlgen generate

type Resolver struct {
	Store telemetry.Store
}
