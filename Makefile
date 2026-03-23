include .env

COMPOSE_DEV = docker compose -f docker-compose.dev.yml

.PHONY: ps-dev build-dev down-dev up-dev up-app-dev dbr-dev init-dev clean-project reset-dev migrate-dev seed-db-dev test-dev

ps-dev:
	$(COMPOSE_DEV) ps

build-dev:
	$(COMPOSE_DEV) build

down-dev:
	$(COMPOSE_DEV) down

up-dev:
	$(COMPOSE_DEV) up -d

up-app-dev:
	cd www && bun run start:dev

dbr-dev: down-dev
	$(COMPOSE_DEV) up -d --build

migrate-dev:
	cd www && npx prisma migrate dev

seed-db-dev:
	cd www && bun run seed

test-dev:
	cd www && bun run test

clean-project:
	@echo "Cleaning project..."
	$(COMPOSE_DEV) down -v --remove-orphans
	docker network rm $(PROJECT_NAME)_net 2>/dev/null || true
	@echo "Project cleaned!"

init-dev:
	@echo "Building..."
	@$(MAKE) build-dev
	docker network create $(PROJECT_NAME)_net || true
	@echo "Starting services..."
	$(COMPOSE_DEV) up -d --wait
	@echo "Services ready!"
	$(MAKE) ps-dev
	@echo "Setting up application..."
	cd www && \
		bun install && \
		bunx prisma generate
	@echo "✓ Initialization complete!"

reset-dev: clean-project
	@bash setup.sh