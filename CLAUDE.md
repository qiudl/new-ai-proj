# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI project management platform built with a microservices architecture using Docker containers. The project is in early development/planning phase (MVP) and follows cloud-native practices.

**Key Architecture Components:**
- **Backend**: Go (Golang) 1.22+ with PostgreSQL database
- **Frontend**: React with TypeScript and Node.js 22.15.0
- **Database**: PostgreSQL 16 with JSONB support for flexible data structures
- **Containerization**: Docker with multi-stage builds and Docker Compose orchestration
- **Reverse Proxy**: Nginx for routing between frontend and backend services
- **CI/CD**: Jenkins with SonarQube for code quality (planned)

## Development Setup

### Prerequisites
- Docker and Docker Compose
- Go 1.22+ (for local backend development)
- Node.js 22.15.0 (for local frontend development)

### Environment Setup
```bash
# Start the complete stack
docker-compose up -d

# Start just the database
docker-compose up -d db

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down
```

### Database Configuration
- **Connection**: PostgreSQL on port 5432
- **Database**: `main_db`
- **User**: `user` / Password: `password`
- **Initial Schema**: Located in `init.sql`
- **Connection String**: `postgresql://user:password@localhost:5432/main_db?sslmode=disable`

## Service Architecture

### Backend Service (Go)
- **Port**: 8080
- **Build**: Multi-stage Docker build with Alpine Linux
- **Database**: Uses PostgreSQL with advanced features (JSONB, GIN indexes)
- **Key Tables**: `users`, `projects`, `tasks` with flexible custom_fields support

### Frontend Service (React)
- **Port**: 3000 (development)
- **Framework**: React with TypeScript
- **UI Library**: Ant Design (planned)
- **Build**: Node.js 22.15.0 Alpine container

### Database Schema
Core entities with foreign key relationships:
- `users` table with role-based access (admin/user)
- `projects` table linked to user owners
- `tasks` table with JSONB custom_fields for flexibility
- Comprehensive indexing for performance optimization

## Development Commands

### Docker Operations
```bash
# Build and start all services
docker-compose up --build

# Rebuild specific service
docker-compose up --build [backend|frontend]

# Execute commands in containers
docker-compose exec backend [command]
docker-compose exec db psql -U user -d main_db
```

### Backend Development
```bash
# Local development (requires Go 1.22+)
cd backend
go mod download
go run main.go

# Run tests
go test ./...

# Build binary
CGO_ENABLED=0 GOOS=linux go build -o main .
```

### Frontend Development
```bash
# Local development (requires Node 22.15.0)
cd frontend
npm install
npm start

# Run tests
npm test

# Build for production
npm run build
```

## Testing Strategy

### Test Structure
- **Backend Tests**: `tests/backend/` directory
- **Frontend Tests**: `tests/frontend/` directory
- **E2E Testing**: Planned with Cypress
- **API Testing**: Comprehensive test coverage for authentication, projects, and tasks

### Key Test Scenarios
- User authentication and authorization
- Project CRUD operations
- Task management with bulk import functionality
- Custom fields validation (JSONB)
- Performance testing (API response < 500ms)

### Test Execution
```bash
# Unit tests
docker-compose exec backend go test ./...
docker-compose exec frontend npm test

# Integration tests
docker-compose exec backend go test -tags=integration ./...
```

## Key Features & Business Logic

### Authentication System
- JWT-based authentication
- Role-based access control (admin/user)
- User management with secure password hashing

### Project Management
- User-owned projects with descriptions
- Project-scoped task organization
- CRUD operations for project lifecycle

### Task Management
- Flexible task system with custom fields (JSONB)
- Status tracking (todo, in-progress, completed)
- Bulk import functionality from CSV files
- Advanced querying with GIN indexes on custom fields

## Infrastructure & Deployment

### Container Strategy
- Multi-stage Docker builds for optimized image sizes
- Development vs production configurations
- Container orchestration with Docker Compose

### Networking
- Nginx reverse proxy configuration
- Service discovery via Docker Compose networking
- Port mapping: Frontend (3000), Backend (8080), Database (5432)

### Planned Infrastructure
- Kubernetes deployment (`infrastructure/k8s/`)
- Terraform for infrastructure as code (`infrastructure/terraform/`)
- Jenkins CI/CD pipeline with automated testing

## Development Workflow

### Git Strategy
- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/**: Feature development branches
- **bugfix/**: Bug fix branches

### Code Quality
- SonarQube integration (planned)
- 80%+ test coverage requirement
- API response time < 500ms
- Conventional commit messages

## Security Considerations

- Environment variables for sensitive configuration
- Secure password hashing (bcrypt planned)
- Database connection security
- Container security best practices

## Performance Requirements

- API response times under 500ms
- Bulk import processing within 5 seconds for 20+ tasks
- Database optimization with proper indexing
- Efficient JSONB querying for custom fields

## Documentation References

- MVP Development Plan: `docs/MVP_DEVELOPMENT_PLAN.md`
- Testing Guidelines: `docs/TESTING_AND_ACCEPTANCE.md`
- Risk Management: `RISK_MANAGEMENT.md`