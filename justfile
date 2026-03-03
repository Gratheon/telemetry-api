set shell := ["/bin/zsh", "-c"]

start:
	rm -rf ./app || true
	source ~/.nvm/nvm.sh && nvm use && npm i && npm run build
	COMPOSE_PROJECT_NAME=gratheon docker compose -f docker-compose.dev.yml up --build
stop:
	COMPOSE_PROJECT_NAME=gratheon docker compose -f docker-compose.dev.yml down
run:
	ENV_ID=dev npm run dev
test:
	#!/usr/bin/env zsh
	set -euo pipefail
	docker compose -f docker-compose.test.yml up -d --build
	cleanup() {
	  docker compose -f docker-compose.test.yml down -v
	}
	trap cleanup EXIT
	API_HOST=localhost npm run test:unit
	API_HOST=localhost npm run test:integration
