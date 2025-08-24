# MCP Task Bridge

Small Node.js utilities to interact with the Task API for troubleshooting, verification, and automation.

Configuration (env-driven)
- TASK_API_BASE: Task API base URL. Default http://localhost:8080/api/v1 (aligns with backend compose default port 8080)
- TASK_API_TOKEN: Optional bearer token. If set, added as Authorization header. If not set, requests are sent without Authorization (most endpoints require auth and will return 401).
- API_BASE_URL: Back-compat alias for TASK_API_BASE (lower priority)
- API_TOKEN: Back-compat alias for TASK_API_TOKEN (lower priority)

Usage
- Export environment variables before running scripts. Do not print secrets to terminal or logs.
- Example (bash):
  export TASK_API_BASE=http://localhost:8080/api/v1
  export TASK_API_TOKEN={{YOUR_TASK_API_TOKEN}}
- Run scripts:
  node mcp-task-bridge/check-task-200.cjs
  node mcp-task-bridge/find-task-200.js

Notes
- CI (Jenkins, Docker agent): inject TASK_API_BASE and TASK_API_TOKEN via credentials bindings. Never echo credentials.
- Database: per project rules, production uses Postgres; prefer Dockerized Postgres for development.
- Security: never commit real tokens. See .env.example for placeholders (no dotenv is used by default; export envs in your shell or CI).

Dev quick login (optional)
- Tool: dev_quick_login
- Input: { "username": "admin" } (optional; default admin or DEV_LOGIN_USERNAME)
- Backend requirement: APP_ENV must be development or dev; endpoint POST /api/v1/auth/dev-quick-login must be available
- Effect: retrieves a JWT and stores it in-memory (Authorization Bearer) for subsequent calls

Troubleshooting
- 401 Unauthorized: ensure TASK_API_TOKEN has permissions and is exported in the environment (or run dev_quick_login in development mode).
- 404 Not Found: verify API base/port (should be 8080) and that the backend is running; for dev_quick_login, ensure APP_ENV=development on backend.
- CORS issues in browsers: these scripts run in Node and avoid CORS; for browser tools, configure server CORS accordingly.
