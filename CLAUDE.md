# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI project management platform built with a microservices architecture using Docker containers. The project is in early development/planning phase (MVP) and follows cloud-native practices.

**Key Architecture Components:**
- **Backend**: Go 1.24 (Gin framework) with clean architecture pattern
- **Frontend**: React 18.2 with TypeScript and Ant Design UI library  
- **Database**: PostgreSQL 16 with JSONB, views, and stored functions
- **Containerization**: Docker with multi-stage builds and health checks
- **Reverse Proxy**: Nginx for API and static file routing
- **Development Tools**: Comprehensive shell scripts for automation

## Development Setup

### Quick Start
```bash
# One-command environment setup
./scripts/dev-setup.sh

# Test environment comprehensively
./scripts/test-environment.sh

# Database management
./scripts/db-manager.sh [init|reset|backup|connect]
```

### Manual Setup
```bash
# Start all services
docker-compose up -d

# View service status
docker-compose ps

# View logs
docker-compose logs -f [backend|frontend|db|nginx]

# Stop services
docker-compose down
```

## Architecture Details

### Backend Structure (Go)
- **Framework**: Gin with custom Application struct
- **Pattern**: Clean architecture with repository pattern
- **Key Files**:
  - `main.go`: Application setup and route configuration
  - `config/`: Configuration management with YAML support
  - `database/`: PostgreSQL interfaces and implementations
  - `models/`: Domain models with JSON tags and validation
  - `handlers/`: HTTP handlers (placeholder implementations)
  - `middleware/`: CORS and auth middleware
  - `utils/`: JWT, password hashing, validation utilities

### Frontend Structure (React)
- **Framework**: React 18.2 with TypeScript
- **UI Library**: Ant Design with Chinese locale
- **Routing**: React Router v6 with private route protection
- **Pages**: Login, Dashboard, Projects, Tasks, BulkImport
- **Architecture**: Component-based with layout wrapper

### Database Schema
- **Users**: Role-based (admin/user) with bcrypt password hashing
- **Projects**: Owner-linked with cascade delete
- **Tasks**: JSONB custom fields with GIN indexes for performance
- **Views**: `project_task_stats`, `user_task_assignments`, `overdue_tasks`
- **Functions**: Progress calculation and task summary functions

## Essential Commands

### Development Scripts
```bash
# Environment setup and validation
./scripts/dev-setup.sh                    # Complete environment setup
./scripts/test-environment.sh --cleanup   # Test all services
./scripts/check-compose.sh               # Validate docker-compose

# Database operations
./scripts/db-manager.sh init             # Initialize with sample data
./scripts/db-manager.sh reset            # Reset database (with confirmation)
./scripts/db-manager.sh stats            # Show table statistics
./scripts/db-manager.sh connect          # Open psql session
./scripts/db-manager.sh backup           # Create timestamped backup

# Backend building
./backend/scripts/build.sh dev           # Development Docker image
./backend/scripts/build.sh prod          # Production Docker image
./backend/scripts/build.sh local         # Local binary
./backend/scripts/build.sh test          # Run tests with coverage
```

### Backend Development
```bash
# Local development
cd backend && go run main.go

# Testing
go test ./...                            # Unit tests
go test -tags=integration ./...          # Integration tests
go test -coverprofile=coverage.out ./... # With coverage

# Code quality
go fmt ./...                             # Format code
go vet ./...                             # Static analysis
go mod tidy                              # Clean dependencies
```

### Frontend Development
```bash
# Development server
cd frontend && npm start

# Testing and quality
npm test                                 # Jest tests
npm run lint                             # ESLint
npm run lint:fix                         # Fix linting issues
npm run format                           # Prettier formatting
npm run type-check                       # TypeScript checking

# Building
npm run build                            # Production build
```

### Database Operations
```bash
# Quick database access
docker-compose exec db psql -U user -d main_db

# Run SQL scripts
docker-compose exec db psql -U user -d main_db -f /path/to/script.sql

# Database inspection
docker-compose exec db psql -U user -d main_db -c "SELECT * FROM project_task_stats;"
```

## Service Architecture

### Backend API Structure
- **Health/Version**: `/health`, `/version` with build info
- **Authentication**: `/api/v1/auth/login`, `/api/v1/auth/logout`
- **Projects**: Full CRUD at `/api/v1/projects`
- **Tasks**: CRUD and bulk import at `/api/v1/projects/:id/tasks`
- **Middleware**: CORS enabled, auth middleware ready
- **Models**: Request/response models with validation tags

### Database Features
- **Sample Data**: 3 users, 3 projects, 15 tasks with realistic content
- **JSONB Fields**: Tasks have flexible custom_fields with priority, tags, etc.
- **Performance**: GIN indexes on JSONB, partial indexes for active data
- **Business Logic**: Stored functions for progress calculation
- **Constraints**: Check constraints for data validation
- **Triggers**: Automatic updated_at timestamp management

### Service Ports and Access
- **Frontend**: http://localhost:3000 (React dev server)
- **Backend**: http://localhost:8080 (Go API via nginx proxy)
- **Nginx**: http://localhost:80 (reverse proxy)
- **Database**: localhost:5432 (PostgreSQL direct access)

## Default Credentials
- **Username**: `admin` / **Password**: `password123`
- **Alt Users**: `dev_user_1`, `dev_user_2` (same password)

## Key Features & Implementation Status

### Authentication System
- **Framework**: JWT with bcrypt password hashing  
- **Implementation**: Placeholder handlers in `main.go:184-198`
- **Models**: `LoginRequest`, `LoginResponse` in `models/user.go`
- **Utils**: JWT and password utilities in `utils/` directory

### Project Management
- **API Routes**: Full CRUD at `/api/v1/projects/:id`
- **Implementation**: Placeholder handlers ready for implementation
- **Database**: Foreign key relationships with cascade delete
- **Models**: Project model with owner relationship

### Task Management
- **Custom Fields**: JSONB with realistic sample data (priority, tags, hours)
- **API Routes**: CRUD + bulk import at `/api/v1/projects/:id/tasks`
- **Database**: GIN indexes for efficient JSONB querying
- **Status**: todo, in_progress, completed, cancelled

## Testing & Validation

### Environment Testing
```bash
# Comprehensive environment validation
./scripts/test-environment.sh           # Full system test
./scripts/test-environment.sh --cleanup # Test and cleanup

# Test components include:
# - Docker environment validation
# - Service health checks  
# - Database connectivity and content
# - API endpoint availability
# - Performance benchmarking
```

### Application Testing
```bash
# Backend testing
cd backend && go test ./...                    # Unit tests
cd backend && go test -tags=integration ./... # Integration tests

# Frontend testing  
cd frontend && npm test                       # Jest/React Testing Library
cd frontend && npm run type-check            # TypeScript validation
```

### Database Validation
```bash
# Database integrity check
./scripts/db-manager.sh validate

# Sample data verification (15 tasks across 3 projects)
./scripts/db-manager.sh stats
```

## Development Workflow

### Code Quality Tools
- **Go**: `go fmt`, `go vet`, `go mod tidy`
- **React**: ESLint, Prettier, TypeScript checking
- **Scripts**: Built-in formatting and linting in package.json

### Build Process
```bash
# Backend builds with version info
VERSION=v1.0.0 ./backend/scripts/build.sh prod

# Frontend optimized builds
cd frontend && npm run build
```

### Performance Monitoring
- **Health Checks**: Built into Docker services
- **Database Views**: Performance monitoring via `project_task_stats`
- **API Metrics**: Response time logging enabled

## Deployment Configuration

### Environment Files
- `.env.development`: Development defaults
- `.env.production`: Production configuration template
- `docker-compose.prod.yml`: Production Docker composition

### Infrastructure Ready
- **Kubernetes**: Configuration directory at `infrastructure/k8s/`
- **Terraform**: Infrastructure as code at `infrastructure/terraform/`
- **CI/CD**: Jenkins configuration at `docker/jenkins/`

### SSL/HTTPS Support
- **SSL Scripts**: `deploy/ssl-setup.sh`, `deploy/ssl-manage.sh`  
- **Nginx Config**: SSL-ready configuration templates
- **Deployment**: Automated deployment scripts in `deploy/` directory