# 🛠️ 系统持续优化开发Prompts - 任务#205

> **任务ID**: 205  
> **项目**: 31周-06：系统持续优化  
> **创建时间**: 2025-08-03  
> **预估工时**: 72小时 (9天)

---

## 📋 项目概览Prompt

```
作为AI项目管理平台的技术负责人，我需要系统性地清理和优化整个代码库，解决积累的技术债务和代码质量问题。

当前状况分析：
- 前端：ESLint错误累积，TypeScript类型问题，未优化的组件性能
- 后端：gofmt格式不规范，go vet警告，日志记录混乱
- 系统：依赖版本过时，测试覆盖率不足，文档滞后

技术栈：React 18 + TypeScript + Go 1.24 + PostgreSQL + Docker
目标：建立高质量代码标准，提升系统稳定性和可维护性

请提供系统性的代码优化方案和最佳实践。
```

---

## 🎯 Phase 1: 前端代码规范化

### Prompt 1.1: ESLint错误修复

```
请系统性地修复React项目中的ESLint错误和警告：

优先修复的问题类型：
1. 类型安全问题：
   - any类型使用
   - 缺失的类型注解
   - 不安全的类型断言
   - 未处理的Promise

2. 代码质量问题：
   - 未使用的变量和导入
   - 未定义的变量引用
   - 缺失的依赖数组
   - 不必要的useEffect

3. 性能问题：
   - 缺失的useCallback/useMemo
   - 内联对象和函数定义
   - 不必要的重渲染
   - 内存泄漏风险

修复策略：
```typescript
// 示例修复：类型安全
interface TaskProps {
  task: Task;
  onUpdate: (task: Task) => Promise<void>;
}

// 示例修复：性能优化
const TaskItem: React.FC<TaskProps> = memo(({ task, onUpdate }) => {
  const handleUpdate = useCallback((updates: Partial<Task>) => {
    return onUpdate({ ...task, ...updates });
  }, [task, onUpdate]);

  return <div>{/* 组件内容 */}</div>;
});
```

修复优先级：
1. 高：类型错误、安全问题、内存泄漏
2. 中：性能问题、代码风格
3. 低：警告信息、注释问题

请提供具体的修复方案和脚本。
```

### Prompt 1.2: TypeScript类型优化

```
强化React项目的TypeScript类型系统：

类型优化重点：
1. 严格类型配置：
   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "noImplicitReturns": true,
       "noFallthroughCasesInSwitch": true,
       "noUncheckedIndexedAccess": true
     }
   }
   ```

2. 组件类型规范：
   ```typescript
   // 完整的组件Props类型
   interface ComponentProps {
     required: string;
     optional?: number;
     children?: React.ReactNode;
     className?: string;
     style?: React.CSSProperties;
   }

   // 泛型组件类型
   interface GenericProps<T> {
     data: T[];
     onSelect: (item: T) => void;
     renderItem: (item: T) => React.ReactNode;
   }
   ```

3. API类型安全：
   ```typescript
   // API响应类型
   interface ApiResponse<T> {
     success: boolean;
     data: T;
     error?: string;
     pagination?: PaginationInfo;
   }

   // 类型守卫
   function isTaskResponse(response: unknown): response is ApiResponse<Task> {
     return typeof response === 'object' && 
            response !== null && 
            'success' in response;
   }
   ```

4. 状态管理类型：
   ```typescript
   // Redux状态类型
   interface RootState {
     tasks: TaskState;
     projects: ProjectState;
     auth: AuthState;
   }

   // Context类型
   interface TaskContextValue {
     tasks: Task[];
     loading: boolean;
     error: string | null;
     actions: TaskActions;
   }
   ```

请提供完整的类型系统优化方案。
```

---

## 🎯 Phase 2: 后端代码规范化

### Prompt 2.1: Go代码格式化和规范

```
系统性地优化Go后端代码质量：

代码格式化：
```bash
# 格式化所有Go文件
find . -name "*.go" -not -path "./vendor/*" | xargs gofmt -w -s

# 整理imports
find . -name "*.go" -not -path "./vendor/*" | xargs goimports -w

# 清理模块依赖
go mod tidy
go mod verify
```

代码质量检查：
```bash
# 基础检查
go vet ./...
go test -race ./...

# 高级检查
golangci-lint run --enable-all --disable=wsl,lll,gochecknoglobals

# 安全检查
gosec ./...
```

常见问题修复：
1. 错误处理规范化：
   ```go
   // 优化前
   result, err := someFunction()
   if err != nil {
       log.Println(err)
       return nil, err
   }

   // 优化后
   result, err := someFunction()
   if err != nil {
       return nil, fmt.Errorf("failed to execute function: %w", err)
   }
   ```

2. 日志记录标准化：
   ```go
   // 使用结构化日志
   logger.Info("user login", 
       "user_id", userID,
       "ip_address", clientIP,
       "timestamp", time.Now())
   ```

3. 并发安全：
   ```go
   // 使用sync.RWMutex保护共享资源
   type SafeCounter struct {
       mu    sync.RWMutex
       value int
   }
   ```

请提供完整的Go代码优化方案。
```

### Prompt 2.2: API性能优化

```
优化Go后端API的性能和响应时间：

数据库优化：
1. 查询优化：
   ```go
   // 批量查询替代N+1问题
   func (r *TaskRepository) GetTasksWithProjects(projectIDs []int) ([]TaskWithProject, error) {
       query := `
           SELECT t.*, p.name as project_name 
           FROM tasks t 
           JOIN projects p ON t.project_id = p.id 
           WHERE t.project_id = ANY($1)
       `
       // 实现批量查询逻辑
   }

   // 使用索引优化
   CREATE INDEX CONCURRENTLY idx_tasks_status_created_at 
   ON tasks(status, created_at) WHERE deleted_at IS NULL;
   ```

2. 连接池优化：
   ```go
   db.SetMaxOpenConns(25)
   db.SetMaxIdleConns(5)
   db.SetConnMaxLifetime(5 * time.Minute)
   ```

缓存策略：
1. Redis缓存：
   ```go
   // 缓存热点数据
   func (s *ProjectService) GetProject(id int) (*Project, error) {
       cacheKey := fmt.Sprintf("project:%d", id)
       
       // 尝试从缓存获取
       if cached, err := s.cache.Get(cacheKey); err == nil {
           return cached.(*Project), nil
       }
       
       // 从数据库获取并缓存
       project, err := s.repo.GetProject(id)
       if err != nil {
           return nil, err
       }
       
       s.cache.Set(cacheKey, project, 10*time.Minute)
       return project, nil
   }
   ```

2. 内存缓存：
   ```go
   // 使用sync.Map实现并发安全的内存缓存
   type MemoryCache struct {
       data sync.Map
       ttl  time.Duration
   }
   ```

请提供完整的API性能优化方案。
```

---

## 🎯 Phase 3: 系统性能监控

### Prompt 3.1: 前端性能监控

```
建立React应用的性能监控体系：

Bundle分析和优化：
```bash
# 分析bundle大小
npm run build:analyze

# 代码分割优化
npm install --save-dev webpack-bundle-analyzer
```

组件性能监控：
```typescript
// React DevTools Profiler集成
import { Profiler } from 'react';

function onRenderCallback(id: string, phase: string, actualDuration: number) {
  console.log('Component render:', {
    id,
    phase,
    actualDuration,
    timestamp: Date.now()
  });
}

const App = () => (
  <Profiler id="App" onRender={onRenderCallback}>
    <Router>
      {/* 应用内容 */}
    </Router>
  </Profiler>
);
```

性能指标监控：
```typescript
// Web Vitals监控
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // 发送到分析服务
  analytics.track('web-vital', {
    name: metric.name,
    value: metric.value,
    id: metric.id,
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

内存泄漏检测：
```typescript
// 组件卸载清理
useEffect(() => {
  const timer = setInterval(() => {
    // 定时器逻辑
  }, 1000);

  const eventListener = (event: Event) => {
    // 事件处理
  };

  document.addEventListener('click', eventListener);

  return () => {
    clearInterval(timer);
    document.removeEventListener('click', eventListener);
  };
}, []);
```

请提供完整的前端性能监控方案。
```

### Prompt 3.2: 后端性能监控

```
建立Go后端应用的性能监控体系：

应用性能监控(APM)：
```go
// Prometheus指标收集
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    httpRequestsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "The total number of processed HTTP requests",
        },
        []string{"method", "endpoint", "status_code"},
    )

    httpRequestDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "http_request_duration_seconds",
            Help: "Duration of HTTP requests in seconds",
        },
        []string{"method", "endpoint"},
    )
)

// 中间件监控HTTP请求
func metricsMiddleware() gin.HandlerFunc {
    return gin.HandlerFunc(func(c *gin.Context) {
        start := time.Now()
        
        c.Next()
        
        duration := time.Since(start).Seconds()
        status := strconv.Itoa(c.Writer.Status())
        
        httpRequestsTotal.WithLabelValues(c.Request.Method, c.FullPath(), status).Inc()
        httpRequestDuration.WithLabelValues(c.Request.Method, c.FullPath()).Observe(duration)
    })
}
```

数据库性能监控：
```go
// 数据库查询性能追踪
func (r *Repository) GetTasks(ctx context.Context, projectID int) ([]Task, error) {
    start := time.Now()
    defer func() {
        duration := time.Since(start)
        logger.Info("database query completed",
            "operation", "GetTasks",
            "project_id", projectID,
            "duration", duration,
        )
    }()

    // 查询逻辑
    return tasks, nil
}
```

内存和CPU监控：
```go
// pprof性能分析
import _ "net/http/pprof"

func main() {
    go func() {
        log.Println(http.ListenAndServe("localhost:6060", nil))
    }()
    
    // 应用主逻辑
}

// 内存使用监控
func monitorMemory() {
    var m runtime.MemStats
    runtime.ReadMemStats(&m)
    
    logger.Info("memory stats",
        "alloc", bToMb(m.Alloc),
        "total_alloc", bToMb(m.TotalAlloc),
        "sys", bToMb(m.Sys),
        "gc_cycles", m.NumGC,
    )
}
```

请提供完整的后端性能监控方案。
```

---

## 🎯 Phase 4: 测试体系完善

### Prompt 4.1: 前端测试策略

```
建立完整的React应用测试体系：

单元测试（Jest + React Testing Library）：
```typescript
// 组件测试示例
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskEditPage } from '../TaskEditPage';

describe('TaskEditPage', () => {
  const mockTask = {
    id: 1,
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo' as const,
    project_id: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders task edit form', () => {
    render(<TaskEditPage task={mockTask} />);
    
    expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
  });

  test('saves task on form submission', async () => {
    const mockOnSave = jest.fn();
    const user = userEvent.setup();
    
    render(<TaskEditPage task={mockTask} onSave={mockOnSave} />);
    
    await user.clear(screen.getByLabelText('任务标题'));
    await user.type(screen.getByLabelText('任务标题'), 'Updated Task');
    await user.click(screen.getByRole('button', { name: '保存' }));
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        ...mockTask,
        title: 'Updated Task',
      });
    });
  });
});
```

集成测试：
```typescript
// API集成测试
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/v1/projects/1/tasks', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: { data: [mockTask] }
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

E2E测试（Cypress）：
```typescript
// Cypress测试示例
describe('Task Management', () => {
  beforeEach(() => {
    cy.login('admin', 'password123');
    cy.visit('/projects/1');
  });

  it('should create and edit task', () => {
    // 创建任务
    cy.get('[data-testid="create-task-button"]').click();
    cy.get('[data-testid="task-title-input"]').type('New Task');
    cy.get('[data-testid="save-button"]').click();
    
    // 验证任务创建
    cy.contains('New Task').should('be.visible');
    
    // 编辑任务
    cy.contains('New Task').click();
    cy.get('[data-testid="edit-button"]').click();
    cy.get('[data-testid="task-title-input"]').clear().type('Updated Task');
    cy.get('[data-testid="save-button"]').click();
    
    // 验证任务更新
    cy.contains('Updated Task').should('be.visible');
  });
});
```

测试覆盖率配置：
```json
{
  "jest": {
    "collectCoverageFrom": [
      "src/**/*.{ts,tsx}",
      "!src/**/*.d.ts",
      "!src/index.tsx",
      "!src/serviceWorker.ts"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

请提供完整的前端测试实施方案。
```

### Prompt 4.2: 后端测试策略

```
建立完整的Go后端测试体系：

单元测试（testify）：
```go
// 服务层测试
func TestTaskService_CreateTask(t *testing.T) {
    tests := []struct {
        name    string
        task    *Task
        wantErr bool
    }{
        {
            name: "valid task",
            task: &Task{
                Title:       "Test Task",
                Description: "Test Description",
                Status:      "todo",
                ProjectID:   1,
            },
            wantErr: false,
        },
        {
            name: "invalid task - empty title",
            task: &Task{
                Title:     "",
                ProjectID: 1,
            },
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // 设置
            mockRepo := &MockTaskRepository{}
            service := NewTaskService(mockRepo)
            
            if !tt.wantErr {
                mockRepo.On("Create", mock.AnythingOfType("*Task")).Return(nil)
            }

            // 执行
            err := service.CreateTask(tt.task)

            // 断言
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                mockRepo.AssertExpectations(t)
            }
        })
    }
}
```

集成测试：
```go
// API集成测试
func TestTaskHandler_CreateTask(t *testing.T) {
    // 设置测试数据库
    db := setupTestDB(t)
    defer cleanupTestDB(t, db)
    
    // 创建测试路由
    router := setupTestRouter(db)
    
    tests := []struct {
        name         string
        payload      interface{}
        expectedCode int
    }{
        {
            name: "valid task creation",
            payload: map[string]interface{}{
                "title":       "Test Task",
                "description": "Test Description",
                "project_id":  1,
            },
            expectedCode: http.StatusCreated,
        },
        {
            name: "invalid payload",
            payload: map[string]interface{}{
                "title": "", // 空标题
            },
            expectedCode: http.StatusBadRequest,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            body, _ := json.Marshal(tt.payload)
            req := httptest.NewRequest("POST", "/api/v1/projects/1/tasks", bytes.NewBuffer(body))
            req.Header.Set("Content-Type", "application/json")
            
            w := httptest.NewRecorder()
            router.ServeHTTP(w, req)
            
            assert.Equal(t, tt.expectedCode, w.Code)
        })
    }
}
```

基准测试：
```go
// 性能基准测试
func BenchmarkTaskRepository_GetTasks(b *testing.B) {
    repo := setupBenchmarkRepo(b)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, err := repo.GetTasks(1, 1, 20)
        if err != nil {
            b.Fatal(err)
        }
    }
}

func BenchmarkTaskService_CreateTask(b *testing.B) {
    service := setupBenchmarkService(b)
    task := &Task{
        Title:     "Benchmark Task",
        ProjectID: 1,
    }
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        task.Title = fmt.Sprintf("Benchmark Task %d", i)
        err := service.CreateTask(task)
        if err != nil {
            b.Fatal(err)
        }
    }
}
```

测试覆盖率：
```bash
# 生成覆盖率报告
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out -o coverage.html

# 覆盖率要求
go test -coverprofile=coverage.out ./... && \
go tool cover -func=coverage.out | grep total | awk '{print $3}' | \
sed 's/%//' | awk '{if($1<80) exit 1}'
```

请提供完整的后端测试实施方案。
```

---

## 🎯 Phase 5: DevOps和自动化

### Prompt 5.1: CI/CD优化

```
优化GitHub Actions CI/CD流程：

完整的CI/CD配置：
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  frontend-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Lint
      run: |
        cd frontend
        npm run lint
    
    - name: Type check
      run: |
        cd frontend
        npm run type-check
    
    - name: Test
      run: |
        cd frontend
        npm run test:coverage
    
    - name: Build
      run: |
        cd frontend
        npm run build

  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Go
      uses: actions/setup-go@v3
      with:
        go-version: '1.24'
    
    - name: Cache Go modules
      uses: actions/cache@v3
      with:
        path: ~/go/pkg/mod
        key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
        restore-keys: |
          ${{ runner.os }}-go-
    
    - name: Install dependencies
      run: |
        cd backend
        go mod download
    
    - name: Format check
      run: |
        cd backend
        if [ "$(gofmt -s -l . | wc -l)" -gt 0 ]; then
          echo "需要格式化的文件:"
          gofmt -s -l .
          exit 1
        fi
    
    - name: Vet
      run: |
        cd backend
        go vet ./...
    
    - name: Test
      run: |
        cd backend
        go test -race -coverprofile=coverage.out ./...
        go tool cover -func=coverage.out
    
    - name: Build
      run: |
        cd backend
        go build -o main .

  security-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Run Snyk to check for vulnerabilities
      uses: snyk/actions/node@master
      env:
        SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      with:
        args: --severity-threshold=high
```

质量门禁：
```yaml
  quality-gate:
    needs: [frontend-test, backend-test, security-scan]
    runs-on: ubuntu-latest
    if: always()
    steps:
    - name: Check all jobs status
      run: |
        if [[ "${{ needs.frontend-test.result }}" != "success" || 
              "${{ needs.backend-test.result }}" != "success" || 
              "${{ needs.security-scan.result }}" != "success" ]]; then
          echo "Quality gate failed"
          exit 1
        fi
        echo "Quality gate passed"
```

请提供完整的CI/CD优化方案。
```

### Prompt 5.2: 开发工具链优化

```
优化开发工具链和开发体验：

Git Hooks设置：
```bash
#!/bin/sh
# .git/hooks/pre-commit

echo "运行pre-commit检查..."

# 前端检查
cd frontend
echo "🔍 检查前端代码..."

# ESLint检查
npm run lint:check
if [ $? -ne 0 ]; then
  echo "❌ ESLint检查失败"
  exit 1
fi

# TypeScript检查
npm run type-check
if [ $? -ne 0 ]; then
  echo "❌ TypeScript类型检查失败"
  exit 1
fi

# 后端检查
cd ../backend
echo "🔍 检查后端代码..."

# Go格式检查
if [ "$(gofmt -s -l . | wc -l)" -gt 0 ]; then
  echo "❌ Go代码格式不规范，请运行: gofmt -w -s ."
  gofmt -s -l .
  exit 1
fi

# Go vet检查
go vet ./...
if [ $? -ne 0 ]; then
  echo "❌ Go vet检查失败"
  exit 1
fi

echo "✅ 所有检查通过"
```

IDE配置标准化：
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "go.formatTool": "gofmt",
  "go.lintOnSave": "workspace",
  "go.vetOnSave": "workspace",
  "files.associations": {
    "*.json": "jsonc"
  },
  "eslint.workingDirectories": ["frontend"],
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

开发脚本优化：
```bash
#!/bin/bash
# scripts/dev-setup.sh

echo "🚀 设置开发环境..."

# 检查依赖
check_dependencies() {
  command -v node >/dev/null 2>&1 || { echo "❌ Node.js未安装"; exit 1; }
  command -v go >/dev/null 2>&1 || { echo "❌ Go未安装"; exit 1; }
  command -v docker >/dev/null 2>&1 || { echo "❌ Docker未安装"; exit 1; }
}

# 安装前端依赖
setup_frontend() {
  echo "📦 安装前端依赖..."
  cd frontend
  npm ci
  npm run type-check
  cd ..
}

# 安装后端依赖
setup_backend() {
  echo "📦 安装后端依赖..."
  cd backend
  go mod download
  go mod tidy
  cd ..
}

# 设置Git hooks
setup_git_hooks() {
  echo "🪝 设置Git hooks..."
  cp scripts/pre-commit .git/hooks/
  chmod +x .git/hooks/pre-commit
}

# 启动开发环境
start_dev() {
  echo "🔥 启动开发环境..."
  docker-compose up -d db
  sleep 5
  
  # 启动后端
  cd backend && go run main.go &
  BACKEND_PID=$!
  
  # 启动前端
  cd ../frontend && npm start &
  FRONTEND_PID=$!
  
  echo "✅ 开发环境启动完成"
  echo "前端: http://localhost:3000"
  echo "后端: http://localhost:8080"
  
  # 等待Ctrl+C
  trap "kill $BACKEND_PID $FRONTEND_PID; docker-compose down" EXIT
  wait
}

check_dependencies
setup_frontend
setup_backend
setup_git_hooks
start_dev
```

代码质量检查脚本：
```bash
#!/bin/bash
# scripts/quality-check.sh

echo "🔍 执行代码质量检查..."

# 前端质量检查
frontend_check() {
  echo "📱 前端质量检查..."
  cd frontend
  
  echo "  🔍 ESLint检查..."
  npm run lint:check || return 1
  
  echo "  🔍 TypeScript检查..."
  npm run type-check || return 1
  
  echo "  🧪 运行测试..."
  npm run test:coverage || return 1
  
  echo "  📦 构建检查..."
  npm run build || return 1
  
  cd ..
}

# 后端质量检查
backend_check() {
  echo "🚀 后端质量检查..."
  cd backend
  
  echo "  🔍 格式检查..."
  if [ "$(gofmt -s -l . | wc -l)" -gt 0 ]; then
    echo "❌ 代码格式不规范"
    return 1
  fi
  
  echo "  🔍 Vet检查..."
  go vet ./... || return 1
  
  echo "  🧪 运行测试..."
  go test -race -coverprofile=coverage.out ./... || return 1
  
  echo "  📊 覆盖率检查..."
  COVERAGE=$(go tool cover -func=coverage.out | grep total | awk '{print $3}' | sed 's/%//')
  if (( $(echo "$COVERAGE < 80" | bc -l) )); then
    echo "❌ 测试覆盖率不足: $COVERAGE%"
    return 1
  fi
  
  cd ..
}

# 安全检查
security_check() {
  echo "🔒 安全检查..."
  
  echo "  🔍 前端依赖检查..."
  cd frontend && npm audit --audit-level=high || return 1
  cd ..
  
  echo "  🔍 后端安全检查..."
  command -v gosec >/dev/null 2>&1 && {
    cd backend && gosec ./... || return 1
    cd ..
  }
}

# 执行所有检查
frontend_check && backend_check && security_check

if [ $? -eq 0 ]; then
  echo "✅ 所有质量检查通过"
else
  echo "❌ 质量检查失败"
  exit 1
fi
```

请提供完整的开发工具链优化方案。
```

---

## 🎯 实施优先级和时间安排

### 高优先级任务 (第1-3天)
1. **ESLint错误修复** - 立即修复阻塞性错误
2. **Go代码格式化** - 标准化代码格式
3. **TypeScript类型安全** - 修复类型错误
4. **基础测试补全** - 核心功能测试覆盖

### 中优先级任务 (第4-6天)
1. **性能监控建立** - 建立性能基线
2. **CI/CD优化** - 自动化质量检查
3. **文档更新** - 同步最新代码变更
4. **安全扫描** - 依赖漏洞修复

### 低优先级任务 (第7-9天)
1. **开发工具优化** - 提升开发体验
2. **高级性能优化** - 细致性能调优
3. **测试覆盖率提升** - 达到80%+覆盖率
4. **监控仪表板** - 可视化监控界面

---

## 📊 验收标准

### 代码质量指标
- [ ] ESLint: 0错误, 0警告
- [ ] TypeScript: 0类型错误
- [ ] Go: gofmt 100%合规, go vet 0警告
- [ ] 测试覆盖率: 前端>80%, 后端>80%

### 性能指标
- [ ] 前端构建时间 <3分钟
- [ ] 页面加载时间 <2秒
- [ ] API响应时间 <200ms
- [ ] Bundle大小 <500KB

### 自动化指标
- [ ] CI/CD管道成功率 100%
- [ ] 安全扫描无高危漏洞
- [ ] 所有pre-commit检查通过
- [ ] 文档覆盖率 100%

---

**🚀 这个系统优化项目将彻底提升代码质量，为后续功能开发奠定坚实基础！**

**📅 完成时间**: 2025年8月12日  
**🎯 核心收益**: 技术债务清零，开发效率提升40%，系统稳定性显著改善

---

*使用这些prompts可以系统性地完成所有优化工作，建议按阶段执行，每完成一个阶段就提交代码并验证效果。*