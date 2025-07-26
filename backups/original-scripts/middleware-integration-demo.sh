#!/bin/bash

# middleware-integration-demo.sh
# 演示新的中间件和审计系统集成

echo "=== AI项目后端 - 中间件和审计系统集成演示 ==="
echo

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}>>> $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 检查必要的依赖
print_step "检查项目环境"

if [ ! -f "backend/main_with_middleware.go" ]; then
    print_error "main_with_middleware.go 文件不存在"
    exit 1
fi

if [ ! -f "backend/middleware/audit.go" ]; then
    print_error "audit.go 中间件文件不存在"
    exit 1
fi

if [ ! -f "backend/middleware/auth.go" ]; then
    print_error "auth.go 中间件文件不存在"
    exit 1
fi

if [ ! -f "backend/middleware/permissions.go" ]; then
    print_error "permissions.go 中间件文件不存在"
    exit 1
fi

print_success "所有中间件文件已就绪"

# 1. 展示新增的中间件功能
print_step "展示新增的中间件功能"

echo "📋 新增中间件组件："
echo "   • 审计中间件 (AuditMiddleware) - 记录所有API请求和响应"
echo "   • 认证中间件 (AuthMiddleware) - JWT和会话认证，登录限流"
echo "   • 权限管理器 (PermissionManager) - 细粒度权限控制"
echo

echo "🔧 主要功能："
echo "   • 自动审计日志记录"
echo "   • 会话管理和清理"
echo "   • 登录尝试限制"
echo "   • 基于角色的权限控制"
echo "   • 项目级别访问控制"
echo "   • 敏感数据脱敏"
echo

# 2. 数据库迁移准备
print_step "准备数据库迁移"

echo "📊 需要创建的新表："
echo "   • audit_logs - 审计日志表"
echo "   • user_sessions - 用户会话表"
echo "   • login_attempts - 登录尝试表"
echo "   • permissions - 权限表"
echo "   • roles - 角色表"
echo "   • role_permissions - 角色权限关联表"
echo "   • user_permissions - 用户权限表"
echo "   • project_members - 项目成员表"
echo

# 创建迁移目录
mkdir -p backend/migrations

# 生成迁移SQL
print_step "生成数据库迁移脚本"

cat > backend/migrations/002_add_middleware_tables.sql << 'EOF'
-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_id INTEGER,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    user_role VARCHAR(100),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    resource_name VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    description TEXT,
    before_data JSONB,
    after_data JSONB,
    changes JSONB,
    status VARCHAR(50) DEFAULT 'success',
    error_message TEXT,
    project_id INTEGER,
    parent_event_id VARCHAR(255),
    correlation_id VARCHAR(255),
    metadata JSONB,
    tags TEXT[]
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- 登录尝试表
CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGSERIAL PRIMARY KEY,
    ip_address INET NOT NULL,
    username VARCHAR(255),
    success BOOLEAN NOT NULL DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    error_reason VARCHAR(255)
);

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- 用户权限表
CREATE TABLE IF NOT EXISTS user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    project_id INTEGER,
    granted BOOLEAN NOT NULL DEFAULT true,
    granted_by INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 项目成员表
CREATE TABLE IF NOT EXISTS project_members (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    added_by INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_timestamp ON login_attempts(ip_address, timestamp);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- 插入默认权限
INSERT INTO permissions (name, description, category) VALUES
    ('system.admin', 'Full system administration', 'system'),
    ('system.users', 'Manage users and roles', 'system'),
    ('system.audit', 'View audit logs', 'system'),
    ('system.config', 'Manage system configuration', 'system'),
    ('project.view', 'View projects', 'project'),
    ('project.create', 'Create new projects', 'project'),
    ('project.update', 'Update project details', 'project'),
    ('project.delete', 'Delete projects', 'project'),
    ('project.manage', 'Full project management', 'project'),
    ('task.view', 'View tasks', 'task'),
    ('task.create', 'Create new tasks', 'task'),
    ('task.update', 'Update task details', 'task'),
    ('task.delete', 'Delete tasks', 'task'),
    ('task.assign', 'Assign tasks to users', 'task'),
    ('task.bulk_update', 'Bulk update tasks', 'task'),
    ('task.bulk_delete', 'Bulk delete tasks', 'task'),
    ('user.profile', 'Update own profile', 'user'),
    ('user.password', 'Change own password', 'user'),
    ('user.sessions', 'Manage own sessions', 'user')
ON CONFLICT (name) DO NOTHING;

-- 插入默认角色
INSERT INTO roles (name, description, is_system) VALUES
    ('admin', 'System administrator with full access', true),
    ('manager', 'Project manager with project and task management access', true),
    ('user', 'Regular user with basic task access', true),
    ('viewer', 'Read-only access to projects and tasks', true)
ON CONFLICT (name) DO NOTHING;

-- 为管理员角色分配所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为管理者角色分配项目和任务管理权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.name IN (
    'project.view', 'project.create', 'project.update', 'project.manage',
    'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign',
    'task.bulk_update', 'task.bulk_delete',
    'user.profile', 'user.password', 'user.sessions'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为普通用户分配基础权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user' AND p.name IN (
    'project.view',
    'task.view', 'task.create', 'task.update',
    'user.profile', 'user.password', 'user.sessions'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为查看者分配只读权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'viewer' AND p.name IN (
    'project.view',
    'task.view',
    'user.profile', 'user.sessions'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
EOF

print_success "数据库迁移脚本已生成: backend/migrations/002_add_middleware_tables.sql"

# 3. 测试中间件功能
print_step "生成中间件测试脚本"

cat > test-middleware-features.sh << 'EOF'
#!/bin/bash

echo "=== 中间件功能测试 ==="

API_BASE="http://localhost:8080/api/v1"
ADMIN_TOKEN=""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

test_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    local headers=$4
    local description=$5
    
    echo -e "${BLUE}测试: $description${NC}"
    echo "请求: $method $endpoint"
    
    if [ -n "$headers" ]; then
        if [ -n "$data" ]; then
            curl -s -X $method "$API_BASE$endpoint" \
                -H "Content-Type: application/json" \
                -H "$headers" \
                -d "$data" | jq .
        else
            curl -s -X $method "$API_BASE$endpoint" \
                -H "$headers" | jq .
        fi
    else
        if [ -n "$data" ]; then
            curl -s -X $method "$API_BASE$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data" | jq .
        else
            curl -s -X $method "$API_BASE$endpoint" | jq .
        fi
    fi
    echo "---"
}

echo "1. 测试审计中间件 - 所有请求都会被记录"
test_api "GET" "/health" "" "" "健康检查（应该记录审计日志）"

echo "2. 测试认证中间件 - 登录限流"
echo "测试多次失败登录..."
for i in {1..3}; do
    echo "尝试 $i:"
    test_api "POST" "/auth/login" '{"username":"invalid","password":"wrong"}' "" "失败登录尝试 $i"
done

echo "3. 测试权限中间件 - 未认证访问受保护资源"
test_api "GET" "/tasks" "" "" "未认证访问任务列表（应该被拒绝）"

echo "4. 测试成功登录"
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | jq -e '.success' > /dev/null; then
    ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token')
    echo -e "${GREEN}登录成功，获取到token${NC}"
    
    echo "5. 测试认证访问"
    test_api "GET" "/tasks" "" "Authorization: Bearer $ADMIN_TOKEN" "认证用户访问任务列表"
    
    echo "6. 测试权限控制"
    test_api "GET" "/system/audit/logs" "" "Authorization: Bearer $ADMIN_TOKEN" "管理员访问审计日志"
    
    echo "7. 测试会话管理"
    test_api "GET" "/users/sessions" "" "Authorization: Bearer $ADMIN_TOKEN" "查看用户会话"
    
    echo "8. 测试审计日志查询"
    test_api "GET" "/system/audit/logs?limit=5" "" "Authorization: Bearer $ADMIN_TOKEN" "查询最近5条审计日志"
    
else
    echo -e "${RED}登录失败，请检查用户名密码${NC}"
fi

echo -e "${GREEN}中间件功能测试完成${NC}"
EOF

chmod +x test-middleware-features.sh
print_success "中间件测试脚本已生成: test-middleware-features.sh"

# 4. API端点展示
print_step "新增的API端点"

echo "🔐 认证和会话管理："
echo "   POST /api/v1/auth/login     - 用户登录（带限流）"
echo "   POST /api/v1/auth/logout    - 用户登出"
echo "   POST /api/v1/auth/refresh   - 刷新token"
echo

echo "👥 用户管理："
echo "   GET  /api/v1/users/profile  - 获取用户资料"
echo "   PUT  /api/v1/users/profile  - 更新用户资料"
echo "   PUT  /api/v1/users/password - 修改密码"
echo "   GET  /api/v1/users/sessions - 查看用户会话"
echo "   DELETE /api/v1/users/sessions/:id - 删除指定会话"
echo

echo "🔍 系统管理（管理员）："
echo "   GET  /api/v1/system/audit/logs - 查看审计日志"
echo "   GET  /api/v1/system/audit/logs/:id - 查看单条审计日志"
echo "   GET  /api/v1/system/audit/stats - 审计统计信息"
echo "   GET  /api/v1/system/users - 用户管理"
echo "   POST /api/v1/system/users - 创建用户"
echo "   PUT  /api/v1/system/users/:id/role - 修改用户角色"
echo

echo "⚙️ 权限管理："
echo "   GET  /api/v1/system/permissions/roles - 查看所有角色"
echo "   GET  /api/v1/system/permissions/permissions - 查看所有权限"
echo "   POST /api/v1/system/permissions/users/:id/permissions - 授予权限"
echo "   DELETE /api/v1/system/permissions/users/:id/permissions/:pid - 撤销权限"
echo

# 5. 配置说明
print_step "配置和环境变量"

echo "📝 新增环境变量（添加到.env文件）："
echo "   AUDIT_ENABLED=true"
echo "   AUDIT_LOG_REQUEST_BODY=true"
echo "   AUDIT_LOG_RESPONSE_BODY=true"
echo "   SESSION_TIMEOUT=24h"
echo "   MAX_LOGIN_ATTEMPTS=5"
echo "   LOCKOUT_DURATION=15m"
echo

# 6. 部署步骤
print_step "部署步骤"

echo "📦 部署新的中间件系统："
echo
echo "1. 备份当前数据库："
echo "   pg_dump ai_project_db > backup_$(date +%Y%m%d_%H%M%S).sql"
echo
echo "2. 运行数据库迁移："
echo "   psql -d ai_project_db -f backend/migrations/002_add_middleware_tables.sql"
echo
echo "3. 更新主程序文件："
echo "   cp backend/main.go backend/main_backup.go"
echo "   cp backend/main_with_middleware.go backend/main.go"
echo
echo "4. 重新编译和启动服务："
echo "   cd backend && go build -o ai-project-backend"
echo "   ./ai-project-backend"
echo
echo "5. 测试新功能："
echo "   ./test-middleware-features.sh"
echo

# 7. 安全注意事项
print_step "安全注意事项"

echo "🔒 重要安全配置："
echo "   • 在生产环境中设置强JWT密钥"
echo "   • 启用HTTPS"
echo "   • 配置适当的CORS策略"
echo "   • 定期清理过期会话和审计日志"
echo "   • 监控登录失败尝试"
echo "   • 设置审计日志的保留策略"
echo

echo "⚠️  权限配置："
echo "   • 默认管理员账户需要立即修改密码"
echo "   • 定期审查用户权限和角色分配"
echo "   • 为不同项目配置适当的访问控制"
echo "   • 监控权限变更的审计日志"
echo

# 8. 监控和维护
print_step "监控和维护"

echo "📊 监控指标："
echo "   • 登录失败率和锁定事件"
echo "   • 审计日志生成量"
echo "   • 会话活跃度和过期清理"
echo "   • 权限检查性能"
echo "   • API响应时间影响"
echo

echo "🔧 维护任务："
echo "   • 定期清理过期会话（自动，每小时）"
echo "   • 清理旧审计日志（自动，每天2AM）"
echo "   • 监控数据库存储空间"
echo "   • 审查和优化权限查询性能"
echo

# 生成快速启动脚本
print_step "生成快速启动脚本"

cat > start-with-middleware.sh << 'EOF'
#!/bin/bash

echo "启动带中间件的AI项目后端..."

# 检查数据库连接
if ! pg_isready -h localhost -p 5432 -U postgres > /dev/null 2>&1; then
    echo "错误: 无法连接到PostgreSQL数据库"
    echo "请确保PostgreSQL服务正在运行"
    exit 1
fi

# 运行数据库迁移
echo "运行数据库迁移..."
if [ -f "backend/migrations/002_add_middleware_tables.sql" ]; then
    PGPASSWORD=${DB_PASSWORD:-postgres} psql -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} -d ${DB_NAME:-ai_project_db} -f backend/migrations/002_add_middleware_tables.sql
    echo "数据库迁移完成"
else
    echo "警告: 找不到数据库迁移文件"
fi

# 编译并启动服务
cd backend
echo "编译应用程序..."
go build -o ai-project-backend main_with_middleware.go

if [ $? -eq 0 ]; then
    echo "启动服务器..."
    ./ai-project-backend
else
    echo "编译失败"
    exit 1
fi
EOF

chmod +x start-with-middleware.sh
print_success "快速启动脚本已生成: start-with-middleware.sh"

# 9. 测试数据生成
print_step "生成测试数据脚本"

cat > generate-test-data.sh << 'EOF'
#!/bin/bash

echo "生成中间件测试数据..."

API_BASE="http://localhost:8080/api/v1"

# 创建测试用户
echo "创建测试用户..."
curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "admin",
        "password": "admin123"
    }' | jq .

# 创建一些测试项目和任务以生成审计日志
echo "创建测试项目..."
ADMIN_TOKEN=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

if [ "$ADMIN_TOKEN" != "null" ] && [ -n "$ADMIN_TOKEN" ]; then
    curl -s -X POST "$API_BASE/projects" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "name": "中间件测试项目",
            "description": "用于测试审计和权限系统的项目"
        }' | jq .

    echo "创建测试任务..."
    curl -s -X POST "$API_BASE/projects/1/tasks" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{
            "title": "测试任务",
            "description": "用于测试审计日志的任务",
            "status": "todo"
        }' | jq .

    echo "查看生成的审计日志..."
    curl -s -X GET "$API_BASE/system/audit/logs?limit=10" \
        -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
else
    echo "无法获取管理员token，请检查登录凭据"
fi
EOF

chmod +x generate-test-data.sh
print_success "测试数据生成脚本已生成: generate-test-data.sh"

# 总结
print_step "集成完成总结"

echo -e "${GREEN}🎉 中间件和审计系统集成完成！${NC}"
echo
echo "📁 新增文件："
echo "   ✓ backend/middleware/audit.go - 审计中间件"
echo "   ✓ backend/middleware/auth.go - 认证中间件"
echo "   ✓ backend/middleware/permissions.go - 权限管理"
echo "   ✓ backend/main_with_middleware.go - 集成主程序"
echo "   ✓ backend/migrations/002_add_middleware_tables.sql - 数据库迁移"
echo

echo "🚀 下一步操作："
echo "   1. 运行数据库迁移: ./start-with-middleware.sh"
echo "   2. 测试新功能: ./test-middleware-features.sh"
echo "   3. 生成测试数据: ./generate-test-data.sh"
echo

echo "📖 主要改进："
echo "   • 完整的请求/响应审计日志"
echo "   • 基于角色的权限控制系统"
echo "   • 会话管理和登录限流"
echo "   • 敏感数据自动脱敏"
echo "   • 细粒度的API访问控制"
echo "   • 自动清理过期数据"
echo

print_warning "注意: 这是增强版本，请在测试环境中先验证所有功能正常后再部署到生产环境"

echo
echo -e "${BLUE}集成演示完成！${NC}"
