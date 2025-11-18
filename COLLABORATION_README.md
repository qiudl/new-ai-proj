# 🤝 双人协同开发完整指南

> 已为本项目配置完整的双人协同开发系统，包含自动化工具、CI/CD流程和详细文档

---

## 📋 目录

- [快速开始](#快速开始)
- [系统架构](#系统架构)
- [可用命令](#可用命令)
- [工作流程](#工作流程)
- [文档索引](#文档索引)
- [故障排除](#故障排除)

---

## 🚀 快速开始

### 第一步：安装协同开发工具（5分钟）

```bash
# 1. 运行自动安装脚本
bash scripts/setup-collaboration.sh

# 2. 重新加载shell配置
source ~/.zshrc  # macOS/Linux with zsh
# 或
source ~/.bashrc  # Linux with bash

# 3. 验证安装
bash scripts/verify-collaboration-setup.sh
```

### 第二步：配置GitHub仓库（10分钟）

按照 `docs/GITHUB_SETTINGS.md` 中的指南：

1. **设置分支保护规则**
   - GitHub → Settings → Branches
   - 保护 `main` 分支
   - 要求PR审查和CI检查

2. **添加协作者**
   - Settings → Collaborators
   - 添加第二个开发者（Write权限）

3. **验证CI/CD**
   - 检查 GitHub Actions 是否启用
   - Secrets 是否已配置

### 第三步：开始协同开发

```bash
# 创建第一个功能分支
collab new my-first-feature

# 开发代码...
git add .
git commit -m "feat: add my feature"

# 推送并创建PR
collab push
```

---

## 🏗️ 系统架构

### 组件概览

```
双人协同开发系统
├── 🔄 CI/CD自动化
│   ├── PR检查流程 (.github/workflows/pr-check.yml)
│   └── 生产部署流程 (.github/workflows/deploy-cicd.yml)
│
├── 🛠️ 本地开发工具
│   ├── Git Hooks (防止错误操作)
│   ├── 便捷命令 (collab命令)
│   └── 验证脚本
│
├── 📝 标准化模板
│   └── Pull Request模板
│
└── 📚 完整文档
    ├── 快速开始指南
    ├── 协作流程指南
    ├── 工作流程图
    └── GitHub配置指南
```

### 工作流程

```
开发者A              GitHub              开发者B
   │                   │                    │
   ├─ 创建功能分支     │                    ├─ 创建修复分支
   │                   │                    │
   ├─ 开发代码         │                    ├─ 修复bug
   │                   │                    │
   ├─ 推送PR ──────────►                    │
   │                   ├─ CI自动检查        │
   │                   │  ✓ 代码质量        │
   │                   │  ✓ 构建测试        │
   │                   │                    │
   │                   │ ◄──────────────────┤ 推送PR
   │                   │                    │
   ├─ 审查B的PR        │                    ├─ 审查A的PR
   │                   │                    │
   │                   ├─ PR合并             │
   │                   │  ↓                 │
   │                   ├─ 自动部署           │
   │                   │                    │
   └─ 同步最新代码 ◄───┴───► 同步最新代码    │
```

---

## 💻 可用命令

安装后可使用以下命令：

### 基础命令

```bash
collab help          # 显示帮助信息
collab new <name>    # 创建新功能分支（自动选择类型）
collab sync          # 同步最新main分支
collab status        # 查看当前状态和分支信息
```

### PR相关

```bash
collab push          # 推送当前分支并提示创建PR
collab pr            # 快速创建Pull Request（需要gh cli）
collab review        # 拉取并审查队友的PR
```

### 维护命令

```bash
collab clean         # 清理已合并的本地分支
collab switch <name> # 切换到指定分支
```

---

## 🔄 标准工作流程

### 开发者A：添加新功能

```bash
# 1. 同步最新代码
collab sync

# 2. 创建功能分支
collab new user-authentication
# 选择类型：1 (feature)

# 3. 开发代码
cd backend
# 编写代码...
git add .
git commit -m "feat(auth): implement JWT authentication"

# 4. 定期同步main（避免冲突）
collab sync

# 5. 推送并创建PR
collab push

# 6. 创建PR（GitHub CLI）
gh pr create --fill

# 7. 等待审查和CI检查
# GitHub Actions会自动运行测试

# 8. 根据审查意见修改
# 修改代码...
git add .
git commit -m "fix: address review comments"
git push  # 自动更新PR
```

### 开发者B：修复Bug并审查

```bash
# 1. 审查开发者A的PR
collab review
# 输入PR编号
# 查看代码、测试
gh pr review --approve
# 或请求修改
gh pr review --request-changes --body "请修复XX问题"

# 2. 创建Bug修复分支
collab new fix-login-validation
# 选择类型：2 (fix)

# 3. 修复并推送
# 修复代码...
git add .
git commit -m "fix(auth): resolve login validation issue"
collab push
gh pr create --fill

# 4. 等待开发者A审查
```

### PR合并后

```bash
# 双方都同步最新代码
collab sync

# 清理已合并的分支
collab clean
```

---

## 📚 文档索引

### 新手必读

| 文档 | 内容 | 阅读时间 |
|------|------|---------|
| **TEAM_COLLABORATION_QUICKSTART.md** | 5分钟快速开始 | 5分钟 |
| **COLLABORATION_GUIDE.md** | 完整协作指南 | 30分钟 |
| **WORKFLOW_DIAGRAM.md** | 可视化流程图 | 10分钟 |

### 管理员配置

| 文档 | 内容 | 用途 |
|------|------|------|
| **GITHUB_SETTINGS.md** | GitHub仓库配置 | 首次设置 |

### 参考资料

- **CLAUDE.md** - 项目开发指南
- **docs/PRODUCTION_DEPLOYMENT_PLAN.md** - 生产部署计划
- **.github/workflows/** - CI/CD配置

---

## 🎯 关键原则

### ✅ 必须做的

1. **永远通过PR合并代码**
   - 创建功能分支 → 开发 → PR → 审查 → 合并
   - 不要直接推送到main（Git Hooks会阻止）

2. **认真审查每个PR**
   - 检查功能性、代码质量、测试
   - 所有讨论必须解决
   - 至少1个批准

3. **保持PR小而聚焦**
   - 一个PR只做一件事
   - 最好 < 500行代码变更
   - 更容易审查和合并

4. **定期同步main**
   - 每天至少同步1次
   - 避免长期分支分离
   - 减少合并冲突

5. **良好的提交信息**
   - 遵循 Conventional Commits
   - `feat:`, `fix:`, `docs:`, `refactor:` 等

### ❌ 禁止做的

1. **直接推送到main分支**
   - Git Hooks会阻止
   - GitHub分支保护会拒绝

2. **跳过CI检查**
   - 所有PR必须通过CI
   - 不要合并失败的PR

3. **忽视审查意见**
   - 认真对待每个评论
   - 及时响应和修改

4. **强制推送到共享分支**
   - 自己的功能分支可以
   - main/develop绝对不行

---

## 🐛 故障排除

### 问题1：推送被拒绝

```bash
❌ 错误：不允许直接推送到main分支！
```

**解决**：
```bash
# 创建功能分支
git checkout -b feature/my-feature
git push origin feature/my-feature
```

### 问题2：PR有冲突

```bash
This branch has conflicts that must be resolved
```

**解决**：
```bash
# 同步最新main
git fetch origin main
git rebase origin/main

# 解决冲突后
git add .
git rebase --continue
git push --force
```

### 问题3：CI检查失败

**解决**：
```bash
# 查看CI日志找到错误
# 本地修复问题
git add .
git commit -m "fix: resolve CI error"
git push  # 自动重新触发CI
```

### 问题4：collab命令不存在

**解决**：
```bash
# 重新运行安装脚本
bash scripts/setup-collaboration.sh

# 重新加载shell
source ~/.zshrc
```

---

## 🔧 高级功能

### 使用GitHub CLI

```bash
# 安装
brew install gh
gh auth login

# 创建PR
gh pr create --fill

# 审查PR
gh pr list
gh pr checkout 123
gh pr review --approve

# 合并PR
gh pr merge 123 --squash
```

### Git Worktree（多任务并行）

```bash
# 创建多个工作树
git worktree add ../feature-1 -b feature/task-1
git worktree add ../feature-2 -b feature/task-2

# 在不同目录同时开发
cd ../feature-1  # 开发任务1
cd ../feature-2  # 开发任务2
```

### 自定义Git别名

```bash
git config --global alias.co checkout
git config --global alias.st status
git config --global alias.lg "log --oneline --graph --all"
```

---

## 📊 CI/CD流程说明

### PR检查流程（自动）

当创建或更新PR时，自动运行：

1. **代码质量检查**
   - Go代码格式检查（gofmt）
   - Go代码静态分析（go vet）
   - 前端代码检查（ESLint）

2. **后端构建和测试**
   - 下载依赖
   - 运行单元测试
   - 生成覆盖率报告
   - 构建二进制文件

3. **前端构建和测试**
   - 安装依赖
   - 运行单元测试
   - TypeScript类型检查
   - 生产构建

4. **PR检查总结**
   - 汇总所有检查结果
   - 只有全部通过才能合并

### 生产部署流程（自动）

当PR合并到main后，自动：

1. **构建后端**
   - Go二进制文件（Linux/amd64）

2. **构建前端**
   - React生产构建

3. **构建Docker镜像**
   - 后端镜像
   - 前端镜像

4. **部署到生产**
   - 上传到服务器
   - 运行部署脚本
   - 健康检查

5. **失败自动回滚**
   - 如果部署失败，自动回滚到上一版本

---

## 🎓 学习资源

### 推荐阅读

1. **Git工作流**
   - [GitHub Flow](https://guides.github.com/introduction/flow/)
   - [Git分支管理](https://git-scm.com/book/zh/v2)

2. **代码审查**
   - [Google代码审查指南](https://google.github.io/eng-practices/review/)
   - [如何进行代码审查](https://github.com/features/code-review)

3. **Conventional Commits**
   - [规范说明](https://www.conventionalcommits.org/)

### 常用链接

- **项目仓库**: https://github.com/<username>/<repo>
- **CI/CD状态**: https://github.com/<username>/<repo>/actions
- **生产环境**: https://proj.joylodging.com

---

## 📞 获取帮助

### 内部文档

```bash
# 查看命令帮助
collab help

# 验证环境
bash scripts/verify-collaboration-setup.sh

# 查看完整指南
cat docs/COLLABORATION_GUIDE.md
```

### 外部资源

- GitHub文档: https://docs.github.com/
- Git文档: https://git-scm.com/doc
- GitHub CLI: https://cli.github.com/

---

## 📈 下一步

### 对于新手

1. **阅读快速开始指南**
   ```bash
   cat docs/TEAM_COLLABORATION_QUICKSTART.md
   ```

2. **尝试创建第一个PR**
   - 从简单任务开始
   - 熟悉整个流程
   - 体验代码审查

### 对于团队

1. **制定团队规范**
   - 代码风格指南
   - PR大小限制
   - 审查响应时间

2. **定期回顾**
   - 每周同步进度
   - 讨论改进点
   - 优化工作流程

---

**祝你和队友协同开发愉快！🚀**

---

## 📝 维护记录

| 日期 | 版本 | 说明 |
|------|------|------|
| 2025-11-18 | v1.0 | 初始版本，完整协同开发系统 |

---

**最后更新**: 2025-11-18
**维护者**: AI项目开发团队
