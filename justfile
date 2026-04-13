set shell := ["/bin/zsh", "-c"]

start:
	go build ./...
	COMPOSE_PROJECT_NAME=gratheon docker compose -f docker-compose.dev.yml up --build
stop:
	COMPOSE_PROJECT_NAME=gratheon docker compose -f docker-compose.dev.yml down
run:
	ENV_ID=dev go run .
test:
	#!/usr/bin/env zsh
	set -euo pipefail
	docker compose -f docker-compose.test.yml up -d --build
	cleanup() {
	  docker compose -f docker-compose.test.yml down -v
	}
	trap cleanup EXIT
	go test ./...
