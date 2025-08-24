# 并行开发快速启动指南

## 🚀 快速开始

### 1. 环境准备（所有开发者）
```bash
# 克隆代码
git clone <repo-url>
cd mcp-task-bridge

# 创建并切换到自己的功能分支
git checkout -b feature/589-database-migration  # Developer A
git checkout -b feature/590-versioning-api      # Developer B  
git checkout -b feature/591-test-suite          # Developer C

# 复制环境变量配置
cp .env.development.example .env.development

# 启动 Docker 数据库
docker-compose -f docker-compose.dev.yml up -d

# 验证数据库连接
docker-compose -f docker-compose.dev.yml ps
```

### 2. 任务分配

| 开发者 | 任务ID | 任务内容 | 主要文件 |
|-------|--------|---------|----------|
| A | #589 | 数据库迁移 | migrations/*.sql |
| B | #590 | API开发 | src/services/, src/api/ |
| C | #591 | 测试套件 | tests/, src/mocks/ |

### 3. Day 1 开发指令

#### Developer A (#589 - 数据库)
```bash
# 创建迁移文件
mkdir -p migrations
touch migrations/001_create_task_versions.up.sql
touch migrations/001_create_task_versions.down.sql

# 编写迁移脚本（参考任务 #589 描述中的 SQL）
# 测试迁移
docker exec -i task_versioning_db psql -U taskuser -d taskdb < migrations/001_create_task_versions.up.sql
```

#### Developer B (#590 - API)
```bash
# 创建服务文件
mkdir -p src/services src/api src/mocks
touch src/services/TaskVersioningService.ts
touch src/mocks/MockTaskVersionRepository.ts

# 使用 Mock 实现开始开发
# 接口定义已在 src/shared/interfaces/versioning.interfaces.ts
```

#### Developer C (#591 - 测试)
```bash
# 创建测试文件
mkdir -p tests/unit tests/integration tests/helpers
touch tests/unit/taskVersioning.test.ts
touch tests/integration/concurrency.test.ts
touch tests/helpers/testDataGenerator.ts

# 安装测试依赖
npm install --save-dev jest @types/jest ts-jest
```

## 📋 每日检查清单

### Day 1 结束前
- [ ] Developer A: 迁移脚本完成并部署到开发环境
- [ ] Developer B: Mock API 可运行
- [ ] Developer C: 单元测试框架搭建完成
- [ ] 17:30 同步会议完成

### Day 2 结束前
- [ ] 所有集成测试通过
- [ ] 性能测试达标（1000版本<100ms）
- [ ] 文档更新完成
- [ ] 代码审查完成

## 🔄 Git 工作流

```bash
# 每日开始前拉取最新代码
git fetch origin
git rebase origin/main

# 提交代码（使用规范格式）
git add .
git commit -m "feat(#589): Add task_description_versions table migration"

# 推送到远程
git push origin feature/589-database-migration

# Day 2 集成时
git checkout -b integration/task-versioning
git merge feature/589-database-migration
git merge feature/590-versioning-api
git merge feature/591-test-suite
```

## 🛠️ 常用命令

```bash
# 数据库操作
docker-compose -f docker-compose.dev.yml exec postgres psql -U taskuser -d taskdb
docker-compose -f docker-compose.dev.yml logs postgres

# 运行测试
npm test                          # 所有测试
npm run test:unit                 # 单元测试
npm run test:integration          # 集成测试
npm run test:coverage            # 覆盖率报告

# 启动 API 服务
npm run dev                       # 开发模式
npm run build && npm start        # 生产模式
```

## 📞 紧急联系

- 技术问题：在 Slack #dev-versioning 频道
- 阻塞问题：直接 @ai-pm
- 紧急会议：使用 /emergency-meeting 命令

## ✅ 验收标准提醒

1. **功能完整**：所有 AC 满足
2. **测试覆盖**：单元测试 >80%
3. **性能达标**：1000版本查询 <100ms
4. **并发安全**：10并发更新 0失败
5. **文档齐全**：API文档、部署文档、使用指南

## 🎯 成功关键

- **接口契约优先**：严格遵循 versioning.interfaces.ts
- **Mock 先行**：不等待依赖，使用 Mock 开发
- **频繁同步**：每日 17:30 同步会议不可缺席
- **及时求助**：遇到问题立即在 Slack 提出

---

记住：我们的目标是 **1.5-2天完成** 整个功能！
