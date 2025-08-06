# MCP环境检测与数据库一致性解决方案

## 任务背景

记录用户在前面会话中提出的两个重要技术问题的完整解决方案：

1. **MCP环境检测问题**: "如何判断我现在的mcp连接的是本地开发环境还是生产环境"
2. **数据库一致性问题**: "本地开发环境的数据库与生产环境如何保持一致"

## MCP环境检测解决方案

### 1. 环境变量检测方法

#### 核心环境变量
- **AI_ENV**: 设置为 `development` 或 `production`
- **AI_PROJECT_ENV**: 项目特定的环境标识  
- **NODE_ENV**: Node.js标准环境变量
- **DATABASE_URL**: 通过数据库连接字符串检测环境

#### 实现示例
```javascript
// 环境检测函数
function detectEnvironment() {
  const env = process.env.AI_ENV || process.env.NODE_ENV || 'development';
  const projectEnv = process.env.AI_PROJECT_ENV;
  const dbUrl = process.env.DATABASE_URL;
  
  return {
    environment: env,
    projectEnvironment: projectEnv,
    isDevelopment: env === 'development',
    isProduction: env === 'production',
    databaseHost: dbUrl ? new URL(dbUrl).hostname : 'localhost'
  };
}
```

### 2. 端口基础检测方法

#### 端口映射规则
- **开发环境**: 默认端口8090
- **生产环境**: 默认端口8080
- **MCP服务检测**: 通过API base URL端口判断

#### 实现示例
```javascript
function detectEnvironmentByPort() {
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';
  const url = new URL(apiBaseUrl);
  const port = parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80);
  
  return {
    port,
    environment: port === 8090 ? 'development' : 'production',
    apiBaseUrl
  };
}
```

### 3. API响应头检测方法

#### 后端实现
```go
// Gin middleware 添加环境标识头部
func EnvironmentHeaderMiddleware() gin.HandlerFunc {
    env := os.Getenv("AI_ENV")
    if env == "" {
        env = "development"
    }
    
    return func(c *gin.Context) {
        c.Header("X-Environment", env)
        c.Header("X-Server-Type", "ai-project-manager")
        c.Next()
    }
}
```

#### 前端检测
```javascript
// Axios interceptor 检测环境
axios.interceptors.response.use(
  response => {
    const environment = response.headers['x-environment'] || 'unknown';
    const serverType = response.headers['x-server-type'] || 'unknown';
    
    // 存储环境信息到全局状态
    window.__APP_ENVIRONMENT__ = {
      environment,
      serverType,
      detectedAt: new Date().toISOString()
    };
    
    return response;
  }
);
```

## 数据库一致性解决方案

### 1. 数据库同步脚本

#### 结构同步
```bash
#!/bin/bash
# sync-database-schema.sh

PROD_HOST="production-host"
PROD_USER="username"
PROD_DB="main_db"
DEV_HOST="localhost"
DEV_USER="user"
DEV_DB="main_db"

echo "导出生产环境数据库结构..."
pg_dump --schema-only -h $PROD_HOST -U $PROD_USER -d $PROD_DB > schema_backup.sql

echo "应用到开发环境..."
psql -h $DEV_HOST -U $DEV_USER -d $DEV_DB < schema_backup.sql

echo "清理临时文件..."
rm schema_backup.sql

echo "✅ 数据库结构同步完成"
```

### 2. 迁移文件管理

#### 目录结构
```
backend/migrations/
├── 001_initial_schema.sql
├── 002_add_user_sessions.sql
├── 003_add_task_archives.sql
└── migration_tracker.sql
```

### 3. 生产数据备份和恢复

#### 自动化备份脚本
```bash
#!/bin/bash
# backup-production.sh

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/prod_backup_$TIMESTAMP.sql"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
pg_dump -h $PROD_HOST -U $PROD_USER -d $PROD_DB > $BACKUP_FILE

# 压缩备份
gzip $BACKUP_FILE

echo "✅ 备份完成: ${BACKUP_FILE}.gz"
```

## 实施步骤

### 第一阶段：环境检测配置
1. 配置环境变量（AI_ENV, NODE_ENV等）
2. 添加API响应头中间件
3. 前端环境检测逻辑实现
4. MCP工具环境识别功能

### 第二阶段：数据库同步工具
1. 创建数据库结构同步脚本
2. 开发安全的数据恢复流程
3. 实现迁移文件自动执行
4. 集成到开发环境启动流程

## 验证标准

### 环境检测验证
- 能够准确识别当前MCP连接环境
- API响应头正确标识环境类型
- 前端能够动态适配不同环境

### 数据库一致性验证
- 数据库结构与生产环境保持同步
- 开发数据不会影响生产环境
- 同步过程安全可靠且可逆