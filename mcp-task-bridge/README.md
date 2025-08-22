# MCP Task Bridge

Small Node.js utilities to interact with the Task API for troubleshooting, verification, and automation.

Configuration (env-driven)
- TASK_API_BASE: Task API base URL. Default http://localhost:8081/api/v1 (aligns with backend/config/config.yaml and MIGRATION_TO_DOCKER_DEV.md)
- TASK_API_TOKEN: Optional bearer token. If set, added as Authorization header. If not set, requests are sent without Authorization.

Usage
- Export environment variables before running scripts. Do not print secrets to terminal or logs.
- Example (bash):
  export TASK_API_BASE=http://localhost:8081/api/v1
  export TASK_API_TOKEN={{YOUR_TASK_API_TOKEN}}
- Run scripts:
  node mcp-task-bridge/check-task-200.cjs
  node mcp-task-bridge/find-task-200.js

Notes
- CI (Jenkins, Docker agent): inject TASK_API_BASE and TASK_API_TOKEN via credentials bindings. Never echo credentials.
- Database: per project rules, production uses Postgres; prefer Dockerized Postgres for development.
- Security: never commit real tokens. See .env.example for placeholders (no dotenv is used by default; export envs in your shell or CI).

Troubleshooting
- 401 Unauthorized: ensure TASK_API_TOKEN has permissions and is exported in the environment.
- 404 Not Found for tasks: verify API base/port (should be 8081), and that the Task service is running; check project and pagination.
- CORS issues in browsers: these scripts run in Node and avoid CORS; for browser tools, configure server CORS accordingly.
