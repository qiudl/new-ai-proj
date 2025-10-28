# RBAC v2 Integration Tests

## Overview

This directory contains integration tests for the RBAC v2 (Role-Based Access Control Version 2) system.

## Test Coverage

### System Domain Routes (`system_routes_v2.go`)
- Enterprise Management (`/api/v1/system/enterprises`)
- System User Management (`/api/v1/system/users`)
- System Role & Permission Management (`/api/v1/system/roles`, `/api/v1/system/permissions`)

### Enterprise Domain Routes (`enterprise_routes_v2.go`)
- Enterprise User Management (`/api/v1/enterprises/:enterprise_id/users`)
- Enterprise Role & Permission Management (`/api/v1/enterprises/:enterprise_id/roles`, `/api/v1/enterprises/:enterprise_id/permissions`)
- Business Routes (`/api/v1/enterprises/:enterprise_id/projects`, `/api/v1/enterprises/:enterprise_id/tasks`, `/api/v1/enterprises/:enterprise_id/documents`)

### Enterprise Isolation
- Cross-enterprise access prevention
- Enterprise data filtering
- Permission boundary enforcement

### Permission Enforcement
- System permission checks
- Enterprise permission checks
- Unauthenticated access prevention

### Route Adapters
- Enterprise context injection (`adaptEnterpriseContext`)
- Parameter validation (`enterprise_id`, `user_id`, etc.)
- Error handling

## Running Tests

### Prerequisites

1. **Test Database**: Ensure PostgreSQL is running with a test database
2. **Environment**: Set `APP_ENV=test` or use a `.env.test` file
3. **Dependencies**: Run `go mod download`

### Run All Tests

```bash
go test ./tests -v
```

### Run Specific Test Suite

```bash
go test ./tests -v -run TestRBACv2IntegrationSuite
```

### Run Specific Test

```bash
go test ./tests -v -run TestRBACv2IntegrationSuite/TestSystemRoutes_EnterpriseManagement
```

### With Coverage

```bash
go test ./tests -v -cover -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## Test Structure

```
tests/
├── README.md                      # This file
├── test_helpers.go                # Test utilities and helper functions
├── rbac_v2_integration_test.go    # Main integration test suite
└── fixtures/                      # Test data fixtures (future)
```

## Test Data

The test suite creates the following test data:

- **System Users**: `test_system_admin`
- **Enterprises**: `Test Enterprise 1`, `Test Enterprise 2`
- **Enterprise Users**: `test_ent_user1` (Enterprise 1), `test_ent_user2` (Enterprise 2)

All test data is cleaned up after the test suite completes.

## Environment Variables

```bash
# Test Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=test_user
DB_PASSWORD=test_password
DB_NAME=ai_project_test_db

# Application Environment
APP_ENV=test
LOG_LEVEL=debug

# JWT Configuration
JWT_SECRET=test_jwt_secret
JWT_EXPIRATION=24h
```

## Known Issues / Limitations

1. **Full Application Setup**: Current tests require full application initialization. Consider using test doubles for faster execution.
2. **Database State**: Tests assume a clean database state. Add database migrations/seeding if needed.
3. **Parallel Execution**: Tests are not currently safe for parallel execution due to shared database state.

## Future Improvements

- [ ] Add test data fixtures
- [ ] Implement database transactions for test isolation
- [ ] Add benchmark tests
- [ ] Add contract tests for API schemas
- [ ] Enable parallel test execution
- [ ] Add Docker Compose for test database

## References

- [RBAC v2 Design Document](../docs/RBAC_PROTOTYPE_DESIGN.md)
- [Enterprise Routes](../routes/enterprise_routes_v2.go)
- [System Routes](../routes/system_routes_v2.go)
- [Permission Middleware](../middleware/permission_middleware_v2.go)
