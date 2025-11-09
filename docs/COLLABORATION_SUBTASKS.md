# 实时协作编辑功能 - 开发子任务清单

**父任务**: #3584 - 设计和实现实时协作编辑功能(包括后端WebSocket支持)
**创建日期**: 2025-11-08
**总预估**: 8-10天

---

## 子任务列表

### ✅ Phase 1: 依赖安装和环境配置 (1天)

**任务ID**: 待创建
**优先级**: High
**预估工时**: 1天
**状态**: Todo

#### 描述
安装前后端所需的依赖包,配置开发环境,确保所有库版本兼容。

#### 具体任务
- [ ] **前端依赖安装**
  ```bash
  cd frontend
  npm install yjs@^13.6.0
  npm install @lexical/yjs@^0.38.2
  npm install y-websocket@^1.5.0
  npm install --save-dev @types/y-websocket
  ```

- [ ] **后端依赖安装**
  ```bash
  cd backend
  go get github.com/gorilla/websocket@v1.5.1
  go mod tidy
  ```

- [ ] **验证依赖**
  - 运行 `npm run type-check` 确保无类型错误
  - 运行 `go build` 确保编译通过

- [ ] **环境变量配置**
  - 更新 `frontend/.env` 添加 `REACT_APP_WS_HOST`
  - 更新 `backend/.env` 添加 WebSocket 配置

#### 验收标准
- ✅ package.json包含所有新依赖
- ✅ go.mod包含gorilla/websocket
- ✅ TypeScript编译无错误
- ✅ Go编译无错误

---

### ✅ Phase 2: 数据库Schema创建和迁移 (0.5天)

**任务ID**: 待创建
**优先级**: High
**预估工时**: 0.5天
**依赖**: Phase 1
**状态**: Todo

#### 描述
创建协作相关的数据库表和索引,设置Redis数据结构。

#### 具体任务
- [ ] **创建迁移文件**
  - 创建目录 `backend/migrations/202511_08_01_add_collaboration_tables/`
  - 创建 `up.sql` (参考技术方案文档第3.2.1节)
  - 创建 `down.sql`

- [ ] **数据库表创建**
  - `collaboration_documents` - 协作文档表
  - `collaboration_updates` - 更新历史表
  - `collaboration_sessions` - 会话表
  - 添加索引和外键约束

- [ ] **运行迁移**
  ```bash
  # 在开发环境执行迁移
  psql -h localhost -U dev_user -d ai_project_db -f backend/migrations/202511_08_01_add_collaboration_tables/up.sql
  ```

- [ ] **Redis配置**
  - 文档Redis key结构设计
  - 设置TTL策略

- [ ] **验证数据库**
  ```sql
  \d collaboration_documents
  \d collaboration_updates
  \d collaboration_sessions
  SELECT * FROM collaboration_documents LIMIT 1;
  ```

#### 验收标准
- ✅ 3个新表创建成功
- ✅ 所有索引创建成功
- ✅ 外键约束正常工作
- ✅ 可以正常插入测试数据

#### 产出文件
- `backend/migrations/202511_08_01_add_collaboration_tables/up.sql`
- `backend/migrations/202511_08_01_add_collaboration_tables/down.sql`

---

### ✅ Phase 3: 后端WebSocket服务实现 (3天)

**任务ID**: 待创建
**优先级**: High
**预估工时**: 3天
**依赖**: Phase 2
**状态**: Todo

#### 描述
实现完整的WebSocket协作服务,包括连接管理、房间管理、Yjs协议处理、消息广播。

#### 具体任务

**Day 1: 核心服务框架**
- [ ] **创建WebSocket服务类**
  - 文件: `backend/services/collaboration_websocket_service.go`
  - 实现 `CollaborationWebSocketService` 结构体
  - 实现 `CollaborationRoom` 结构体
  - 实现 `CollaborationClient` 结构体

- [ ] **房间管理**
  - 实现 `GetOrCreateRoom()` 方法
  - 实现房间注册/注销逻辑
  - 实现 `Room.Run()` 协程

- [ ] **测试**
  ```bash
  go test ./services -v -run TestCollaborationWebSocketService
  ```

**Day 2: Yjs协议实现**
- [ ] **Sync协议**
  - 实现 `sendInitialState()` - Sync Step 1
  - 实现状态向量处理 - Sync Step 2
  - 实现 `loadDocumentState()` 从数据库加载

- [ ] **Update协议**
  - 实现 `applyUpdate()` 更新应用
  - 实现 `persistDocumentState()` 持久化
  - 实现更新广播逻辑

- [ ] **Awareness协议**
  - 实现 `broadcastAwareness()` 用户状态广播
  - 实现光标位置同步
  - 实现用户加入/离开通知

- [ ] **测试**
  ```bash
  go test ./services -v -run TestYjsProtocol
  ```

**Day 3: Handler和路由**
- [ ] **创建WebSocket Handler**
  - 文件: `backend/handlers/collaboration_ws_handler.go`
  - 实现 `HandleWebSocket()` 方法
  - 实现JWT认证集成
  - 实现权限检查

- [ ] **客户端消息处理**
  - 实现 `HandleClient()` 读取消息
  - 实现 `WritePump()` 写入消息
  - 实现心跳机制

- [ ] **创建路由**
  - 文件: `backend/routes/collaboration_routes.go`
  - 注册 `/ws/collaboration/:documentId` 路由

- [ ] **集成测试**
  ```bash
  # 启动服务器
  go run main.go

  # 使用wscat测试WebSocket连接
  wscat -c "ws://localhost:8080/ws/collaboration/1?token=<JWT_TOKEN>"
  ```

#### 验收标准
- ✅ WebSocket连接成功建立
- ✅ 多个客户端可以加入同一个房间
- ✅ 消息正确广播给其他客户端
- ✅ 文档状态正确持久化到数据库
- ✅ 断线重连后状态同步正确
- ✅ 单元测试覆盖率 > 80%

#### 产出文件
- `backend/services/collaboration_websocket_service.go`
- `backend/handlers/collaboration_ws_handler.go`
- `backend/routes/collaboration_routes.go`
- `backend/services/collaboration_websocket_service_test.go`

---

### ✅ Phase 4: 前端协作组件开发 (2天)

**任务ID**: 待创建
**优先级**: High
**预估工时**: 2天
**依赖**: Phase 3
**状态**: Todo

#### 描述
开发前端协作相关的组件、Hooks和UI,实现Yjs与Lexical的集成。

#### 具体任务

**Day 1: 核心Hook和编辑器**
- [ ] **创建协作Hook**
  - 文件: `frontend/src/hooks/useCollaboration.ts`
  - 实现Yjs文档创建
  - 实现WebSocket Provider连接
  - 实现用户awareness管理
  - 实现连接状态管理

- [ ] **创建协作编辑器组件**
  - 文件: `frontend/src/components/CollaborativeEditor/CollaborativeEditor.tsx`
  - 集成Lexical + Yjs
  - 实现CollaborationPlugin
  - 保留原有编辑器功能

- [ ] **测试Hook**
  ```bash
  npm test -- useCollaboration.test.ts
  ```

**Day 2: UI组件和样式**
- [ ] **活跃用户面板**
  - 文件: `frontend/src/components/CollaborativeEditor/ActiveUsersPanel.tsx`
  - 显示在线用户列表
  - 显示用户头像和颜色
  - 实时更新用户状态

- [ ] **连接状态指示器**
  - 文件: `frontend/src/components/CollaborativeEditor/ConnectionStatus.tsx`
  - 显示连接状态 (连接中/已连接/断开)
  - 显示同步状态
  - 错误提示

- [ ] **远程光标组件**
  - 文件: `frontend/src/components/CollaborativeEditor/RemoteCursor.tsx`
  - 显示其他用户的光标位置
  - 显示用户名标签
  - 使用用户颜色

- [ ] **样式文件**
  - 文件: `frontend/src/components/CollaborativeEditor/collaborative-editor.css`
  - 协作UI样式
  - 光标和选区样式
  - 响应式设计

- [ ] **导出索引**
  - 文件: `frontend/src/components/CollaborativeEditor/index.tsx`

#### 验收标准
- ✅ useCollaboration Hook正常工作
- ✅ CollaborativeEditor成功集成Yjs
- ✅ 可以看到其他用户的在线状态
- ✅ 可以看到其他用户的光标位置
- ✅ 连接状态正确显示
- ✅ UI美观,符合Ant Design设计规范
- ✅ 组件测试覆盖率 > 70%

#### 产出文件
- `frontend/src/hooks/useCollaboration.ts`
- `frontend/src/components/CollaborativeEditor/CollaborativeEditor.tsx`
- `frontend/src/components/CollaborativeEditor/ActiveUsersPanel.tsx`
- `frontend/src/components/CollaborativeEditor/ConnectionStatus.tsx`
- `frontend/src/components/CollaborativeEditor/RemoteCursor.tsx`
- `frontend/src/components/CollaborativeEditor/collaborative-editor.css`
- `frontend/src/components/CollaborativeEditor/index.tsx`

---

### ✅ Phase 5: 集成到RequirementFormPage (1天)

**任务ID**: 待创建
**优先级**: High
**预估工时**: 1天
**依赖**: Phase 4
**状态**: Todo

#### 描述
将CollaborativeEditor组件集成到需求表单页面,替换原有的LexicalEditor。

#### 具体任务
- [ ] **修改RequirementFormPage**
  - 文件: `frontend/src/pages/RequirementFormPage.tsx`
  - 导入 `CollaborativeEditor`
  - 添加协作模式开关状态
  - 替换4个编辑器实例

- [ ] **配置字段映射**
  ```typescript
  // description -> CollaborativeEditor fieldName="description"
  // business_value -> CollaborativeEditor fieldName="business_value"
  // expected_outcome -> CollaborativeEditor fieldName="expected_outcome"
  // acceptance_criteria -> CollaborativeEditor fieldName="acceptance_criteria"
  ```

- [ ] **添加协作开关**
  - 添加Switch组件控制协作模式
  - 只在编辑模式下启用协作
  - 保存用户偏好到localStorage

- [ ] **处理边界情况**
  - 新建需求时禁用协作 (没有documentId)
  - 离开页面时正确清理连接
  - 保存时合并Yjs内容到表单

- [ ] **测试集成**
  ```bash
  npm start
  # 手动测试所有功能
  ```

#### 验收标准
- ✅ 可以在需求表单中使用协作编辑器
- ✅ 协作模式可以开启/关闭
- ✅ 4个字段都支持独立协作
- ✅ 保存功能正常工作
- ✅ 离开页面不会内存泄漏
- ✅ 向后兼容非协作模式

#### 产出文件
- `frontend/src/pages/RequirementFormPage.tsx` (修改)

---

### ✅ Phase 6: 测试和性能优化 (1.5天)

**任务ID**: 待创建
**优先级**: High
**预估工时**: 1.5天
**依赖**: Phase 5
**状态**: Todo

#### 描述
全面测试协作功能,进行性能优化,修复发现的bug。

#### 具体任务

**Day 1: 功能测试**
- [ ] **单人编辑测试**
  - 创建需求并编辑
  - 验证保存功能
  - 验证加载功能

- [ ] **双人协作测试**
  - 两个浏览器同时编辑同一需求
  - 验证实时同步
  - 验证光标显示
  - 验证冲突解决

- [ ] **多人协作测试**
  - 5个用户同时编辑
  - 验证性能
  - 验证消息广播

- [ ] **网络测试**
  - 断网重连测试
  - 弱网环境测试
  - WebSocket断开恢复

- [ ] **边界情况测试**
  - 大文档 (> 1MB)
  - 快速输入
  - 粘贴大段内容
  - 图片上传

**Day 2: 性能优化**
- [ ] **前端优化**
  - Awareness状态节流 (200ms)
  - Update批处理 (100ms)
  - 内存泄漏检查
  - 组件懒加载

- [ ] **后端优化**
  - 消息队列优化
  - 定期持久化策略
  - 空房间清理
  - Redis缓存优化

- [ ] **性能测试**
  ```bash
  # 并发测试
  npm run test:performance:load

  # 内存测试
  npm run test:performance:memory
  ```

- [ ] **浏览器兼容性**
  - Chrome
  - Firefox
  - Safari
  - Edge
  - 移动端Safari/Chrome

#### 验收标准
- ✅ 10个并发用户,延迟 < 500ms
- ✅ 网络断开后自动重连
- ✅ 所有浏览器正常工作
- ✅ 无明显内存泄漏
- ✅ 所有功能测试通过
- ✅ 性能测试通过

#### 产出文件
- 测试报告文档
- 性能优化记录
- Bug修复列表

---

### ✅ Phase 7: 文档完善和部署准备 (1天)

**任务ID**: 待创建
**优先级**: Medium
**预估工时**: 1天
**依赖**: Phase 6
**状态**: Todo

#### 描述
完善用户文档、API文档,准备生产环境部署。

#### 具体任务
- [ ] **用户文档**
  - 协作功能使用指南
  - 常见问题FAQ
  - 截图和视频演示

- [ ] **API文档**
  - 更新Swagger文档
  ```bash
  cd backend
  make swagger
  ```
  - WebSocket协议文档
  - Yjs协议说明

- [ ] **开发文档**
  - 架构图更新
  - 代码注释完善
  - README更新

- [ ] **部署准备**
  - 环境变量配置文档
  - Nginx WebSocket配置
  ```nginx
  location /ws/ {
      proxy_pass http://backend:8080;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
  }
  ```
  - Docker配置更新
  - 数据库迁移脚本

- [ ] **监控配置**
  - Prometheus指标
  - 日志聚合
  - 告警规则

#### 验收标准
- ✅ 用户文档清晰易懂
- ✅ API文档完整准确
- ✅ 部署文档完善
- ✅ 监控配置完成
- ✅ 所有文档已提交到Git

#### 产出文件
- `docs/COLLABORATION_USER_GUIDE.md`
- `docs/COLLABORATION_API.md`
- `docs/COLLABORATION_DEPLOYMENT.md`
- `backend/docs/swagger.json` (更新)

---

## 总结

### 时间线
```
Day 1:     Phase 1 (依赖安装) + Phase 2 (数据库)
Day 2-4:   Phase 3 (后端WebSocket服务)
Day 5-6:   Phase 4 (前端协作组件)
Day 7:     Phase 5 (集成到表单)
Day 8-9:   Phase 6 (测试和优化)
Day 10:    Phase 7 (文档和部署)
```

### 关键里程碑
- ✅ Day 2: 数据库Schema完成
- ✅ Day 4: 后端WebSocket服务可用
- ✅ Day 6: 前端协作组件完成
- ✅ Day 7: 端到端功能打通
- ✅ Day 9: 测试通过
- ✅ Day 10: 准备上线

### 风险和依赖
1. **WebSocket库兼容性** - gorilla/websocket与现有系统集成
2. **Yjs协议复杂度** - 需要深入理解CRDT原理
3. **性能瓶颈** - 大量并发用户的消息广播
4. **浏览器兼容** - 老版本浏览器的WebSocket支持

### 资源需求
- **后端开发**: 1人 x 4天
- **前端开发**: 1人 x 3天
- **测试**: 1人 x 1.5天
- **文档**: 0.5人 x 1天

---

**创建日期**: 2025-11-08
**文档版本**: v1.0
**父任务**: #3584
