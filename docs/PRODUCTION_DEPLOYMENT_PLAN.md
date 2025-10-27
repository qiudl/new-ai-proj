# Company体系清理 - 生产环境部署计划

**任务**: #2857
**创建日期**: 2025-10-27
**计划执行**: 待定
**负责人**: 后端开发团队

---

## 1. 部署前置条件检查清单

### 1.1 代码准备
- [x] 后端代码清理完成 (#2854)
- [x] 前端代码清理完成 (#2855)
- [x] API文档更新完成 (#2856)
- [x] Swagger文档重新生成
- [x] 所有代码已推送到远程仓库
- [x] 本地环境功能测试通过

### 1.2 文档准备
- [x] 迁移指南文档完成
- [x] Swagger重新生成文档完成
- [x] API变更清单完成
- [x] 测试报告完成

### 1.3 环境准备
- [x] 备份脚本准备完成
- [ ] 生产环境数据库连接测试
- [ ] 生产环境磁盘空间检查 (至少20GB可用)
- [ ] 生产环境备份执行

---

## 2. 风险评估

### 2.1 技术风险

**风险等级**: 🟡 中等

| 风险项 | 影响程度 | 可能性 | 缓解措施 |
|--------|---------|--------|----------|
| 数据迁移失败 | 高 | 低 | 完整备份 + 测试环境验证 |
| API兼容性问题 | 中 | 低 | 保留company_id向后兼容字段 |
| 前端显示异常 | 中 | 低 | 前端已完全测试 |
| 服务中断 | 中 | 中 | 选择低峰期部署，准备回滚计划 |

### 2.2 业务风险

**风险等级**: 🟢 低

- 迁移过程不涉及数据删除，只是改变引用方式
- 保留了向后兼容字段，老数据仍可正常访问
- 所有功能在测试环境已验证

---

## 3. 部署步骤

### Phase 1: 备份 (预计时间: 15分钟)

#### 3.1 检查磁盘空间
```bash
ssh ubuntu@152.136.104.251 'df -h /opt/ai-project/backups'
```

**预期结果**: 至少20GB可用空间

#### 3.2 执行数据库备份
```bash
ssh ubuntu@152.136.104.251 'cd /opt/ai-project && /opt/ai-project/deploy/tencent-cloud/scripts/backup.sh'
```

**验证备份**:
```bash
ssh ubuntu@152.136.104.251 'ls -lh /opt/ai-project/backups/ai_project_backup_* | tail -5'
```

#### 3.3 下载备份到本地
```bash
scp ubuntu@152.136.104.251:/opt/ai-project/backups/ai_project_backup_*.sql.gz \
    /Users/johnqiu/coding/www/projects/new-ai-proj/backend/backups/
```

---

### Phase 2: 代码部署 (预计时间: 10分钟)

#### 2.1 构建后端二进制文件
```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj/backend
GOOS=linux GOARCH=amd64 go build -o ai-project-backend-prod-linux
```

#### 2.2 上传到服务器
```bash
scp ai-project-backend-prod-linux \
    ubuntu@152.136.104.251:/home/ubuntu/apps/new-ai-proj/backend/main-new
```

#### 2.3 构建前端静态文件
```bash
cd /Users/johnqiu/coding/www/projects/new-ai-proj/frontend
npm run build
```

#### 2.4 上传前端文件
```bash
rsync -avz --delete build/ \
    ubuntu@152.136.104.251:/home/ubuntu/apps/new-ai-proj/frontend/build/
```

---

### Phase 3: 服务重启 (预计时间: 5分钟)

#### 3.1 重启后端服务
```bash
ssh ubuntu@152.136.104.251 'cd /home/ubuntu/apps/new-ai-proj/backend && \
    mv main main-old && \
    mv main-new main && \
    sudo systemctl restart ai-project-backend'
```

#### 3.2 验证后端服务
```bash
ssh ubuntu@152.136.104.251 'ps aux | grep ai-project-backend | grep -v grep'
```

```bash
curl -s https://proj.joylodging.com/api/v1/health
```

**预期结果**:
```json
{
  "status": "ok",
  "message": "Service is healthy",
  "service": "ai-project-backend"
}
```

#### 3.3 重启前端服务 (如果需要)
```bash
ssh ubuntu@152.136.104.251 'sudo systemctl restart nginx'
```

---

### Phase 4: 功能验证 (预计时间: 10分钟)

#### 4.1 API功能测试

**测试脚本**: 在本地创建测试脚本
```bash
cat > /tmp/test-production-api.sh << 'EOF'
#!/bin/bash

BASE_URL="https://proj.joylodging.com"

# 获取token (需要替换为实际的登录方式)
TOKEN="YOUR_PRODUCTION_TOKEN"

echo "=== 生产环境API测试 ==="
echo ""

echo "1. 健康检查:"
curl -s "$BASE_URL/api/v1/health"
echo ""

echo "2. 企业列表:"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/v1/enterprises?page=1&page_size=3"
echo ""

echo "3. 项目列表:"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/v1/projects?page=1&page_size=3"
echo ""

echo "4. 用户列表:"
curl -s -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/v1/users?page=1&page_size=3"
echo ""
EOF

chmod +x /tmp/test-production-api.sh
```

#### 4.2 前端功能测试

**测试清单**:
- [ ] 访问 https://proj.joylodging.com
- [ ] 登录系统
- [ ] 查看企业列表
- [ ] 查看项目列表
- [ ] 创建新项目（使用enterprise_id）
- [ ] 查看用户列表
- [ ] 检查企业用户的权限

#### 4.3 关键数据验证

```bash
ssh ubuntu@152.136.104.251 'docker exec -i ai_postgres_prod psql -U ai_prod_user -d ai_project_prod' << 'EOF'
-- 检查企业表数据
SELECT COUNT(*) as total_enterprises FROM enterprises WHERE deleted_at IS NULL;

-- 检查项目的enterprise_id
SELECT
    COUNT(*) as total_projects,
    COUNT(enterprise_id) as projects_with_enterprise_id
FROM projects
WHERE deleted_at IS NULL;

-- 检查用户的enterprise_id (company类型)
SELECT
    COUNT(*) as total_company_users,
    COUNT(enterprise_id) as users_with_enterprise_id
FROM users
WHERE user_type = 'company' AND deleted_at IS NULL;
EOF
```

---

### Phase 5: 监控观察 (预计时间: 30分钟)

#### 5.1 监控指标

- **后端日志**: `ssh ubuntu@152.136.104.251 'tail -f /var/log/ai-project-backend.log'`
- **Nginx日志**: `ssh ubuntu@152.136.104.251 'tail -f /var/log/nginx/access.log'`
- **系统资源**: `ssh ubuntu@152.136.104.251 'htop'`

#### 5.2 关键监控点

- [ ] 后端服务CPU使用率 < 70%
- [ ] 内存使用率 < 80%
- [ ] API响应时间 < 500ms
- [ ] 错误率 < 1%
- [ ] 无500错误

---

## 4. 回滚计划

### 4.1 回滚触发条件

- 关键功能无法使用 (企业列表、项目创建等)
- 错误率 > 5%
- 系统响应时间 > 3秒
- 出现大量500错误

### 4.2 回滚步骤 (预计时间: 5分钟)

#### Step 1: 停止服务
```bash
ssh ubuntu@152.136.104.251 'sudo systemctl stop ai-project-backend'
```

#### Step 2: 恢复旧版本代码
```bash
ssh ubuntu@152.136.104.251 'cd /home/ubuntu/apps/new-ai-proj/backend && \
    mv main main-failed && \
    mv main-old main'
```

#### Step 3: 重启服务
```bash
ssh ubuntu@152.136.104.251 'sudo systemctl start ai-project-backend'
```

#### Step 4: 验证服务
```bash
curl -s https://proj.joylodging.com/api/v1/health
```

#### Step 5: 前端回滚 (如果需要)
```bash
# 从备份恢复前端文件
rsync -avz --delete backup-build/ \
    ubuntu@152.136.104.251:/home/ubuntu/apps/new-ai-proj/frontend/build/
```

---

## 5. 部署时间建议

### 5.1 推荐时间窗口

**选项1**: 工作日凌晨 (2:00 AM - 4:00 AM)
- 优点: 用户流量最低
- 缺点: 需要半夜值班

**选项2**: 周末下午 (Saturday 2:00 PM - 4:00 PM)
- 优点: 白天操作，团队在线
- 缺点: 可能影响周末使用的用户

**推荐**: 选择周六下午，预估影响用户数量较少

### 5.2 预计总时间

| 阶段 | 预计时间 | 累计时间 |
|------|---------|---------|
| 备份 | 15分钟 | 15分钟 |
| 代码部署 | 10分钟 | 25分钟 |
| 服务重启 | 5分钟 | 30分钟 |
| 功能验证 | 10分钟 | 40分钟 |
| 监控观察 | 30分钟 | 70分钟 |

**总计**: 约70分钟 (1小时10分钟)

---

## 6. 团队分工

| 角色 | 人员 | 职责 |
|------|------|------|
| 部署负责人 | Claude Code | 执行部署脚本，监控部署过程 |
| 后端验证 | 开发团队 | API功能测试 |
| 前端验证 | 开发团队 | 前端界面测试 |
| 数据验证 | DBA | 数据库数据验证 |
| 监控观察 | 运维团队 | 系统监控，日志查看 |

---

## 7. 沟通计划

### 7.1 部署前通知

**通知时间**: 部署前24小时

**通知内容**:
```
【系统升级通知】

尊敬的用户：

我们计划于 [日期] [时间] 对系统进行升级维护，预计耗时1小时。

升级内容:
- 优化企业管理功能
- 改进系统性能
- 修复已知问题

升级期间系统可能会有短暂的服务中断，给您带来的不便敬请谅解。

技术支持团队
```

### 7.2 部署完成通知

**通知内容**:
```
【系统升级完成】

系统升级已完成，现已恢复正常服务。

如遇到任何问题，请及时联系技术支持。

谢谢您的配合！
```

---

## 8. 后续优化

### 8.1 短期优化 (1周内)

- [ ] 监控系统性能指标
- [ ] 收集用户反馈
- [ ] 修复可能出现的小问题
- [ ] 优化查询性能

### 8.2 中期优化 (1个月内)

- [ ] 移除所有向后兼容的company_id字段
- [ ] 优化数据库索引
- [ ] 添加企业相关的统计报表
- [ ] 实现企业数据隔离增强

### 8.3 长期规划 (3个月内)

- [ ] 企业分级管理
- [ ] 企业数据备份策略
- [ ] 企业权限精细化控制
- [ ] 企业数据导出功能

---

## 9. 成功标准

部署被认为成功，当满足以下所有条件:

- ✅ 所有API返回200/201状态码
- ✅ 前端界面正常显示
- ✅ 企业列表功能正常
- ✅ 项目创建使用enterprise_id成功
- ✅ 用户管理功能正常
- ✅ 无500错误
- ✅ 系统响应时间 < 500ms
- ✅ 错误率 < 1%
- ✅ 监控观察30分钟无异常

---

## 10. 部署检查清单

### 10.1 部署前

- [ ] 所有代码已合并到main分支
- [ ] 本地环境测试通过
- [ ] 团队成员已通知
- [ ] 用户已提前通知
- [ ] 备份脚本已准备
- [ ] 回滚计划已准备

### 10.2 部署中

- [ ] 数据库备份完成
- [ ] 备份文件已下载到本地
- [ ] 后端代码已构建
- [ ] 前端代码已构建
- [ ] 代码已上传到服务器
- [ ] 服务已重启
- [ ] 健康检查通过

### 10.3 部署后

- [ ] API功能测试通过
- [ ] 前端功能测试通过
- [ ] 数据验证通过
- [ ] 监控指标正常
- [ ] 日志无异常
- [ ] 用户反馈正常
- [ ] 部署文档已更新

---

## 11. 联系人

如有问题，请联系:

- **技术负责人**: @admin
- **紧急联系**: Claude Code
- **任务追踪**: #2857 (ai-proj系统)

---

**文档创建**: 2025-10-27
**最后更新**: 2025-10-27
**文档版本**: v1.0
**状态**: 待批准
