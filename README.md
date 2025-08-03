统一文档目录（推荐）

  重新定义目录职责：

  project-root/
  ├── docs/                          # 📚 统一文档中心
  │   ├── system/                    # 🔧 系统级文档
  │   │   ├── development/           # 开发指南
  │   │   ├── deployment/            # 部署文档
  │   │   ├── api/                   # API文档
  │   │   └── architecture/          # 架构设计
  │   ├── tasks/                     # 📋 任务文档（动态生成）
  │   │   ├── projects/              # 项目任务文档
  │   │   │   └── project-1/
  │   │   │       └── task-184.md
  │   │   ├── personal/              # 个人任务文档
  │   │   └── templates/             # 文档模板
  │   └── user/                      # 👤 用户文档
  │       ├── guides/                # 使用指南
  │       └── tutorials/             # 教程
  └── backend/                       # 后端代码
      └── docs/                      # 🗂️ 废弃或重新定位

  实施步骤

⏺ Write(/Users/johnqiu/coding/www/projects/new-ai-proj/DOCS_ARCHITECTURE_SOLUTION.md)
  ⎿  Wrote 197 lines to                                                               
     /Users/johnqiu/coding/www/projects/new-ai-proj/DOCS_ARCHITECTURE_SOLUTION.md
     # 文档目录架构统一解决方案

     ## 🎯 问题描述

     当前项目存在两个文档目录，导致文档管理混乱和API访问失败：
     - **根目录 `docs/`**: 项目级文档和开发指南
     - **`backend/docs/`**: 任务文档和系统生成内容

     这种分离导致：
     1. Docker volume映射混乱
     2. 后端API无法找到任务文档
     3. 用户无法在前端界面访问文档
     4. 开发者困惑于文档存放位置

     ## 💡 统一解决方案

     ### 阶段1：立即修复（保持现有架构）

     **目标**: 快速解决用户无法访问任务文档的问题

     **操作**:
     1. 修改Docker配置，将backend/docs映射到容器
     2. 更新后端配置路径
     3. 保持现有目录结构不变

     ```yaml
     # docker-compose.yml 修改
     volumes:
       - ./backend/docs:/app/docs:rw  # 映射backend/docs到容器工作目录
     ```

     **优点**:
     - ✅ 立即解决API访问问题
     - ✅ 不破坏现有文档结构
     - ✅ 用户可立即看到任务文档

     **缺点**:
     - ❌ 仍然存在目录分离问题
     - ❌ 长期维护复杂

     ### 阶段2：长期架构优化（推荐）

     **目标**: 建立清晰的文档架构和管理体系

     #### 新的目录结构

     ```
     project-root/
     ├── docs/                          # 📚 统一文档中心
     │   ├── system/                    # 🔧 系统文档
     │   │   ├── development/           # 开发指南
     │   │   │   ├── setup.md
     │   │   │   ├── api-reference.md
     │   │   │   └── testing.md
     │   │   ├── deployment/            # 部署文档
     │   │   │   ├── docker.md
     │   │   │   └── production.md
     │   │   ├── architecture/          # 架构设计
     │   │   │   ├── overview.md
     │   │   │   ├── database.md
     │   │   │   └── microservices.md
     │   │   └── maintenance/           # 维护文档
     │   │       ├── backup.md
     │   │       └── monitoring.md
     │   │
     │   ├── tasks/                     # 📋 任务文档（动态）
     │   │   ├── projects/              # 项目任务文档
     │   │   │   ├── project-1/
     │   │   │   │   ├── task-184.md    # 甘特图设计
     │   │   │   │   ├── task-260.md    # Phase 1
     │   │   │   │   └── ...
     │   │   │   └── project-2/
     │   │   ├── personal/              # 个人任务文档
     │   │   │   └── user-1/
     │   │   └── templates/             # 文档模板
     │   │       ├── technical-design.md
     │   │       ├── gantt-chart.md
     │   │       └── feature-spec.md
     │   │
     │   ├── user/                      # 👤 用户文档
     │   │   ├── guides/                # 使用指南
     │   │   │   ├── getting-started.md
     │   │   │   ├── task-management.md
     │   │   │   └── time-tracking.md
     │   │   ├── tutorials/             # 教程
     │   │   └── faqs/                  # 常见问题
     │   │
     │   └── releases/                  # 📦 发布文档
     │       ├── changelog.md
     │       ├── migration-guides/
     │       └── version-notes/
     │
     ├── backend/                       # 后端代码
     │   ├── docs/                      # 🗂️ 临时存在（迁移中）
     │   └── ...
     │
     └── frontend/                      # 前端代码
         ├── docs/                      # 前端特定文档
         └── ...
     ```

     #### 配置更新

     **Docker配置**:
     ```yaml
     # docker-compose.yml
     services:
       backend:
         volumes:
           - ./docs:/app/docs:rw         # 统一映射根目录docs
           - ./backend:/app:rw           # 代码目录
     ```

     **后端配置**:
     ```go
     // main.go
     docsBasePath := "./docs"  // 现在指向统一的docs目录
     ```

     #### 文档分类和管理规则

     | 目录 | 内容 | 管理方式 | 访问方式 |
     |------|------|----------|----------|
     | `docs/system/` | 开发、部署、架构文档 | 手动维护 | Git + 静态网站 |
     | `docs/tasks/` | 任务技术文档 | 系统自动生成 | 前端API |
     | `docs/user/` | 用户指南和教程 | 手动维护 | 前端展示 |
     | `docs/releases/` | 版本发布说明 | CI/CD自动生成 | 公开访问 |

     ### 阶段3：智能文档管理

     **目标**: 建立智能化的文档生成和管理体系

     #### 功能特性

     1. **智能文档生成**
        - 基于任务类型自动选择模板
        - AI辅助内容生成
        - 版本控制集成

     2. **文档状态管理**
        - 文档生命周期跟踪
        - 自动更新和同步
        - 权限控制

     3. **用户界面集成**
        - 任务详情页直接访问
        - 在线编辑和预览
        - 协作编辑功能

     ## 🚀 实施计划

     ### Phase 1: 紧急修复（1小时）
     - [ ] 修改Docker volume映射
     - [ ] 重启服务验证API访问
     - [ ] 测试前端文档显示

     ### Phase 2: 目录重构（4小时）
     - [ ] 创建新的目录结构
     - [ ] 迁移现有文档到统一目录
     - [ ] 更新配置文件
     - [ ] 测试所有功能

     ### Phase 3: 文档管理增强（8小时）
     - [ ] 实现文档版本控制
     - [ ] 添加权限管理
     - [ ] 优化用户界面
     - [ ] 完善文档模板系统