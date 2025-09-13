# CLAUDE.md - AI Project Development Guide

## Project Overview

This is a production-ready AI project backend/API with comprehensive documentation and testing infrastructure. The project follows contract-first development using OpenAPI 3.0 specifications.

## Architecture & Technology Stack

- **API Framework**: RESTful API with OpenAPI 3.0 specification
- **Documentation**: Swagger UI for interactive API documentation
- **Database**: PostgreSQL (mandatory for production/staging environments)
- **Cache**: Redis (optional component for development)
- **Containerization**: Docker support for development environments
- **Testing**: Shell-based smoke tests using curl
- **Security**: Environment variable-based token management

## Key Files & Structure

```
├── docs/api/
│   ├── openapi.yaml          # OpenAPI 3.0 specification (contract)
│   ├── index.html           # Swagger UI static page
│   └── examples.http        # REST Client examples for VS Code/JetBrains
├── scripts/
│   └── smoke.sh            # Automated health check script
└── README.md               # Project documentation (Chinese)
```

## Development Workflow

### 1. Environment Setup

```bash
# Set required environment variables
export BASE_URL=http://localhost:8081/api/v1
export ACCESS_TOKEN={{YOUR_ACCESS_TOKEN}}
```

### 2. Running Health Checks

```bash
# Make script executable and run
chmod +x scripts/smoke.sh
./scripts/smoke.sh
```

### 3. API Documentation

- Open `docs/api/index.html` in browser for Swagger UI
- Use `docs/api/examples.http` for REST Client testing
- Reference `docs/api/openapi.yaml` for contract details

## Security Guidelines

⚠️ **CRITICAL SECURITY PRACTICES**:
- Never print tokens or sensitive information in command line/logs
- Always use environment variables for secret management
- PostgreSQL is mandatory for production and staging environments
- Use Docker for development database setup when possible

## Database Configuration

- **Production/Staging**: Must use PostgreSQL
- **Development**: Recommended to use Docker for PostgreSQL + Redis setup
- Follow project rules for database environment separation

## Testing Strategy

- **Smoke Tests**: Use `scripts/smoke.sh` for quick health validation
- **Contract Testing**: OpenAPI specification serves as contract
- **Integration**: Ready for CI/CD with Jenkins and Docker agents
- **SDK Generation**: Use openapi-generator with `docs/api/openapi.yaml`

## CI/CD Integration

The project is designed for pipeline integration:
- Environment variables for secret injection
- Contract validation using OpenAPI spec
- Automated smoke testing in CI environments
- Docker agent compatibility

## Code Generation Options

Generate additional tooling from the OpenAPI specification:
- **SDKs**: Client libraries for various languages
- **Mock Servers**: For development and testing
- **Test Stubs**: Automated test generation

Use openapi-generator with `docs/api/openapi.yaml` as source.

## Best Practices for Claude Development

1. **Contract-First**: Always reference `docs/api/openapi.yaml` for API contracts
2. **Security**: Follow environment variable patterns from README.md
3. **Testing**: Run smoke tests after any API changes
4. **Documentation**: Keep Swagger UI and examples in sync with implementation
5. **Database**: Respect PostgreSQL requirement for production environments

## Common Commands

```bash
# Environment setup
export BASE_URL=http://localhost:8081/api/v1
export ACCESS_TOKEN={{YOUR_ACCESS_TOKEN}}

# Run health checks
./scripts/smoke.sh

# View API documentation
open docs/api/index.html

# Generate SDK (example)
openapi-generator generate -i docs/api/openapi.yaml -g [language] -o ./generated-sdk/
```

## Development Notes

- Project documentation is primarily in Chinese
- Focus on production-ready, scalable solutions
- Emphasize security and compliance from the start
- Contract-first API development approach
- Docker-based development environment recommended

## When Working on This Project

1. Always check the OpenAPI specification first
2. Run smoke tests after changes
3. Maintain environment variable security practices
4. Keep documentation synchronized with implementation
5. Follow PostgreSQL requirements for production deployments

- 请记住本项目的重启方式是用docker compose
- 记住docker-compose的用法: docker compose -f docker-compose.dev.yml {down/restart/up -d)
- 开发登录端点路径：/api/v1/auth/dev/quick-login
- 项目总结文档不要用工作笔记,而是任务文档.
- 执行完任务，请用create-and-attach (MCP)将任务执行过程和总结创建为本任务的任务文档。注意保存文档标题。
- 本项目后端只能用8081端口