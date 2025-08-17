# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI-powered project management system with task management, timer functionality, document management, and company management features. The system consists of a Go backend API, React frontend, PostgreSQL database, and various supporting tools including an MCP (Model Context Protocol) server for Claude Code integration.

## Architecture

### Backend (Go)
- **Framework**: Gin (HTTP web framework)
- **Database**: PostgreSQL with GORM/SQL
- **Authentication**: JWT-based auth system
- **Architecture**: Clean architecture with handlers, services, repositories
- **Key modules**: Tasks, Projects, Timers, Documents, Companies, Users, AI Integration

### Frontend (React)
- **Framework**: React 18 with TypeScript
- **UI Library**: Ant Design
- **State Management**: React Query (@tanstack/react-query)
- **Routing**: React Router v6
- **Styling**: CSS modules + Ant Design theming
- **Key features**: Task management, timer widgets, document editing, dashboard

### Infrastructure
- **Database**: PostgreSQL 16
- **Deployment**: Docker Compose
- **Reverse Proxy**: Nginx
- **MCP Server**: Custom task bridge for Claude Code integration

## Development Commands

### Backend
```bash
cd backend
go run main.go                    # Start development server
go build -o main .               # Build binary
go test ./...                    # Run tests
```

### Frontend  
```bash
cd frontend
npm start                        # Start development server (port 3000)
npm run build                    # Build for production
npm test                         # Run tests
npm run lint                     # Run ESLint
npm run type-check              # TypeScript type checking
```

### Docker Development
```bash
docker-compose up               # Start all services
docker-compose up db           # Start only database
docker-compose down            # Stop all services
```

### MCP Server
```bash
cd ai-proj-mcp
npm start                      # Start MCP server
npm run dev                    # Start with tsx watch
```

## Key File Locations

### Backend Structure
- `main.go` - Application entry point and dependency injection
- `handlers/` - HTTP request handlers organized by module
- `models/` - Data models and domain entities
- `database/` - Repository implementations and DB interfaces
- `services/` - Business logic and validation services
- `middleware/` - Authentication, audit, and other middleware
- `routes/` - Route definitions and setup
- `config/` - Configuration management
- `migrations/` - Database migration files

### Frontend Structure
- `src/App.tsx` - Main application component with routing
- `src/pages/` - Page components organized by feature
- `src/components/` - Reusable UI components
- `src/services/` - API service layers
- `src/hooks/` - Custom React hooks
- `src/contexts/` - React context providers
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions and helpers

## Database Schema

Key tables include:
- `users` - User accounts and authentication
- `projects` - Project management
- `tasks` - Task management with hierarchical support
- `companies` - Enterprise customer management
- `timers` - Time tracking functionality
- `documents` - Document management system
- `audit_logs` - System audit trail

## API Architecture

The backend follows RESTful API conventions:
- `/api/v1/auth/*` - Authentication endpoints
- `/api/v1/projects/*` - Project management
- `/api/v1/projects/{id}/tasks/*` - Task management (project-scoped)
- `/api/v1/timers/*` - Timer functionality
- `/api/v1/companies/*` - Company management
- `/api/v1/documents/*` - Document management
- `/api/v1/system/*` - System administration

## Authentication

The system uses JWT tokens for authentication:
- Login endpoint: `POST /api/v1/auth/login`
- Token validation through middleware
- Role-based access control
- Development quick login for `admin` and `qiudl` users

## Environment Setup

### Required Environment Variables (Backend)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database configuration
- `JWT_SECRET` - JWT signing secret
- `PORT` - Server port (default: 8080)

### Required Environment Variables (Frontend)
- `REACT_APP_API_URL` - Backend API URL (default: /api/v1)
- `REACT_APP_ENV` - Environment identifier

## Testing

### Backend Testing
- Unit tests for services and utilities
- Integration tests for database operations
- Handler tests for API endpoints

### Frontend Testing
- Jest + React Testing Library
- Component unit tests
- Integration tests for key user flows
- E2E tests for critical paths

## Development Guidelines

### Code Organization
- Follow existing directory structure and naming conventions
- Keep components focused and reusable
- Use TypeScript for type safety
- Implement proper error handling and validation

### Database Migrations
- New migrations go in `backend/migrations/`
- Use sequential numbering for migration files
- Always provide both up and down migrations

### API Development
- Follow RESTful conventions
- Use appropriate HTTP status codes
- Implement consistent error response format
- Add proper request validation

### Frontend Development
- Use Ant Design components consistently
- Implement responsive design patterns
- Follow React best practices (hooks, context)
- Use React Query for server state management

## Common Development Tasks

### Adding New API Endpoints
1. Create handler in `backend/handlers/`
2. Add route in `backend/routes/`
3. Update service layer if needed
4. Add database methods if required
5. Update frontend service files

### Adding New Frontend Pages
1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`
3. Create corresponding service functions
4. Add to navigation if needed

### Database Changes
1. Create migration file in `backend/migrations/`
2. Update model structs in `backend/models/`
3. Update repository interfaces and implementations
4. Update frontend types if needed

## Deployment

The system is containerized with Docker:
- `docker-compose.yml` for development/staging
- Nginx reverse proxy configuration
- PostgreSQL data persistence
- Environment-specific configurations

## MCP Integration

The `ai-proj-mcp` directory contains an MCP server that enables Claude Code to interact with the task management system. This provides enhanced productivity features when using Claude Code for development.