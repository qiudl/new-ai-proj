# 双人协同开发指南

## 📋 目录
- [开发流程](#开发流程)
- [分支策略](#分支策略)
- [代码审查](#代码审查)
- [冲突解决](#冲突解决)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 🚀 开发流程

### 标准工作流

```bash
# 1️⃣ 同步最新代码
git checkout main
git pull origin main

# 2️⃣ 创建功能分支（命名规范：类型/简短描述）
git checkout -b feature/user-profile-page
# 或
git checkout -b fix/login-bug
git checkout -b refactor/api-structure

# 3️⃣ 开发代码
# 编写代码、测试、提交...

# 4️⃣ 定期同步main分支（避免长时间分离）
git fetch origin main
git rebase origin/main
# 或使用merge（更安全）
git merge origin/main

# 5️⃣ 推送到远程
git push origin feature/user-profile-page

# 6️⃣ 在GitHub创建Pull Request
# 标题：简洁描述功能
# 描述：使用PR模板填写详细信息

# 7️⃣ 等待审查和CI检查
# ✅ 所有CI检查必须通过
# ✅ 至少1个审查批准

# 8️⃣ 合并到main（使用Squash and merge）
# 自动触发CI/CD部署到生产环境

# 9️⃣ 删除已合并的分支
git branch -d feature/user-profile-page
git push origin --delete feature/user-profile-page
```

---

## 🌿 分支策略

### 分支类型

| 分支类型 | 命名规范 | 示例 | 用途 |
|---------|---------|------|------|
| **main** | `main` | - | 生产分支，始终可部署 |
| **功能分支** | `feature/描述` | `feature/user-auth` | 新功能开发 |
| **修复分支** | `fix/描述` | `fix/login-validation` | Bug修复 |
| **热修复** | `hotfix/描述` | `hotfix/security-patch` | 紧急生产修复 |
| **重构分支** | `refactor/描述` | `refactor/api-cleanup` | 代码重构 |
| **文档分支** | `docs/描述` | `docs/update-readme` | 文档更新 |

### 分支保护规则

**main分支受保护**：
- ❌ 禁止直接推送
- ✅ 必须通过Pull Request
- ✅ 需要1个审查批准
- ✅ 必须通过CI检查
- ✅ 必须解决所有讨论

---

## 👥 代码审查

### 审查检查清单

**功能性**：
- [ ] 代码实现了PR描述的功能
- [ ] 没有引入新的bug
- [ ] 边界情况已处理

**代码质量**：
- [ ] 代码清晰易懂
- [ ] 遵循项目编码规范
- [ ] 没有重复代码
- [ ] 函数/组件职责单一

**测试**：
- [ ] 包含必要的单元测试
- [ ] 测试覆盖率合理
- [ ] 手动测试通过

**安全性**：
- [ ] 没有硬编码敏感信息
- [ ] 输入验证充分
- [ ] 没有SQL注入/XSS漏洞

**性能**：
- [ ] 没有明显性能问题
- [ ] 数据库查询优化
- [ ] 适当使用缓存

### 审查流程

```bash
# 审查者：拉取PR分支
git fetch origin
git checkout feature/user-profile-page

# 本地测试
cd backend && go run main.go
cd ../frontend && npm start

# 在GitHub PR页面：
# 1. 查看代码变更
# 2. 添加评论和建议
# 3. 批准或请求修改
```

### 评论规范

```markdown
**必须修改（Blocking）**：
🔴 这里有SQL注入风险，需要使用参数化查询

**建议（Non-blocking）**：
💡 建议：这个函数可以拆分为更小的函数提高可读性

**提问**：
❓ 这里为什么使用异步处理？

**赞扬**：
👍 这个错误处理很优雅！
```

---

## 🔧 冲突解决

### 场景1：同时修改不同文件

```bash
# 无冲突，自动合并
git merge origin/main
# 或
git rebase origin/main
```

### 场景2：同时修改同一文件不同区域

```bash
# 可能无冲突或有简单冲突
git merge origin/main
# 解决冲突后
git add .
git commit -m "Merge main and resolve conflicts"
```

### 场景3：同时修改同一文件相同区域

```bash
# 1. 拉取最新main
git fetch origin main

# 2. 尝试rebase（推荐）
git rebase origin/main

# 3. 遇到冲突时
# Git会暂停，显示冲突文件

# 4. 手动解决冲突
# 编辑冲突文件，选择保留的代码
<<<<<<< HEAD
你的代码
=======
别人的代码
>>>>>>> origin/main

# 5. 标记为已解决
git add conflicted-file.go
git rebase --continue

# 6. 如果rebase太复杂，可以放弃重来
git rebase --abort
# 改用merge
git merge origin/main
```

### 预防冲突的策略

1. **频繁同步**：每天至少同步一次main分支
2. **小而频繁的提交**：避免大型长期分支
3. **沟通协调**：修改共享文件前先沟通
4. **模块化设计**：减少文件间耦合

---

## ✨ 最佳实践

### Commit规范（Conventional Commits）

```bash
# 格式：<类型>(<范围>): <简短描述>
#
# <详细描述>（可选）
#
# <footer>（可选）

git commit -m "feat(auth): add JWT token refresh mechanism

- Implement refresh token rotation
- Add token expiration validation
- Update auth middleware

Closes #123"
```

**类型（Type）**：
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构
- `test`: 添加测试
- `chore`: 构建/工具变更
- `perf`: 性能优化

### 代码审查时机

| 时机 | 操作 |
|------|------|
| **创建PR后** | 立即通知审查者 |
| **CI检查通过后** | 开始详细审查 |
| **修改代码后** | 重新审查变更部分 |
| **讨论解决后** | 最终批准 |

### 紧急修复流程（Hotfix）

```bash
# 1. 从main创建hotfix分支
git checkout -b hotfix/critical-security-patch main

# 2. 快速修复和测试
# 编写代码...

# 3. 创建PR，标记为紧急
# 标题：🚨 HOTFIX: Critical security patch

# 4. 简化审查流程（但不能跳过）
# 快速审查 → 合并 → 立即部署

# 5. 如果有develop分支，也要合并回去
git checkout develop
git merge hotfix/critical-security-patch
```

### 环境管理

```bash
# 开发者A的环境
.env.local.devA

# 开发者B的环境
.env.local.devB

# 不要提交到Git
echo ".env.local*" >> .gitignore
```

---

## 🛡️ 防止错误操作

### 设置Git Hooks

在 `.git/hooks/pre-push` 添加：

```bash
#!/bin/bash

# 获取当前分支
current_branch=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

# 阻止直接推送到main
if [ "$current_branch" = "main" ]; then
    echo "❌ 错误：不允许直接推送到main分支！"
    echo "请使用Pull Request流程："
    echo "  1. 创建功能分支"
    echo "  2. 推送到远程"
    echo "  3. 在GitHub创建PR"
    exit 1
fi

exit 0
```

使其可执行：
```bash
chmod +x .git/hooks/pre-push
```

---

## 📊 协同开发监控

### 使用GitHub Insights

1. **Network Graph**：可视化分支历史
   - Repository → Insights → Network

2. **Code Frequency**：代码变更频率
   - 查看开发活跃度

3. **Contributors**：贡献统计
   - 查看每个人的贡献

### 日常沟通

**每日站会（可选）**：
- 昨天完成了什么
- 今天计划做什么
- 遇到什么阻碍

**Slack/微信工作群**：
- PR已创建，请审查
- 我在修改XX文件，注意冲突
- 发现了一个bug，我来修复

---

## ❓ 常见问题

### Q1: PR被拒绝后怎么办？

```bash
# 在原分支上继续修改
git checkout feature/user-profile-page

# 修改代码...

# 提交修改
git add .
git commit -m "fix: address review comments"

# 推送（会自动更新PR）
git push origin feature/user-profile-page
```

### Q2: 如何同步别人的最新代码？

```bash
# 方法1：直接拉取（如果没有本地修改）
git pull origin main

# 方法2：保存工作进度
git stash
git pull origin main
git stash pop

# 方法3：rebase（保持提交历史清晰）
git fetch origin
git rebase origin/main
```

### Q3: 误提交到main怎么办？

```bash
# 如果还没推送
git reset --soft HEAD~1  # 撤销提交，保留修改
git checkout -b feature/my-feature  # 创建正确的分支

# 如果已经推送（需要协调）
# 联系另一个开发者
# 使用 git revert 或 git reset --hard（谨慎！）
```

### Q4: 如何查看别人的分支？

```bash
# 获取所有远程分支
git fetch --all

# 查看远程分支列表
git branch -r

# 检出别人的分支
git checkout -b local-branch-name origin/remote-branch-name
```

---

## 📝 Pull Request模板

在 `.github/PULL_REQUEST_TEMPLATE.md` 创建：

```markdown
## 变更描述
<!-- 简要描述这个PR做了什么 -->

## 变更类型
- [ ] 新功能（feature）
- [ ] Bug修复（fix）
- [ ] 重构（refactor）
- [ ] 文档（docs）
- [ ] 其他

## 关联Issue
<!-- 如果有相关issue，请关联 -->
Closes #

## 测试
- [ ] 已添加/更新单元测试
- [ ] 已进行手动测试
- [ ] 所有测试通过

## 截图（如果适用）
<!-- 添加截图帮助审查者理解变更 -->

## 部署注意事项
- [ ] 需要数据库迁移
- [ ] 需要环境变量更新
- [ ] 需要依赖更新
- [ ] 无特殊要求

## 审查检查清单
- [ ] 代码遵循项目规范
- [ ] 已自我审查代码
- [ ] 已添加必要的注释
- [ ] 文档已更新
- [ ] 无新的警告产生
```

---

## 🎯 总结

**关键原则**：
1. ✅ **永远不要直接推送到main**
2. ✅ **小而频繁的PR优于大型PR**
3. ✅ **认真审查每个PR**
4. ✅ **保持良好的沟通**
5. ✅ **CI必须通过才能合并**

**每日工作流**：
```
早上：同步main → 创建/切换分支 → 开发
中午：提交代码 → 推送
下午：继续开发 → 创建PR
晚上：审查对方PR → 合并
```

---

**有问题随时沟通，Happy Coding! 🚀**
