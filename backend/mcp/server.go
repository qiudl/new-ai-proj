package mcp

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"ai-project-backend/database"
	"ai-project-backend/models"
	"ai-project-backend/services"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

const (
	ServerName    = "ai-project-mcp"
	ServerVersion = "1.0.0"
)

// MCPServerConfig MCP 服务器配置
type MCPServerConfig struct {
	// 数据库访问
	DB database.DB

	// API Key 服务
	APIKeyService *services.MCPAPIKeyService

	// 日志
	Logger *slog.Logger

	// 会话配置
	SessionTimeout time.Duration // 空闲会话超时
	Stateless      bool          // 是否无状态模式
}

// MCPServer MCP 服务器
type MCPServer struct {
	config *MCPServerConfig

	// SDK Handler
	handler *mcp.StreamableHTTPHandler

	// 会话管理
	sessions sync.Map // sessionID -> *SessionContext
}

// SessionContext 会话上下文
type SessionContext struct {
	APIKey    *models.MCPAPIKey
	UserID    int
	RequestID string
	StartTime time.Time
}

// NewMCPServer 创建 MCP 服务器
func NewMCPServer(config *MCPServerConfig) *MCPServer {
	if config.Logger == nil {
		config.Logger = slog.Default()
	}
	if config.SessionTimeout == 0 {
		config.SessionTimeout = 30 * time.Minute
	}

	s := &MCPServer{
		config: config,
	}

	// 创建 StreamableHTTPHandler
	opts := &mcp.StreamableHTTPOptions{
		Logger:         config.Logger,
		Stateless:      config.Stateless,
		SessionTimeout: config.SessionTimeout,
	}

	s.handler = mcp.NewStreamableHTTPHandler(s.getServerForRequest, opts)

	return s
}

// getServerForRequest 为每个请求创建/获取 Server 实例
// 这个函数会在每次 HTTP 请求时被调用
func (s *MCPServer) getServerForRequest(r *http.Request) *mcp.Server {
	// 从请求上下文中获取认证信息（由中间件设置）
	ctx := r.Context()

	// 获取 API Key（通过中间件已验证）
	apiKeyID := ctx.Value("mcp_api_key_id")
	if apiKeyID == nil {
		log.Printf("[MCP_SERVER] No API key found in context")
		return nil
	}

	// 创建 MCP Server 实例
	server := mcp.NewServer(&mcp.Implementation{
		Name:    ServerName,
		Version: ServerVersion,
	}, nil)

	// 注册所有工具
	s.registerTools(server, ctx)

	return server
}

// registerTools 注册所有 MCP 工具
func (s *MCPServer) registerTools(server *mcp.Server, ctx context.Context) {
	// ========== 任务管理工具 ==========

	// 1. list_tasks - 列出任务
	s.registerListTasks(server)

	// 2. create_task - 创建任务
	s.registerCreateTask(server)

	// 3. find_task - 查找任务
	s.registerFindTask(server)

	// 4. update_task - 更新任务
	s.registerUpdateTask(server)

	// 5. delete_task - 删除任务
	s.registerDeleteTask(server)

	// 6. start_task - 开始任务
	s.registerStartTask(server)

	// 7. complete_task - 完成任务
	s.registerCompleteTask(server)

	// 8. pause_task - 暂停任务
	s.registerPauseTask(server)

	// 9. get_detailed_task_info - 获取任务详情
	s.registerGetDetailedTaskInfo(server)

	// 10. create_subtask - 创建子任务
	s.registerCreateSubtask(server)

	log.Printf("[MCP_SERVER] Registered %d tools", 10)
}

// ServeHTTP 实现 http.Handler 接口
func (s *MCPServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.handler.ServeHTTP(w, r)
}

// Handler 返回 HTTP Handler
func (s *MCPServer) Handler() http.Handler {
	return s.handler
}
