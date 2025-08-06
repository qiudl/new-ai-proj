# 🏗️ 环境管理最佳实践指南

## 问题诊断

### ❌ 之前的错误做法
```
/projects/
├── start-dev-local.sh      # ❌ 脚本放在父目录
├── stop-dev-local.sh       # ❌ 污染了projects空间
├── new-ai-proj/           # 项目目录
├── new-ai-proj-dev/       # 开发环境
└── other-projects/        # 其他项目
```

**问题：**
1. **命名空间污染** - 脚本名称太通用，容易冲突
2. **维护困难** - 脚本与项目分离，不能版本管理
3. **逻辑混乱** - projects是多项目父目录，不应包含特定项目脚本

## ✅ 正确的做法

### 1. 项目自包含原则
```
/projects/new-ai-proj/                    # 主项目目录
├── ai-context-env.sh                     # 🎯 项目专用环境管理器
├── scripts/                              
│   └── env-management/                   # 环境管理脚本目录
│       ├── start-dev.sh                  # 启动开发环境
│       ├── stop-dev.sh                   # 停止开发环境
│       ├── start-prod.sh                 # 启动生产环境
│       └── backup.sh                     # 备份脚本
├── mcp-task-bridge/                      # MCP集成
├── backend/                              # 后端代码
├── frontend/                             # 前端代码
└── docs/                                 # 文档
```

### 2. 命名规范

**项目专属命名：**
- ✅ `ai-context-env.sh` - 明确是哪个项目的
- ❌ `start-dev.sh` - 太通用

**使用项目前缀：**
- ✅ `ai-context-start-dev.sh`
- ✅ `aipm-env-manager.sh` (使用缩写)

### 3. 脚本组织结构

```bash
# 主入口脚本 (ai-context-env.sh)
./ai-context-env.sh start-dev    # 启动开发环境
./ai-context-env.sh stop-dev     # 停止开发环境
./ai-context-env.sh status       # 查看状态
./ai-context-env.sh logs         # 查看日志

# 内部脚本放在 scripts/ 目录
scripts/
├── env-management/      # 环境管理
├── deployment/          # 部署相关
├── maintenance/         # 维护脚本
└── testing/            # 测试脚本
```

## 🎯 为什么这样做？

### 1. **版本控制友好**
```bash
# 所有脚本都在项目内，可以一起提交
git add .
git commit -m "feat: 添加环境管理脚本"
git push
```

### 2. **团队协作方便**
```bash
# 新成员克隆项目后立即可用
git clone https://github.com/yourteam/new-ai-proj.git
cd new-ai-proj
./ai-context-env.sh start-dev  # 直接能用！
```

### 3. **避免冲突**
```
/projects/
├── new-ai-proj/
│   └── ai-context-env.sh      # AI上下文管理平台专用
├── crm-system/
│   └── crm-env.sh             # CRM系统专用
└── blog-platform/
    └── blog-env.sh            # 博客平台专用
```

### 4. **便于维护**
- 脚本与代码在一起，修改代码时能同步更新脚本
- 可以在README中文档化脚本使用方法
- CI/CD可以直接使用项目内的脚本

## 📝 实施步骤

### 1. 迁移现有脚本
```bash
# 从projects目录移动到项目内
cd /Users/johnqiu/coding/www/projects
mv start-dev-local.sh new-ai-proj/scripts/env-management/start-dev.sh
mv stop-dev-local.sh new-ai-proj/scripts/env-management/stop-dev.sh
```

### 2. 创建项目管理器
```bash
cd new-ai-proj
chmod +x ai-context-env.sh
./ai-context-env.sh help  # 查看使用说明
```

### 3. 更新文档
在 README.md 中添加：
```markdown
## 快速开始
# 启动开发环境
./ai-context-env.sh start-dev

# 查看环境状态
./ai-context-env.sh status

# 停止环境
./ai-context-env.sh stop-dev
```

### 4. 加入版本控制
```bash
git add ai-context-env.sh scripts/
git commit -m "refactor: 将环境管理脚本移入项目内部"
```

## 🔧 高级技巧

### 1. 环境变量配置
```bash
# scripts/env-management/config.sh
export AI_CONTEXT_DEV_FRONTEND_PORT=3001
export AI_CONTEXT_DEV_BACKEND_PORT=8090
export AI_CONTEXT_PROD_FRONTEND_PORT=3000
export AI_CONTEXT_PROD_BACKEND_PORT=8080
```

### 2. 多环境支持
```bash
./ai-context-env.sh start dev     # 开发环境
./ai-context-env.sh start test    # 测试环境
./ai-context-env.sh start staging # 预发布环境
./ai-context-env.sh start prod    # 生产环境
```

### 3. 健康检查
```bash
# 在脚本中添加健康检查
check_health() {
    curl -s http://localhost:$PORT/health || echo "服务未响应"
}
```

## ✨ 总结

**核心原则：**
1. **项目自包含** - 所有相关资源都在项目目录内
2. **清晰的命名** - 使用项目特定的前缀
3. **良好的组织** - 使用子目录分类管理脚本
4. **版本控制** - 脚本与代码一起管理
5. **文档化** - 在README中说明使用方法

这样做的好处是让项目更加专业、易于维护，团队协作更顺畅！