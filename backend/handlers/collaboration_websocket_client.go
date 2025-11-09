package handlers

import (
	"log"
	"time"

	"github.com/gorilla/websocket"
	"gorm.io/gorm"

	"ai-project-backend/models"
)

const (
	// 写入等待时间
	writeWait = 10 * time.Second

	// pong等待时间
	pongWait = 60 * time.Second

	// ping周期（必须小于pongWait）
	pingPeriod = (pongWait * 9) / 10

	// 最大消息大小
	maxMessageSize = 512 * 1024 // 512KB
)

// readPump 从WebSocket读取消息并处理
func (c *CollaborationClient) readPump() {
	defer func() {
		c.Room.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		// 更新心跳
		go c.updateHeartbeat()
		return nil
	})
	c.Conn.SetReadLimit(maxMessageSize)

	for {
		messageType, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		if messageType == websocket.BinaryMessage {
			// 处理Yjs二进制消息
			c.handleYjsMessage(message)
		}
	}
}

// writePump 向WebSocket写入消息
func (c *CollaborationClient) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// 通道已关闭
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.BinaryMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// 批量发送队列中的消息
			n := len(c.Send)
			for i := 0; i < n; i++ {
				w.Write(<-c.Send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleYjsMessage 处理Yjs协议消息
func (c *CollaborationClient) handleYjsMessage(message []byte) {
	if len(message) == 0 {
		return
	}

	// Yjs消息格式: [messageType, ...payload]
	messageType := message[0]

	switch messageType {
	case MessageTypeSync:
		// Sync消息 - 同步文档状态
		c.handleSyncMessage(message[1:])

	case MessageTypeUpdate:
		// Update消息 - 增量更新
		c.handleUpdateMessage(message[1:])

	case MessageTypeAwareness:
		// Awareness消息 - 用户状态
		c.handleAwarenessMessage(message[1:])

	default:
		log.Printf("Unknown Yjs message type: %d", messageType)
	}
}

// handleSyncMessage 处理同步消息
func (c *CollaborationClient) handleSyncMessage(payload []byte) {
	// Sync Step 1: 客户端发送state vector
	// Sync Step 2: 服务器发送缺失的updates

	// 更新房间的文档状态
	c.Room.docMux.Lock()
	c.Room.YjsDocument = payload
	c.Room.docMux.Unlock()

	// 广播给其他客户端
	fullMessage := append([]byte{MessageTypeSync}, payload...)
	c.Room.Broadcast <- &BroadcastMessage{
		Data:      fullMessage,
		ExcludeID: c.SessionID,
	}

	// 异步持久化到数据库
	go c.saveDocumentUpdate(payload, "sync")
}

// handleUpdateMessage 处理更新消息
func (c *CollaborationClient) handleUpdateMessage(payload []byte) {
	// Update消息包含文档的增量变更

	// 广播给其他客户端
	fullMessage := append([]byte{MessageTypeUpdate}, payload...)
	c.Room.Broadcast <- &BroadcastMessage{
		Data:      fullMessage,
		ExcludeID: c.SessionID,
	}

	// 应用到房间的文档状态
	c.Room.docMux.Lock()
	// Note: 这里简化处理，实际应该合并updates
	c.Room.YjsDocument = append(c.Room.YjsDocument, payload...)
	c.Room.docMux.Unlock()

	// 异步持久化到数据库
	go c.saveDocumentUpdate(payload, "update")
}

// handleAwarenessMessage 处理awareness消息
func (c *CollaborationClient) handleAwarenessMessage(payload []byte) {
	// Awareness消息包含用户的光标、选中等状态

	// 广播给其他客户端
	fullMessage := append([]byte{MessageTypeAwareness}, payload...)
	c.Room.Broadcast <- &BroadcastMessage{
		Data:      fullMessage,
		ExcludeID: c.SessionID,
	}

	// TODO: 解析awareness数据并更新到数据库
}

// === 数据库操作方法 ===

// createSessionRecord 在数据库中创建会话记录
func (c *CollaborationClient) createSessionRecord() {
	// 先获取或创建collaboration_document记录
	var doc models.CollaborationDocument
	result := c.db.Where("requirement_id = ? AND field_name = ?",
		c.Room.DocumentID, c.Room.FieldName).First(&doc)

	if result.Error == gorm.ErrRecordNotFound {
		// 创建新文档记录
		doc = models.CollaborationDocument{
			RequirementID: c.Room.DocumentID,
			FieldName:     c.Room.FieldName,
			Version:       0,
		}
		if err := c.db.Create(&doc).Error; err != nil {
			log.Printf("Failed to create collaboration document: %v", err)
			return
		}
	}

	// 创建会话记录
	session := models.CollaborationSession2{
		DocumentID: int(doc.ID),
		UserID:     c.UserID,
		SessionID:  c.SessionID,
		UserName:   c.UserName,
		UserColor:  c.UserColor,
		IsActive:   true,
		JoinedAt:   time.Now(),
		LastHeartbeat: time.Now(),
	}

	if err := c.db.Create(&session).Error; err != nil {
		log.Printf("Failed to create session record: %v", err)
	}
}

// updateHeartbeat 更新心跳时间
func (c *CollaborationClient) updateHeartbeat() {
	c.db.Model(&models.CollaborationSession2{}).
		Where("session_id = ?", c.SessionID).
		Update("last_heartbeat", time.Now())
}

// markSessionInactive 标记会话为不活跃
func (c *CollaborationClient) markSessionInactive() {
	now := time.Now()
	c.db.Model(&models.CollaborationSession2{}).
		Where("session_id = ?", c.SessionID).
		Updates(map[string]interface{}{
			"is_active": false,
			"left_at":   now,
		})
}

// saveDocumentUpdate 保存文档更新到数据库
func (c *CollaborationClient) saveDocumentUpdate(updateData []byte, updateType string) {
	// 获取collaboration_document ID
	var doc models.CollaborationDocument
	if err := c.db.Where("requirement_id = ? AND field_name = ?",
		c.Room.DocumentID, c.Room.FieldName).First(&doc).Error; err != nil {
		log.Printf("Failed to find collaboration document: %v", err)
		return
	}

	// 保存更新记录
	update := models.CollaborationUpdate{
		DocumentID: int(doc.ID),
		UpdateData: updateData,
		UserID:     &c.UserID,
		Timestamp:  time.Now(),
	}

	if err := c.db.Create(&update).Error; err != nil {
		log.Printf("Failed to save document update: %v", err)
	}

	// 更新文档版本
	c.db.Model(&doc).Updates(map[string]interface{}{
		"version":          gorm.Expr("version + 1"),
		"last_modified_by": c.UserID,
		"last_modified_at": time.Now(),
	})
}

// === Room的数据库操作方法 ===

// loadDocumentState 从数据库加载文档状态
func (r *CollaborationRoom) loadDocumentState(db *gorm.DB) {
	var doc models.CollaborationDocument
	if err := db.Where("requirement_id = ? AND field_name = ?",
		r.DocumentID, r.FieldName).First(&doc).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// 文档不存在，创建新的
			doc = models.CollaborationDocument{
				RequirementID: r.DocumentID,
				FieldName:     r.FieldName,
				Version:       0,
			}
			db.Create(&doc)
		}
		return
	}

	// 加载到内存
	r.docMux.Lock()
	r.YjsDocument = doc.YjsDocument
	r.StateVector = doc.StateVector
	r.docMux.Unlock()

	log.Printf("Loaded document state for requirement %d, field %s (version: %d)",
		r.DocumentID, r.FieldName, doc.Version)
}

// persistDocumentState 持久化文档状态到数据库
func (r *CollaborationRoom) persistDocumentState(db *gorm.DB) {
	r.docMux.RLock()
	yjsDoc := r.YjsDocument
	stateVec := r.StateVector
	r.docMux.RUnlock()

	if yjsDoc == nil {
		return
	}

	// 更新数据库
	db.Model(&models.CollaborationDocument{}).
		Where("requirement_id = ? AND field_name = ?", r.DocumentID, r.FieldName).
		Updates(map[string]interface{}{
			"yjs_document": yjsDoc,
			"state_vector": stateVec,
			"updated_at":   time.Now(),
		})
}
