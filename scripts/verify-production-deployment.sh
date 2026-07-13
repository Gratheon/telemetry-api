#!/bin/sh
set -eu

CONTAINER_NAME="${CONTAINER_NAME:-telemetry-api_telemetry-api_1}"
EXPECTED_PROJECT="${EXPECTED_PROJECT:-telemetry-api}"
EXPECTED_WORKING_DIR="${EXPECTED_WORKING_DIR:-/www/telemetry-api}"
SCHEMA_REGISTRY_URL="${SCHEMA_REGISTRY_URL:-http://127.0.0.1:3000/schema/latest}"
VERIFY_ATTEMPTS="${VERIFY_ATTEMPTS:-30}"
VERIFY_INTERVAL_SECONDS="${VERIFY_INTERVAL_SECONDS:-2}"

actual_project=$(docker inspect "$CONTAINER_NAME" --format '{{ index .Config.Labels "com.docker.compose.project" }}')
actual_working_dir=$(docker inspect "$CONTAINER_NAME" --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}')
if [ "$actual_project" != "$EXPECTED_PROJECT" ]; then
  echo "Expected $CONTAINER_NAME to use Compose project $EXPECTED_PROJECT, got $actual_project" >&2
  exit 1
fi
if [ "$actual_working_dir" != "$EXPECTED_WORKING_DIR" ]; then
  echo "Expected $CONTAINER_NAME to be deployed from $EXPECTED_WORKING_DIR, got $actual_working_dir" >&2
  exit 1
fi

for attempt in $(seq 1 "$VERIFY_ATTEMPTS"); do
  if curl --fail --silent --show-error --max-time 5 http://127.0.0.1:8600/health >/dev/null \
    && python3 - "$SCHEMA_REGISTRY_URL" <<'PY'
import json
import sys
import urllib.request

with urllib.request.urlopen(sys.argv[1], timeout=10) as response:
    payload = json.load(response)
schema = next((entry for entry in payload.get("data", []) if entry.get("name") == "telemetry-api"), None)
if schema is None:
    raise SystemExit("telemetry-api schema is missing from registry")
if schema.get("url") != "localhost:8600":
    raise SystemExit(f"expected telemetry-api registry URL localhost:8600, got {schema.get('url')}")
if "entranceMovementToday" not in schema.get("type_defs", ""):
    raise SystemExit("telemetry-api schema is missing Query.entranceMovementToday")
print("Verified telemetry-api health and schema registration")
PY
  then
    exit 0
  fi

  if [ "$attempt" -lt "$VERIFY_ATTEMPTS" ]; then
    echo "Waiting for telemetry-api readiness (attempt $attempt/$VERIFY_ATTEMPTS)..." >&2
    sleep "$VERIFY_INTERVAL_SECONDS"
  fi
done

exit 1
