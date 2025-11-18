# GitHub仓库设置指南

> 配置GitHub仓库以支持双人协同开发

---

## 🔒 分支保护规则设置

### 1. 访问分支保护设置

1. 打开GitHub仓库页面
2. 点击 **Settings** → **Branches**
3. 点击 **Add branch protection rule**

### 2. main分支保护配置

**Branch name pattern**: `main`

#### ✅ 必须启用的规则

**Protect matching branches**:

- [x] **Require a pull request before merging**
  - [x] Require approvals: `1`
  - [x] Dismiss stale pull request approvals when new commits are pushed
  - [x] Require review from Code Owners (如果有CODEOWNERS文件)

- [x] **Require status checks to pass before merging**
  - [x] Require branches to be up to date before merging
  - **Required status checks**（添加以下检查）:
    - `code-quality`
    - `backend-test`
    - `frontend-test`
    - `pr-summary`

- [x] **Require conversation resolution before merging**
  - 确保所有讨论都已解决

- [x] **Require signed commits** (可选，增强安全性)

- [x] **Require linear history** (可选，保持清晰的提交历史)

- [x] **Do not allow bypassing the above settings**
  - 即使是管理员也必须遵守规则

#### ⚠️ 可选规则

- [ ] **Require deployments to succeed before merging**
  - 如果有staging环境，可以启用

- [ ] **Lock branch** (不推荐)
  - 完全锁定分支，只读

- [ ] **Restrict who can push to matching branches**
  - 限制特定团队成员才能推送

### 3. 保存设置

点击 **Create** 或 **Save changes**

---

## 🔐 Repository安全设置

### 1. 访问安全设置

**Settings** → **Security & analysis**

### 2. 启用安全功能

#### Dependency graph
- [x] **Enable Dependency graph**
  - 自动检测依赖关系

#### Dependabot alerts
- [x] **Enable Dependabot alerts**
  - 自动检测依赖漏洞

#### Dependabot security updates
- [x] **Enable Dependabot security updates**
  - 自动创建PR修复漏洞

#### Dependabot version updates (可选)
- [x] **Enable Dependabot version updates**
  - 自动更新依赖版本

#### Secret scanning
- [x] **Enable Secret scanning**
  - 检测提交中的密钥和凭证

---

## 🔑 Secrets配置

### 1. 访问Secrets设置

**Settings** → **Secrets and variables** → **Actions**

### 2. 添加生产环境Secrets

点击 **New repository secret**，添加以下secrets：

| Secret名称 | 说明 | 示例值 |
|-----------|------|--------|
| `PROD_SSH_HOST` | 生产服务器地址 | `your-server.com` |
| `PROD_SSH_USER` | SSH用户名 | `deploy` |
| `PROD_SSH_KEY` | SSH私钥（Base64编码） | `LS0tLS1CRU...` |
| `JWT_SECRET_PROD` | 生产环境JWT密钥 | `your-secret-key` |
| `DB_PASSWORD_PROD` | 生产数据库密码 | `secure-password` |

**重要**：
- 使用Base64编码SSH密钥：`cat ~/.ssh/id_rsa | base64`
- 确保secrets安全，不要泄露
- 定期轮换密钥

---

## 🔄 GitHub Actions配置

### 1. 启用Actions

**Settings** → **Actions** → **General**

- [x] **Allow all actions and reusable workflows**

### 2. Workflow权限

**Workflow permissions**:
- (•) **Read and write permissions**
  - 允许workflow创建PR、评论等

- [x] **Allow GitHub Actions to create and approve pull requests**

---

## 👥 协作者设置

### 1. 添加协作者

**Settings** → **Collaborators**

点击 **Add people**，输入GitHub用户名或邮箱

### 2. 设置权限

| 角色 | 权限 | 适用于 |
|------|------|--------|
| **Admin** | 完全控制 | 项目负责人 |
| **Maintain** | 管理仓库（无删除） | 高级开发者 |
| **Write** | 推送代码、合并PR | 开发者（推荐） |
| **Triage** | 管理issue和PR | 社区贡献者 |
| **Read** | 只读访问 | 观察者 |

**推荐设置**：
- 两个开发者都设置为 **Write** 权限
- 启用分支保护后，即使Write权限也不能直接推送到main

---

## 📋 Pull Request模板

### 已创建的模板

模板文件位置：`.github/PULL_REQUEST_TEMPLATE.md`

当开发者创建PR时，会自动加载此模板。

### 自定义Issue模板（可选）

创建 `.github/ISSUE_TEMPLATE/` 目录，添加：

**Bug报告模板** (`.github/ISSUE_TEMPLATE/bug_report.md`):
```markdown
---
name: Bug报告
about: 创建bug报告帮助我们改进
title: '[BUG] '
labels: bug
assignees: ''
---

**Bug描述**
简要描述bug是什么

**复现步骤**
1. 访问 '...'
2. 点击 '....'
3. 滚动到 '....'
4. 出现错误

**期望行为**
描述你期望发生什么

**截图**
如果适用，添加截图

**环境信息**
 - OS: [e.g. macOS]
 - Browser: [e.g. chrome, safari]
 - Version: [e.g. 22]
```

**功能请求模板** (`.github/ISSUE_TEMPLATE/feature_request.md`):
```markdown
---
name: 功能请求
about: 建议新功能
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

**功能描述**
你希望添加什么功能？

**使用场景**
为什么需要这个功能？

**可选方案**
是否考虑过其他解决方案？
```

---

## 🏷️ Labels标签设置

### 1. 访问标签设置

**Issues** → **Labels**

### 2. 创建标准标签

| 标签名 | 颜色 | 描述 |
|-------|------|------|
| `bug` | `#d73a4a` | Bug修复 |
| `feature` | `#a2eeef` | 新功能 |
| `enhancement` | `#84b6eb` | 功能增强 |
| `documentation` | `#0075ca` | 文档相关 |
| `refactor` | `#fbca04` | 代码重构 |
| `performance` | `#f9d0c4` | 性能优化 |
| `security` | `#ee0701` | 安全相关 |
| `urgent` | `#b60205` | 紧急 |
| `help wanted` | `#008672` | 需要帮助 |
| `good first issue` | `#7057ff` | 适合新手 |
| `wontfix` | `#ffffff` | 不会修复 |
| `duplicate` | `#cfd3d7` | 重复issue |

---

## 🔔 通知设置

### 个人通知偏好

每个开发者应该配置自己的通知：

1. 访问 **Settings** (个人设置) → **Notifications**

2. **Watching**:
   - [x] Participating and @mentions
   - [x] Custom: 选择关注的事件

3. **Email notifications**:
   - [x] Pull Request reviews
   - [x] Pull Request pushes
   - [x] Comments on Issues and Pull Requests

### 团队通知（可选）

创建 `.github/CODEOWNERS` 文件：

```
# 后端代码审查
/backend/**/*.go @developer-a @developer-b

# 前端代码审查
/frontend/**/*.tsx @developer-a @developer-b
/frontend/**/*.ts @developer-a @developer-b

# CI/CD配置
/.github/workflows/** @developer-a
/docker-compose*.yml @developer-a
/scripts/** @developer-a

# 文档
/docs/** @developer-a @developer-b
*.md @developer-a @developer-b
```

---

## 📊 Insights配置

### 启用有用的图表

**Insights** → **Settings**

- [x] **Network graph** - 查看分支历史
- [x] **Contributors** - 贡献统计
- [x] **Traffic** - 访问统计
- [x] **Dependency graph** - 依赖关系

---

## ✅ 配置验证清单

完成配置后，验证以下内容：

- [ ] main分支已受保护，无法直接推送
- [ ] PR需要至少1个审查批准
- [ ] CI检查配置正确并运行
- [ ] Secrets已正确配置
- [ ] 协作者权限设置正确
- [ ] PR模板可用
- [ ] Dependabot已启用
- [ ] 通知设置完成

---

## 🧪 测试配置

### 测试分支保护

```bash
# 尝试直接推送到main（应该失败）
git checkout main
echo "test" >> test.txt
git add test.txt
git commit -m "test"
git push origin main
# 预期：被Git Hook阻止
```

### 测试PR流程

```bash
# 创建测试分支
git checkout -b test/branch-protection
echo "test" >> test.txt
git add test.txt
git commit -m "test: verify branch protection"
git push origin test/branch-protection

# 在GitHub创建PR
# 预期：CI自动运行，需要审查才能合并
```

---

## 📚 参考文档

- [GitHub分支保护文档](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub Actions文档](https://docs.github.com/en/actions)
- [Dependabot文档](https://docs.github.com/en/code-security/dependabot)
- [CODEOWNERS文档](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)

---

**配置完成后，你的仓库将拥有企业级的协同开发保护机制！** 🎉
