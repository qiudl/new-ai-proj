# Make commands for DB and Prisma with Docker Postgres

# Default shell
SHELL := /bin/sh

# Docker compose file
COMPOSE := docker compose -f compose.yaml

# Environment
ENV_FILE := .env.docker

.PHONY: db.up db.down db.psql migrate prisma.pull prisma.generate prisma.migrate.dev prisma.migrate.deploy prisma.studio prisma.validate seed

## Bring up Postgres and sidecars
db.up:
	$(COMPOSE) up -d db prisma

## Stop all services
db.down:
	$(COMPOSE) down -v

## Open psql against the running db
# Usage: make db.psql CMD="SELECT 1;"
db.psql:
	@docker exec -i ai-db psql -U $${DB_USER:-user} -d $${DB_NAME:-main_db} -c "$${CMD:-SELECT now();}"

## Apply raw SQL migrations in ./migrations via the migrate service
migrate:
	$(COMPOSE) up --exit-code-from migrate migrate

## Prisma: introspect existing DB into prisma/schema.prisma
prisma.pull:
	$(COMPOSE) exec -T prisma npx -y prisma@5.16.1 db pull

## Prisma: generate client (for Node usage)
prisma.generate:
	$(COMPOSE) exec -T prisma npx -y prisma@5.16.1 generate

## Prisma: dev migrations (creates new migration from schema)
prisma.migrate.dev:
	$(COMPOSE) exec -T prisma npx -y prisma@5.16.1 migrate dev --name init

## Prisma: deploy migrations (apply existing migrations)
prisma.migrate.deploy:
	$(COMPOSE) exec -T prisma npx -y prisma@5.16.1 migrate deploy

## Prisma: open studio (browser UI)
prisma.studio:
	$(COMPOSE) exec -T -e BROWSER=none prisma npx -y prisma@5.16.1 studio --port 5555 --host 0.0.0.0

## Prisma: validate schema
prisma.validate:
	$(COMPOSE) exec -T prisma npx -y prisma@5.16.1 validate

## Seed data placeholder (SQL seeds live in migrations or separate scripts)
seed:
	@echo "Seeding via SQL files in migrations/ or project-specific scripts..."

