# 实时协作编辑功能设计文档

## 概述

为需求表单的Lexical编辑器添加实时协作编辑功能，允许多个用户同时编辑同一个文档。

## 技术栈

### 前端
- **WebSocket库**: socket.io-client (已安装)
- **CRDT库**: Yjs + y-websocket (需要安装)
- **编辑器绑定**: y-lexical (Lexical编辑器的Yjs绑定)
- **用户界面**: Ant Design组件

### 后端
- **WebSocket服务器**: Socket.IO (Go语言的gorilla/websocket或Socket.IO Go实现)
- **CRDT同步**: Yjs文档同步
- **持久化**: PostgreSQL存储文档快照

## 架构设计

```
┌─────────────────┐       WebSocket        ┌──────────────────┐
│   用户A浏览器   │◄─────────────────────►│                  │
│  Lexical+Yjs    │                        │  WebSocket服务器 │
└─────────────────┘                        │   (Go/Node.js)   │
                                           │                  │
┌─────────────────┐       WebSocket        │  - CRDT同步      │
│   用户B浏览器   │◄─────────────────────►│  - 用户管理      │
│  Lexical+Yjs    │                        │  - 消息广播      │
└─────────────────┘                        └──────────────────┘
                                                     │
                                                     ▼
                                           ┌──────────────────┐
                                           │   PostgreSQL     │
                                           │  - 文档快照      │
                                           │  - 变更历史      │
                                           └──────────────────┘
```

## 数据流

### 1. 连接建立
```typescript
用户A打开文档
  ↓
创建Yjs文档实例
  ↓
建立WebSocket连接
  ↓
发送JOIN事件({documentId, userId})
  ↓
服务器返回：
  - 当前文档状态
  - 在线用户列表
  - 光标位置
```

### 2. 编辑同步
```typescript
用户A编辑文本
  ↓
Lexical触发onChange
  ↓
Yjs捕获操作并生成update
  ↓
WebSocket发送update到服务器
  ↓
服务器广播给其他用户
  ↓
用户B接收update
  ↓
Yjs应用update到本地文档
  ↓
Lexical渲染更新
```

### 3. 光标同步
```typescript
用户A移动光标
  ↓
发送CURSOR_MOVE事件
  ↓
服务器广播给其他用户
  ↓
用户B显示用户A的光标位置
```

## 实现步骤

### Phase 1: 基础WebSocket连接 (1-2天)
- [ ] 安装依赖包 (yjs, y-websocket, y-lexical)
- [ ] 创建WebSocket连接管理器
- [ ] 实现用户认证和会话管理
- [ ] 创建基础UI（在线用户列表）

### Phase 2: CRDT文档同步 (2-3天)
- [ ] 集成Yjs到Lexical编辑器
- [ ] 实现文档初始化和加载
- [ ] 实现变更捕获和广播
- [ ] 实现冲突自动解决

### Phase 3: 用户体验优化 (2-3天)
- [ ] 实现光标位置同步
- [ ] 实现选区高亮（不同用户不同颜色）
- [ ] 添加用户头像和状态指示
- [ ] 实现断线重连机制

### Phase 4: 后端服务 (3-5天)
- [ ] 实现WebSocket服务器（Go或Node.js）
- [ ] 实现Yjs文档管理
- [ ] 实现用户会话管理
- [ ] 实现文档快照和持久化
- [ ] 添加监控和日志

### Phase 5: 测试和优化 (2-3天)
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能测试（100+并发用户）
- [ ] 网络延迟优化
- [ ] 内存泄漏检测

## 关键技术点

### 1. CRDT (Conflict-free Replicated Data Type)
使用Yjs提供的CRDT算法自动解决编辑冲突：
- **优点**: 无需中心化仲裁，自动合并冲突
- **核心**: Operation Transform (OT) + Vector Clock
- **保证**: 最终一致性

### 2. WebSocket协议

```typescript
// 客户端 → 服务器
{
  type: 'JOIN' | 'LEAVE' | 'UPDATE' | 'CURSOR' | 'AWARENESS',
  payload: {
    documentId: string,
    userId: number,
    data: any
  }
}

// 服务器 → 客户端
{
  type: 'SYNC' | 'UPDATE' | 'USER_JOIN' | 'USER_LEAVE' | 'CURSOR',
  payload: {
    users: User[],
    update?: Uint8Array,
    cursor?: CursorPosition
  }
}
```

### 3. Awareness（用户感知）
```typescript
interface Awareness {
  user: {
    userId: number,
    name: string,
    color: string,
    avatar?: string
  },
  cursor: {
    anchor: number,
    focus: number
  },
  selection: {
    start: number,
    end: number
  }
}
```

## 用户界面设计

### 1. 在线用户列表
```
┌─────────────────────────────┐
│  👥 在线用户 (3)             │
├─────────────────────────────┤
│  🟢 张三 (编辑中)            │
│  🟢 李四 (查看)              │
│  🟡 王五 (离开2分钟)         │
└─────────────────────────────┘
```

### 2. 编辑器光标显示
```
这是一个文档内容[张三|正在编辑]更多内容
                 ↑
               光标位置+用户名提示
```

### 3. 状态指示器
```
┌─────────────────────────────┐
│  🔄 正在同步...              │
│  ✅ 已保存 (2秒前)           │
│  ⚠️  网络断开，正在重连...    │
└─────────────────────────────┘
```

## 性能考虑

### 1. 文档大小限制
- 单个文档最大: 5MB
- 操作历史保留: 最近1000次操作
- 自动快照: 每100次操作

### 2. 并发限制
- 单文档最多: 50个并发用户
- 操作频率限制: 100 ops/秒/用户

### 3. 网络优化
- 操作批处理: 100ms内的操作合并
- 压缩传输: gzip压缩WebSocket消息
- 增量更新: 只传输变更部分

## 安全考虑

### 1. 认证授权
- WebSocket连接需要JWT token
- 验证用户对文档的访问权限
- 不同权限级别（只读、评论、编辑）

### 2. 数据保护
- 传输加密: WSS (WebSocket Secure)
- 操作审计: 记录所有编辑操作
- 版本回滚: 支持恢复到任意版本

## 降级方案

如果WebSocket不可用：
1. 自动切换到HTTP轮询模式
2. 增加操作间隔（5秒）
3. 显示警告提示用户

如果CRDT冲突无法自动解决：
1. 锁定文档
2. 提示用户手动解决冲突
3. 提供对比视图

## 依赖包

```json
{
  "dependencies": {
    "yjs": "^13.6.0",
    "y-websocket": "^1.5.0",
    "y-lexical": "^0.1.0",
    "socket.io-client": "^4.8.1" // 已安装
  }
}
```

## 实现优先级

### P0 (必须有)
- WebSocket连接和断线重连
- 基础CRDT同步
- 在线用户列表

### P1 (应该有)
- 光标位置同步
- 用户颜色区分
- 保存状态指示

### P2 (最好有)
- 选区高亮
- 用户头像显示
- 操作历史回放

### P3 (未来考虑)
- 语音/视频协作
- 智能建议
- AI辅助编辑

## 估算工作量

- **总工时**: 10-15天
- **前端开发**: 5-7天
- **后端开发**: 4-6天
- **测试优化**: 1-2天

## 风险和挑战

1. **技术复杂度高**: CRDT算法理解和实现
2. **性能要求高**: 大文档+多用户场景
3. **网络依赖**: 需要稳定的WebSocket连接
4. **浏览器兼容**: 老版本浏览器可能不支持
5. **并发问题**: 高并发下的状态同步

## 参考资源

- Yjs官方文档: https://docs.yjs.dev/
- y-websocket: https://github.com/yjs/y-websocket
- Lexical Collaboration: https://lexical.dev/docs/collaboration/introduction
- CRDT论文: https://crdt.tech/

---

**文档版本**: v1.0
**创建时间**: 2025-11-08
**最后更新**: 2025-11-08
**负责人**: AI开发团队
