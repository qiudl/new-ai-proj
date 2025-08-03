# Timer Architecture Documentation

## Overview

This document describes the unified timer architecture implemented in the AI Project Management Platform. The timer system has been refactored from multiple overlapping handlers to a single, unified architecture for better maintainability and consistency.

## Architecture Evolution

### Before (Legacy Architecture)
```
TimerHandler          → /api/v1/timer/*           (Legacy project timers)
PersonalTimerHandler  → /api/v1/user/timer/*      (Personal timer operations) 
UserTimerHandler      → /api/v1/user/timer/*      (Task management & stats)
ConcurrentSafeHandler → (Experimental, unused)
```

### After (Unified Architecture)
```
UnifiedTimerHandler   → /api/v1/user/timer/*      (All timer operations)
UserTimerHandler      → /api/v1/user/timer/*      (Task management & stats)
TimerService          → Backend core logic        (Centralized service layer)
```

## Core Components

### 1. TimerService (`services/timer_service.go`)
**Central business logic layer for all timer operations**

#### Key Features:
- **Concurrent Safety**: All operations use SQL transactions with serializable isolation
- **Smart Time Tracking**: Handles pause/resume with accumulated time preservation
- **Task Type Support**: Both personal and project tasks
- **Auto-stop Logic**: Configurable behavior when starting new timers

#### Methods:
```go
StartTimer(ctx context.Context, userID int, req StartTimerRequest) (*TimerResponse, error)
StopTimer(ctx context.Context, userID int) (*TimerResponse, error)
PauseTimer(ctx context.Context, userID int) (*TimerResponse, error)
ResumeTimer(ctx context.Context, userID int) (*TimerResponse, error)
GetCurrentTimer(ctx context.Context, userID int) (*CurrentTimerResponse, error)
```

#### Time Calculation Logic:
```go
// Running Timer: accumulated_seconds + current_session_seconds
if user.TimingStatus == "running" {
    currentSessionSeconds := int(time.Since(*user.TimingStartTime).Seconds())
    totalElapsed = user.TimingAccumulatedSeconds + currentSessionSeconds
}

// Paused Timer: accumulated_seconds only
if user.TimingStatus == "paused" {
    totalElapsed = user.TimingAccumulatedSeconds
}
```

### 2. UnifiedTimerHandler (`handlers/unified_timer_handler.go`)
**HTTP handler providing unified timer API endpoints**

#### Endpoints:
- `POST /api/v1/user/timer/start` - Start timer (unified)
- `POST /api/v1/user/timer/stop` - Stop timer
- `POST /api/v1/user/timer/pause` - Pause timer
- `POST /api/v1/user/timer/resume` - Resume timer
- `GET /api/v1/user/timer/current` - Get current timer status
- `GET /api/v1/user/timer/health` - Health check

#### Legacy Compatibility:
- `POST /api/v1/user/timer/start-personal` - Redirects to unified start
- `POST /api/v1/user/timer/start-project` - Redirects to unified start

### 3. Database Schema

#### New Fields in `users` table:
```sql
timing_paused_time         TIMESTAMP NULL DEFAULT NULL
timing_accumulated_seconds INTEGER NOT NULL DEFAULT 0
```

#### Enhanced `timing_status` enum:
```sql
CREATE TYPE timing_status_type AS ENUM ('stopped', 'running', 'paused');
```

## API Reference

### Start Timer (Unified)
```http
POST /api/v1/user/timer/start
Content-Type: application/json
Authorization: Bearer <token>

{
  "task_type": "personal|project",
  "task_id": 123,
  "auto_stop_others": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Timer started for personal task",
  "task_id": 123,
  "task_title": "Learn React",
  "task_type": "personal",
  "status": "running",
  "start_time": "2025-08-02T02:00:00Z"
}
```

### Pause Timer
```http
POST /api/v1/user/timer/pause
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Timer paused successfully",
  "task_id": 123,
  "task_title": "Learn React",
  "task_type": "personal",
  "status": "paused",
  "duration_seconds": 1800
}
```

### Resume Timer
```http
POST /api/v1/user/timer/resume
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Timer resumed successfully",
  "task_id": 123,
  "task_title": "Learn React",
  "task_type": "personal",
  "status": "running",
  "start_time": "2025-08-02T02:30:00Z",
  "duration_seconds": 1800
}
```

### Get Current Timer
```http
GET /api/v1/user/timer/current
Authorization: Bearer <token>
```

**Response:**
```json
{
  "is_running": true,
  "is_paused": false,
  "task_id": 123,
  "task_title": "Learn React",
  "task_type": "personal",
  "start_time": "2025-08-02T02:30:00Z",
  "elapsed_seconds": 3600
}
```

## Frontend Integration

### Services Updated:
1. **personalTimerService.ts** - Now uses unified API endpoints
2. **timerService.ts** - Updated to use `/user/timer/*` endpoints
3. **TimerContext.tsx** - Handles pause/resume state management

### Key Frontend Changes:
```typescript
// Before
await api.post('/user/timer/stop') // Mock pause

// After  
await api.post('/user/timer/pause') // Real pause functionality
await api.post('/user/timer/resume') // Real resume functionality
```

## Migration Benefits

### ✅ Achieved Benefits:
1. **Single Source of Truth**: All timer operations through `TimerService`
2. **Real Pause/Resume**: No more mock implementations
3. **Concurrent Safety**: Transaction-based operations prevent race conditions
4. **Simplified Maintenance**: One codebase instead of multiple overlapping handlers
5. **Better Error Handling**: Centralized validation and state management
6. **Backward Compatibility**: Legacy APIs continue to work

### 🔧 Technical Improvements:
- **Database Consistency**: All timer state changes are atomic
- **Smart Time Tracking**: Accurate time calculation across pause/resume cycles
- **Type Safety**: Unified request/response models
- **Comprehensive Testing**: API compatibility test suite

## Testing

### Compatibility Test Suite:
```bash
./scripts/test-timer-api-compatibility.sh
```

**Test Coverage:**
- ✅ Authentication and token validation
- ✅ Unified timer health check
- ✅ Current timer status (legacy & unified)
- ✅ Pause/resume functionality
- ✅ Legacy compatibility endpoints
- ✅ Timer start/stop operations

## Deployment Notes

### Database Migration Required:
```bash
# Run migration to add pause fields
docker-compose exec db psql -U user -d main_db -f /tmp/004_add_timer_pause_fields.sql
```

### Environment Variables:
No new environment variables required.

### Service Dependencies:
- PostgreSQL 16+ (for JSONB and enum support)
- No additional services required

## Legacy Support

### Deprecated but Supported:
- `POST /api/v1/timer/*` endpoints (old TimerHandler)
- Will be removed in future version after transition period

### Removed:
- ❌ `PersonalTimerHandler` (replaced by `UnifiedTimerHandler`)
- ❌ `ConcurrentSafeTimerHandler` (experimental, unused)

### Still Active:
- ✅ `TimerHandler` (legacy project timers)
- ✅ `UserTimerHandler` (task management and statistics)
- ✅ `UnifiedTimerHandler` (new unified operations)

## Performance Considerations

### Database:
- New indexes on `timing_paused_time` and `timing_accumulated_seconds`
- Optimized queries with proper `FOR UPDATE` locking
- Serializable transaction isolation for consistency

### API:
- Health check endpoint for monitoring
- Efficient state calculations
- Minimal database round trips

## Future Enhancements

### Planned for Next Phase:
1. Remove legacy `TimerHandler` after transition period
2. Add timer analytics and reporting
3. Implement timer templates and presets
4. Add team timer coordination features

---

*This documentation was generated during the timer architecture refactoring project (Phases 1-5).*