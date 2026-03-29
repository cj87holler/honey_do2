.PHONY: dev up down db-generate db-migrate db-studio start install db-reset test test-ci

# Start Next.js dev server (requires DB running)
dev:
	npm run dev

# Start PostgreSQL via Docker Compose
up:
	docker compose up -d

# Stop PostgreSQL (preserves data)
down:
	docker compose down

# Generate migration files from schema changes
db-generate:
	npx drizzle-kit generate

# Apply pending migrations to database
db-migrate:
	@set -a && . ./.env.local && set +a && npx drizzle-kit migrate

# Open Drizzle Studio (visual DB browser)
db-studio:
	npx drizzle-kit studio

# Start DB, run migrations, and start dev server
start: up
	@echo "Waiting for PostgreSQL..."
	@sleep 2
	$(MAKE) db-migrate
	$(MAKE) dev

# Install all dependencies
install:
	npm install

# Wipe local database volume (DESTRUCTIVE — local dev only)
db-reset:
	docker compose down -v
	docker compose up -d
	@echo "Waiting for PostgreSQL..."
	@sleep 2
	$(MAKE) db-migrate

# Run tests in watch mode
test:
	npm run test

# Run tests once (CI mode)
test-ci:
	npx vitest run
