# 实时协作编辑功能 - 完整实现方案

## 文档信息
- **创建时间**: 2025-11-08
- **版本**: v2.0 (包含后端支持)
- **状态**: 设计完成,待实施
- **任务**: #3584
- **负责人**: AI开发团队

---

## 1. 项目概述

### 1.1 功能目标
为需求表单(RequirementFormPage)的Lexical富文本编辑器添加实时协作编辑功能,允许多个用户同时编辑同一个文档,实时看到彼此的修改和光标位置。

### 1.2 技术栈选择

#### 前端技术栈
- **CRDT库**: Yjs ^13.6.0 (Conflict-free Replicated Data Type)
- **Yjs绑定**: @lexical/yjs ^0.38.2 (Lexical官方Yjs绑定)
- **WebSocket客户端**: y-websocket ^1.5.0 (Yjs的WebSocket provider)
- **编辑器**: Lexical ^0.38.2 (已集成)
- **UI组件**: Ant Design ^5.6.1 (已集成)

#### 后端技术栈
- **WebSocket库**: github.com/gorilla/websocket (Go标准WebSocket库)
- **Yjs同步**: 自定义Go实现 (参考y-websocket协议)
- **持久化**: PostgreSQL 16 + GORM
- **缓存**: Redis (存储活跃会话和用户awareness)
- **认证**: JWT (现有系统)

### 1.3 架构概览

```
┌──────────────────────────────────────────────────────────────┐
│                        前端 (React)                           │
├──────────────────────────────────────────────────────────────┤
│  RequirementFormPage                                         │
│    ├─ CollaborativeEditor (新组件)                           │
│    │   ├─ LexicalEditor (现有)                              │
│    │   ├─ LexicalCollaborationPlugin                        │
│    │   │   └─ Yjs Provider (y-websocket)                    │
│    │   └─ CollaborationUI                                    │
│    │       ├─ ActiveUsersList (在线用户列表)                 │
│    │       ├─ CursorOverlay (远程光标显示)                   │
│    │       └─ ConnectionStatus (连接状态)                    │
└──────────────────────────────────────────────────────────────┘
                            ↕ WebSocket (wss://)
┌──────────────────────────────────────────────────────────────┐
│                      后端 (Go + Gin)                          │
├──────────────────────────────────────────────────────────────┤
│  WebSocket Server (/ws/collaboration/:documentId)            │
│    ├─ Connection Manager (管理所有WebSocket连接)             │
│    ├─ Room Manager (按documentId分组管理房间)                │
│    ├─ Yjs Sync Handler (处理Yjs协议消息)                     │
│    │   ├─ SyncStep1: 初始化状态向量                         │
│    │   ├─ SyncStep2: 发送文档更新                           │
│    │   └─ Update: 广播增量更新                              │
│    ├─ Awareness Protocol (用户状态同步)                      │
│    │   ├─ User Join/Leave                                   │
│    │   ├─ Cursor Position                                   │
│    │   └─ Selection Range                                   │
│    └─ Persistence Layer                                      │
│        ├─ Document Snapshots (定期保存文档快照)              │
│        ├─ Update History (保存所有更新记录)                  │
│        └─ Session Logs (会话日志)                            │
├──────────────────────────────────────────────────────────────┤
│                      数据存储层                               │
├──────────────────────────────────────────────────────────────┤
│  PostgreSQL                          Redis                   │
│  ├─ collaboration_documents          ├─ active_sessions:{id}  │
│  ├─ collaboration_updates            ├─ room_users:{docId}    │
│  └─ collaboration_sessions           └─ awareness:{docId}     │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. 现有代码分析

### 2.1 前端现状

#### LexicalEditor组件 (`src/components/LexicalEditor/LexicalEditor.tsx`)
```typescript
// 当前架构
export default function LexicalEditor({
  value,
  onChange,
  placeholder,
  onUploadImage,
  minHeight,
  maxHeight,
}: LexicalEditorProps): JSX.Element {
  // 使用LexicalComposer作为容器
  // 已集成插件: RichText, History, AutoFocus, List, Link, Images
  // 支持节点: Heading, List, Quote, Link, Image
}
```

**现有优势**:
- ✅ 已完整集成Lexical编辑器
- ✅ 支持丰富的节点类型和格式
- ✅ 有完整的工具栏 (ToolbarPlugin)
- ✅ 有图片上传功能
- ✅ 有历史记录 (HistoryPlugin)

**需要扩展**:
- ❌ 没有协作功能
- ❌ 没有Yjs集成
- ❌ 没有用户awareness显示

#### RequirementFormPage (`src/pages/RequirementFormPage.tsx`)
```typescript
// 当前有4个Lexical编辑器实例
<LexicalEditor value={descriptionContent} onChange={setDescriptionContent} />
<LexicalEditor value={businessValueContent} onChange={setBusinessValueContent} />
<LexicalEditor value={expectedOutcomeContent} onChange={setExpectedOutcomeContent} />
<LexicalEditor value={acceptanceCriteriaContent} onChange={setAcceptanceCriteriaContent} />
```

**集成挑战**:
- 需要为每个编辑器创建独立的Yjs文档和房间
- 需要区分不同字段的协作会话

### 2.2 后端现状

#### DocumentCollaborationHandler (`backend/handlers/document_collaboration_handler.go`)
```go
// 已有功能
✅ AddComment - 添加评论
✅ GetComments - 获取评论
✅ AddCollaborator - 添加协作者
✅ GetCollaborators - 获取协作者列表
✅ StartCollaborationSession - 开始协作会话
✅ GetActiveCollaborators - 获取活跃协作者
✅ GetChangeHistory - 获取变更历史
```

**现有优势**:
- ✅ 已有文档协作的基础架构
- ✅ 已有权限检查机制
- ✅ 已有协作会话管理
- ✅ 已有变更历史记录

**需要补充**:
- ❌ WebSocket功能被禁用 (websocket_handler_simple.go被注释)
- ❌ 没有Yjs协议支持
- ❌ 没有实时消息广播机制

---

## 3. 技术实现方案

### 3.1 Phase 1: 依赖安装和基础配置 (1天)

#### 3.1.1 前端依赖安装

```bash
cd frontend

# 安装Yjs核心库
npm install yjs@^13.6.0

# 安装Lexical的Yjs绑定
npm install @lexical/yjs@^0.38.2

# 安装WebSocket provider
npm install y-websocket@^1.5.0

# 安装类型定义
npm install --save-dev @types/y-websocket
```

**package.json 更新**:
```json
{
  "dependencies": {
    "yjs": "^13.6.0",
    "@lexical/yjs": "^0.38.2",
    "y-websocket": "^1.5.0"
  }
}
```

#### 3.1.2 后端依赖安装

```bash
cd backend

# 安装WebSocket库 (可能已安装)
go get github.com/gorilla/websocket@v1.5.1

# 更新go.mod
go mod tidy
```

**go.mod 更新**:
```go
require (
    github.com/gorilla/websocket v1.5.1
    // ... 其他现有依赖
)
```

### 3.2 Phase 2: 数据库Schema设计 (0.5天)

#### 3.2.1 创建迁移文件

**文件**: `backend/migrations/202511_08_01_add_collaboration_tables/up.sql`

```sql
-- 1. 协作文档表 (存储Yjs文档状态)
CREATE TABLE IF NOT EXISTS collaboration_documents (
    id SERIAL PRIMARY KEY,
    requirement_id INTEGER NOT NULL,              -- 关联的需求ID
    field_name VARCHAR(50) NOT NULL,              -- 字段名 (description/business_value/expected_outcome/acceptance_criteria)
    yjs_document BYTEA,                           -- Yjs文档的二进制状态
    state_vector BYTEA,                           -- Yjs状态向量
    version INTEGER DEFAULT 0,                    -- 文档版本号
    last_modified_by INTEGER,                     -- 最后修改人
    last_modified_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(requirement_id, field_name),           -- 每个需求的每个字段只有一个协作文档
    FOREIGN KEY (requirement_id) REFERENCES requirements(id) ON DELETE CASCADE,
    FOREIGN KEY (last_modified_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_collab_docs_requirement ON collaboration_documents(requirement_id);
CREATE INDEX idx_collab_docs_modified ON collaboration_documents(last_modified_at DESC);

-- 2. 协作更新历史表 (存储所有Yjs更新)
CREATE TABLE IF NOT EXISTS collaboration_updates (
    id BIGSERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL,                 -- 关联的协作文档
    update_data BYTEA NOT NULL,                   -- Yjs更新的二进制数据
    user_id INTEGER,                              -- 产生更新的用户
    timestamp TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (document_id) REFERENCES collaboration_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_collab_updates_document ON collaboration_updates(document_id, timestamp DESC);
CREATE INDEX idx_collab_updates_user ON collaboration_updates(user_id);

-- 3. 协作会话表 (跟踪活跃的协作会话)
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id BIGSERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL,                 -- 关联的协作文档
    user_id INTEGER NOT NULL,                     -- 用户ID
    session_id VARCHAR(100) NOT NULL,             -- WebSocket会话ID (UUID)
    user_name VARCHAR(255),                       -- 用户名 (冗余存储,方便查询)
    user_color VARCHAR(20),                       -- 用户颜色 (用于光标显示)
    cursor_position JSONB,                        -- 光标位置信息
    selection_range JSONB,                        -- 选区信息
    is_active BOOLEAN DEFAULT TRUE,               -- 是否活跃
    last_heartbeat TIMESTAMP DEFAULT NOW(),       -- 最后心跳时间
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES collaboration_documents(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_collab_sessions_document ON collaboration_sessions(document_id, is_active);
CREATE INDEX idx_collab_sessions_user ON collaboration_sessions(user_id);
CREATE INDEX idx_collab_sessions_active ON collaboration_sessions(is_active, last_heartbeat);

-- 4. 添加注释
COMMENT ON TABLE collaboration_documents IS '协作文档表,存储Yjs文档状态';
COMMENT ON TABLE collaboration_updates IS '协作更新历史,存储所有Yjs增量更新';
COMMENT ON TABLE collaboration_sessions IS '协作会话表,跟踪在线用户';

COMMENT ON COLUMN collaboration_documents.yjs_document IS 'Yjs文档的完整二进制状态 (Y.encodeStateAsUpdate)';
COMMENT ON COLUMN collaboration_documents.state_vector IS 'Yjs状态向量 (Y.encodeStateVector)';
COMMENT ON COLUMN collaboration_updates.update_data IS 'Yjs增量更新的二进制数据';
COMMENT ON COLUMN collaboration_sessions.cursor_position IS 'JSON格式: {line: number, column: number, offset: number}';
COMMENT ON COLUMN collaboration_sessions.selection_range IS 'JSON格式: {anchor: number, focus: number}';
```

**文件**: `backend/migrations/202511_08_01_add_collaboration_tables/down.sql`

```sql
DROP TABLE IF EXISTS collaboration_sessions;
DROP TABLE IF EXISTS collaboration_updates;
DROP TABLE IF EXISTS collaboration_documents;
```

#### 3.2.2 Redis数据结构

```
# 活跃会话 (Hash)
active_sessions:{documentId} = {
  "{sessionId}": "{userId}:{userName}:{color}:{lastSeen}",
  ...
}
TTL: 2小时 (心跳刷新)

# 房间用户列表 (Set)
room_users:{documentId} = [sessionId1, sessionId2, ...]
TTL: 2小时

# Awareness状态 (Hash)
awareness:{documentId} = {
  "{sessionId}": "{cursorPosition}:{selectionRange}:{timestamp}",
  ...
}
TTL: 10分钟 (频繁更新)

# 文档锁 (String)
doc_lock:{documentId} = "{sessionId}"
TTL: 30秒 (防止并发保存冲突)
```

### 3.3 Phase 3: 后端WebSocket服务实现 (3天)

#### 3.3.1 WebSocket连接管理器

**文件**: `backend/services/collaboration_websocket_service.go`

```go
package services

import (
    "context"
    "encoding/json"
    "log"
    "sync"
    "time"

    "github.com/gorilla/websocket"
    "github.com/google/uuid"
)

// CollaborationWebSocketService WebSocket协作服务
type CollaborationWebSocketService struct {
    rooms      map[int]*CollaborationRoom  // documentID -> Room
    roomsMutex sync.RWMutex
    db         *sql.DB
    redis      *redis.Client
    logger     *log.Logger
}

// CollaborationRoom 协作房间 (一个文档一个房间)
type CollaborationRoom struct {
    DocumentID  int
    Clients     map[string]*CollaborationClient
    Broadcast   chan *BroadcastMessage
    Register    chan *CollaborationClient
    Unregister  chan *CollaborationClient
    YjsDocument []byte                    // Yjs文档的二进制状态
    StateVector []byte                    // Yjs状态向量
    mutex       sync.RWMutex
}

// CollaborationClient WebSocket客户端
type CollaborationClient struct {
    SessionID  string
    UserID     int
    UserName   string
    UserColor  string
    Conn       *websocket.Conn
    Room       *CollaborationRoom
    Send       chan []byte
}

// BroadcastMessage 广播消息
type BroadcastMessage struct {
    Type       string          `json:"type"`    // sync, update, awareness
    Data       json.RawMessage `json:"data"`
    ExcludeID  string          // 排除的客户端ID (不发给消息发送者)
}

// WebSocket消息类型
const (
    MessageTypeSync      = "sync"
    MessageTypeUpdate    = "update"
    MessageTypeAwareness = "awareness"
    MessageTypeQuery     = "query"
)

// NewCollaborationWebSocketService 创建WebSocket服务
func NewCollaborationWebSocketService(db *sql.DB, redis *redis.Client, logger *log.Logger) *CollaborationWebSocketService {
    return &CollaborationWebSocketService{
        rooms:  make(map[int]*CollaborationRoom),
        db:     db,
        redis:  redis,
        logger: logger,
    }
}

// GetOrCreateRoom 获取或创建房间
func (s *CollaborationWebSocketService) GetOrCreateRoom(documentID int) *CollaborationRoom {
    s.roomsMutex.Lock()
    defer s.roomsMutex.Unlock()

    room, exists := s.rooms[documentID]
    if !exists {
        room = &CollaborationRoom{
            DocumentID: documentID,
            Clients:    make(map[string]*CollaborationClient),
            Broadcast:  make(chan *BroadcastMessage, 256),
            Register:   make(chan *CollaborationClient),
            Unregister: make(chan *CollaborationClient),
        }
        s.rooms[documentID] = room

        // 从数据库加载文档状态
        s.loadDocumentState(room)

        // 启动房间协程
        go room.Run(s)
    }

    return room
}

// Run 运行房间 (处理注册、注销、广播)
func (r *CollaborationRoom) Run(service *CollaborationWebSocketService) {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case client := <-r.Register:
            r.mutex.Lock()
            r.Clients[client.SessionID] = client
            r.mutex.Unlock()

            service.logger.Printf("Client %s joined room %d (User: %s)",
                client.SessionID, r.DocumentID, client.UserName)

            // 发送当前文档状态给新客户端
            r.sendInitialState(client)

            // 通知其他客户端有新用户加入
            r.broadcastAwareness()

        case client := <-r.Unregister:
            r.mutex.Lock()
            delete(r.Clients, client.SessionID)
            close(client.Send)
            r.mutex.Unlock()

            service.logger.Printf("Client %s left room %d", client.SessionID, r.DocumentID)

            // 通知其他客户端有用户离开
            r.broadcastAwareness()

            // 如果房间空了,考虑持久化并关闭
            if len(r.Clients) == 0 {
                go service.persistDocumentState(r)
            }

        case message := <-r.Broadcast:
            r.mutex.RLock()
            for id, client := range r.Clients {
                if id != message.ExcludeID {
                    select {
                    case client.Send <- message.Data:
                    default:
                        close(client.Send)
                        delete(r.Clients, id)
                    }
                }
            }
            r.mutex.RUnlock()

        case <-ticker.C:
            // 定期持久化文档状态
            go service.persistDocumentState(r)
        }
    }
}

// sendInitialState 发送初始状态给新客户端
func (r *CollaborationRoom) sendInitialState(client *CollaborationClient) {
    r.mutex.RLock()
    defer r.mutex.RUnlock()

    // Yjs Sync Protocol - Step 1
    syncMessage := map[string]interface{}{
        "type": "sync",
        "step": 1,
        "stateVector": r.StateVector,
    }

    data, _ := json.Marshal(syncMessage)
    client.Send <- data

    // Yjs Sync Protocol - Step 2
    if len(r.YjsDocument) > 0 {
        updateMessage := map[string]interface{}{
            "type": "sync",
            "step": 2,
            "update": r.YjsDocument,
        }
        data, _ := json.Marshal(updateMessage)
        client.Send <- data
    }
}

// loadDocumentState 从数据库加载文档状态
func (s *CollaborationWebSocketService) loadDocumentState(room *CollaborationRoom) {
    var doc struct {
        YjsDocument []byte
        StateVector []byte
    }

    err := s.db.QueryRow(`
        SELECT yjs_document, state_vector
        FROM collaboration_documents
        WHERE id = $1
    `, room.DocumentID).Scan(&doc.YjsDocument, &doc.StateVector)

    if err == nil {
        room.YjsDocument = doc.YjsDocument
        room.StateVector = doc.StateVector
    }
}

// persistDocumentState 持久化文档状态到数据库
func (s *CollaborationWebSocketService) persistDocumentState(room *CollaborationRoom) {
    room.mutex.RLock()
    yjsDoc := room.YjsDocument
    stateVec := room.StateVector
    room.mutex.RUnlock()

    if len(yjsDoc) == 0 {
        return
    }

    _, err := s.db.Exec(`
        UPDATE collaboration_documents
        SET yjs_document = $1, state_vector = $2, updated_at = NOW()
        WHERE id = $3
    `, yjsDoc, stateVec, room.DocumentID)

    if err != nil {
        s.logger.Printf("Failed to persist document %d: %v", room.DocumentID, err)
    }
}

// HandleClient 处理客户端消息
func (client *CollaborationClient) HandleClient() {
    defer func() {
        client.Room.Unregister <- client
        client.Conn.Close()
    }()

    // 设置读取超时
    client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
    client.Conn.SetPongHandler(func(string) error {
        client.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
        return nil
    })

    for {
        _, message, err := client.Conn.ReadMessage()
        if err != nil {
            break
        }

        // 解析消息类型
        var msg struct {
            Type string          `json:"type"`
            Data json.RawMessage `json:"data"`
        }
        if err := json.Unmarshal(message, &msg); err != nil {
            continue
        }

        switch msg.Type {
        case MessageTypeUpdate:
            // Yjs增量更新 - 广播给其他客户端
            client.Room.Broadcast <- &BroadcastMessage{
                Type:      MessageTypeUpdate,
                Data:      message,
                ExcludeID: client.SessionID,
            }

            // 应用更新到房间的文档状态
            client.Room.applyUpdate(msg.Data)

        case MessageTypeAwareness:
            // 用户awareness (光标、选区) - 广播
            client.Room.Broadcast <- &BroadcastMessage{
                Type:      MessageTypeAwareness,
                Data:      message,
                ExcludeID: client.SessionID,
            }
        }
    }
}

// WritePump 写入消息到WebSocket
func (client *CollaborationClient) WritePump() {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case message, ok := <-client.Send:
            if !ok {
                client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if err := client.Conn.WriteMessage(websocket.BinaryMessage, message); err != nil {
                return
            }

        case <-ticker.C:
            // 发送心跳
            client.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
            if err := client.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}

// applyUpdate 应用Yjs更新到文档
func (r *CollaborationRoom) applyUpdate(updateData []byte) {
    r.mutex.Lock()
    defer r.mutex.Unlock()

    // 这里需要实现Yjs协议的更新合并
    // 由于Go没有官方的Yjs库,我们存储原始更新
    // 在实际应用中,可能需要调用外部服务或使用WASM

    r.YjsDocument = append(r.YjsDocument, updateData...)
}
```

#### 3.3.2 WebSocket Handler

**文件**: `backend/handlers/collaboration_ws_handler.go`

```go
package handlers

import (
    "net/http"
    "strconv"

    "ai-project-backend/services"
    "github.com/gin-gonic/gin"
    "github.com/gorilla/websocket"
    "github.com/google/uuid"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        // TODO: 根据实际情况配置CORS
        return true
    },
}

// CollaborationWSHandler WebSocket协作处理器
type CollaborationWSHandler struct {
    wsService *services.CollaborationWebSocketService
}

// NewCollaborationWSHandler 创建WebSocket处理器
func NewCollaborationWSHandler(wsService *services.CollaborationWebSocketService) *CollaborationWSHandler {
    return &CollaborationWSHandler{
        wsService: wsService,
    }
}

// HandleWebSocket 处理WebSocket连接
// GET /ws/collaboration/:documentId
func (h *CollaborationWSHandler) HandleWebSocket(c *gin.Context) {
    // 1. 获取文档ID
    documentID, err := strconv.Atoi(c.Param("documentId"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
        return
    }

    // 2. 获取用户信息 (从JWT)
    userID := GetUserIDFromContextAsUint(c)
    if userID == 0 {
        c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
        return
    }

    userName := GetUsernameFromContext(c)
    if userName == "" {
        userName = "User " + strconv.Itoa(int(userID))
    }

    // 3. TODO: 检查用户对文档的访问权限
    // hasPermission := checkDocumentPermission(userID, documentID)
    // if !hasPermission {
    //     c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
    //     return
    // }

    // 4. 升级HTTP连接到WebSocket
    conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
    if err != nil {
        h.wsService.Logger.Printf("WebSocket upgrade error: %v", err)
        return
    }

    // 5. 创建客户端
    sessionID := uuid.New().String()
    userColor := generateUserColor(userID) // 根据userID生成颜色

    client := &services.CollaborationClient{
        SessionID: sessionID,
        UserID:    int(userID),
        UserName:  userName,
        UserColor: userColor,
        Conn:      conn,
        Send:      make(chan []byte, 256),
    }

    // 6. 获取或创建房间
    room := h.wsService.GetOrCreateRoom(documentID)
    client.Room = room

    // 7. 注册客户端到房间
    room.Register <- client

    // 8. 启动读写协程
    go client.WritePump()
    go client.HandleClient()
}

// generateUserColor 根据用户ID生成颜色
func generateUserColor(userID uint) string {
    colors := []string{
        "#1890ff", "#52c41a", "#faad14", "#f5222d",
        "#722ed1", "#13c2c2", "#eb2f96", "#fa8c16",
    }
    return colors[int(userID)%len(colors)]
}
```

#### 3.3.3 注册路由

**文件**: `backend/routes/collaboration_routes.go`

```go
package routes

import (
    "ai-project-backend/handlers"
    "ai-project-backend/middleware"
    "github.com/gin-gonic/gin"
)

// SetupCollaborationRoutes 设置协作路由
func SetupCollaborationRoutes(router *gin.Engine, wsHandler *handlers.CollaborationWSHandler) {
    ws := router.Group("/ws")
    ws.Use(middleware.JWTMiddleware()) // JWT认证
    {
        // WebSocket连接端点
        ws.GET("/collaboration/:documentId", wsHandler.HandleWebSocket)
    }
}
```

### 3.4 Phase 4: 前端协作组件实现 (2天)

#### 3.4.1 创建协作Hook

**文件**: `frontend/src/hooks/useCollaboration.ts`

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { getCurrentUser } from '../utils/userUtils';

export interface CollaborationUser {
  userId: number;
  userName: string;
  userColor: string;
  cursor?: {
    line: number;
    column: number;
  };
  selection?: {
    anchor: number;
    focus: number;
  };
}

export interface UseCollaborationOptions {
  documentId: number;
  fieldName: string; // 'description' | 'business_value' | 'expected_outcome' | 'acceptance_criteria'
  enabled?: boolean;
}

export interface UseCollaborationReturn {
  yDoc: Y.Doc | null;
  provider: WebsocketProvider | null;
  activeUsers: CollaborationUser[];
  isConnected: boolean;
  isSynced: boolean;
  error: Error | null;
}

export function useCollaboration({
  documentId,
  fieldName,
  enabled = true,
}: UseCollaborationOptions): UseCollaborationReturn {
  const [yDoc, setYDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    try {
      // 1. 创建Yjs文档
      const doc = new Y.Doc();

      // 2. 获取WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.REACT_APP_WS_HOST || window.location.host;
      const wsUrl = `${protocol}//${host}/ws/collaboration/${documentId}`;

      // 3. 创建WebSocket Provider
      const currentUser = getCurrentUser();
      const wsProvider = new WebsocketProvider(
        wsUrl,
        `${fieldName}`, // 房间名 = 字段名
        doc,
        {
          connect: true,
          params: {
            userId: currentUser?.id.toString() || '',
            userName: currentUser?.username || 'Anonymous',
          },
        }
      );

      // 4. 监听连接状态
      wsProvider.on('status', (event: { status: string }) => {
        setIsConnected(event.status === 'connected');
      });

      wsProvider.on('sync', (isSynced: boolean) => {
        setIsSynced(isSynced);
      });

      // 5. 监听Awareness (用户状态)
      wsProvider.awareness.on('change', () => {
        const states = wsProvider.awareness.getStates();
        const users: CollaborationUser[] = [];

        states.forEach((state, clientId) => {
          if (clientId !== wsProvider.awareness.clientID) {
            users.push({
              userId: state.user?.userId || 0,
              userName: state.user?.userName || 'Unknown',
              userColor: state.user?.color || '#1890ff',
              cursor: state.cursor,
              selection: state.selection,
            });
          }
        });

        setActiveUsers(users);
      });

      // 6. 设置本地用户信息
      wsProvider.awareness.setLocalStateField('user', {
        userId: currentUser?.id,
        userName: currentUser?.username || 'Anonymous',
        color: generateUserColor(currentUser?.id || 0),
      });

      setYDoc(doc);
      setProvider(wsProvider);
      providerRef.current = wsProvider;

      console.log(`✅ Collaboration initialized for ${fieldName}`);
    } catch (err) {
      console.error('Collaboration initialization error:', err);
      setError(err as Error);
    }

    // Cleanup
    return () => {
      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }
    };
  }, [documentId, fieldName, enabled]);

  return {
    yDoc,
    provider,
    activeUsers,
    isConnected,
    isSynced,
    error,
  };
}

// 生成用户颜色 (与后端保持一致)
function generateUserColor(userId: number): string {
  const colors = [
    '#1890ff',
    '#52c41a',
    '#faad14',
    '#f5222d',
    '#722ed1',
    '#13c2c2',
    '#eb2f96',
    '#fa8c16',
  ];
  return colors[userId % colors.length];
}
```

#### 3.4.2 创建协作编辑器组件

**文件**: `frontend/src/components/CollaborativeEditor/CollaborativeEditor.tsx`

```typescript
/**
 * 协作编辑器组件
 * 基于Lexical + Yjs实现实时协作
 */

import React, { useEffect, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import * as Y from 'yjs';
import { Provider } from '@lexical/yjs';

import { ImageNode } from '../LexicalEditor/nodes/ImageNode';
import ToolbarPlugin from '../LexicalEditor/plugins/ToolbarPlugin';
import ImagesPlugin from '../LexicalEditor/plugins/ImagesPlugin';
import theme from '../LexicalEditor/themes/EditorTheme';
import { useCollaboration } from '../../hooks/useCollaboration';
import ActiveUsersPanel from './ActiveUsersPanel';
import ConnectionStatus from './ConnectionStatus';

import './collaborative-editor.css';

export interface CollaborativeEditorProps {
  documentId: number;
  fieldName: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  onUploadImage?: (file: File) => Promise<string>;
  minHeight?: number;
  maxHeight?: number;
  enableCollaboration?: boolean;
}

function onError(error: Error) {
  console.error('Collaborative Editor Error:', error);
}

// 协作插件组件
function CollabPlugin({
  yDoc,
  provider,
}: {
  yDoc: Y.Doc;
  provider: Provider;
}): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!yDoc || !provider) return;

    // 绑定Yjs到Lexical
    const binding = new Provider(yDoc, provider, editor);

    return () => {
      binding.destroy();
    };
  }, [editor, yDoc, provider]);

  return null;
}

export default function CollaborativeEditor({
  documentId,
  fieldName,
  value,
  onChange,
  placeholder = '请输入内容...',
  onUploadImage,
  minHeight = 200,
  maxHeight = 600,
  enableCollaboration = true,
}: CollaborativeEditorProps): JSX.Element {
  const editorRef = useRef<any>(null);

  // 使用协作Hook
  const {
    yDoc,
    provider,
    activeUsers,
    isConnected,
    isSynced,
    error,
  } = useCollaboration({
    documentId,
    fieldName,
    enabled: enableCollaboration,
  });

  const initialConfig = {
    namespace: `CollaborativeEditor_${fieldName}`,
    theme,
    onError,
    nodes: [
      HeadingNode,
      ListNode,
      ListItemNode,
      QuoteNode,
      LinkNode,
      AutoLinkNode,
      ImageNode,
    ],
    editorState: null, // Yjs会管理状态
  };

  return (
    <div className="collaborative-editor-wrapper">
      {/* 连接状态指示器 */}
      {enableCollaboration && (
        <div className="collaboration-header">
          <ConnectionStatus
            isConnected={isConnected}
            isSynced={isSynced}
            error={error}
          />
          <ActiveUsersPanel users={activeUsers} />
        </div>
      )}

      <LexicalComposer initialConfig={initialConfig}>
        <div className="lexical-editor-container">
          <ToolbarPlugin
            onInsertImage={() => {
              // 图片插入逻辑
            }}
          />
          <div className="lexical-editor-inner">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="lexical-editor-input"
                  style={{
                    minHeight: `${minHeight}px`,
                    maxHeight: `${maxHeight}px`,
                  }}
                />
              }
              placeholder={
                <div className="lexical-editor-placeholder">{placeholder}</div>
              }
              ErrorBoundary={LexicalErrorBoundary}
            />

            {/* 协作插件 */}
            {enableCollaboration && yDoc && provider && (
              <CollaborationPlugin
                id={`${documentId}_${fieldName}`}
                providerFactory={(id, yjsDocMap) => provider}
                shouldBootstrap={true}
              />
            )}

            <ListPlugin />
            <LinkPlugin />
            <ImagesPlugin onUpload={onUploadImage} />
          </div>
        </div>
      </LexicalComposer>
    </div>
  );
}
```

#### 3.4.3 活跃用户面板

**文件**: `frontend/src/components/CollaborativeEditor/ActiveUsersPanel.tsx`

```typescript
import React from 'react';
import { Avatar, Tooltip, Badge } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { CollaborationUser } from '../../hooks/useCollaboration';

interface ActiveUsersPanelProps {
  users: CollaborationUser[];
}

const ActiveUsersPanel: React.FC<ActiveUsersPanelProps> = ({ users }) => {
  if (users.length === 0) {
    return null;
  }

  return (
    <div className="active-users-panel">
      <span className="users-label">在线协作:</span>
      <Avatar.Group maxCount={5} size="small">
        {users.map((user) => (
          <Tooltip key={user.userId} title={user.userName}>
            <Badge dot status="success">
              <Avatar
                style={{ backgroundColor: user.userColor }}
                icon={<UserOutlined />}
              >
                {user.userName.charAt(0).toUpperCase()}
              </Avatar>
            </Badge>
          </Tooltip>
        ))}
      </Avatar.Group>
      <span className="users-count">({users.length})</span>
    </div>
  );
};

export default ActiveUsersPanel;
```

#### 3.4.4 连接状态组件

**文件**: `frontend/src/components/CollaborativeEditor/ConnectionStatus.tsx`

```typescript
import React from 'react';
import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

interface ConnectionStatusProps {
  isConnected: boolean;
  isSynced: boolean;
  error: Error | null;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isSynced,
  error,
}) => {
  if (error) {
    return (
      <Tag icon={<CloseCircleOutlined />} color="error">
        连接失败
      </Tag>
    );
  }

  if (!isConnected) {
    return (
      <Tag icon={<LoadingOutlined />} color="processing">
        正在连接...
      </Tag>
    );
  }

  if (!isSynced) {
    return (
      <Tag icon={<SyncOutlined spin />} color="processing">
        正在同步...
      </Tag>
    );
  }

  return (
    <Tag icon={<CheckCircleOutlined />} color="success">
      实时协作中
    </Tag>
  );
};

export default ConnectionStatus;
```

#### 3.4.5 样式文件

**文件**: `frontend/src/components/CollaborativeEditor/collaborative-editor.css`

```css
.collaborative-editor-wrapper {
  position: relative;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.collaboration-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #fafafa;
  border-bottom: 1px solid #d9d9d9;
}

.active-users-panel {
  display: flex;
  align-items: center;
  gap: 8px;
}

.users-label {
  font-size: 12px;
  color: #8c8c8c;
}

.users-count {
  font-size: 12px;
  color: #595959;
  font-weight: 500;
}

/* 远程用户光标样式 */
.remote-cursor {
  position: absolute;
  pointer-events: none;
  border-left: 2px solid;
  height: 1.2em;
  z-index: 10;
}

.remote-cursor-label {
  position: absolute;
  top: -20px;
  left: -2px;
  padding: 2px 6px;
  border-radius: 3px;
  color: white;
  font-size: 11px;
  white-space: nowrap;
  font-weight: 500;
}

/* 远程用户选区样式 */
.remote-selection {
  position: absolute;
  pointer-events: none;
  opacity: 0.3;
  z-index: 5;
}
```

### 3.5 Phase 5: 集成到RequirementFormPage (1天)

**文件**: `frontend/src/pages/RequirementFormPage.tsx` (修改)

```typescript
// 导入协作编辑器
import CollaborativeEditor from '../components/CollaborativeEditor/CollaborativeEditor';

// 在组件中添加协作开关状态
const [enableCollaboration, setEnableCollaboration] = useState(true);

// 替换原有的LexicalEditor为CollaborativeEditor
<Form.Item
  label="需求描述"
  name="description"
  rules={[{ required: true, message: '请输入需求描述' }]}
>
  <CollaborativeEditor
    documentId={id ? parseInt(id) : 0}  // 使用需求ID作为documentId
    fieldName="description"
    value={descriptionContent}
    onChange={setDescriptionContent}
    placeholder="详细描述需求的功能、背景和目标..."
    onUploadImage={uploadImage}
    minHeight={300}
    maxHeight={600}
    enableCollaboration={enableCollaboration && isEditMode}
  />
</Form.Item>

// 类似地替换其他3个编辑器
<CollaborativeEditor fieldName="business_value" ... />
<CollaborativeEditor fieldName="expected_outcome" ... />
<CollaborativeEditor fieldName="acceptance_criteria" ... />

// 添加协作开关按钮
<Switch
  checked={enableCollaboration}
  onChange={setEnableCollaboration}
  checkedChildren="协作模式"
  unCheckedChildren="单人模式"
/>
```

---

## 4. 实施计划

### 4.1 时间线 (总计: 8-10天)

| 阶段 | 任务 | 时长 | 负责模块 |
|------|------|------|----------|
| **Phase 1** | 依赖安装和配置 | 1天 | 前端+后端 |
| **Phase 2** | 数据库Schema设计 | 0.5天 | 后端 |
| **Phase 3** | 后端WebSocket服务 | 3天 | 后端 |
| **Phase 4** | 前端协作组件 | 2天 | 前端 |
| **Phase 5** | 集成到表单页面 | 1天 | 前端 |
| **Phase 6** | 测试和优化 | 1.5天 | 全栈 |
| **Phase 7** | 文档和部署 | 1天 | DevOps |

### 4.2 子任务拆分

#### 后端子任务 (#3585 - 4天)
1. ✅ 安装gorilla/websocket依赖
2. ✅ 创建数据库迁移文件
3. ✅ 实现CollaborationWebSocketService
4. ✅ 实现CollaborationWSHandler
5. ✅ 实现Room管理和消息广播
6. ✅ 实现文档持久化逻辑
7. ✅ 实现Awareness协议
8. ✅ 添加单元测试
9. ✅ 添加集成测试

#### 前端子任务 (#3586 - 3天)
1. ✅ 安装yjs, @lexical/yjs, y-websocket
2. ✅ 实现useCollaboration Hook
3. ✅ 实现CollaborativeEditor组件
4. ✅ 实现ActiveUsersPanel组件
5. ✅ 实现ConnectionStatus组件
6. ✅ 实现远程光标和选区显示
7. ✅ 集成到RequirementFormPage
8. ✅ 添加样式和UI优化
9. ✅ 添加单元测试

#### 测试子任务 (#3587 - 1.5天)
1. ✅ 单人编辑测试
2. ✅ 多人同时编辑测试
3. ✅ 网络断线重连测试
4. ✅ 冲突解决测试
5. ✅ 性能测试 (10+ 并发用户)
6. ✅ 浏览器兼容性测试

---

## 5. 技术细节和最佳实践

### 5.1 Yjs CRDT原理

**CRDT (Conflict-free Replicated Data Type)** 是一种无需中心化协调即可自动解决冲突的数据结构。Yjs使用了**Operation-based CRDT**实现:

1. **操作记录**: 每个编辑操作都被记录为一个update
2. **向量时钟**: 使用状态向量跟踪每个客户端的操作顺序
3. **自动合并**: 接收到远程更新时,自动根据因果关系合并
4. **最终一致性**: 所有客户端最终会收敛到相同状态

**Yjs协议流程**:
```
客户端A加入 → 发送状态向量 → 服务器发送缺失的更新 → 同步完成
客户端A编辑 → 生成update → 发送到服务器 → 广播给其他客户端
客户端B接收 → 应用update → 文档自动合并 → UI更新
```

### 5.2 性能优化

#### 5.2.1 前端优化
- **节流更新**: awareness状态(光标位置)不要每次移动都发送,使用200ms节流
- **批量操作**: 多个连续编辑操作在100ms内合并为一个update
- **懒加载**: 只在用户主动开启协作模式时连接WebSocket
- **内存管理**: 离开页面时正确销毁Yjs文档和WebSocket连接

#### 5.2.2 后端优化
- **消息队列**: 使用带缓冲的channel避免阻塞
- **定期持久化**: 每30秒或每100次更新持久化一次文档状态
- **房间清理**: 空房间超过5分钟自动关闭并持久化
- **Redis缓存**: 活跃会话信息存Redis,避免频繁查询数据库

### 5.3 安全考虑

1. **WebSocket认证**: 升级连接前验证JWT token
2. **权限检查**: 连接建立后检查用户对文档的访问权限
3. **消息验证**: 验证所有WebSocket消息的格式和来源
4. **速率限制**: 限制每个用户的消息发送频率
5. **数据加密**: 生产环境使用WSS (WebSocket Secure)

### 5.4 监控和日志

```go
// 监控指标
- 活跃WebSocket连接数
- 每秒消息吞吐量
- 文档同步延迟
- 错误率

// 日志记录
- 用户加入/离开房间
- 文档保存成功/失败
- WebSocket连接异常
- Yjs更新应用失败
```

---

## 6. 降级方案

### 6.1 WebSocket不可用时
- 自动切换到单人编辑模式
- 显示提示: "实时协作暂时不可用,您的修改将正常保存"
- 继续使用原有的onChange机制保存

### 6.2 CRDT冲突无法自动解决时
- 锁定文档
- 弹出对比视图让用户手动选择
- 记录冲突日志供后续分析

### 6.3 性能不足时
- 限制单文档最多20个并发用户
- 超过限制时只读模式
- 提示用户错峰编辑

---

## 7. 验收标准

### 7.1 功能验收
- [ ] 2个用户可以同时编辑同一个需求的不同字段
- [ ] 2个用户可以同时编辑同一个字段,实时看到对方的修改
- [ ] 能看到其他用户的光标位置和选区
- [ ] 用户加入/离开时有通知
- [ ] 网络断开后自动重连并同步
- [ ] 编辑历史完整保存到数据库

### 7.2 性能验收
- [ ] 10个并发用户同时编辑,延迟 < 500ms
- [ ] 文档大小 < 5MB
- [ ] WebSocket消息传输延迟 < 100ms
- [ ] 页面内存占用增长 < 50MB

### 7.3 兼容性验收
- [ ] Chrome/Edge/Safari/Firefox最新版本
- [ ] 移动端Safari和Chrome
- [ ] 可选启用/禁用协作模式
- [ ] 向后兼容非协作编辑

---

## 8. 参考资源

- [Yjs官方文档](https://docs.yjs.dev/)
- [y-websocket协议](https://github.com/yjs/y-websocket)
- [Lexical协作插件](https://lexical.dev/docs/collaboration/introduction)
- [gorilla/websocket](https://github.com/gorilla/websocket)
- [CRDT论文](https://crdt.tech/)

---

**创建日期**: 2025-11-08
**最后更新**: 2025-11-08
**文档版本**: v2.0
**状态**: ✅ 设计完成,待实施
