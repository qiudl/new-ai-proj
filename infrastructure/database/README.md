# Local Postgres (Docker) quick start

## Start database

1) docker compose -f db/docker-compose.yml up -d db
2) Wait for healthy: docker compose -f db/docker-compose.yml ps

## Initialize schema and seeds

- On first container start, files under db/init/*.sql run automatically.
- Alternatively, run migrations manually:
  psql postgresql://ai:ai@localhost:5433/ai_tasks -f db/migrations/V20250821_1500__create_dictionaries.sql
  psql postgresql://ai:ai@localhost:5433/ai_tasks -f db/migrations/V20250821_1501__seed_dictionaries.sql

## Verify

- psql postgresql://ai:ai@localhost:5433/ai_tasks -c "SELECT key,name FROM task_categories;"
- psql postgresql://ai:ai@localhost:5433/ai_tasks -c "SELECT key,level FROM task_risk_levels;"

## Rollback

- psql postgresql://ai:ai@localhost:5433/ai_tasks -f db/migrations/R20250821_1500__drop_dictionaries.sql

## Reset database (dangerous)

- docker compose -f db/docker-compose.yml down -v && docker compose -f db/docker-compose.yml up -d db

