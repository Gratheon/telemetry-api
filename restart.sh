#!/bin/sh
set -eu

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-telemetry-api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
rm -rf ./app

COMPOSE_PROJECT_NAME="$PROJECT_NAME" docker-compose -f "$COMPOSE_FILE" down
COMPOSE_PROJECT_NAME="$PROJECT_NAME" docker-compose -f "$COMPOSE_FILE" up --build -d
