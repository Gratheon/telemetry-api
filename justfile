start:
	rm -rf ./app || true
	source ~/.nvm/nvm.sh && nvm use && npm i && npm run build
	COMPOSE_PROJECT_NAME=gratheon docker compose -f docker-compose.dev.yml up --build
stop:
	COMPOSE_PROJECT_NAME=gratheon docker compose -f docker-compose.dev.yml down
run:
	ENV_ID=dev npm run dev
