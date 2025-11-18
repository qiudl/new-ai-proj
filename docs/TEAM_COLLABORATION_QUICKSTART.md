# 🤝 双人协同开发 - 快速开始指南

> 5分钟快速设置双人协同开发环境

---

## 🚀 立即开始（3步）

### 步骤1：运行自动安装脚本

```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj

# 一键安装所有协同开发工具
bash scripts/setup-collaboration.sh
```

**这个脚本会自动**：
- ✅ 安装Git Hooks（防止错误操作）
- ✅ 设置便捷命令别名
- ✅ 检查开发环境
- ✅ 创建配置文件示例

### 步骤2：重新加载Shell

```bash
# macOS/Linux
source ~/.zshrc
# 或
source ~/.bashrc
```

### 步骤3：开始开发

```bash
# 创建功能分支
collab new my-awesome-feature

# 开发代码...
# 编写代码、测试、提交

# 推送并创建PR
collab push
```

✅ **完成！你现在可以开始协同开发了**

---

## 📚 常用命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `collab new <name>` | 创建新功能分支 | `collab new user-profile` |
| `collab sync` | 同步最新main分支 | `collab sync` |
| `collab status` | 查看当前状态 | `collab status` |
| `collab push` | 推送并提示创建PR | `collab push` |
| `collab pr` | 快速创建Pull Request | `collab pr` |
| `collab review` | 审查队友的PR | `collab review` |
| `collab clean` | 清理已合并的分支 | `collab clean` |
| `collab help` | 显示帮助信息 | `collab help` |

---

## 🔄 典型工作流

### 开发者A：添加新功能

```bash
# 1. 同步最新代码
collab sync

# 2. 创建功能分支
collab new user-authentication

# 3. 开发代码
cd backend
# 编写代码...
git add .
git commit -m "feat(auth): implement JWT authentication"

# 4. 推送并创建PR
collab push

# 5. 在GitHub创建PR（或使用gh cli）
gh pr create --fill

# 6. 等待开发者B审查
```

### 开发者B：修复Bug并审查A的PR

```bash
# 1. 同步最新代码
collab sync

# 2. 创建修复分支
collab new fix-login-validation

# 3. 修复bug
cd frontend/src
# 修复代码...
git add .
git commit -m "fix(auth): resolve login validation issue"

# 4. 推送并创建PR
collab push

# 5. 审查开发者A的PR
collab review
# 选择PR编号
# 查看代码、测试、添加评论
gh pr review --approve
# 或请求修改
gh pr review --request-changes --body "请修复XX问题"
```

---

## 🎯 关键规则

### ✅ 必须做的

1. **永远通过PR合并代码**
   - ❌ 不要直接推送到main
   - ✅ 创建功能分支 → PR → 审查 → 合并

2. **每个PR必须经过审查**
   - 至少1个团队成员批准
   - 所有CI检查通过
   - 讨论已解决

3. **保持PR小而聚焦**
   - 一个PR只做一件事
   - 最好 < 500行代码变更
   - 更易审查和合并

4. **定期同步main分支**
   - 每天至少同步1次
   - 避免长期分支分离
   - 减少合并冲突

5. **良好的沟通**
   - PR描述清晰
   - 及时响应审查意见
   - 遇到问题主动沟通

### ❌ 禁止做的

1. **直接推送到main分支**
   - Git Hooks会阻止
   - 如果绕过会触发警告

2. **跳过CI检查**
   - 所有PR必须通过CI
   - 不要合并失败的PR

3. **忽视审查意见**
   - 认真对待每个评论
   - 必须解决所有讨论

4. **强制推送到共享分支**
   - 自己的功能分支可以
   - main/develop绝对不行

---

## 🔧 环境配置

### 后端开发环境

```bash
cd backend

# 1. 复制配置文件
cp .env.local.example .env.local

# 2. 修改配置
vim .env.local

# 3. 启动开发服务器
air
# 或
go run main.go
```

### 前端开发环境

```bash
cd frontend

# 1. 安装依赖
npm install

# 2. 复制配置文件
cp .env.local.example .env.local

# 3. 启动开发服务器
npm start
```

### Docker开发环境（推荐）

```bash
# 启动完整开发环境
docker-compose -f docker-compose.dev.yml up -d

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f backend

# 停止服务
docker-compose -f docker-compose.dev.yml down
```

---

## 🐛 常见问题

### Q1: 推送到main被拒绝

**问题**：
```
❌ 错误：不允许直接推送到main分支！
```

**解决**：
```bash
# 1. 创建功能分支
git checkout -b feature/my-feature

# 2. 推送功能分支
git push origin feature/my-feature

# 3. 在GitHub创建PR
```

### Q2: PR有冲突

**问题**：
```
This branch has conflicts that must be resolved
```

**解决**：
```bash
# 1. 同步最新main
git fetch origin main

# 2. Rebase到最新main
git rebase origin/main

# 3. 解决冲突
# 编辑冲突文件

# 4. 继续rebase
git add .
git rebase --continue

# 5. 强制推送（更新PR）
git push --force
```

### Q3: CI检查失败

**问题**：
```
❌ Build backend - Failed
```

**解决**：
```bash
# 1. 查看CI日志找到错误

# 2. 本地修复问题

# 3. 提交修复
git add .
git commit -m "fix: resolve CI build error"

# 4. 推送（自动更新PR和触发CI）
git push
```

### Q4: 如何测试队友的代码

**方法1 - GitHub CLI**：
```bash
# 检出PR分支
gh pr checkout 123

# 测试
npm start
# 或
go run main.go
```

**方法2 - 手动**：
```bash
# 拉取远程分支
git fetch origin
git checkout -b test-pr origin/feature/their-branch

# 测试
npm start
```

---

## 📊 审查清单

### 代码审查时检查

- [ ] **功能性**
  - 代码实现了PR描述的功能
  - 没有引入新bug
  - 边界情况已处理

- [ ] **代码质量**
  - 代码清晰易懂
  - 遵循项目编码规范
  - 没有重复代码

- [ ] **测试**
  - 包含必要的测试
  - 测试覆盖充分
  - 本地测试通过

- [ ] **安全性**
  - 没有硬编码敏感信息
  - 输入验证充分
  - 没有常见安全漏洞

- [ ] **性能**
  - 没有明显性能问题
  - 数据库查询优化
  - 适当使用缓存

---

## 🎉 下一步

### 新手建议

1. **阅读完整指南**
   ```bash
   cat docs/COLLABORATION_GUIDE.md
   ```

2. **查看工作流程图**
   ```bash
   cat docs/WORKFLOW_DIAGRAM.md
   ```

3. **尝试创建第一个PR**
   - 从简单任务开始
   - 熟悉整个流程
   - 体验代码审查

### 高级技巧

1. **安装GitHub CLI**
   ```bash
   brew install gh
   gh auth login
   ```

2. **使用Git Worktree（多任务并行）**
   ```bash
   # 在不同目录同时开发多个功能
   git worktree add ../feature-1 -b feature/task-1
   git worktree add ../feature-2 -b feature/task-2
   ```

3. **自定义Git别名**
   ```bash
   git config --global alias.co checkout
   git config --global alias.br branch
   git config --global alias.ci commit
   git config --global alias.st status
   ```

---

## 📞 获取帮助

**问题或建议**：
- 查看完整文档：`docs/COLLABORATION_GUIDE.md`
- 工作流程图：`docs/WORKFLOW_DIAGRAM.md`
- 项目文档：`docs/`
- 联系团队成员

**有用的资源**：
- GitHub文档：https://docs.github.com/
- Git文档：https://git-scm.com/doc
- Conventional Commits：https://www.conventionalcommits.org/

---

**祝你协同开发愉快！🚀**
