---
task_id: 599
title: "阶段4: 数据库扩展和安全Token管理"
status: "todo"
created_date: "2025-08-05 16:02:47"
updated_date: "2025-08-05 16:02:47"
---

# 阶段4: 数据库扩展和安全Token管理

## 任务描述
数据库扩展和Token安全管理的实现：

## 技术实现要求
1. **扩展users表添加Google认证相关字段**
   - google_calendar_enabled BOOLEAN DEFAULT FALSE
   - google_access_token TEXT (AES加密存储)
   - google_refresh_token TEXT (AES加密存储)  
   - google_token_expires_at TIMESTAMP
   - google_calendar_id VARCHAR(255)
   - google_sync_enabled BOOLEAN DEFAULT FALSE
   - google_last_sync_at TIMESTAMP

2. **Token的AES加密存储**
   - 实现AES-256-GCM加密算法
   - 使用随机生成的IV向量
   - 安全的密钥管理和轮转
   - 加密/解密性能优化

3. **自动刷新访问令牌机制**
   - 实现RefreshGoogleToken()函数
   - Token过期时间检查逻辑
   - 自动刷新失败时的处理
   - 支持批量Token刷新

4. **Token过期检测和处理**
   - 定时任务检查Token有效性
   - API调用前的Token验证
   - 过期Token的自动刷新
   - 刷新失败时的用户通知

## 验收标准
- [ ] 数据库表结构修改完成，包含所有必要字段
- [ ] Token加密存储功能完整且安全
- [ ] 自动刷新机制能正常工作
- [ ] Token过期检测准确及时
- [ ] 数据库迁移脚本完整
- [ ] 加密密钥管理安全
- [ ] 支持数据库事务操作

## 预估工时
6小时

## 关键交付物
- 数据库迁移脚本
- models/google_token.go模型
- utils/encryption.go加密工具
- services/token_refresh.go刷新服务
- 定时任务配置

## 详细内容
请在这里添加任务的详细内容...

---
*最后更新: 2025-08-05 16:02:47*