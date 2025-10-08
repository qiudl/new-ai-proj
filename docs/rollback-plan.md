# TaskDetail全量替换回滚方案

## 🎯 方案概述

本文档定义了TaskDetail全量替换过程中的回滚策略和执行步骤,确保在出现问题时能够快速恢复到稳定状态。

## 📊 回滚触发条件

### 🔴 紧急回滚 (立即执行)
满足以下任一条件时,立即执行回滚:

1. **系统崩溃**: 应用无法访问或频繁崩溃
2. **数据丢失**: 发现数据丢失或损坏
3. **严重安全漏洞**: 发现Critical级别安全问题
4. **错误率飙升**: 错误率 > 5%
5. **核心功能失效**: 任务创建/编辑/删除等核心功能不可用

### 🟡 计划回滚 (评估后执行)
满足以下条件时,评估后决定是否回滚:

1. **错误率超标**: 错误率 1-5%
2. **性能下降**: P95响应时间 > 1000ms
3. **用户投诉**: 大量用户反馈问题
4. **业务影响**: 影响关键业务流程

## 🔄 回滚级别

### Level 1: 灰度回滚 (最快)
**执行时间**: 1分钟
**适用场景**: 灰度发布阶段,问题影响范围可控

**步骤**:
1. 访问灰度管理面板: `http://localhost:3000/admin/gray-release`
2. 将灰度比例降低:
   - 当前 → 50% → 20% → 5% → 0%
3. 观察系统指标是否恢复正常
4. 如需要,将特性完全关闭

**操作示例**:
```typescript
// 方式1: 通过管理面板UI操作
// 访问 http://localhost:3000/admin/gray-release
// 点击"关闭灰度 (0%)"按钮

// 方式2: 通过浏览器Console
FeatureFlagService.setRolloutPercentage(FeatureFlag.NEW_TASK_DETAIL, 0);
FeatureFlagService.setEnabled(FeatureFlag.NEW_TASK_DETAIL, false);
```

### Level 2: 路由回滚 (快速)
**执行时间**: 5-10分钟
**适用场景**: 全量发布后,需要快速切回旧版本

**步骤**:
1. 修改路由配置
2. 重新构建和部署
3. 验证回滚成功

**代码修改**:
```typescript
// frontend/src/App.tsx

// 回滚前 (新版本)
<Route
  path="/projects/:projectId/tasks/:taskId"
  element={<TaskDetailPageRefactored />}
/>

// 回滚后 (旧版本)
<Route
  path="/projects/:projectId/tasks/:taskId"
  element={<TaskDetailPageNew />}
/>
```

**部署命令**:
```bash
# 1. 修改代码后构建
npm run build

# 2. 部署到生产环境
# (根据实际部署方式执行)
```

### Level 3: Git回滚 (完整)
**执行时间**: 15-30分钟
**适用场景**: 需要完整恢复到之前的稳定版本

**步骤**:

#### 3.1 查找回滚目标
```bash
# 查看最近的提交历史
git log --oneline -20

# 查找Phase 3之前的稳定版本
git log --grep="Phase 2" --oneline
```

#### 3.2 执行Git回滚
```bash
# 方式1: 软回滚 (保留代码修改,可以调整后重新提交)
git reset --soft <commit-hash>

# 方式2: 硬回滚 (完全恢复,丢弃所有修改)
git reset --hard <commit-hash>

# 方式3: Revert (创建新提交来撤销)
git revert <commit-hash>
```

#### 3.3 恢复特定文件
如果只需要恢复部分文件:
```bash
# 恢复TaskDetail相关文件
git checkout <stable-commit> -- frontend/src/pages/TaskDetailPageNew.tsx
git checkout <stable-commit> -- frontend/src/App.tsx
git checkout <stable-commit> -- frontend/src/routes/TaskDetailRouter.tsx

# 提交恢复
git add .
git commit -m "回滚: 恢复TaskDetail旧版本"
```

#### 3.4 强制推送到远程 (谨慎!)
```bash
# ⚠️ 警告: 这会改写远程历史,需要团队协调
git push origin main --force

# 更安全的方式: 使用force-with-lease
git push origin main --force-with-lease
```

## 🛡️ 回滚验证清单

### 功能验证
- [ ] 任务列表正常加载
- [ ] 任务详情页正常打开
- [ ] 任务创建功能正常
- [ ] 任务编辑功能正常
- [ ] 任务删除功能正常
- [ ] 子任务管理正常
- [ ] 文档关联功能正常
- [ ] 计时器功能正常

### 性能验证
- [ ] 页面加载时间 < 2秒
- [ ] API响应时间 < 500ms
- [ ] 无明显卡顿
- [ ] 内存使用正常

### 数据验证
- [ ] 无数据丢失
- [ ] 数据显示正确
- [ ] 数据更新正常保存

## 📝 回滚执行记录模板

```markdown
## 回滚记录 #<ID>

**执行时间**: YYYY-MM-DD HH:mm:ss
**执行人**: <姓名>
**回滚级别**: Level 1/2/3
**触发原因**: <具体原因>

### 问题描述
<详细描述导致回滚的问题>

### 回滚步骤
1. <执行的具体步骤1>
2. <执行的具体步骤2>
...

### 验证结果
- [ ] 功能验证: 通过/失败
- [ ] 性能验证: 通过/失败
- [ ] 数据验证: 通过/失败

### 影响范围
- 影响用户数: <数量>
- 影响时长: <分钟>
- 数据影响: 有/无

### 后续行动
- [ ] 问题根因分析
- [ ] 修复方案制定
- [ ] 回归测试
- [ ] 重新发布

**回滚状态**: 成功/失败
**备注**: <其他说明>
```

## 🔍 回滚后问题排查

### 1. 确认回滚成功
```bash
# 检查当前代码版本
git log -1

# 检查运行的代码
curl http://localhost:3000/static/js/main.*.js | grep "TaskDetailPageNew"

# 检查浏览器Console
# 应该看到旧版本的组件名称
```

### 2. 收集问题信息
- [ ] 保存错误日志
- [ ] 保存性能数据
- [ ] 保存用户反馈
- [ ] 截图/录屏问题现场

### 3. 问题分析
- 问题是否可复现?
- 问题影响范围?
- 是代码问题还是环境问题?
- 是否有临时解决方案?

## 📞 应急联系人

### 技术团队
- **前端负责人**: [姓名] - [电话]
- **后端负责人**: [姓名] - [电话]
- **运维负责人**: [姓名] - [电话]

### 业务团队
- **产品经理**: [姓名] - [电话]
- **业务负责人**: [姓名] - [电话]

### 升级路径
1. 开发人员发现问题 → 团队Lead
2. 团队Lead评估 → 技术负责人
3. 技术负责人决策 → 执行回滚
4. 严重问题 → 通知业务团队

## 🎯 回滚成功标准

- ✅ 系统恢复正常访问
- ✅ 错误率降至正常水平 (< 0.1%)
- ✅ 性能指标恢复正常
- ✅ 用户可以正常使用
- ✅ 无数据丢失或损坏
- ✅ 所有核心功能可用

## 📋 预防措施

### 发布前
- [ ] 充分的灰度测试
- [ ] 完整的回归测试
- [ ] 性能基准测试
- [ ] 备份关键数据

### 发布时
- [ ] 低峰期发布
- [ ] 分步骤执行
- [ ] 实时监控
- [ ] 团队待命

### 发布后
- [ ] 持续监控24小时
- [ ] 收集用户反馈
- [ ] 性能数据分析
- [ ] 准备快速修复

## 🔗 相关资源

- [灰度管理面板](http://localhost:3000/admin/gray-release)
- [Phase 3验证报告](./phase3-validation-report.md)
- [Phase 4实施方案](./task-2489-design.md)
- [错误监控Dashboard](链接)
- [性能监控Dashboard](链接)

---

**文档状态**: ✅ 已完成
**最后更新**: 2025-10-03
**维护人**: 前端团队

🤖 Generated with [Claude Code](https://claude.com/claude-code)
