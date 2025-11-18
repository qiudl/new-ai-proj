# GitHub Secrets 快速配置指南

## 🚀 5 分钟快速配置

### 步骤 1: 打开 GitHub Secrets 配置页面

1. 进入你的 GitHub 仓库
2. 点击 `Settings` 标签
3. 左侧菜单选择 `Secrets and variables` → `Actions`
4. 点击 `New repository secret` 按钮

### 步骤 2: 添加 3 个必需的 Secrets

#### Secret 1: PROD_SSH_HOST

```
Name: PROD_SSH_HOST
Secret: 152.136.104.251
```

**说明**: 生产服务器IP地址

---

#### Secret 2: PROD_SSH_USER

```
Name: PROD_SSH_USER
Secret: ubuntu
```

**说明**: SSH登录用户名

---

#### Secret 3: PROD_SSH_KEY

```
Name: PROD_SSH_KEY
Secret: (见下方完整私钥内容)
```

**说明**: SSH私钥（完整内容）

**获取私钥**:
```bash
cat ~/.ssh/github_actions_cicd
```

**或者查看已保存的配置文件**:
```bash
cat /tmp/github-secrets-config.txt
```

**重要**:
- ✅ 复制完整的私钥内容（包括 `-----BEGIN OPENSSH PRIVATE KEY-----` 和 `-----END OPENSSH PRIVATE KEY-----`）
- ✅ 确保没有额外的空格或换行
- ✅ 直接粘贴到 Secret 值中

---

### 步骤 3: 验证配置

添加完 3 个 Secrets 后，你应该看到：

```
PROD_SSH_HOST     ✓ Set
PROD_SSH_USER     ✓ Set
PROD_SSH_KEY      ✓ Set
```

---

### 步骤 4: 测试连接（可选）

在本地测试 SSH 连接：

```bash
ssh -i ~/.ssh/github_actions_cicd ubuntu@152.136.104.251 "echo 'SSH connection successful!'"
```

应该看到输出：`SSH connection successful!`

---

## ✅ 配置完成！

现在你可以：

1. **手动触发部署**:
   - 进入 `Actions` 标签
   - 选择 `CI/CD Deploy to Production`
   - 点击 `Run workflow`
   - 选择 `main` 分支
   - 点击 `Run workflow` 按钮

2. **自动部署**:
   - 推送代码到 `main` 分支
   - 或者创建新的 Release

---

## 🔒 安全提示

- ✅ 私钥文件已保存在本地: `~/.ssh/github_actions_cicd`
- ✅ 临时配置文件: `/tmp/github-secrets-config.txt`
- ⚠️ 配置完成后，可以删除临时文件: `rm /tmp/github-secrets-config.txt`
- ⚠️ 不要将私钥提交到 Git 仓库
- ⚠️ 不要分享私钥给他人

---

## 📚 详细文档

需要更多信息？查看完整文档：

- **部署指南**: `docs/CICD_DEPLOYMENT_GUIDE.md`
- **Secrets 配置详解**: `docs/GITHUB_SECRETS_SETUP.md`
- **实施总结**: `CICD_IMPLEMENTATION_SUMMARY.md`

---

## 🆘 遇到问题？

### SSH 连接失败

```bash
# 重新测试连接
ssh -i ~/.ssh/github_actions_cicd -v ubuntu@152.136.104.251

# 检查公钥是否在服务器上
ssh ubuntu@152.136.104.251 "cat ~/.ssh/authorized_keys | grep github-actions"
```

### Secret 配置错误

- 检查 Secret 名称是否完全匹配（区分大小写）
- 检查 Secret 值中是否有额外的空格
- 重新复制私钥内容

### Workflow 执行失败

- 查看 GitHub Actions 日志
- 检查是否所有 3 个 Secrets 都已配置
- 验证 SSH 连接是否正常

---

**配置时间**: < 5 分钟
**难度**: ⭐⭐ (简单)
**优先级**: 🔴 高（必须完成才能使用 CI/CD）

---

**最后更新**: 2025-11-18
