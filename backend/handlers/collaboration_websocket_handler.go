package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

// CollaborationWebSocketHandler WebSocket协作处理器
type CollaborationWebSocketHandler struct {
	db       *gorm.DB
	rooms    map[int]*CollaborationRoom // documentID -> Room
	roomsMux sync.RWMutex
	upgrader websocket.Upgrader
}

// NewCollaborationWebSocketHandler 创建新的WebSocket处理器
func NewCollaborationWebSocketHandler(db *gorm.DB) *CollaborationWebSocketHandler {
	return &CollaborationWebSocketHandler{
		db:    db,
		rooms: make(map[int]*CollaborationRoom),
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024 * 4,  // 4KB
			WriteBufferSize: 1024 * 4,  // 4KB
			CheckOrigin: func(r *http.Request) bool {
				// TODO: 生产环境需要验证origin
				return true
			},
		},
	}
}

// CollaborationRoom 协作房间 - 管理单个文档的所有连接
type CollaborationRoom struct {
	DocumentID  int
	FieldName   string
	Clients     map[string]*CollaborationClient
	clientsMux  sync.RWMutex
	Broadcast   chan *BroadcastMessage
	Register    chan *CollaborationClient
	Unregister  chan *CollaborationClient
	YjsDocument []byte
	StateVector []byte
	docMux      sync.RWMutex
}

// CollaborationClient WebSocket客户端
type CollaborationClient struct {
	SessionID string
	UserID    int
	UserName  string
	UserColor string
	Conn      *websocket.Conn
	Room      *CollaborationRoom
	Send      chan []byte
	db        *gorm.DB
}

// BroadcastMessage 广播消息
type BroadcastMessage struct {
	Data      []byte
	ExcludeID string // 排除指定客户端
}

// Yjs消息类型常量
const (
	MessageTypeSync      = 0
	MessageTypeAwareness = 1
	MessageTypeUpdate    = 2
)

// HandleCollaborationWebSocket WebSocket连接处理
// @Summary 实时协作WebSocket连接
// @Description 建立WebSocket连接进行实时协作编辑
// @Tags Collaboration
// @Param document_id path int true "文档ID"
// @Success 101 {string} string "Switching Protocols"
// @Router /ws/collaboration/{document_id} [get]
func (h *CollaborationWebSocketHandler) HandleCollaborationWebSocket(c *gin.Context) {
	// 1. 解析参数
	documentIDStr := c.Param("document_id")
	documentID, err := strconv.Atoi(documentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document_id"})
		return
	}

	fieldName := c.Query("room")
	if fieldName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing room (field_name) parameter"})
		return
	}

	// 2. 从query参数获取用户信息
	userIDStr := c.Query("userId")
	userName := c.Query("userName")
	token := c.Query("token")

	if userIDStr == "" || userName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing userId or userName"})
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid userId"})
		return
	}

	// TODO: 验证JWT token
	_ = token

	// 3. 升级到WebSocket
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	// 4. 获取或创建房间
	room := h.getOrCreateRoom(documentID, fieldName)

	// 5. 创建客户端
	sessionID := generateSessionID(userID, time.Now().UnixNano())
	client := &CollaborationClient{
		SessionID: sessionID,
		UserID:    userID,
		UserName:  userName,
		UserColor: generateUserColor(userID),
		Conn:      conn,
		Room:      room,
		Send:      make(chan []byte, 256),
		db:        h.db,
	}

	// 6. 注册客户端到房间
	room.Register <- client

	// 7. 在数据库中创建会话记录
	go client.createSessionRecord()

	// 8. 启动客户端读写goroutines
	go client.writePump()
	go client.readPump()
}

// getOrCreateRoom 获取或创建房间
func (h *CollaborationWebSocketHandler) getOrCreateRoom(documentID int, fieldName string) *CollaborationRoom {
	h.roomsMux.Lock()
	defer h.roomsMux.Unlock()

	room, exists := h.rooms[documentID]
	if !exists {
		room = &CollaborationRoom{
			DocumentID: documentID,
			FieldName:  fieldName,
			Clients:    make(map[string]*CollaborationClient),
			Broadcast:  make(chan *BroadcastMessage, 256),
			Register:   make(chan *CollaborationClient),
			Unregister: make(chan *CollaborationClient),
		}
		h.rooms[documentID] = room

		// 启动房间管理goroutine
		go room.run(h.db)

		// 从数据库加载文档状态
		go room.loadDocumentState(h.db)
	}

	return room
}

// run 房间主循环
func (r *CollaborationRoom) run(db *gorm.DB) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case client := <-r.Register:
			r.handleRegister(client)

		case client := <-r.Unregister:
			r.handleUnregister(client)

		case message := <-r.Broadcast:
			r.handleBroadcast(message)

		case <-ticker.C:
			// 定期持久化文档状态
			go r.persistDocumentState(db)
		}
	}
}

// handleRegister 处理客户端注册
func (r *CollaborationRoom) handleRegister(client *CollaborationClient) {
	r.clientsMux.Lock()
	r.Clients[client.SessionID] = client
	r.clientsMux.Unlock()

	log.Printf("Client registered: %s (User: %s) in document %d", client.SessionID, client.UserName, r.DocumentID)

	// 发送初始同步消息
	r.sendInitialState(client)

	// 广播awareness变化
	r.broadcastAwareness()
}

// handleUnregister 处理客户端注销
func (r *CollaborationRoom) handleUnregister(client *CollaborationClient) {
	r.clientsMux.Lock()
	if _, ok := r.Clients[client.SessionID]; ok {
		delete(r.Clients, client.SessionID)
		close(client.Send)
	}
	r.clientsMux.Unlock()

	log.Printf("Client unregistered: %s (User: %s)", client.SessionID, client.UserName)

	// 更新数据库会话状态
	go client.markSessionInactive()

	// 广播awareness变化
	r.broadcastAwareness()
}

// handleBroadcast 处理广播消息
func (r *CollaborationRoom) handleBroadcast(msg *BroadcastMessage) {
	r.clientsMux.RLock()
	defer r.clientsMux.RUnlock()

	for sessionID, client := range r.Clients {
		if sessionID != msg.ExcludeID {
			select {
			case client.Send <- msg.Data:
			default:
				// 发送缓冲区满，关闭连接
				close(client.Send)
				delete(r.Clients, sessionID)
			}
		}
	}
}

// sendInitialState 发送初始文档状态给新连接的客户端
func (r *CollaborationRoom) sendInitialState(client *CollaborationClient) {
	r.docMux.RLock()
	defer r.docMux.RUnlock()

	if r.YjsDocument != nil {
		// 发送完整文档状态
		client.Send <- r.YjsDocument
	}

	if r.StateVector != nil {
		// 发送状态向量
		client.Send <- r.StateVector
	}
}

// broadcastAwareness 广播awareness更新
func (r *CollaborationRoom) broadcastAwareness() {
	r.clientsMux.RLock()
	defer r.clientsMux.RUnlock()

	// 构建awareness消息（包含所有活跃用户）
	users := make([]map[string]interface{}, 0, len(r.Clients))
	for _, client := range r.Clients {
		users = append(users, map[string]interface{}{
			"userId":   client.UserID,
			"userName": client.UserName,
			"color":    client.UserColor,
		})
	}

	awarenessMsg, _ := json.Marshal(map[string]interface{}{
		"type":  MessageTypeAwareness,
		"users": users,
	})

	// 广播给所有客户端
	for _, client := range r.Clients {
		select {
		case client.Send <- awarenessMsg:
		default:
		}
	}
}

// 辅助函数
func generateSessionID(userID int, nanos int64) string {
	return strconv.Itoa(userID) + "_" + strconv.FormatInt(nanos, 36)
}

func generateUserColor(userID int) string {
	colors := []string{
		"#1890ff", "#52c41a", "#faad14", "#f5222d", "#722ed1",
		"#13c2c2", "#eb2f96", "#fa8c16", "#a0d911", "#2f54eb",
	}
	return colors[userID%len(colors)]
}
