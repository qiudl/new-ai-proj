# 🎯 新的项目目录结构

## 整理后的目录结构

```
new-ai-proj/                          # 项目根目录
├── README.md                         # 项目主文档  
├── docker-compose.yml               # 生产环境 Docker 配置
├── docker-compose.dev.yml           # 开发环境 Docker 配置
├── package.json                     # Node.js 项目依赖
├── package-lock.json                # 锁定版本
├── claude-code-config.json          # MCP 配置
├── .env*                            # 环境变量文件
├── .gitignore                       # Git 忽略文件
│
├── backend/                         # 🚀 后端代码
├── frontend/                        # 🎨 前端代码  
├── mcp-task-bridge/                 # 🔗 MCP 集成
│
├── infrastructure/                   # 🏗️ 基础设施
│   ├── jenkins/                     # Jenkins AI (原 jenkins-ai/)
│   ├── docker/                      # Docker 相关配置 (原 docker/)
│   ├── database/                    # 数据库相关 (原 db/ + database/)
│   │   ├── migrations/              # 数据库迁移
│   │   └── init/                    # 初始化脚本
│   └── nginx/                       # Nginx 配置
│
├── docs/                            # 📚 文档
│   ├── api/                         # API 文档 (原 openapi/)
│   └── guides/                      # 指南文档 (原根目录的 .md 文件)
│       ├── DEPLOYMENT_GUIDE.md
│       ├── CLAUDE.md
│       ├── WORK_NOTES.md
│       └── ...
│
├── tools/                           # 🔧 工具
│   ├── scripts/                     # 工具脚本
│   │   ├── create-task.js
│   │   ├── create-task-simple.js
│   │   └── start-dev.sh
│   ├── Makefile.prisma              # Prisma 构建脚本
│   └── requirements.txt             # Python 依赖
│
├── scripts/                         # 📜 构建/部署脚本
├── logs/                            # 📊 日志文件
├── data/                            # 💾 数据文件
├── backups/                         # 💽 备份文件
└── archive/                         # 📦 归档文件
    └── old-configs/                 # 旧的配置文件
        ├── docker-compose.ai-jenkins.yml
        ├── docker-compose.prod.yml
        ├── docker-compose.simple.yml
        └── ...
```

## 🎯 整理的好处

### 1. **根目录简洁**
只保留最核心的配置文件：
- `README.md` - 项目介绍
- `docker-compose.yml` - 主要部署配置
- `package.json` - 依赖管理
- `claude-code-config.json` - MCP 配置

### 2. **清晰的分类**
- **infrastructure/** - 所有基础设施相关
- **docs/** - 所有文档集中管理  
- **tools/** - 工具脚本集中存放
- **archive/** - 历史文件归档

### 3. **易于维护**
- 相关文件就近存放
- 减少根目录混乱
- 便于版本控制管理
- 新成员容易理解项目结构

## 🚀 如何执行整理

1. **备份当前项目**（重要！）
   ```bash
   cd /Users/johnqiu/coding/www/projects
   cp -r new-ai-proj new-ai-proj-backup-$(date +%Y%m%d)
   ```

2. **执行整理脚本**
   ```bash
   cd new-ai-proj
   ./reorganize-project.sh
   ```

3. **验证结果**
   - 检查文件是否正确移动
   - 测试 Docker Compose 配置是否正常
   - 确认 MCP 配置路径是否需要更新

4. **更新相关配置**
   - 更新 Docker 配置中的路径引用
   - 更新文档中的路径说明
   - 提交版本控制

## ⚠️ 注意事项

1. **路径引用更新**：一些配置文件可能需要更新路径引用
2. **MCP 配置**：确认 `mcp-task-bridge` 中的相对路径是否正确
3. **Docker 卷挂载**：检查 Docker Compose 中的卷挂载路径
4. **CI/CD 脚本**：如有 CI/CD 脚本需要更新路径

## 📝 后续建议

1. **更新 README.md**，反映新的项目结构
2. **创建 infrastructure/README.md**，说明基础设施组件
3. **在 docs/ 中创建索引文件**，方便查找文档
4. **定期清理 archive/ 目录**，删除过期的配置文件
